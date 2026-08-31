import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`READONLY_WORKFLOW_REMOVAL: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const readJson=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const policy=readJson(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`);
const authText=read(`${root}/V4552_READONLY_WORKFLOW_REMOVAL_AUTHORIZATION.json`);
const auth=JSON.parse(authText);
const authAuditText=read(`${root}/audit-readonly-workflow-removal-authorization.mjs`);
const classificationText=read(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`);
const classification=JSON.parse(classificationText);
const classificationAuditText=read(`${root}/audit-readonly-migration-workflow-disposition.mjs`);

if(policy.schema_version!=='engineer-osint-readonly-workflow-removal-v1')fail('schema drift');
if(policy.status!=='AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED')fail('status drift');
if(policy.reviewed_authorization_main_sha!=='2f3afc8d44e949ef115a2e7ce0d13746355ba5e2')fail('reviewed authorization main SHA drift');
if(gitBlobSha(authText)!==policy.authorization_policy_git_blob_sha)fail('v4.5.52 authorization policy blob drift');
if(gitBlobSha(authAuditText)!==policy.authorization_audit_git_blob_sha)fail('v4.5.52 authorization audit blob drift');
if(gitBlobSha(classificationText)!==policy.classification_policy_git_blob_sha)fail('v4.5.51 classification policy blob drift');
if(gitBlobSha(classificationAuditText)!==policy.classification_audit_git_blob_sha)fail('v4.5.51 classification audit blob drift');
if(auth.status!=='AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOW_REMOVAL'||auth.authorization?.exact_all_seven_workflow_deletion_authorized!==true||auth.application_contract?.this_slice_performs_deletion!==false)fail('v4.5.52 exact authorization invalid');
if(classification.status!=='SEVEN_SAFE_REMOVAL_CANDIDATES_NO_REMOVAL_AUTHORIZED')fail('v4.5.51 classification history drift');

const targets=policy.removed_targets||[];
const active=policy.required_remaining_workflows?.ACTIVE_PRODUCTION_PROTECTION||[];
const historical=policy.required_remaining_workflows?.HISTORICAL_EVIDENCE_KEEP||[];
if(targets.length!==7||active.length!==5||historical.length!==2)fail('7/5/2 removal taxonomy drift');
const authTargets=(auth.targets||[]).map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0]));
const removedTargets=targets.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0]));
if(JSON.stringify(authTargets)!==JSON.stringify(removedTargets))fail('removed target set differs from exact authorization');
const classTargets=(classification.candidates||[]).map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0]));
if(JSON.stringify(classTargets)!==JSON.stringify(removedTargets))fail('removed target set differs from exact v4.5.51 classification');

for(const target of targets)if(existsSync(`${workflowsDir}/${target.file}`))fail(`authorized target still present: ${target.file}`);
const actualFiles=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
const expectedRemaining=[...active,...historical].map(x=>x.file).sort();
if(actualFiles.length!==7||JSON.stringify(actualFiles)!==JSON.stringify(expectedRemaining))fail(`post-removal workflow inventory mismatch actual=${actualFiles.length}`);
for(const item of [...active,...historical]){
  const path=`${workflowsDir}/${item.file}`;
  if(!existsSync(path))fail(`required workflow missing: ${item.file}`);
  if(gitBlobSha(read(path))!==item.git_blob_sha)fail(`required workflow blob drift: ${item.file}`);
}

const manifestText=read(`${root}/data/run-store-manifest.json`);
const runtimeText=read(`${root}/runtime-modules.mjs`);
const unchanged=policy.required_unchanged_state||{};
if(gitBlobSha(manifestText)!==unchanged.run_store_manifest_git_blob_sha)fail('run-store manifest blob drift');
if(gitBlobSha(runtimeText)!==unchanged.runtime_modules_git_blob_sha)fail('runtime modules blob drift');
if(!/export const LEGACY_FACTUAL_OVERLAY_MODULES=\[\];/.test(runtimeText))fail('active legacy factual overlay count no longer zero');
const baseline=readJson(`${root}/legacy-runtime-overlay-baseline.json`);
if(Object.keys(baseline.modules||{}).length!==0)fail('legacy baseline module count no longer zero');

const manifest=JSON.parse(manifestText),runs=manifest.runs||[];
const b99Indexes=runs.map((x,i)=>x.run_id===unchanged.b99_run_id?i:-1).filter(i=>i>=0);
if(b99Indexes.length!==1)fail('B99 anchor not unique');
const b99=runs[b99Indexes[0]];
if(b99.file_sha256!==unchanged.b99_file_sha256||b99.canonical_sha256!==unchanged.b99_canonical_sha256)fail('B99 manifest hashes drift');
if(sha256(read(`${root}/${b99.path}`))!==unchanged.b99_file_sha256)fail('B99 raw file hash drift');
if(runs.length-1<b99Indexes[0])fail('current canonical lineage predates B99');

const identityRegression=read(`${workflowsDir}/identity-fix-retirement-regression.yml`);
if(!identityRegression.includes(unchanged.retired_browser_dom_sha256))fail('browser retirement digest protection missing');
const result=policy.removal_result||{};
if(result.workflow_count_before!==14||result.workflow_count_after!==7||result.deleted_workflow_count!==7||result.active_production_protection_count!==5||result.historical_evidence_keep_count!==2||result.remaining_migration_ci_debt_candidate_count!==0||result.remaining_write_capable_migration_one_shot_count!==0)fail('declared removal result drift');
for(const key of ['partial_subset_removed','other_workflow_deleted','other_workflow_edited','active_protection_edited','historical_evidence_workflow_edited','historical_evidence_trigger_deactivated','v4551_policy_or_audit_edited','v4552_policy_or_audit_edited','canonical_data_edited','run_store_manifest_edited','run_appended','runtime_module_edited','manual_hash_edit'])if(result[key]!==false)fail(`removal scope broadened: ${key}`);
for(const [key,value] of Object.entries(policy.production_contract||{}))if(value!==true)fail(`production contract not retained: ${key}`);

console.log(`READONLY_WORKFLOW_REMOVAL=PASS removed=7 workflows=7 active=5 historical=2 migration-debt=0 write-one-shots=0 b99=${b99.run_id} overlays=0 baseline=0`);
