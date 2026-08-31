import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {LEGACY_FACTUAL_OVERLAY_MODULES} from './runtime-modules.mjs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`ONE_SHOT_WORKFLOW_REMOVAL: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const readJson=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const policy=readJson(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`);
const authText=read(`${root}/V4549_ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION.json`);
const auth=JSON.parse(authText);
const classificationText=read(`${root}/V4548_MIGRATION_WORKFLOW_CLASSIFICATION.json`);
const classification=JSON.parse(classificationText);

if(policy.schema_version!=='engineer-osint-one-shot-workflow-removal-v1'||policy.status!=='AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED')fail('removal policy schema/status drift');
if(policy.reviewed_authorization_main_sha!=='3433ec2c636ebb1c87a04ff34d9c7cbc2af4cb79')fail('reviewed authorization main SHA drift');
if(gitBlobSha(authText)!==policy.authorization_policy_git_blob_sha)fail('v4.5.49 authorization policy blob drift');
if(gitBlobSha(classificationText)!==policy.classification_policy_git_blob_sha)fail('v4.5.48 classification policy blob drift');
if(auth.status!=='READY_FOR_EXACT_FOUR_ONE_SHOT_REMOVAL_SLICE'||auth.authorization?.one_removal_slice_only!==true||auth.authorization?.allow_delete_exact_four_one_shot_workflows!==true)fail('v4.5.49 exact deletion authorization missing');
for(const key of ['allow_edit_target_workflows_before_deletion','allow_delete_any_other_workflow','allow_edit_any_other_workflow','allow_deactivate_historical_evidence_workflows','allow_edit_active_production_protection_workflows','allow_canonical_data_edit','allow_run_store_manifest_edit','allow_run_append','allow_runtime_module_edit','allow_historical_policy_or_audit_rewrite','allow_manual_hash_edit'])if(auth.authorization?.[key]!==false)fail(`v4.5.49 authorization scope broadened: ${key}`);

for(const item of policy.historical_audits_retained||[]){
  const path=`${root}/${item.file}`;
  if(!existsSync(path)||gitBlobSha(read(path))!==item.git_blob_sha)fail(`historical audit changed: ${item.file}`);
}

const expectedTargets=['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml'];
const removed=(policy.removed_targets||[]).map(x=>x.file).sort();
if(JSON.stringify(removed)!==JSON.stringify([...expectedTargets].sort()))fail(`removed target scope drift: ${removed.join(',')}`);
for(const item of policy.removed_targets){
  if(existsSync(`${workflowsDir}/${item.file}`))fail(`authorized target still present: ${item.file}`);
  const authTarget=auth.targets?.find(x=>x.file===item.file);
  const classified=classification.workflows?.find(x=>x.file===item.file);
  if(!authTarget||authTarget.git_blob_sha!==item.git_blob_sha||authTarget.historical_run_id!==item.historical_run_id||authTarget.run_file_sha256!==item.run_file_sha256||authTarget.canonical_sha256!==item.canonical_sha256)fail(`authorization handoff drift: ${item.file}`);
  if(!classified||classified.git_blob_sha!==item.git_blob_sha||classified.classification!=='REMOVABLE_CI_DEBT_CANDIDATE'||classified.write_capable!==true)fail(`classification handoff drift: ${item.file}`);
}

const groups=policy.required_remaining_workflows||{};
const expectedRemaining=Object.values(groups).flat();
if(expectedRemaining.length!==14||new Set(expectedRemaining.map(x=>x.file)).size!==14)fail('expected remaining workflow set is not exactly 14 unique files');
const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
const expectedNames=expectedRemaining.map(x=>x.file).sort();
if(JSON.stringify(actual)!==JSON.stringify(expectedNames))fail(`post-removal workflow inventory drift actual=${actual.length} expected=${expectedNames.length}`);
for(const item of expectedRemaining){
  const path=`${workflowsDir}/${item.file}`;
  if(gitBlobSha(read(path))!==item.git_blob_sha)fail(`non-target workflow blob drift: ${item.file}`);
}
if((groups.ACTIVE_PRODUCTION_PROTECTION||[]).length!==5||(groups.HISTORICAL_EVIDENCE_KEEP||[]).length!==2||(groups.REMAINING_REMOVABLE_CI_DEBT_CANDIDATE||[]).length!==7)fail('post-removal 5/2/7 taxonomy drift');

const manifestText=read(`${root}/data/run-store-manifest.json`);
if(gitBlobSha(manifestText)!==policy.required_unchanged_data.run_store_manifest_git_blob_sha)fail('run-store manifest edited');
const runtimeText=read(`${root}/runtime-modules.mjs`);
if(gitBlobSha(runtimeText)!==policy.required_unchanged_data.runtime_modules_git_blob_sha)fail('runtime module manifest edited');
const baseline=readJson(`${root}/legacy-runtime-overlay-baseline.json`);
if(LEGACY_FACTUAL_OVERLAY_MODULES.length!==policy.required_unchanged_data.active_legacy_factual_overlay_count)fail('active legacy factual overlay count drift');
if(Object.keys(baseline.modules||{}).length!==policy.required_unchanged_data.active_legacy_baseline_module_count)fail('active legacy baseline module count drift');

const manifest=JSON.parse(manifestText);
let previous=null;
for(const target of policy.removed_targets){
  const matches=(manifest.runs||[]).filter(x=>x.run_id===target.historical_run_id);
  if(matches.length!==1)fail(`historical run anchor uniqueness drift: ${target.historical_run_id}`);
  const entry=matches[0];
  if(entry.file_sha256!==target.run_file_sha256||entry.canonical_sha256!==target.canonical_sha256)fail(`historical run manifest hash drift: ${target.historical_run_id}`);
  if(sha256(read(`${root}/${entry.path}`))!==target.run_file_sha256)fail(`historical run raw hash drift: ${target.historical_run_id}`);
  if(previous&&entry.parent_run_id!==previous.historical_run_id)fail(`historical parent run drift: ${target.historical_run_id}`);
  if(previous&&entry.parent_canonical_sha256!==previous.canonical_sha256)fail(`historical parent canonical drift: ${target.historical_run_id}`);
  previous=target;
}

const result=policy.removal_result||{};
if(result.workflow_count_before!==18||result.workflow_count_after!==14||result.deleted_workflow_count!==4||result.remaining_repository_write_capable_migration_one_shots!==0||result.active_production_protection_count!==5||result.historical_evidence_keep_count!==2||result.remaining_removable_ci_debt_candidate_count!==7)fail('removal result count contract drift');
for(const key of ['other_workflow_deleted','other_workflow_edited','historical_policy_edited','historical_audit_edited','canonical_data_edited','run_store_manifest_edited','run_appended','runtime_module_edited','manual_hash_edit'])if(result[key]!==false)fail(`removal safety boundary broadened: ${key}`);
const next=policy.required_next_slice||{};
if(next.remaining_candidate_removal_authorized!==false||next.automatic_historical_evidence_trigger_deactivation_authorized!==false||next.active_protection_modernization_authorized!==false)fail('next-slice authorization leaked');

console.log('ONE_SHOT_WORKFLOW_REMOVAL=PASS removed=4 workflows=14 active=5 historical=2 remaining-debt=7 write-one-shots=0 b96-b99-history=unchanged');
