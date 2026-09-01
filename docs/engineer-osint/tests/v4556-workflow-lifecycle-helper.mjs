import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const executionPath=`${root}/V4556_HISTORICAL_MANUAL_ONLY_EXECUTION.json`;
const hotfixPath=`${root}/V4557_BROWSER_DIGEST_NORMALIZATION_HOTFIX.json`;
const node20BaselinePath=`${root}/V4561_CI_NODE_RUNTIME_INVENTORY.json`;
const node24MigrationPath=`${root}/V4562_ACTIVE_NODE24_MIGRATION.json`;
export const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const v4556=existsSync(executionPath)?JSON.parse(readFileSync(executionPath,'utf8')):null;
export const v4557=existsSync(hotfixPath)?JSON.parse(readFileSync(hotfixPath,'utf8')):null;
export const v4561=existsSync(node20BaselinePath)?JSON.parse(readFileSync(node20BaselinePath,'utf8')):null;
export const v4562=existsSync(node24MigrationPath)?JSON.parse(readFileSync(node24MigrationPath,'utf8')):null;

export function assertHistoricalWorkflowCurrentOrV4556(item){
  const path=`.github/workflows/${item.file}`;
  const text=readFileSync(path,'utf8');
  const current=gitBlobSha(text);
  if(current===item.git_blob_sha)return;
  assert.ok(v4556,`${item.file}: unexpected workflow drift without v4.5.56 execution record`);
  assert.equal(v4556.schema_version,'engineer-osint-historical-manual-only-execution-v1');
  assert.equal(v4556.status,'AUTHORIZED_EXACT_TWO_HISTORICAL_WORKFLOWS_MANUAL_ONLY_APPLIED');
  const target=v4556.targets.find(x=>x.file===item.file);
  assert.ok(target,`${item.file}: drift is outside v4.5.56 exact target set`);
  assert.equal(target.historical_git_blob_sha,item.git_blob_sha,`${item.file}: historical anchor drift`);
  assert.equal(current,target.manual_only_git_blob_sha,`${item.file}: unauthorized successor blob`);
  assert.equal(target.trigger_state,'WORKFLOW_DISPATCH_ONLY');
  assert.equal(target.file_retained,true);
  assert.equal(target.jobs_preserved,true);
  assert.equal(target.permissions_preserved,true);
  assert.match(text,/^on:\s*\n\s+workflow_dispatch:\s*$/m,`${item.file}: workflow_dispatch-only trigger missing`);
  assert.doesNotMatch(text,/^\s+pull_request\s*:/m,`${item.file}: pull_request trigger survived`);
  assert.doesNotMatch(text,/^\s+push\s*:/m,`${item.file}: push trigger survived`);
  assert.match(text,/permissions:\s*\n\s*contents:\s*read\b/,`${item.file}: permissions drift`);
  assert.match(text,/^jobs:/m,`${item.file}: jobs block missing`);
}

function assertExactV4562ActiveNode24Successor(item,text,current){
  if(!v4562)return false;
  const successor=v4562.workflows?.find(x=>x.file===item.file);
  if(!successor||current!==successor.git_blob_sha)return false;

  assert.equal(v4562.schema_version,'engineer-osint-active-node24-migration-v1');
  assert.equal(v4562.status,'ACTIVE_WORKFLOWS_NODE24_HISTORICAL_NODE20_RETAINED');
  assert.equal(v4562.base_main_sha,'e2d0bc8bdb082651e87e92c902e24d4dad6c3bf1');
  assert.equal(v4562.findings.active_node20_remaining,0);
  assert.equal(v4562.findings.active_node24_workflows,5);
  assert.equal(v4562.findings.historical_node20_workflows,2);
  assert.equal(v4562.findings.historical_workflows_modified,false);
  assert.equal(v4562.findings.workflow_trigger_change_performed,false);
  assert.equal(v4562.findings.workflow_job_change_performed,false);
  assert.equal(v4562.findings.action_version_change_performed,false);
  assert.equal(v4562.findings.canonical_data_edit_performed,false);
  assert.equal(v4562.findings.run_store_edit_performed,false);
  assert.equal(v4562.findings.runtime_module_edit_performed,false);
  assert.equal(v4562.findings.ui_edit_performed,false);

  assert.equal(successor.role,'ACTIVE_PRODUCTION_PROTECTION',`${item.file}: v4.5.62 successor is not active protection`);
  assert.equal(successor.configured_node_major,24,`${item.file}: v4.5.62 successor is not Node 24`);
  assert.equal(successor.setup_node_action,'actions/setup-node@v4',`${item.file}: setup-node action drift`);
  assert.match(text,/^\s*node-version:\s*['"]?24['"]?\s*$/m,`${item.file}: Node 24 configuration missing`);

  assert.ok(v4561,`${item.file}: v4.5.61 frozen Node 20 baseline missing`);
  assert.equal(v4561.schema_version,'engineer-osint-ci-node-runtime-inventory-v1');
  assert.equal(v4561.version,'v4.5.61');
  assert.equal(v4561.status,'READ_ONLY_INVENTORY_NO_WORKFLOW_CHANGE');
  assert.equal(v4562.historical_baseline.git_blob_sha,gitBlobSha(readFileSync(node20BaselinePath,'utf8')),'v4.5.61 frozen baseline artifact drift');
  const baseline=v4561.workflows.find(x=>x.file===item.file);
  assert.ok(baseline,`${item.file}: missing from v4.5.61 baseline`);
  assert.equal(baseline.role,'ACTIVE_PRODUCTION_PROTECTION',`${item.file}: v4.5.61 role drift`);
  assert.equal(baseline.configured_node_major,20,`${item.file}: v4.5.61 predecessor was not Node 20`);

  if(item.git_blob_sha===baseline.git_blob_sha)return true;

  assert.equal(item.file,'identity-fix-retirement-regression.yml',`${item.file}: v4.5.62 successor does not descend from supplied historical anchor`);
  assert.ok(v4557,'identity-fix-retirement-regression.yml: v4.5.57 hotfix record missing from v4.5.62 lifecycle');
  assert.equal(v4557.schema_version,'engineer-osint-browser-digest-normalization-hotfix-v1');
  assert.equal(v4557.status,'EXACT_ACTIVE_BROWSER_GUARD_SUCCESSOR_APPLIED');
  assert.equal(v4557.target.file,item.file);
  assert.equal(v4557.target.historical_git_blob_sha,item.git_blob_sha,'v4.5.57 historical active-protection anchor drift');
  assert.equal(v4557.target.successor_git_blob_sha,baseline.git_blob_sha,'v4.5.62 identity predecessor is not the exact v4.5.57 successor');
  return true;
}

export function assertActiveProtectionCurrentOrV4557(item){
  const path=`.github/workflows/${item.file}`;
  const text=readFileSync(path,'utf8');
  const current=gitBlobSha(text);
  if(current===item.git_blob_sha)return;
  if(assertExactV4562ActiveNode24Successor(item,text,current))return;
  assert.equal(item.file,'identity-fix-retirement-regression.yml',`${item.file}: non-target active protection drift`);
  assert.ok(v4557,'identity-fix-retirement-regression.yml: unexpected drift without v4.5.57 hotfix record');
  assert.equal(v4557.schema_version,'engineer-osint-browser-digest-normalization-hotfix-v1');
  assert.equal(v4557.status,'EXACT_ACTIVE_BROWSER_GUARD_SUCCESSOR_APPLIED');
  assert.equal(v4557.target.file,item.file);
  assert.equal(v4557.target.historical_git_blob_sha,item.git_blob_sha,'v4.5.57 historical active-protection anchor drift');
  assert.equal(current,v4557.target.successor_git_blob_sha,'v4.5.57 unauthorized active-protection successor blob');
  assert.equal(v4557.target.change_scope,'BILINGUAL_LABEL_NORMALIZATION_CASEFOLD_ONLY');
  assert.equal(v4557.target.expected_browser_sha256_unchanged,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
  for(const key of ['workflow_triggers_preserved','permissions_preserved','job_structure_preserved','canonical_guard_steps_preserved','browser_guard_preserved'])assert.equal(v4557.target[key],true,key);
  for(const value of Object.values(v4557.safety_boundary))assert.equal(value,false,'v4.5.57 safety boundary broadened');
  assert.match(text,/text\.casefold\(\) in \{cs\.casefold\(\),en\.casefold\(\)\}/,'v4.5.57 exact casefold normalization missing');
  assert.match(text,/expected='6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31'/,'historical browser digest changed');
}

export function assertV4556Applied(){
  assert.ok(v4556,'v4.5.56 execution record missing');
  assert.equal(v4556.status,'AUTHORIZED_EXACT_TWO_HISTORICAL_WORKFLOWS_MANUAL_ONLY_APPLIED');
  assert.equal(v4556.targets.length,2);
  for(const target of v4556.targets){
    const text=readFileSync(`.github/workflows/${target.file}`,'utf8');
    assert.equal(gitBlobSha(text),target.manual_only_git_blob_sha,target.file);
  }
  return true;
}

export function assertV4557Applied(){
  assert.ok(v4557,'v4.5.57 hotfix record missing');
  assertActiveProtectionCurrentOrV4557({file:v4557.target.file,git_blob_sha:v4557.target.historical_git_blob_sha});
  return true;
}
