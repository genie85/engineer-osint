import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const executionPath=`${root}/V4556_HISTORICAL_MANUAL_ONLY_EXECUTION.json`;
const hotfixPath=`${root}/V4557_BROWSER_DIGEST_NORMALIZATION_HOTFIX.json`;
const node20BaselinePath=`${root}/V4561_CI_NODE_RUNTIME_INVENTORY.json`;
const node24MigrationPath=`${root}/V4562_ACTIVE_NODE24_MIGRATION.json`;
const actionUpgradePath=`${root}/V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json`;
const b100IdentityWorkflowSha='1113c9388e69abea0b9b14a029b68a906befdb31';
const b101IdentityWorkflowSha='744daab32ba9e55c1546b38ab2dd049562777906';
const b102IdentityWorkflowSha='3a14efd69c46d464c50543431565b57b4517ae39';
const b103IdentityWorkflowSha='ba0517693b06a0360e1254f47e8b9004942bba0f';
const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';
export const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
export const v4556=existsSync(executionPath)?JSON.parse(readFileSync(executionPath,'utf8')):null;
export const v4557=existsSync(hotfixPath)?JSON.parse(readFileSync(hotfixPath,'utf8')):null;
export const v4561=existsSync(node20BaselinePath)?JSON.parse(readFileSync(node20BaselinePath,'utf8')):null;
export const v4562=existsSync(node24MigrationPath)?JSON.parse(readFileSync(node24MigrationPath,'utf8')):null;
export const v4565=existsSync(actionUpgradePath)?JSON.parse(readFileSync(actionUpgradePath,'utf8')):null;

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

function assertExactV4565ActionUpgradeSuccessor(item,text,current){
  if(!v4565)return false;
  const successor=v4565.workflow_successors?.find(x=>x.file===item.file);
  if(!successor)return false;
  const exactHistorical=current===successor.v4564_diagnostic_git_blob_sha;
  const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha];
  const exactPublishedDescendant=item.file==='identity-fix-retirement-regression.yml'&&published.includes(current);
  if(!exactHistorical&&!exactPublishedDescendant)return false;
  assert.equal(v4565.schema_version,'engineer-osint-action-upgrade-lifecycle-authorization-v1');
  assert.equal(v4565.status,'AUTHORIZED_EXACT_ACTION_UPGRADE_LIFECYCLE_SUCCESSOR_HANDLING_NOT_EXECUTED');
  assert.ok(v4562,`${item.file}: v4.5.62 migration record missing for action successor`);
  const node24=v4562.workflows?.find(x=>x.file===item.file);
  assert.ok(node24,`${item.file}: missing v4.5.62 active workflow anchor`);
  assert.equal(successor.v4562_git_blob_sha,node24.git_blob_sha,`${item.file}: v4.5.65 predecessor anchor drift`);
  assert.equal(node24.configured_node_major,24,`${item.file}: action successor does not preserve Node 24`);
  assert.equal(v4565.execution_boundary.wildcard_or_current_state_acceptance_authorized,false);
  assert.equal(v4565.required_unchanged.browser_digest,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
  assert.match(text,/^\s*node-version:\s*['"]?24['"]?\s*$/m,`${item.file}: Node 24 configuration missing after action successor`);
  if(exactPublishedDescendant){
    assert.match(text,/'engineer-osint-20260830-B99':'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31'/,'B99 historical digest anchor missing');
    assert.match(text,/'engineer-osint-20260902-B100':'58f9d08fa884fd49638f0f57a52dde993c3a22fafc5233c13e4e14d90e30e85d'/,'B100 exact digest anchor missing');
    if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260902-B101':'c8c134daff25a15b3825680f5e033d83a833f87910e2c94421adf634ee7a7acd'/,'B101 exact digest anchor missing');
    if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260902-B102':'5122d347541c53638a59c8f3c855c417db8ae2ea5a04b002948d655d91b5e6d7'/,'B102 exact digest anchor missing');
    if([b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260902-B103':'68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a'/,'B103 exact digest anchor missing');
    if(current===b104IdentityWorkflowSha)assert.match(text,/'engineer-osint-20260903-B104':'5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c'/,'B104 exact digest anchor missing');
    assert.match(text,/no exact digest authorized for current run/,'unknown descendant fail-closed guard missing');
  }
  return true;
}

export function assertActiveProtectionCurrentOrV4557(item){
  const path=`.github/workflows/${item.file}`;
  const text=readFileSync(path,'utf8');
  const current=gitBlobSha(text);
  if(current===item.git_blob_sha)return;
  if(assertExactV4565ActionUpgradeSuccessor(item,text,current))return;
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
  assert.match(text,/6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31/,'historical browser digest changed');
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
