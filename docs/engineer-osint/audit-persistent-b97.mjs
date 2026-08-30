import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validateIntelligenceExtensionV1} from './lib/run-store.mjs';
import {resolvePinnedMultimediaStatus,validateMediaSweepExceptionRegistry} from './lib/media-sweep-exceptions.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const simulate=process.argv.includes('--simulate-from-candidate');
const read=(path,label=path)=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:label});
const policy=read('V4517_B97_READINESS.json','B97 readiness policy');
const candidateRaw=readFileSync(join(src,'V4517_B97_PATCH_CANDIDATE.json'),'utf8');
const candidate=parseJsonStrict(candidateRaw,{source:'exact B97 candidate'});
const baseline=read('V4512_POST_B96_RESIDUAL_BASELINE.json','B96 residual baseline');
const b96Auth=read('V4511_B96_APPEND_AUTHORIZATION.json','B96 authorization');
const registry=validateMediaSweepExceptionRegistry(read('media-sweep-status-exceptions.json','media exception registry'));
const store=loadCanonicalRunStore({root:src});
const fail=message=>{throw new Error(`PERSISTENT_B97: ${message}`)};
const b96='engineer-osint-20260829-B96',b97='engineer-osint-20260830-B97';
const b96Sha='4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5';
const b97FileSha='b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';

if(policy.candidate_run_id!==b97||policy.expected_parent_run_id!==b96||policy.expected_parent_canonical_sha256!==b96Sha||policy.exact_candidate_file_sha256!==b97FileSha||policy.expected_resulting_canonical_sha256!==b97Sha)fail('readiness policy identity/hash drift');
if(sha256Text(candidateRaw)!==b97FileSha)fail('candidate file SHA drift');
validateIntelligenceExtensionV1(candidate);

let mode,data,manifestEntry,repositoryRaw;
if(simulate){
  if(store.report.current_run_id!==b96||store.report.canonical_sha256!==b96Sha)fail(`simulation requires persistent B96, got ${store.report.current_run_id}`);
  data=applyStrictPatchToCanonicalData(structuredClone(store.data),candidate);
  mode='SIMULATED_PRE_APPEND_READINESS';
  manifestEntry={run_id:b97,parent_run_id:b96,parent_canonical_sha256:b96Sha,path:'data/runs/engineer-osint-20260830-B97.json',file_sha256:b97FileSha,canonical_sha256:b97Sha};
  repositoryRaw=candidateRaw;
}else{
  if(store.report.current_run_id!==b97||store.report.canonical_sha256!==b97Sha)fail(`persistent audit requires exact B97 tip, got ${store.report.current_run_id}`);
  const manifest=read('data/run-store-manifest.json','run-store manifest');
  manifestEntry=manifest.runs.find(entry=>entry.run_id===b97);
  if(!manifestEntry||manifestEntry.parent_run_id!==b96||manifestEntry.parent_canonical_sha256!==b96Sha||manifestEntry.file_sha256!==b97FileSha||manifestEntry.canonical_sha256!==b97Sha)fail('persistent manifest entry drift');
  repositoryRaw=readFileSync(join(src,manifestEntry.path),'utf8');
  if(sha256Text(repositoryRaw)!==b97FileSha||JSON.stringify(parseJsonStrict(repositoryRaw,{source:'persistent B97 run'}))!==JSON.stringify(candidate))fail('persistent B97 bytes differ from reviewed candidate');
  data=store.data;
  mode='PERSISTENT_POST_APPEND';
}

if(data.state_latest?.run_id!==b97)fail('materialized state_latest is not B97');
const gaps=Array.isArray(data.intelligence_gaps?.gaps)?data.intelligence_gaps.gaps:[];
const expectedGapIds=Array.from({length:15},(_,index)=>`ENG-GAP-B97-OVL-${String(index+1).padStart(3,'0')}`);
for(const id of expectedGapIds)if(!gaps.some(gap=>(gap?.gap_id||gap?.id)===id))fail(`native gap missing ${id}`);
const assessments=Array.isArray(data.intelligence_assessments?.assessments)?data.intelligence_assessments.assessments:[];
const b98Assessments=assessments.filter(item=>String(item?.assessment_id||item?.id||'').startsWith('ENG-ASMT-B98-OVL-'));
if(b98Assessments.length)fail('B98 assessment materialized before Stage C');

const exception=registry.exceptions.find(item=>item.run_id===b97);
if(!exception)fail('B97 media attestation missing');
const reportSnapshotRaw=readFileSync(join(src,exception.report_snapshot_path),'utf8');
const mediaResolution=resolvePinnedMultimediaStatus({patch:candidate,manifestEntry,repositoryFileRaw:repositoryRaw,reportSnapshotRaw,registry});
if(mediaResolution.status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION'||mediaResolution.exception_id!=='MEDIA-SWEEP-ATTEST-B97-INTELLIGENCE-MIGRATION')fail('B97 media attestation resolution mismatch');

const logical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const obj=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const residualSignature=(change,before,after)=>{const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);if(!match)return `UNSCOPED|${change.path}`;const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'',beforeItem=obj(before,top,raw,index),afterItem=obj(after,top,raw,index),field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');return `${logical[raw]||raw}|${itemId(afterItem)||itemId(beforeItem)||'UNKNOWN'}|${field}`;};
let runtime=structuredClone(data);const modules=[],unexpected=[];
for(const module of b96Auth.scope_modules){
  const expected=baseline.modules?.[module];if(!expected)fail(`missing residual baseline for ${module}`);
  const before=structuredClone(runtime),after=structuredClone(runtime);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const factual=deepDiff(before,after).filter(change=>change.path!=='rich_backfill_meta'&&!change.path.startsWith('rich_backfill_meta.'));
  const signatures=[...new Set(factual.map(change=>residualSignature(change,before,after)))].sort(),expectedSignatures=[...expected.residual_signatures].sort();
  const added=signatures.filter(signature=>!expectedSignatures.includes(signature)),missing=expectedSignatures.filter(signature=>!signatures.includes(signature));
  if(signatures.length!==expected.residual_signature_count||factual.length!==expected.residual_factual_leaf_mutations||added.length||missing.length)unexpected.push({module,added,missing});
  modules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length});runtime=after;
}
const residualSignatures=modules.reduce((sum,item)=>sum+item.residual_signature_count,0),residualLeaves=modules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
if(residualSignatures!==61||residualLeaves!==81||unexpected.length)fail(`residual debt drift ${residualSignatures}/${residualLeaves}; unexpected=${unexpected.length}`);

const ctx=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(data)},console});
vm.runInContext(readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8'),ctx,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const guard=ctx.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;if(!guard?.shouldShortCircuit)fail('runtime guard API missing');
const guardDecisions=b96Auth.scope_modules.map(module=>({module,short_circuit:Boolean(guard.shouldShortCircuit(module,ctx.window.__ENGINEER_DATA__))}));
const guardShortCircuits=guardDecisions.filter(item=>item.short_circuit).length;
if(guardShortCircuits!==0)fail(`runtime guard short-circuit drift ${guardShortCircuits}/3 before B98`);

const output={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-persistent-b97-audit-v1',mode,
  persistent_tip:store.report.current_run_id,candidate_run_id:b97,parent_run_id:b96,candidate_file_sha256:b97FileSha,resulting_canonical_sha256:b97Sha,
  native_gap_count:15,b98_assessment_count:0,residual_signature_count:residualSignatures,residual_factual_leaf_mutations:residualLeaves,
  unexpected_residual_modules:unexpected,guard_short_circuit_count:guardShortCircuits,guard_decisions:guardDecisions,
  multimedia_status:mediaResolution.status,multimedia_exception_id:mediaResolution.exception_id,b98_materialized:false,overlays_must_remain_active:true,
  post_b97_pages_validation_ready:true,canonical_write_performed:false
};
writeFileSync(join(dist,'persistent-b97-audit.json'),JSON.stringify(output,null,2)+'\n');
writeFileSync(join(dist,'persistent-b97-audit.md'),`# ENGINEER OSINT v4.5.18 — persistent B97 audit\n\nStatus: **PASS**\nMode: **${mode}**\n\n- B97 candidate SHA: \`${b97FileSha}\`\n- B97 canonical SHA: \`${b97Sha}\`\n- Native gaps: **15**\n- B98 assessments present: **0**\n- Residual signatures / leaves: **${residualSignatures} / ${residualLeaves}**\n- Runtime guard short-circuits: **${guardShortCircuits}/3**\n- Media status: **${mediaResolution.status}**\n\nLegacy overlays remain active until B98 and a separate retirement decision.\n`);
appendFileSync(join(dist,'health.txt'),`persistent_b97_audit=pass\npersistent_b97_mode=${mode==='PERSISTENT_POST_APPEND'?'persistent':'simulated-pre-append'}\npersistent_b97_candidate_run=${b97}\npersistent_b97_parent_run=${b96}\npersistent_b97_candidate_file_sha=${b97FileSha}\npersistent_b97_result_sha=${b97Sha}\npersistent_b97_native_gaps=15\npersistent_b97_b98_assessments=0\npersistent_b97_residual_signatures=${residualSignatures}\npersistent_b97_residual_factual_leafs=${residualLeaves}\npersistent_b97_unexpected_residual_modules=${unexpected.length}\npersistent_b97_guard_short_circuits=${guardShortCircuits}\npersistent_b97_media_status=${mediaResolution.status}\npersistent_b97_b98_materialized=0\npersistent_b97_overlays_must_remain_active=1\npersistent_b97_pages_validation_ready=1\npersistent_b97_canonical_writes=0\n`);
console.log(`Persistent B97 audit PASS: mode=${mode}; gaps=15; residual=${residualSignatures}/${residualLeaves}; guard=${guardShortCircuits}/3; media=${mediaResolution.status}`);
