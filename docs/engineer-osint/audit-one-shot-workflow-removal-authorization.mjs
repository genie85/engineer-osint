import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,existsSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION: ${message}`)};
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const policyPath=`${root}/V4549_ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION.json`;
const classificationPath=`${root}/V4548_MIGRATION_WORKFLOW_CLASSIFICATION.json`;
const policy=readJson(policyPath);
const classificationText=readFileSync(classificationPath,'utf8');
const classification=JSON.parse(classificationText);

if(policy.schema_version!=='engineer-osint-one-shot-workflow-removal-authorization-v1')fail('schema drift');
if(policy.status!=='READY_FOR_EXACT_FOUR_ONE_SHOT_REMOVAL_SLICE')fail('status drift');
if(policy.reviewed_main_sha!=='c506c4c838d7967ac9445186529285cdddbd1992')fail('reviewed main SHA drift');
if(gitBlobSha(classificationText)!==policy.reviewed_classification_policy_git_blob_sha)fail('v4.5.48 classification policy blob drift');
if(classification.status!==policy.required_classification_status)fail('classification status drift');

const auth=policy.authorization||{};
for(const key of ['one_removal_slice_only','allow_delete_exact_four_one_shot_workflows'])if(auth[key]!==true)fail(`required authorization missing: ${key}`);
for(const key of ['allow_edit_target_workflows_before_deletion','allow_delete_any_other_workflow','allow_edit_any_other_workflow','allow_deactivate_historical_evidence_workflows','allow_edit_active_production_protection_workflows','allow_canonical_data_edit','allow_run_store_manifest_edit','allow_run_append','allow_runtime_module_edit','allow_historical_policy_or_audit_rewrite','allow_manual_hash_edit'])if(auth[key]!==false)fail(`authorization scope broadened: ${key}`);

const expectedTargets=['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml'];
const targets=(policy.targets||[]).map(x=>x.file);
if(JSON.stringify([...targets].sort())!==JSON.stringify([...expectedTargets].sort()))fail(`target scope mismatch: ${targets.join(',')}`);
if(new Set(targets).size!==4)fail('target uniqueness drift');

for(const target of policy.targets){
  const path=`${workflowsDir}/${target.file}`;
  if(!existsSync(path))fail(`authorized target missing before removal slice: ${target.file}`);
  const text=readFileSync(path,'utf8');
  if(gitBlobSha(text)!==target.git_blob_sha)fail(`target workflow blob drift: ${target.file}`);
  const classified=classification.workflows.find(x=>x.file===target.file);
  if(!classified||classified.classification!=='REMOVABLE_CI_DEBT_CANDIDATE'||classified.write_capable!==true||classified.removal_authorized!==false)fail(`target classification boundary drift: ${target.file}`);
  if(classified.git_blob_sha!==target.git_blob_sha)fail(`target classification blob mismatch: ${target.file}`);
}

const manifest=readJson(`${root}/data/run-store-manifest.json`);
let previous=null;
for(const target of policy.targets){
  const matches=(manifest.runs||[]).filter(x=>x.run_id===target.historical_run_id);
  if(matches.length!==1)fail(`historical run anchor uniqueness drift: ${target.historical_run_id}`);
  const entry=matches[0];
  if(entry.file_sha256!==target.run_file_sha256||entry.canonical_sha256!==target.canonical_sha256)fail(`historical run hash drift: ${target.historical_run_id}`);
  const raw=readFileSync(`${root}/${entry.path}`,'utf8');
  if(sha256(raw)!==target.run_file_sha256)fail(`historical run raw file hash drift: ${target.historical_run_id}`);
  if(previous&&entry.parent_run_id!==previous.historical_run_id)fail(`B96-B99 parent chain drift at ${target.historical_run_id}`);
  if(previous&&entry.parent_canonical_sha256!==previous.canonical_sha256)fail(`B96-B99 parent canonical drift at ${target.historical_run_id}`);
  previous=target;
}

const activeNames=classification.workflows.filter(x=>x.classification==='ACTIVE_PRODUCTION_PROTECTION').map(x=>x.file).sort();
const requiredActive=policy.required_unchanged_active_protections.map(x=>x.file).sort();
if(JSON.stringify(activeNames)!==JSON.stringify(requiredActive))fail('active production protection set drift');
for(const item of policy.required_unchanged_active_protections){
  const path=`${workflowsDir}/${item.file}`;
  if(!existsSync(path)||gitBlobSha(readFileSync(path,'utf8'))!==item.git_blob_sha)fail(`active protection blob drift: ${item.file}`);
}

const historicalNames=classification.workflows.filter(x=>x.classification==='HISTORICAL_EVIDENCE_KEEP').map(x=>x.file).sort();
const requiredHistorical=policy.required_unchanged_historical_evidence.map(x=>x.file).sort();
if(JSON.stringify(historicalNames)!==JSON.stringify(requiredHistorical))fail('historical evidence set drift');
for(const item of policy.required_unchanged_historical_evidence){
  const path=`${workflowsDir}/${item.file}`;
  if(!existsSync(path)||gitBlobSha(readFileSync(path,'utf8'))!==item.git_blob_sha)fail(`historical evidence blob drift: ${item.file}`);
}

const workflowFiles=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
if(workflowFiles.length!==classification.inventory_count||workflowFiles.length!==18)fail(`pre-removal inventory drift: ${workflowFiles.length}`);
let references=0;
for(const file of workflowFiles){
  if(expectedTargets.includes(file))continue;
  const text=readFileSync(`${workflowsDir}/${file}`,'utf8');
  for(const target of expectedTargets)if(text.includes(target))references++;
}
if(references!==policy.dependency_proof.required_non_target_workflow_references_to_targets)fail(`non-target dependency references=${references}`);
if(policy.dependency_proof.targets_are_transition_executors_not_reusable_dependencies!==true)fail('dependency proof classification drift');

const next=policy.required_next_slice||{};
if(next.expected_workflow_count_after!==14||next.must_preserve_active_protection_count!==5||next.must_preserve_historical_evidence_count!==2)fail('next-slice count contract drift');
for(const key of ['must_preserve_b96_b99_run_hashes','must_run_full_p0_p1','must_run_browser_regressions','must_verify_pages_after_merge'])if(next[key]!==true)fail(`next-slice gate missing: ${key}`);

console.log(`ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION=PASS targets=4 references=${references} active=5 historical=2 pre-inventory=18 post-expected=14`);
