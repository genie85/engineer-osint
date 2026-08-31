import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`EXACT_SEVEN_WORKFLOW_AUTHORIZATION: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const json=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const policy=json(`${root}/V4552_EXACT_SEVEN_WORKFLOW_AUTHORIZATION.json`);
const v4551Text=read(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`);
const v4551=JSON.parse(v4551Text);

if(policy.schema_version!=='engineer-osint-exact-seven-workflow-authorization-v1')fail('schema drift');
if(policy.status!=='AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_FOR_NEXT_SLICE_ONLY')fail('status drift');
if(policy.reviewed_main_sha!=='1d7f9a5f7dbf0ada8c09d95fbd8b4d3dca437d07')fail('reviewed main SHA drift');
if(gitBlobSha(v4551Text)!==policy.reviewed_v4551_policy_git_blob_sha)fail('v4.5.51 policy blob drift');
if(v4551.status!=='SEVEN_SAFE_REMOVAL_CANDIDATES_NO_REMOVAL_AUTHORIZED')fail('v4.5.51 disposition drift');

const auth=policy.authorization||{};
if(auth.exact_seven_workflow_removal_authorized!==true)fail('exact seven authorization missing');
for(const key of ['partial_subset_removal_authorized','workflow_content_edit_authorized','trigger_deactivation_without_removal_authorized','historical_evidence_workflow_change_authorized','active_protection_workflow_change_authorized','canonical_data_edit_authorized','run_store_edit_authorized','run_append_authorized','runtime_edit_authorized','manual_hash_edit_authorized'])if(auth[key]!==false)fail(`unexpected authorization: ${key}`);

const targets=policy.authorized_targets||[];
const active=policy.required_preserved_workflows?.active_production_protection||[];
const historical=policy.required_preserved_workflows?.historical_evidence_keep||[];
if(targets.length!==7||active.length!==5||historical.length!==2)fail('7/5/2 contract drift');
if(new Set(targets.map(x=>x.file)).size!==7)fail('target filenames not unique');
if(JSON.stringify(targets.map(x=>x.file).sort())!==JSON.stringify((v4551.candidates||[]).map(x=>x.file).sort()))fail('authorized targets differ from v4.5.51 candidates');

const expected=[...targets,...active,...historical].map(x=>x.file).sort();
const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
if(JSON.stringify(actual)!==JSON.stringify(expected))fail('workflow inventory changed before authorization execution');

for(const item of [...targets,...active,...historical]){
  const path=`${workflowsDir}/${item.file}`;
  if(!existsSync(path))fail(`workflow missing: ${item.file}`);
  if(gitBlobSha(read(path))!==item.git_blob_sha)fail(`workflow blob drift: ${item.file}`);
}

for(const target of targets){
  const text=read(`${workflowsDir}/${target.file}`);
  if(/workflow_call\s*:/.test(text))fail(`target defines workflow_call: ${target.file}`);
  if(!/permissions:\s*\n\s*contents:\s*read\b/.test(text))fail(`target no longer read-only: ${target.file}`);
  if(/contents:\s*write\b/.test(text))fail(`target became write-capable: ${target.file}`);
}

const targetNames=new Set(targets.map(x=>x.file));
let refs=0;
for(const item of [...active,...historical]){
  const text=read(`${workflowsDir}/${item.file}`);
  for(const name of targetNames)if(text.includes(name))refs++;
}
if(refs!==0)fail(`preserved workflows reference authorized target filenames: ${refs}`);

const manifest=json(`${root}/data/run-store-manifest.json`);
const lineage=policy.required_current_lineage||{};
const b99=(manifest.runs||[]).find(x=>x.run_id===lineage.b99_run_id);
if(!b99)fail('B99 anchor missing');
if(b99.file_sha256!==lineage.b99_file_sha256||b99.canonical_sha256!==lineage.b99_canonical_sha256)fail('B99 manifest hash drift');
if(sha256(read(`${root}/${b99.path}`))!==lineage.b99_file_sha256)fail('B99 raw hash drift');

const exec=policy.execution_contract||{};
for(const key of ['authorization_applies_only_if_all_seven_blobs_match','next_slice_must_remove_exactly_all_seven_targets','next_slice_must_not_modify_other_workflows','next_slice_must_not_edit_canonical_or_runtime','next_slice_must_revalidate_p0_p1_build_browser_and_pages','authorization_is_invalid_after_any_authorized_target_blob_drift'])if(exec[key]!==true)fail(`execution contract missing: ${key}`);

console.log(`EXACT_SEVEN_WORKFLOW_AUTHORIZATION=PASS targets=7 active=5 historical=2 refs=${refs} b99=${b99.run_id}`);
