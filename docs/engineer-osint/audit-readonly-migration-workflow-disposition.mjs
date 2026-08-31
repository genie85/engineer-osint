import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`READONLY_MIGRATION_WORKFLOW_DISPOSITION: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const readJson=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const policy=readJson(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`);
const v4550Text=read(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`);
const v4550=JSON.parse(v4550Text);

if(policy.schema_version!=='engineer-osint-readonly-migration-workflow-disposition-v1')fail('schema drift');
if(policy.status!=='SEVEN_SAFE_REMOVAL_CANDIDATES_NO_REMOVAL_AUTHORIZED')fail('status drift');
if(policy.reviewed_main_sha!=='cf846fe1f10a8a06187354bda47a99a8890666a5')fail('reviewed main SHA drift');
if(gitBlobSha(v4550Text)!==policy.reviewed_v4550_policy_git_blob_sha)fail('v4.5.50 policy blob drift');
if(v4550.status!=='AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED')fail('v4.5.50 lifecycle status drift');

for(const [key,value] of Object.entries(policy.authorization||{}))if(value!==false)fail(`v4.5.51 unexpectedly authorizes ${key}`);
if(policy.inventory?.workflow_count!==14||policy.inventory?.active_production_protection_count!==5||policy.inventory?.historical_evidence_keep_count!==2||policy.inventory?.readonly_migration_candidate_count!==7||policy.inventory?.write_capable_migration_one_shot_count!==0)fail('inventory count contract drift');

const replacement=Object.values(policy.replacement_protections||{});
const historical=policy.historical_evidence_workflows||[];
const candidates=policy.candidates||[];
if(replacement.length!==5||historical.length!==2||candidates.length!==7)fail('5/2/7 taxonomy drift');
if(new Set(candidates.map(x=>x.file)).size!==7)fail('candidate filenames not unique');
if(candidates.some(x=>x.disposition!=='SAFE_REMOVAL_CANDIDATE_AFTER_EXACT_AUTHORIZATION'))fail('candidate disposition drift');

const expected=[...replacement,...historical,...candidates].map(x=>x.file).sort();
const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
if(expected.length!==14||new Set(expected).size!==14)fail('policy does not define exactly 14 unique workflows');
if(JSON.stringify(actual)!==JSON.stringify(expected))fail(`workflow inventory mismatch actual=${actual.length} expected=${expected.length}`);

for(const item of [...replacement,...historical,...candidates]){
  const path=`${workflowsDir}/${item.file}`;
  if(!existsSync(path))fail(`workflow missing: ${item.file}`);
  if(gitBlobSha(read(path))!==item.git_blob_sha)fail(`workflow blob drift: ${item.file}`);
}

for(const candidate of candidates){
  const text=read(`${workflowsDir}/${candidate.file}`);
  if(!/permissions:\s*\n\s*contents:\s*read\b/.test(text))fail(`candidate is not contents: read: ${candidate.file}`);
  if(/contents:\s*write\b/.test(text))fail(`candidate unexpectedly write-capable: ${candidate.file}`);
  if(!/node-version:\s*['"]?20['"]?/.test(text))fail(`candidate Node version classification drift: ${candidate.file}`);
  if(/workflow_call\s*:/.test(text))fail(`candidate is a reusable workflow dependency: ${candidate.file}`);
  if(!/pull_request:\s*\n\s*branches:\s*\[main\]/.test(text))fail(`candidate no longer runs on pull_request main: ${candidate.file}`);
  const pushMain=/push:\s*\n\s*branches:\s*\[main\]/.test(text);
  if(pushMain!==candidate.automatic_push_main)fail(`candidate main-push classification drift: ${candidate.file}`);
  if(candidate.legacy_branch_push&&!text.includes(candidate.legacy_branch_push))fail(`candidate legacy push branch drift: ${candidate.file}`);
  if(!candidate.replacement_reason||!(candidate.replacement_workflows||[]).length)fail(`candidate replacement rationale missing: ${candidate.file}`);
  for(const replacementFile of candidate.replacement_workflows){
    if(!replacement.some(x=>x.file===replacementFile))fail(`candidate replacement is not an active protection: ${candidate.file} -> ${replacementFile}`);
  }
}

for(const item of replacement){
  const text=read(`${workflowsDir}/${item.file}`);
  for(const marker of item.required_markers||[])if(!text.includes(marker))fail(`replacement marker missing ${item.file}: ${marker}`);
}

let crossWorkflowRefs=0;
const candidateNames=new Set(candidates.map(x=>x.file));
for(const item of [...replacement,...historical]){
  const text=read(`${workflowsDir}/${item.file}`);
  for(const candidateName of candidateNames)if(text.includes(candidateName))crossWorkflowRefs++;
}
if(crossWorkflowRefs!==0)fail(`active/historical workflow references candidate workflow filenames: ${crossWorkflowRefs}`);

const manifest=readJson(`${root}/data/run-store-manifest.json`);
const lineage=policy.required_current_lineage||{};
const runs=manifest.runs||[];
const b99Index=runs.findIndex(x=>x.run_id===lineage.b99_run_id);
if(b99Index<0||b99Index!==runs.findLastIndex(x=>x.run_id===lineage.b99_run_id))fail('unique B99 anchor missing');
const b99=runs[b99Index];
if(b99.file_sha256!==lineage.b99_file_sha256||b99.canonical_sha256!==lineage.b99_canonical_sha256)fail('B99 manifest hash drift');
if(sha256(read(`${root}/${b99.path}`))!==lineage.b99_file_sha256)fail('B99 raw file hash drift');
if(runs.length-1<b99Index)fail('current canonical tip predates B99');
if(lineage.current_tip_must_be_b99_or_descendant!==true)fail('lineage gate disabled');

const next=policy.required_next_slice||{};
for(const key of ['exact_seven_removal_authorized','partial_subset_removal_authorized','historical_evidence_trigger_deactivation_authorized','active_protection_modernization_authorized'])if(next[key]!==false)fail(`next-slice authorization leaked: ${key}`);
for(const key of ['must_pin_all_seven_blobs_again','must_prove_no_workflow_call_or_cross_workflow_dependency','must_preserve_five_active_protections','must_preserve_two_historical_evidence_workflows','must_preserve_b99_hashes'])if(next[key]!==true)fail(`next-slice proof requirement missing: ${key}`);

console.log(`READONLY_MIGRATION_WORKFLOW_DISPOSITION=PASS workflows=14 candidates=7 active=5 historical=2 cross-workflow-refs=${crossWorkflowRefs} removal-authorized=0 b99=${b99.run_id}`);
