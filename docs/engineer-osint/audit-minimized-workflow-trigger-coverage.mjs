import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {LEGACY_FACTUAL_OVERLAY_MODULES} from './runtime-modules.mjs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const fail=message=>{throw new Error(`MINIMIZED_WORKFLOW_TRIGGER_COVERAGE: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const json=path=>JSON.parse(read(path));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const policyText=read(`${root}/V4554_MINIMIZED_WORKFLOW_TRIGGER_COVERAGE.json`);
const policy=JSON.parse(policyText);
const v4553Text=read(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`);
const v4553=JSON.parse(v4553Text);

if(policy.schema_version!=='engineer-osint-minimized-workflow-trigger-coverage-v1')fail('policy schema drift');
if(policy.status!=='READ_ONLY_TRIGGER_COVERAGE_REVIEW_NO_TRIGGER_CHANGE_AUTHORIZED')fail('policy status drift');
if(policy.reviewed_main_sha!=='483ddeb2da16a29043902f14e265b31b2c8cbc98')fail('reviewed main SHA drift');
if(gitBlobSha(v4553Text)!==policy.reviewed_v4553_policy_git_blob_sha)fail('v4.5.53 policy blob drift');
if(v4553.status!=='AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED')fail('v4.5.53 lifecycle status drift');

const active=policy.active_production_protections||[];
const historical=policy.historical_evidence_workflows||[];
if(active.length!==5||historical.length!==2)fail('5/2 workflow taxonomy drift');
const expected=[...active,...historical];
if(new Set(expected.map(x=>x.file)).size!==7)fail('workflow inventory is not seven unique files');
const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
const expectedNames=expected.map(x=>x.file).sort();
if(JSON.stringify(actual)!==JSON.stringify(expectedNames))fail(`workflow inventory drift actual=${actual.length} expected=7`);

const texts=new Map();
for(const item of expected){
  const text=read(`${workflowsDir}/${item.file}`);
  texts.set(item.file,text);
  if(gitBlobSha(text)!==item.git_blob_sha)fail(`workflow blob drift: ${item.file}`);
  if(!/workflow_dispatch\s*:/.test(text))fail(`workflow_dispatch missing: ${item.file}`);
  if(!/permissions:\s*\n\s*contents:\s*read\b/.test(text))fail(`read-only contents permission missing: ${item.file}`);
}

const hasBroadPr=text=>/pull_request:\s*\n\s*branches:\s*\[main\]\s*\n\s*paths:\s*\n(?:\s*-.*\n)*?\s*- ['"]docs\/engineer-osint\/\*\*['"]/.test(text);
const hasBroadMainPush=text=>/push:\s*\n(?:\s*branches:\s*\[main\]|\s*branches:\s*\n(?:\s*-.*\n)*?\s*- main)\s*\n\s*paths:\s*\n(?:\s*-.*\n)*?\s*- ['"]docs\/engineer-osint\/\*\*['"]/.test(text);

let activeBroadPr=0,activeBroadPush=0;
for(const item of active){
  const text=texts.get(item.file);
  const pr=hasBroadPr(text),push=hasBroadMainPush(text);
  if(pr!==item.pull_request_main_docs_broad)fail(`PR trigger classification drift: ${item.file}`);
  if(push!==item.push_main_docs_broad)fail(`main push trigger classification drift: ${item.file}`);
  if(pr)activeBroadPr++;
  if(push)activeBroadPush++;
}
if(activeBroadPr!==4||activeBroadPush!==3)fail(`active broad coverage drift pr=${activeBroadPr} push=${activeBroadPush}`);

const i18n=texts.get('i18n-switch-regression.yml');
if(/docs\/engineer-osint\/\*\*/.test(i18n))fail('i18n specialist unexpectedly broadened to docs/**');
for(const marker of ['canonical-snapshot.js','i18n-runtime-switch-fix.js','language-switch-control.test.mjs'])if(!i18n.includes(marker))fail(`i18n specialist path missing: ${marker}`);

const readiness=texts.get('identity-fix-retirement-readiness.yml');
const authorization=texts.get('identity-fix-retirement-authorization.yml');
for(const [file,text] of [['identity-fix-retirement-readiness.yml',readiness],['identity-fix-retirement-authorization.yml',authorization]]){
  if(!hasBroadPr(text))fail(`historical workflow no longer has observed broad PR trigger: ${file}`);
  if(hasBroadMainPush(text))fail(`historical workflow unexpectedly pushes on main: ${file}`);
}
for(const branch of ['chatgpt/engineer-osint-v4544-identity-retirement-readiness','chatgpt/engineer-osint-v4546-identity-retirement'])if(!readiness.includes(branch))fail(`readiness historical push branch drift: ${branch}`);
for(const branch of ['chatgpt/engineer-osint-v4545-identity-retirement-authorization','chatgpt/engineer-osint-v4546-identity-retirement'])if(!authorization.includes(branch))fail(`authorization historical push branch drift: ${branch}`);

const proof=policy.coverage_proof||{};
if(proof.broad_active_pull_request_main_docs_workflow_count!==activeBroadPr)fail('policy PR broad coverage count drift');
if(proof.broad_active_push_main_docs_workflow_count!==activeBroadPush)fail('policy push broad coverage count drift');
if(proof.historical_workflows_required_for_current_pull_request_coverage!==false||proof.historical_workflows_required_for_current_main_push_coverage!==false)fail('historical workflow coverage requirement unexpectedly asserted');
if(proof.observed_pull_request_count_explained_by_four_broad_active_plus_two_historical!==true)fail('observed PR count explanation drift');
if(proof.observed_push_count_explained_by_three_broad_active!==true)fail('observed push count explanation drift');

const observed=policy.observed_v4553_ci||{};
if(observed.pull_request_workflows_triggered!==6||observed.pull_request_workflows_success!==6||observed.pull_request_workflows_failed!==0)fail('reviewed PR CI evidence drift');
if(observed.push_workflows_triggered!==3||observed.push_workflows_success!==3||observed.push_workflows_failed!==0)fail('reviewed push CI evidence drift');
if(observed.pages_run_id!==33445402934||observed.pages_artifact_id!==9777837903||observed.pages_build_version!==policy.reviewed_main_sha)fail('Pages deployment evidence drift');

for(const [key,value] of Object.entries(policy.authorization||{}))if(value!==false)fail(`unauthorized trigger/data change leaked: ${key}`);
for(const item of historical)if(item.automatic_current_pr_trigger_disposition!=='REDUNDANT_CANDIDATE_FOR_SEPARATE_MANUAL_ONLY_REVIEW')fail(`historical disposition drift: ${item.file}`);

const manifestText=read(`${root}/data/run-store-manifest.json`);
const runtimeText=read(`${root}/runtime-modules.mjs`);
if(gitBlobSha(manifestText)!==v4553.required_unchanged_state.run_store_manifest_git_blob_sha)fail('run-store manifest drift');
if(gitBlobSha(runtimeText)!==v4553.required_unchanged_state.runtime_modules_git_blob_sha)fail('runtime manifest drift');
const baseline=json(`${root}/legacy-runtime-overlay-baseline.json`);
if(LEGACY_FACTUAL_OVERLAY_MODULES.length!==0||Object.keys(baseline.modules||{}).length!==0)fail('legacy factual overlay debt returned');
if(v4553.required_unchanged_state.b99_file_sha256!=='ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab')fail('B99 file anchor drift');
if(v4553.required_unchanged_state.b99_canonical_sha256!=='754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30')fail('B99 canonical anchor drift');

console.log('MINIMIZED_WORKFLOW_TRIGGER_COVERAGE=PASS workflows=7 active=5 historical=2 broad-pr-active=4 broad-push-active=3 observed-pr=6 observed-push=3 historical-pr-redundant=2 trigger-change-authorized=0');
