import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {LEGACY_FACTUAL_OVERLAY_MODULES} from './runtime-modules.mjs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const json=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const policy=json(`${root}/V4555_HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION.json`);
const v4554Text=read(`${root}/V4554_MINIMIZED_WORKFLOW_TRIGGER_COVERAGE.json`);
const v4554=JSON.parse(v4554Text);
if(policy.schema_version!=='engineer-osint-historical-trigger-manual-only-authorization-v1')fail('policy schema drift');
if(policy.status!=='AUTHORIZED_EXACT_TWO_HISTORICAL_WORKFLOWS_MANUAL_ONLY_NEXT_SLICE')fail('policy status drift');
if(policy.reviewed_main_sha!=='fe989b673b069f2d584f9dcdaf2f15fa931995ba')fail('reviewed main SHA drift');
if(gitBlobSha(v4554Text)!==policy.reviewed_v4554_policy_git_blob_sha)fail('v4.5.54 policy blob drift');
if(v4554.status!=='READ_ONLY_TRIGGER_COVERAGE_REVIEW_NO_TRIGGER_CHANGE_AUTHORIZED')fail('v4.5.54 status drift');
if(v4554.coverage_proof?.historical_workflows_required_for_current_pull_request_coverage!==false)fail('v4.5.54 PR coverage proof drift');
if(v4554.coverage_proof?.historical_workflows_required_for_current_main_push_coverage!==false)fail('v4.5.54 push coverage proof drift');

const targets=policy.targets||[];
if(targets.length!==2||new Set(targets.map(x=>x.file)).size!==2)fail('target set is not exactly two unique workflows');
const targetNames=targets.map(x=>x.file).sort();
if(JSON.stringify(targetNames)!==JSON.stringify(['identity-fix-retirement-authorization.yml','identity-fix-retirement-readiness.yml']))fail('target names drift');
const v4554Historical=v4554.historical_evidence_workflows||[];
for(const target of targets){
  const historical=v4554Historical.find(x=>x.file===target.file);
  if(!historical||historical.git_blob_sha!==target.current_git_blob_sha)fail(`v4.5.54 target handoff drift: ${target.file}`);
  if(historical.automatic_current_pr_trigger_disposition!=='REDUNDANT_CANDIDATE_FOR_SEPARATE_MANUAL_ONLY_REVIEW')fail(`target was not classified redundant: ${target.file}`);
  const text=read(`${workflowsDir}/${target.file}`);
  if(gitBlobSha(text)!==target.current_git_blob_sha)fail(`target workflow blob drift: ${target.file}`);
  if(!/workflow_dispatch\s*:/.test(text))fail(`workflow_dispatch missing: ${target.file}`);
  if(!/pull_request\s*:/.test(text))fail(`current pull_request trigger missing before authorized future edit: ${target.file}`);
  if(!/push\s*:/.test(text))fail(`current historical push trigger missing before authorized future edit: ${target.file}`);
  if(!/permissions:\s*\n\s*contents:\s*read\b/.test(text))fail(`read-only permissions drift: ${target.file}`);
  if(!/^jobs:/m.test(text))fail(`jobs block missing: ${target.file}`);
  if(target.authorized_next_state!=='WORKFLOW_DISPATCH_ONLY'||target.file_must_be_retained!==true||target.jobs_and_permissions_must_be_preserved!==true)fail(`target next-state contract drift: ${target.file}`);
}

const active=policy.required_unchanged_active_protections||[];
if(active.length!==5||new Set(active.map(x=>x.file)).size!==5)fail('active protection set drift');
for(const item of active){
  const current=read(`${workflowsDir}/${item.file}`);
  if(gitBlobSha(current)!==item.git_blob_sha)fail(`active protection blob drift: ${item.file}`);
  const prior=v4554.active_production_protections?.find(x=>x.file===item.file);
  if(!prior||prior.git_blob_sha!==item.git_blob_sha)fail(`active protection v4.5.54 handoff drift: ${item.file}`);
}
const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
if(actual.length!==7)fail(`workflow inventory drift actual=${actual.length} expected=7`);
if(JSON.stringify(actual)!==JSON.stringify([...active.map(x=>x.file),...targets.map(x=>x.file)].sort()))fail('seven-workflow inventory names drift');

const coverage=policy.coverage_after_authorized_future_change||{};
if(coverage.workflow_file_count!==7||coverage.active_production_protection_count!==5||coverage.historical_evidence_file_count!==2)fail('future inventory coverage contract drift');
if(coverage.automatic_historical_pull_request_trigger_count!==0||coverage.automatic_historical_push_trigger_count!==0||coverage.manual_historical_workflow_dispatch_count!==2)fail('future historical trigger count contract drift');
if(coverage.broad_active_pull_request_main_docs_workflow_count!==4||coverage.broad_active_push_main_docs_workflow_count!==3)fail('future active broad coverage count drift');
if(coverage.current_pull_request_coverage_preserved_without_historical_automatic_triggers!==true||coverage.current_main_push_coverage_preserved_without_historical_automatic_triggers!==true)fail('future coverage preservation not asserted');

const auth=policy.authorization||{};
for(const key of ['one_execution_slice_only','edit_exact_two_target_workflow_trigger_blocks','remove_pull_request_triggers_from_targets','remove_push_triggers_from_targets','retain_workflow_dispatch_on_targets','retain_target_files'])if(auth[key]!==true)fail(`required authorization missing: ${key}`);
for(const key of ['edit_target_jobs','edit_target_permissions','delete_target_files','edit_any_active_protection','delete_any_active_protection','edit_any_other_workflow','delete_any_other_workflow','canonical_data_edit','run_store_manifest_edit','run_append','runtime_module_edit','historical_policy_or_audit_rewrite','manual_hash_edit'])if(auth[key]!==false)fail(`authorization scope broadened: ${key}`);
if(policy.application_contract?.this_slice_performs_trigger_change!==false)fail('authorization slice performs trigger change');
for(const key of ['next_slice_must_repin_both_target_blobs_before_edit','next_slice_must_prove_only_on_block_changed','next_slice_must_preserve_name_permissions_jobs_byte_semantics','next_slice_must_prove_both_files_remain_present','next_slice_must_prove_workflow_dispatch_only','next_slice_must_run_full_available_pr_ci_before_merge','next_slice_must_validate_post_merge_three_push_workflows_and_pages'])if(policy.application_contract?.[key]!==true)fail(`application contract missing: ${key}`);

const observed=policy.reviewed_v4554_production_evidence||{};
if(observed.v4554_pr_workflows_success!==6||observed.v4554_pr_workflows_failed!==0||observed.v4554_merge_sha!==policy.reviewed_main_sha)fail('v4.5.54 PR/merge evidence drift');
if(observed.v4554_push_workflows_success!==3||observed.v4554_push_workflows_failed!==0)fail('v4.5.54 push evidence drift');
if(observed.pages_run_id!==33446070096||observed.pages_artifact_id!==9778082196||observed.pages_build_version!==policy.reviewed_main_sha)fail('v4.5.54 Pages evidence drift');

const unchanged=policy.required_unchanged_state||{};
if(unchanged.b99_run_id!=='engineer-osint-20260830-B99'||unchanged.b99_file_sha256!=='ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab'||unchanged.b99_canonical_sha256!=='754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30')fail('B99 invariant drift');
const baseline=json(`${root}/legacy-runtime-overlay-baseline.json`);
if(LEGACY_FACTUAL_OVERLAY_MODULES.length!==0||Object.keys(baseline.modules||{}).length!==0)fail('legacy factual overlay debt returned');

console.log('HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION=PASS targets=2 workflows=7 active=5 future-historical-auto-pr=0 future-historical-auto-push=0 future-manual=2 broad-pr-active=4 broad-push-active=3 this-slice-trigger-change=0 next-slice-authorized=1');
