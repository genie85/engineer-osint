import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {basename,join} from 'node:path';
import {canonicalDigest,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';

const source='docs/engineer-osint',input=process.argv[2],write=process.argv.includes('--write');
const guardedB96='engineer-osint-20260829-B96',guardedB97='engineer-osint-20260830-B97',guardedB98='engineer-osint-20260830-B98',guardedB99='engineer-osint-20260830-B99';
if(!input)throw new Error('Usage: node docs/engineer-osint/append-run.mjs <fresh-patch.json> [--write]');
const raw=readFileSync(input,'utf8'),patch=parseJsonStrict(raw,{source:input});
validatePatchOperations(patch);
const store=loadCanonicalRunStore({root:source});
if(patch.state.parent_run_id!==store.report.current_run_id)throw new Error(`Stale parent: expected ${store.report.current_run_id}, got ${patch.state.parent_run_id}`);
const result=applyStrictPatchToCanonicalData(store.data,patch),runId=patch.state.run_id;
const normalized=JSON.stringify(patch,null,2)+'\n';
const relative=`data/runs/${runId}.json`,destination=join(source,relative);
if(existsSync(destination))throw new Error(`Append-only run already exists: ${destination}`);
const entry={
  run_id:runId,parent_run_id:store.report.current_run_id,parent_canonical_sha256:store.report.canonical_sha256,
  path:relative,file_sha256:sha256Text(normalized),canonical_sha256:canonicalDigest(result)
};
const manifest={...store.manifest,runs:[...store.manifest.runs,entry]};
const plan={status:write?'APPENDED':'VALIDATED_DRY_RUN',input:basename(input),entry};

if(write&&runId===guardedB96){
  const authorizationPath=join(source,'V4511_B96_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B96 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b96-append-authorization-v1')throw new Error('B96 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B96 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.post_b96_ci_pipeline_ready!==true)throw new Error('B96 append blocked: post-B96 CI pipeline is not ready');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B96 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B96 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B96 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B96 append resulting canonical SHA differs from reviewed authorization');
  if((patch.extensions?.operations_v1||[]).length!==authorization.expected_operation_count)throw new Error('B96 append operation count mismatch');
  if((patch.sources||[]).length!==authorization.expected_source_append_count)throw new Error('B96 append source append count mismatch');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true)throw new Error('B96 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_b97_or_b98_same_slice!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('B96 append authorization scope is unsafe');
}

if(write&&runId===guardedB97){
  const authorizationPath=join(source,'V4518_B97_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B97 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b97-append-authorization-v1')throw new Error('B97 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B97 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.post_b97_ci_pipeline_ready!==true)throw new Error('B97 append blocked: post-B97 CI pipeline is not ready');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B97 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B97 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B97 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B97 append resulting canonical SHA differs from reviewed authorization');
  const intelligence=patch.extensions?.intelligence_v1;
  if(!intelligence||!Array.isArray(intelligence.gaps)||intelligence.gaps.length!==authorization.expected_gap_count)throw new Error('B97 append native gap count mismatch');
  if(!Array.isArray(intelligence.assessments)||intelligence.assessments.length!==authorization.expected_assessment_count||!Array.isArray(intelligence.contradictions)||intelligence.contradictions.length!==authorization.expected_contradiction_count)throw new Error('B97 append Intelligence v1 scope mismatch');
  if(patch.extensions?.operations_v1!==undefined)throw new Error('B97 append may not include factual correction operations');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true)throw new Error('B97 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_b98_same_slice!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('B97 append authorization scope is unsafe');
}

if(write&&runId===guardedB98){
  const authorizationPath=join(source,'V4526_B98_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B98 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b98-append-authorization-v1')throw new Error('B98 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B98 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4525_post_b98_ci_pipeline_ready!==true||authorization.required_preconditions?.pages_post_b98_phase_ready!==true)throw new Error('B98 append blocked: POST_B98 CI/Pages pipeline is not ready');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B98 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B98 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B98 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B98 append resulting canonical SHA differs from reviewed authorization');
  if(!Array.isArray(patch.evidence)||patch.evidence.length!==authorization.expected_candidate_evidence_count)throw new Error('B98 append evidence count mismatch');
  const intelligence=patch.extensions?.intelligence_v1;
  if(!intelligence||!Array.isArray(intelligence.gaps)||intelligence.gaps.length!==authorization.expected_candidate_gap_count)throw new Error('B98 append candidate gap count mismatch');
  if(!Array.isArray(intelligence.assessments)||intelligence.assessments.length!==authorization.expected_candidate_assessment_count||!Array.isArray(intelligence.contradictions)||intelligence.contradictions.length!==authorization.expected_candidate_contradiction_count)throw new Error('B98 append Intelligence v1 scope mismatch');
  if(patch.extensions?.operations_v1!==undefined)throw new Error('B98 append may not include factual correction operations');
  if(patch.continuity?.overlay_retirement_authorized!==false)throw new Error('B98 append candidate may not authorize overlay retirement');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true)throw new Error('B98 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('B98 append authorization scope is unsafe');
}

if(write&&runId===guardedB99){
  const authorizationPath=join(source,'V4539_B99_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B99 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b99-append-authorization-v1')throw new Error('B99 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B99 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4536_exact_candidate_reviewed!==true||authorization.required_preconditions?.v4537_post_b99_lifecycle_ready!==true||authorization.required_preconditions?.v4538_pages_b99_gate_ready!==true||authorization.required_preconditions?.current_main_push_checks_green!==true)throw new Error('B99 append blocked: reviewed candidate/lifecycle/Pages/current-main evidence is incomplete');
  if(authorization.required_preconditions?.identity_fix_runtime_must_remain_active!==true||authorization.required_preconditions?.expected_identity_overlay_residual_after_append!==0)throw new Error('B99 append blocked: identity overlay safety preconditions drifted');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B99 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B99 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B99 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B99 append resulting canonical SHA differs from reviewed authorization');
  const operations=patch.extensions?.operations_v1||[];
  if(operations.length!==authorization.expected_operation_count)throw new Error('B99 append operation count mismatch');
  if(operations.filter(item=>item.op==='REPLACE_FIELD').length!==authorization.expected_replace_field_count)throw new Error('B99 append REPLACE_FIELD count mismatch');
  if(operations.filter(item=>item.op==='REMOVE_FIELD').length!==authorization.expected_remove_field_count)throw new Error('B99 append REMOVE_FIELD count mismatch');
  const mirrorSync=patch.extensions?.legacy_mirror_sync_v1?.updated_records||[];
  if(mirrorSync.length!==authorization.expected_mirror_sync_request_count)throw new Error('B99 append mirror sync request count mismatch');
  if(mirrorSync[0]?.target_id!==authorization.expected_mirror_sync_target_id)throw new Error('B99 append mirror sync target mismatch');
  if(JSON.stringify(mirrorSync[0]?.fields)!==JSON.stringify(authorization.expected_mirror_sync_fields))throw new Error('B99 append mirror sync exact field scope mismatch');
  if(authorization.expected_mirror_sync_fields?.length!==18||authorization.expected_identity_overlay_residual_after_append!==0)throw new Error('B99 append reviewed mirror/residual scope drift');
  if(patch.continuity?.identity_fix_runtime_removal_authorized!==false)throw new Error('B99 append candidate may not authorize identity-fix runtime removal');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true)throw new Error('B99 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_identity_fix_runtime_removal!==false||authorization.authorization?.allow_identity_overlay_retirement!==false||authorization.authorization?.allow_other_runtime_module_removal!==false)throw new Error('B99 append authorization scope is unsafe');
}

if(write){
  const manifestPath=join(source,'data/run-store-manifest.json'),runTemp=`${destination}.tmp`,manifestTemp=`${manifestPath}.tmp`;
  writeFileSync(runTemp,normalized,{encoding:'utf8',flag:'wx'});
  writeFileSync(manifestTemp,JSON.stringify(manifest,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  renameSync(runTemp,destination);
  renameSync(manifestTemp,manifestPath);
  const verified=loadCanonicalRunStore({root:source});
  if(verified.report.current_run_id!==runId||verified.report.canonical_sha256!==entry.canonical_sha256)throw new Error('Post-write run-store verification failed');
}
console.log(JSON.stringify(plan,null,2));
