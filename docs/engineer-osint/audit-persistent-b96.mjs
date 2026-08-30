import {appendFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {canonicalDigest,deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const simulate=process.argv.includes('--simulate-from-candidate');
const authorization=parseJsonStrict(readFileSync(join(src,'V4511_B96_APPEND_AUTHORIZATION.json'),'utf8'),{source:'B96 authorization'});
const baseline=parseJsonStrict(readFileSync(join(src,'V4512_POST_B96_RESIDUAL_BASELINE.json'),'utf8'),{source:'post-B96 residual baseline'});
const store=loadCanonicalRunStore({root:src});
const b95=authorization.expected_parent_run_id,b96=authorization.candidate_run_id;

if(authorization.schema_version!=='engineer-osint-b96-append-authorization-v1')throw new Error('PERSISTENT_B96: authorization schema mismatch');
if(baseline.schema_version!=='engineer-osint-post-b96-residual-baseline-v1')throw new Error('PERSISTENT_B96: residual baseline schema mismatch');
if(baseline.candidate_run_id!==b96||baseline.candidate_file_sha256!==authorization.exact_candidate_file_sha256||baseline.resulting_canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('PERSISTENT_B96: baseline/authorization identity mismatch');

let b96Patch,b96Data,entry,mode;
if(simulate){
  if(store.report.current_run_id!==b95)throw new Error(`PERSISTENT_B96 simulation requires ${b95}, got ${store.report.current_run_id}`);
  const candidatePath=join(dist,'overlay-stage-a-patch-candidate.json');
  const planPath=join(dist,'overlay-stage-a-append-plan.json');
  if(!existsSync(candidatePath)||!existsSync(planPath))throw new Error('PERSISTENT_B96: Stage A candidate/plan missing for simulation');
  const raw=readFileSync(candidatePath,'utf8');
  b96Patch=parseJsonStrict(raw,{source:'Stage A candidate'});
  const plan=parseJsonStrict(readFileSync(planPath,'utf8'),{source:'Stage A append plan'});
  entry=plan.entry;
  if(plan.status!=='VALIDATED_DRY_RUN')throw new Error('PERSISTENT_B96: simulation append plan is not validated dry-run');
  if(sha256Text(raw)!==authorization.exact_candidate_file_sha256||entry?.file_sha256!==authorization.exact_candidate_file_sha256)throw new Error('PERSISTENT_B96: simulated candidate file SHA drift');
  if(entry?.parent_run_id!==b95||entry?.parent_canonical_sha256!==authorization.expected_parent_canonical_sha256)throw new Error('PERSISTENT_B96: simulated parent mismatch');
  b96Data=applyStrictPatchToCanonicalData(structuredClone(store.data),b96Patch);
  if(canonicalDigest(b96Data)!==authorization.expected_resulting_canonical_sha256||entry?.canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('PERSISTENT_B96: simulated resulting canonical SHA drift');
  mode='SIMULATED_PRE_APPEND_READINESS';
}else{
  if(store.report.current_run_id!==b96)throw new Error(`PERSISTENT_B96 audit requires persistent ${b96}, got ${store.report.current_run_id}`);
  if(store.report.canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('PERSISTENT_B96: persistent canonical SHA mismatch');
  entry=store.manifest.runs.find(item=>item.run_id===b96);
  if(!entry)throw new Error('PERSISTENT_B96: B96 manifest entry missing');
  if(entry.parent_run_id!==b95||entry.parent_canonical_sha256!==authorization.expected_parent_canonical_sha256||entry.file_sha256!==authorization.exact_candidate_file_sha256||entry.canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('PERSISTENT_B96: manifest entry differs from reviewed authorization');
  const path=join(src,entry.path),raw=readFileSync(path,'utf8');
  if(sha256Text(raw)!==authorization.exact_candidate_file_sha256)throw new Error('PERSISTENT_B96: persistent B96 file SHA mismatch');
  b96Patch=parseJsonStrict(raw,{source:path});
  b96Data=structuredClone(store.data);
  mode='PERSISTENT_POST_APPEND';
}

if(b96Patch.state?.run_id!==b96||b96Patch.state?.parent_run_id!==b95||b96Data.state_latest?.run_id!==b96)throw new Error('PERSISTENT_B96: run identity mismatch');
const operations=b96Patch.extensions?.operations_v1||[];
if(operations.length!==authorization.expected_operation_count)throw new Error(`PERSISTENT_B96: expected ${authorization.expected_operation_count} operations, got ${operations.length}`);
if((b96Patch.sources||[]).length!==authorization.expected_source_append_count)throw new Error(`PERSISTENT_B96: expected ${authorization.expected_source_append_count} source appends, got ${(b96Patch.sources||[]).length}`);
for(let i=0;i<operations.length;i++){
  const expected=`ENG-OP-B96-OVL-MIG-${String(i+1).padStart(3,'0')}`;
  if(operations[i]?.operation_id!==expected||operations[i]?.op!=='REPLACE_FIELD')throw new Error(`PERSISTENT_B96: operation sequence drift at ${expected}`);
}
const serialized=JSON.stringify(b96Data);
if(serialized.includes('ENG-GAP-B97-OVL-')||serialized.includes('ENG-ASMT-B98-OVL-'))throw new Error('PERSISTENT_B96: B97/B98 native intelligence leaked into Stage A state');

const rawToLogical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
const residualSignature=(change,before,after)=>{
  const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);
  if(!match)return `UNSCOPED|${change.path}`;
  const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'';
  const beforeItem=objectAt(before,top,raw,index),afterItem=objectAt(after,top,raw,index);
  const id=itemId(afterItem)||itemId(beforeItem)||'UNKNOWN';
  const field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');
  return `${rawToLogical[raw]||raw}|${id}|${field}`;
};

let runtime=structuredClone(b96Data);
const modules=[],unexpected=[];
for(const module of authorization.scope_modules){
  const expected=baseline.modules?.[module];
  if(!expected)throw new Error(`PERSISTENT_B96: no residual baseline for ${module}`);
  const before=structuredClone(runtime),after=structuredClone(runtime);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const changes=deepDiff(before,after),factual=changes.filter(item=>!isOverlayMeta(item.path));
  const signatures=[...new Set(factual.map(change=>residualSignature(change,before,after)))].sort();
  const expectedSignatures=[...expected.residual_signatures].sort();
  const added=signatures.filter(signature=>!expectedSignatures.includes(signature));
  const missing=expectedSignatures.filter(signature=>!signatures.includes(signature));
  if(signatures.length!==expected.residual_signature_count||factual.length!==expected.residual_factual_leaf_mutations||added.length||missing.length)unexpected.push({module,added,missing,signature_count:signatures.length,factual_leaf_mutations:factual.length});
  modules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length,added_signatures:added,missing_signatures:missing,residual_signatures:signatures});
  runtime=after;
}
const totalSignatures=modules.reduce((sum,item)=>sum+item.residual_signature_count,0);
const totalFactualLeafs=modules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
if(totalSignatures!==baseline.expected_total_residual_signatures||totalFactualLeafs!==baseline.expected_total_factual_leaf_mutations||unexpected.length)throw new Error(`PERSISTENT_B96: residual debt drift signatures=${totalSignatures} factual=${totalFactualLeafs} unexpectedModules=${unexpected.length}`);

const guardCode=readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8');
const guardContext=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(b96Data)},console});
vm.runInContext(guardCode,guardContext,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const guard=guardContext.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;
if(!guard?.shouldShortCircuit)throw new Error('PERSISTENT_B96: runtime transition guard API missing');
const guardDecisions=authorization.scope_modules.map(module=>({module,short_circuit:Boolean(guard.shouldShortCircuit(module,guardContext.window.__ENGINEER_DATA__))}));
if(guardDecisions.some(item=>item.short_circuit))throw new Error('PERSISTENT_B96: B96 must not short-circuit legacy overlays before B97/B98');

const output={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-persistent-b96-audit-v1',mode,
  persistent_tip:store.report.current_run_id,candidate_run_id:b96,parent_run_id:b95,
  candidate_file_sha256:authorization.exact_candidate_file_sha256,resulting_canonical_sha256:authorization.expected_resulting_canonical_sha256,
  operation_count:operations.length,source_append_count:(b96Patch.sources||[]).length,
  residual_signature_count:totalSignatures,residual_factual_leaf_mutations:totalFactualLeafs,unexpected_residual_modules:unexpected,
  guard_short_circuit_count:guardDecisions.filter(item=>item.short_circuit).length,guard_decisions:guardDecisions,
  b97_b98_materialized:false,overlays_must_remain_active:true,post_b96_pages_validation_ready:true,
  canonical_write_performed:false,overlay_retirement_authorized:false
};
writeFileSync(join(dist,'persistent-b96-audit.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.12 — post-B96 persistence audit','',
  `Generated: ${output.generated_at}`,
  `Mode: **${mode}**`,
  `Status: **PASS**`,'',
  `- B96 file SHA-256: \`${output.candidate_file_sha256}\``,
  `- B96 resulting canonical SHA-256: \`${output.resulting_canonical_sha256}\``,
  `- Stage A operations: **${output.operation_count}**`,
  `- Reviewed source appends: **${output.source_append_count}**`,
  `- Reviewed residual signatures after B96: **${output.residual_signature_count}**`,
  `- Residual factual leaf mutations: **${output.residual_factual_leaf_mutations}**`,
  `- Unexpected residual modules: **${unexpected.length}**`,
  `- Runtime guard short-circuits at B96: **${output.guard_short_circuit_count}/3**`,'',
  'B96 is factual/source Stage A only. The three legacy factual overlays must remain active until B97/B98 are persistently materialized and the later zero-mutation + semantic-parity gates pass.'
].join('\n');
writeFileSync(join(dist,'persistent-b96-audit.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`persistent_b96_audit=pass\npersistent_b96_mode=${mode==='PERSISTENT_POST_APPEND'?'persistent':'simulated-pre-append'}\npersistent_b96_candidate_run=${b96}\npersistent_b96_candidate_file_sha=${authorization.exact_candidate_file_sha256}\npersistent_b96_result_sha=${authorization.expected_resulting_canonical_sha256}\npersistent_b96_ops=${operations.length}\npersistent_b96_sources=${(b96Patch.sources||[]).length}\npersistent_b96_residual_signatures=${totalSignatures}\npersistent_b96_residual_factual_leafs=${totalFactualLeafs}\npersistent_b96_unexpected_residual_modules=${unexpected.length}\npersistent_b96_guard_short_circuits=0\npersistent_b96_b97_b98_materialized=0\npersistent_b96_overlays_must_remain_active=1\npersistent_b96_pages_validation_ready=1\npersistent_b96_canonical_writes=0\n`,'utf8');
console.log(`Persistent B96 audit PASS: mode=${mode}; ops=${operations.length}; sources=${(b96Patch.sources||[]).length}; residual-signatures=${totalSignatures}; guard-short-circuits=0`);
