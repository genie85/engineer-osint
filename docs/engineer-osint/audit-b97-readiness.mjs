import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {canonicalDigest,deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validateIntelligenceExtensionV1} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const read=(name,label=name)=>parseJsonStrict(readFileSync(join(src,name),'utf8'),{source:label});
const policy=read('V4517_B97_READINESS.json','B97 readiness policy');
const raw=readFileSync(join(src,'V4517_B97_PATCH_CANDIDATE.json'),'utf8');
const patch=parseJsonStrict(raw,{source:'B97 exact candidate'});
const plan=parseJsonStrict(readFileSync(join(dist,'b97-append-plan.json'),'utf8'),{source:'B97 append dry-run plan'});
const baseline=read('V4512_POST_B96_RESIDUAL_BASELINE.json','B96 residual baseline');
const b96Auth=read('V4511_B96_APPEND_AUTHORIZATION.json','B96 authorization');
const store=loadCanonicalRunStore({root:src});
const fail=m=>{throw new Error(`B97_READINESS: ${m}`)};

if(policy.schema_version!=='engineer-osint-b97-readiness-v1'||policy.status!=='BLOCKED_PENDING_POST_B97_CI_READINESS')fail('unsafe policy');
const a=policy.authorization||{};
if(a.append_allowed!==false||a.standard_append_run_dry_run_required!==true||a.standard_append_run_write_allowed!==false||a.one_run_only!==true||a.allow_b98_same_slice!==false||a.allow_overlay_retirement!==false||a.allow_identity_fix_migration!==false)fail('unsafe authorization scope');
if(store.report.current_run_id!==policy.expected_parent_run_id||store.report.canonical_sha256!==policy.expected_parent_canonical_sha256)fail('persistent B96 parent/hash mismatch');
if(sha256Text(raw)!==policy.exact_candidate_file_sha256)fail('candidate byte SHA drift');
if(patch.state?.run_id!==policy.candidate_run_id||patch.state?.parent_run_id!==policy.expected_parent_run_id)fail('candidate identity mismatch');
if(Object.values(patch.true_delta||{}).some(v=>v!==0)||Object.values(patch.state?.counts||{}).some(v=>v!==0))fail('non-zero research/delta count');
for(const f of ['new_records','updated_records','sources','relations','evidence','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned'])if(!Array.isArray(patch[f])||patch[f].length)fail(`${f} must be empty`);
if(patch.extensions?.operations_v1!==undefined)fail('factual correction operations are forbidden');
const intel=validateIntelligenceExtensionV1(patch);
if(intel.gaps.length!==15||intel.assessments.length||intel.contradictions.length)fail('Intelligence v1 counts mismatch');
for(let i=0;i<15;i++)if(intel.gaps[i]?.gap_id!==`ENG-GAP-B97-OVL-${String(i+1).padStart(3,'0')}`)fail(`gap sequence drift at ${i+1}`);

if(plan.status!=='VALIDATED_DRY_RUN'||plan.entry?.run_id!==policy.candidate_run_id||plan.entry?.parent_run_id!==policy.expected_parent_run_id)fail('append plan identity/status mismatch');
if(plan.entry?.file_sha256!==policy.exact_candidate_file_sha256||plan.entry?.parent_canonical_sha256!==policy.expected_parent_canonical_sha256)fail('append plan reviewed hash mismatch');
if(!/^[a-f0-9]{64}$/.test(plan.entry?.canonical_sha256||'')||plan.entry.canonical_sha256===policy.expected_parent_canonical_sha256)fail('resulting canonical SHA invalid');
if(policy.expected_resulting_canonical_sha256!==null&&plan.entry.canonical_sha256!==policy.expected_resulting_canonical_sha256)fail('resulting canonical SHA differs from pinned value');
const after=applyStrictPatchToCanonicalData(structuredClone(store.data),patch);
if(canonicalDigest(after)!==plan.entry.canonical_sha256)fail('strict digest differs from append plan');
const gaps=after.intelligence_gaps?.gaps||[];
for(const g of intel.gaps)if(!gaps.some(x=>(x.gap_id||x.id)===g.gap_id))fail(`materialized gap missing ${g.gap_id}`);
if(JSON.stringify(after).includes('ENG-ASMT-B98-OVL-'))fail('B98 assessment leaked into B97 simulation');

const logical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const obj=(r,t,c,i)=>r?.[t]?.[c]?.[i];
const id=x=>x?.id||x?.source_id||x?.lead_id||x?.asset_id||x?.media_id||x?.evidence_id||x?.relation_id||x?.lesson_id;
const sig=(ch,b,a)=>{const m=ch.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);if(!m)return `UNSCOPED|${ch.path}`;const [_,t,c,n,rel='']=m,i=Number(n),bi=obj(b,t,c,i),ai=obj(a,t,c,i),field=rel.match(/^([^.[]+)/)?.[1]||(bi===undefined?'APPEND_ITEM':ai===undefined?'RETRACT_ITEM':'WHOLE_ITEM');return `${logical[c]||c}|${id(ai)||id(bi)||'UNKNOWN'}|${field}`};
let runtime=structuredClone(after);const modules=[],unexpected=[];
for(const module of b96Auth.scope_modules){
  const exp=baseline.modules?.[module];if(!exp)fail(`missing baseline for ${module}`);
  const before=structuredClone(runtime),next=structuredClone(runtime);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:next},console},{filename:module,timeout:3000});
  const factual=deepDiff(before,next).filter(x=>x.path!=='rich_backfill_meta'&&!x.path.startsWith('rich_backfill_meta.'));
  const signatures=[...new Set(factual.map(x=>sig(x,before,next)))].sort(),expected=[...exp.residual_signatures].sort();
  const added=signatures.filter(x=>!expected.includes(x)),missing=expected.filter(x=>!signatures.includes(x));
  if(signatures.length!==exp.residual_signature_count||factual.length!==exp.residual_factual_leaf_mutations||added.length||missing.length)unexpected.push({module,added,missing});
  modules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length});runtime=next;
}
const rs=modules.reduce((s,x)=>s+x.residual_signature_count,0),rf=modules.reduce((s,x)=>s+x.residual_factual_leaf_mutations,0);
if(rs!==61||rf!==81||unexpected.length)fail(`residual debt drift ${rs}/${rf}; unexpected=${unexpected.length}`);

const ctx=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(after)},console});
vm.runInContext(readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8'),ctx,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const guard=ctx.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;if(!guard?.shouldShortCircuit)fail('runtime guard API missing');
const decisions=b96Auth.scope_modules.map(module=>({module,short_circuit:Boolean(guard.shouldShortCircuit(module,ctx.window.__ENGINEER_DATA__))}));
const short=decisions.filter(x=>x.short_circuit).length;if(short!==0)fail(`guard short-circuit drift ${short}`);

const out={generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-b97-readiness-audit-v1',mode:'PERSISTENT_B96_DRY_RUN_B97',persistent_tip:store.report.current_run_id,candidate_run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,candidate_file_sha256:policy.exact_candidate_file_sha256,resulting_canonical_sha256:plan.entry.canonical_sha256,gap_count:15,assessment_count:0,contradiction_count:0,residual_signature_count:rs,residual_factual_leaf_mutations:rf,unexpected_residual_modules:unexpected,guard_short_circuit_count:short,guard_decisions:decisions,b98_materialized:false,overlays_must_remain_active:true,canonical_write_performed:false,safe_to_append:false,post_b97_pages_validation_ready:false};
writeFileSync(join(dist,'b97-readiness-audit.json'),JSON.stringify(out,null,2)+'\n');
writeFileSync(join(dist,'b97-readiness-audit.md'),`# ENGINEER OSINT v4.5.17 — B97 readiness audit\n\nStatus: **PASS**\n\n- Candidate SHA: \`${out.candidate_file_sha256}\`\n- Result canonical SHA: \`${out.resulting_canonical_sha256}\`\n- Native gaps: **15**\n- Residual signatures / leaves: **${rs} / ${rf}**\n- Runtime guard short-circuits: **${short}/3**\n\nB97 is dry-run only; B98 is absent and legacy overlays remain active.\n`);
appendFileSync(join(dist,'health.txt'),`b97_readiness=pass\nb97_candidate_run=${policy.candidate_run_id}\nb97_candidate_file_sha=${policy.exact_candidate_file_sha256}\nb97_result_sha=${plan.entry.canonical_sha256}\nb97_native_gaps=15\nb97_residual_signatures=${rs}\nb97_residual_factual_leafs=${rf}\nb97_guard_short_circuits=${short}\nb97_b98_materialized=0\nb97_overlays_must_remain_active=1\nb97_safe_to_append=0\nb97_post_pages_ready=0\nb97_canonical_writes=0\n`);
console.log(`B97 readiness PASS: result=${plan.entry.canonical_sha256}; gaps=15; residual=${rs}/${rf}; guard=${short}/3; append=NO`);
