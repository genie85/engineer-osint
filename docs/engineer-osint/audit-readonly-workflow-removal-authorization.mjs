import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`READONLY_WORKFLOW_REMOVAL_AUTHORIZATION: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const readJson=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const policy=readJson(`${root}/V4552_READONLY_WORKFLOW_REMOVAL_AUTHORIZATION.json`);
const v4551Text=read(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`);
const v4551=JSON.parse(v4551Text);
const v4551AuditText=read(`${root}/audit-readonly-migration-workflow-disposition.mjs`);

if(policy.schema_version!=='engineer-osint-readonly-workflow-removal-authorization-v1')fail('schema drift');
if(policy.status!=='AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOW_REMOVAL')fail('status drift');
if(policy.reviewed_main_sha!=='1d7f9a5f7dbf0ada8c09d95fbd8b4d3dca437d07')fail('reviewed main SHA drift');
if(gitBlobSha(v4551Text)!==policy.reviewed_v4551_policy_git_blob_sha)fail('v4.5.51 policy blob drift');
if(gitBlobSha(v4551AuditText)!==policy.reviewed_v4551_audit_git_blob_sha)fail('v4.5.51 audit blob drift');
if(v4551.status!=='SEVEN_SAFE_REMOVAL_CANDIDATES_NO_REMOVAL_AUTHORIZED')fail('v4.5.51 lifecycle state drift');
for(const [key,value] of Object.entries(v4551.authorization||{}))if(value!==false)fail(`v4.5.51 historical no-removal boundary drift: ${key}`);

const targets=policy.targets||[];
const active=policy.required_remaining_workflows?.ACTIVE_PRODUCTION_PROTECTION||[];
const historical=policy.required_remaining_workflows?.HISTORICAL_EVIDENCE_KEEP||[];
if(targets.length!==7||active.length!==5||historical.length!==2)fail('7/5/2 authorization taxonomy drift');
if(new Set(targets.map(x=>x.file)).size!==7)fail('target filenames not unique');
if(new Set([...targets,...active,...historical].map(x=>x.file)).size!==14)fail('authorization inventory not unique');

const v4551Targets=(v4551.candidates||[]).map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0]));
const authorizedTargets=targets.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0]));
if(JSON.stringify(v4551Targets)!==JSON.stringify(authorizedTargets))fail('authorization target set differs from exact v4.5.51 candidate set');
for(const candidate of v4551.candidates||[])if(candidate.disposition!=='SAFE_REMOVAL_CANDIDATE_AFTER_EXACT_AUTHORIZATION')fail(`v4.5.51 target was not classified safe: ${candidate.file}`);

const actualFiles=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
const expectedFiles=[...targets,...active,...historical].map(x=>x.file).sort();
if(actualFiles.length!==14||JSON.stringify(actualFiles)!==JSON.stringify(expectedFiles))fail(`workflow inventory mismatch actual=${actualFiles.length}`);

for(const item of [...targets,...active,...historical]){
  const path=`${workflowsDir}/${item.file}`;
  if(!existsSync(path))fail(`workflow missing before authorization application: ${item.file}`);
  if(gitBlobSha(read(path))!==item.git_blob_sha)fail(`workflow blob drift: ${item.file}`);
}

let readCount=0,writeCount=0,workflowCallCount=0,crossRefs=0,reusableUsesRefs=0;
const targetNames=new Set(targets.map(x=>x.file));
for(const target of targets){
  const text=read(`${workflowsDir}/${target.file}`);
  if(/permissions:\s*\n\s*contents:\s*read\b/.test(text))readCount++;
  if(/contents:\s*write\b/.test(text))writeCount++;
  if(/workflow_call\s*:/.test(text))workflowCallCount++;
}
for(const file of actualFiles){
  const text=read(`${workflowsDir}/${file}`);
  for(const targetName of targetNames){
    if(file!==targetName&&text.includes(targetName))crossRefs++;
    const escaped=targetName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(file!==targetName&&new RegExp(`uses:\\s*\\.?\\/?\\.?\\/?\\.github\\/workflows\\/${escaped}`).test(text))reusableUsesRefs++;
  }
}
if(readCount!==7||writeCount!==0||workflowCallCount!==0||crossRefs!==0||reusableUsesRefs!==0)fail(`dependency/read-only proof failed read=${readCount} write=${writeCount} workflow_call=${workflowCallCount} cross=${crossRefs} uses=${reusableUsesRefs}`);

const proof=policy.dependency_proof||{};
if(proof.workflow_count_before!==14||proof.candidate_count!==7||proof.candidate_contents_read_count!==7||proof.candidate_contents_write_count!==0||proof.candidate_workflow_call_count!==0||proof.cross_workflow_candidate_reference_count!==0)fail('declared dependency proof drift');
if(proof.expected_workflow_count_after_exact_removal!==7||proof.expected_active_production_protection_count_after!==5||proof.expected_historical_evidence_keep_count_after!==2||proof.expected_remaining_migration_ci_debt_candidate_count_after!==0||proof.expected_write_capable_migration_one_shot_count_after!==0)fail('declared post-removal inventory drift');

const unchanged=policy.required_unchanged_state||{};
const manifestText=read(`${root}/data/run-store-manifest.json`);
if(gitBlobSha(manifestText)!==unchanged.run_store_manifest_git_blob_sha)fail('run-store manifest blob drift');
const runtimeText=read(`${root}/runtime-modules.mjs`);
if(gitBlobSha(runtimeText)!==unchanged.runtime_modules_git_blob_sha)fail('runtime modules blob drift');
if(!/export const LEGACY_FACTUAL_OVERLAY_MODULES=\[\];/.test(runtimeText))fail('legacy factual runtime overlay count no longer zero');
const baseline=readJson(`${root}/legacy-runtime-overlay-baseline.json`);
if(Object.keys(baseline.modules||{}).length!==0)fail('legacy baseline modules no longer zero');
if(unchanged.active_legacy_factual_overlay_count!==0||unchanged.active_legacy_baseline_module_count!==0)fail('policy zero-overlay invariant drift');

const manifest=JSON.parse(manifestText),runs=manifest.runs||[];
const b99Index=runs.findIndex(x=>x.run_id===unchanged.b99_run_id);
if(b99Index<0||b99Index!==runs.findLastIndex(x=>x.run_id===unchanged.b99_run_id))fail('unique B99 anchor missing');
const b99=runs[b99Index];
if(b99.file_sha256!==unchanged.b99_file_sha256||b99.canonical_sha256!==unchanged.b99_canonical_sha256)fail('B99 manifest hash drift');
if(sha256(read(`${root}/${b99.path}`))!==unchanged.b99_file_sha256)fail('B99 raw file hash drift');
if(runs.length-1<b99Index)fail('current canonical lineage predates B99');
const identityRegression=read(`${workflowsDir}/identity-fix-retirement-regression.yml`);
if(!identityRegression.includes(unchanged.retired_browser_dom_sha256))fail('retired browser digest protection drift');

const auth=policy.authorization||{};
if(auth.exact_all_seven_workflow_deletion_authorized!==true)fail('exact seven deletion is not authorized');
for(const key of [
  'partial_subset_deletion_authorized','candidate_workflow_edit_authorized','other_workflow_deletion_authorized','other_workflow_edit_authorized',
  'active_protection_change_authorized','historical_evidence_workflow_change_authorized','historical_evidence_trigger_deactivation_authorized',
  'v4551_policy_edit_or_delete_authorized','v4551_audit_edit_or_delete_authorized','canonical_data_edit_authorized','run_store_edit_authorized',
  'run_append_authorized','runtime_edit_authorized','manual_hash_edit_authorized'
])if(auth[key]!==false)fail(`authorization broadened: ${key}`);

const application=policy.application_contract||{};
if(application.this_slice_performs_deletion!==false)fail('authorization slice incorrectly claims deletion');
for(const key of [
  'next_slice_must_delete_exactly_all_seven_targets','next_slice_must_revalidate_target_blobs_before_deletion',
  'next_slice_must_preserve_exactly_five_active_protections','next_slice_must_preserve_exactly_two_historical_evidence_workflows',
  'next_slice_must_preserve_b99_hashes','next_slice_must_preserve_run_store_and_runtime_blobs','next_slice_must_add_post_removal_fail_closed_audit'
])if(application[key]!==true)fail(`application guard missing: ${key}`);
if(application.expected_post_removal_workflow_count!==7)fail('application post-removal count drift');

console.log(`READONLY_WORKFLOW_REMOVAL_AUTHORIZATION=PASS targets=7 workflows=14 after=7 active=5 historical=2 read=${readCount} write=${writeCount} workflow-call=${workflowCallCount} cross-refs=${crossRefs} authorization=exact-all-seven-only b99=${b99.run_id}`);
