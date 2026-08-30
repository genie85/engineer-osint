import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validateIntelligenceExtensionV1} from './lib/run-store.mjs';
import {resolvePinnedMultimediaStatus,validateMediaSweepExceptionRegistry} from './lib/media-sweep-exceptions.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const simulate=process.argv.includes('--simulate-from-generated');
const read=(path,label=path)=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:label});
const policy=read('V4525_B98_POST_CI_READINESS.json','B98 post-CI readiness policy');
const baseline=read('V4512_POST_B96_RESIDUAL_BASELINE.json','B96 residual baseline');
const b96Auth=read('V4511_B96_APPEND_AUTHORIZATION.json','B96 authorization');
const registry=validateMediaSweepExceptionRegistry(read('media-sweep-status-exceptions.json','media exception registry'));
const store=loadCanonicalRunStore({root:src});
const fail=message=>{throw new Error(`PERSISTENT_B98: ${message}`)};
const b97='engineer-osint-20260830-B97',b98='engineer-osint-20260830-B98';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';
const b98FileSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const b98Sha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';

if(policy.schema_version!=='engineer-osint-b98-post-ci-readiness-v1'||policy.candidate_run_id!==b98||policy.expected_parent_run_id!==b97||policy.expected_parent_canonical_sha256!==b97Sha||policy.exact_candidate_file_sha256!==b98FileSha||policy.expected_resulting_canonical_sha256!==b98Sha)fail('policy identity/hash drift');
if(policy.authorization?.append_allowed!==false||policy.authorization?.standard_append_run_write_allowed!==false||policy.authorization?.allow_overlay_retirement!==false||policy.authorization?.allow_identity_fix_migration!==false)fail('authorization unexpectedly broadened');

let candidateRaw,candidate,data,manifestEntry,repositoryRaw,mode;
if(simulate){
  if(store.report.current_run_id!==b97||store.report.canonical_sha256!==b97Sha)fail(`simulation requires exact persistent B97, got ${store.report.current_run_id}`);
  candidateRaw=readFileSync(join(dist,'b98-patch-candidate.json'),'utf8');
  if(sha256Text(candidateRaw)!==b98FileSha)fail('generated B98 candidate SHA drift');
  candidate=parseJsonStrict(candidateRaw,{source:'generated exact B98 candidate'});
  validateIntelligenceExtensionV1(candidate);
  data=applyStrictPatchToCanonicalData(structuredClone(store.data),candidate);
  manifestEntry={run_id:b98,parent_run_id:b97,parent_canonical_sha256:b97Sha,path:'data/runs/engineer-osint-20260830-B98.json',file_sha256:b98FileSha,canonical_sha256:b98Sha};
  repositoryRaw=candidateRaw;
  mode='SIMULATED_PRE_APPEND_READINESS';
}else{
  if(store.report.current_run_id!==b98||store.report.canonical_sha256!==b98Sha)fail(`persistent audit requires exact B98 tip, got ${store.report.current_run_id}`);
  const manifest=read('data/run-store-manifest.json','run-store manifest');
  manifestEntry=manifest.runs.find(entry=>entry.run_id===b98);
  if(!manifestEntry||manifestEntry.parent_run_id!==b97||manifestEntry.parent_canonical_sha256!==b97Sha||manifestEntry.file_sha256!==b98FileSha||manifestEntry.canonical_sha256!==b98Sha)fail('persistent B98 manifest entry drift');
  repositoryRaw=readFileSync(join(src,manifestEntry.path),'utf8');
  if(sha256Text(repositoryRaw)!==b98FileSha)fail('persistent B98 file SHA drift');
  candidate=parseJsonStrict(repositoryRaw,{source:'persistent exact B98 run'});
  validateIntelligenceExtensionV1(candidate);
  data=store.data;
  mode='PERSISTENT_POST_APPEND';
}

if(candidate.state?.run_id!==b98||candidate.state?.parent_run_id!==b97)fail('candidate lineage drift');
if(candidate.evidence?.length!==policy.expected_evidence_count)fail(`candidate evidence drift ${candidate.evidence?.length||0}`);
const intel=candidate.extensions?.intelligence_v1;
if(!intel||intel.assessments?.length!==policy.expected_assessment_count||intel.gaps?.length!==0||intel.contradictions?.length!==0)fail('candidate Intelligence scope drift');
if(candidate.extensions?.operations_v1!==undefined)fail('B98 unexpectedly contains factual operations');
if(candidate.continuity?.overlay_retirement_authorized!==false)fail('B98 candidate authorizes overlay retirement');
if(data.state_latest?.run_id!==b98)fail('materialized state_latest is not B98');

const gaps=Array.isArray(data.intelligence_gaps?.gaps)?data.intelligence_gaps.gaps:[];
const expectedGapIds=Array.from({length:15},(_,index)=>`ENG-GAP-B97-OVL-${String(index+1).padStart(3,'0')}`);
for(const id of expectedGapIds)if(!gaps.some(item=>(item?.gap_id||item?.id)===id))fail(`persistent B97 gap missing after B98 ${id}`);
const assessments=Array.isArray(data.intelligence_assessments?.assessments)?data.intelligence_assessments.assessments:Array.isArray(data.assessments?.assessments)?data.assessments.assessments:[];
const expectedAssessmentIds=Array.from({length:4},(_,index)=>`ENG-ASMT-B98-OVL-${String(index+1).padStart(3,'0')}`);
for(const id of expectedAssessmentIds)if(!assessments.some(item=>(item?.assessment_id||item?.id)===id))fail(`native B98 assessment missing ${id}`);
const evidenceBase=data.evidence?.evidence||data.evidence_registry?.evidence||data.evidence||[];
const evidenceArray=Array.isArray(evidenceBase)?evidenceBase:[];
for(const item of candidate.evidence)if(!evidenceArray.some(actual=>(actual?.evidence_id||actual?.id)===(item.evidence_id||item.id)))fail(`native B98 evidence missing ${item.evidence_id||item.id}`);

const exception=registry.exceptions.find(item=>item.run_id===b98);
if(!exception)fail('B98 media attestation missing');
const reportSnapshotRaw=readFileSync(join(src,exception.report_snapshot_path),'utf8');
const mediaResolution=resolvePinnedMultimediaStatus({patch:candidate,manifestEntry,repositoryFileRaw:repositoryRaw,reportSnapshotRaw,registry});
if(mediaResolution.status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION'||mediaResolution.exception_id!=='MEDIA-SWEEP-ATTEST-B98-INTELLIGENCE-MIGRATION')fail('B98 media attestation resolution mismatch');

const logical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const obj=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const residualSignature=(change,before,after)=>{const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);if(!match)return `UNSCOPED|${change.path}`;const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'',beforeItem=obj(before,top,raw,index),afterItem=obj(after,top,raw,index),field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');return `${logical[raw]||raw}|${itemId(afterItem)||itemId(beforeItem)||'UNKNOWN'}|${field}`;};
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
let unguarded=structuredClone(data);const residualModules=[],unexpected=[];
for(const module of b96Auth.scope_modules){
  const expected=baseline.modules?.[module];if(!expected)fail(`missing residual baseline for ${module}`);
  const before=structuredClone(unguarded),after=structuredClone(unguarded);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const factual=deepDiff(before,after).filter(change=>!isOverlayMeta(change.path));
  const signatures=[...new Set(factual.map(change=>residualSignature(change,before,after)))].sort(),expectedSignatures=[...expected.residual_signatures].sort();
  const added=signatures.filter(signature=>!expectedSignatures.includes(signature)),missing=expectedSignatures.filter(signature=>!signatures.includes(signature));
  if(signatures.length!==expected.residual_signature_count||factual.length!==expected.residual_factual_leaf_mutations||added.length||missing.length)unexpected.push({module,added,missing});
  residualModules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length});
  unguarded=after;
}
const residualSignatures=residualModules.reduce((sum,item)=>sum+item.residual_signature_count,0),residualLeaves=residualModules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
if(residualSignatures!==policy.expected_unguarded_residual_signatures||residualLeaves!==policy.expected_unguarded_residual_factual_leaf_mutations||unexpected.length)fail(`unguarded residual debt drift ${residualSignatures}/${residualLeaves}; unexpected=${unexpected.length}`);

const guardText=readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8');
const ctx=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(data)},console});
vm.runInContext(guardText,ctx,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const guard=ctx.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;if(!guard?.shouldShortCircuit)fail('runtime guard API missing');
const guardDecisions=b96Auth.scope_modules.map(module=>({module,short_circuit:Boolean(guard.shouldShortCircuit(module,ctx.window.__ENGINEER_DATA__))}));
const guardShortCircuits=guardDecisions.filter(item=>item.short_circuit).length;
if(guardShortCircuits!==policy.expected_guard_short_circuits_after)fail(`runtime guard did not transition to 3/3 after B98: ${guardShortCircuits}/3`);

let guarded=structuredClone(data);let guardedMutationCount=0;
for(const module of b96Auth.scope_modules){
  const before=structuredClone(guarded);
  if(!guard.shouldShortCircuit(module,guarded)){
    const context=vm.createContext({window:{__ENGINEER_DATA__:guarded},console});
    vm.runInContext(readFileSync(join(src,module),'utf8'),context,{filename:module,timeout:3000});
    guarded=context.window.__ENGINEER_DATA__;
  }
  guardedMutationCount+=deepDiff(before,guarded).filter(change=>!isOverlayMeta(change.path)).length;
}
if(guardedMutationCount!==0)fail(`guarded B98 overlay path mutated factual state: ${guardedMutationCount}`);

const output={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-persistent-b98-audit-v1',mode,
  persistent_tip:store.report.current_run_id,candidate_run_id:b98,parent_run_id:b97,candidate_file_sha256:b98FileSha,resulting_canonical_sha256:b98Sha,
  persistent_gap_count:15,native_evidence_count:2,native_assessment_count:4,residual_signature_count:residualSignatures,residual_factual_leaf_mutations:residualLeaves,
  unexpected_residual_modules:unexpected,guard_short_circuit_count:guardShortCircuits,guard_decisions:guardDecisions,guarded_factual_mutation_count:guardedMutationCount,
  multimedia_status:mediaResolution.status,multimedia_exception_id:mediaResolution.exception_id,overlays_must_remain_active:true,
  overlay_retirement_authorized:false,identity_fix_migration_authorized:false,post_b98_pages_validation_ready:true,canonical_write_performed:false
};
writeFileSync(join(dist,'persistent-b98-audit.json'),JSON.stringify(output,null,2)+'\n');
writeFileSync(join(dist,'persistent-b98-audit.md'),`# ENGINEER OSINT v4.5.25 — persistent B98 audit\n\nStatus: **PASS**\nMode: **${mode}**\n\n- B98 candidate SHA: \`${b98FileSha}\`\n- B98 canonical SHA: \`${b98Sha}\`\n- Persistent B97 gaps: **15**\n- Native B98 evidence: **2**\n- Native B98 assessments: **4**\n- Unguarded residual signatures / leaves: **${residualSignatures} / ${residualLeaves}**\n- Runtime guard short-circuits: **${guardShortCircuits}/3**\n- Guarded factual mutations: **${guardedMutationCount}**\n- Media status: **${mediaResolution.status}**\n\nThe three legacy factual overlays remain present until a separate retirement slice. Identity-fix migration is not authorized.\n`);
appendFileSync(join(dist,'health.txt'),`persistent_b98_audit=pass\npersistent_b98_mode=${mode==='PERSISTENT_POST_APPEND'?'persistent':'simulated-pre-append'}\npersistent_b98_candidate_run=${b98}\npersistent_b98_parent_run=${b97}\npersistent_b98_candidate_file_sha=${b98FileSha}\npersistent_b98_result_sha=${b98Sha}\npersistent_b98_persistent_gaps=15\npersistent_b98_native_evidence=2\npersistent_b98_native_assessments=4\npersistent_b98_residual_signatures=${residualSignatures}\npersistent_b98_residual_factual_leafs=${residualLeaves}\npersistent_b98_unexpected_residual_modules=${unexpected.length}\npersistent_b98_guard_short_circuits=${guardShortCircuits}\npersistent_b98_guarded_factual_mutations=${guardedMutationCount}\npersistent_b98_media_status=${mediaResolution.status}\npersistent_b98_overlays_must_remain_active=1\npersistent_b98_overlay_retirement_authorized=0\npersistent_b98_identity_fix_migration_authorized=0\npersistent_b98_pages_validation_ready=1\npersistent_b98_canonical_writes=0\n`);
console.log(`Persistent B98 audit PASS: mode=${mode}; gaps=15; evidence=2; assessments=4; residual=${residualSignatures}/${residualLeaves}; guard=${guardShortCircuits}/3; guarded=${guardedMutationCount}; media=${mediaResolution.status}`);
