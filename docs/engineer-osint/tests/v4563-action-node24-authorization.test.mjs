import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4563_ACTION_NODE24_AUTHORIZATION.json`,'utf8'));
const lifecycle=JSON.parse(readFileSync(`${root}/V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json`,'utf8'));
const wfRoot='.github/workflows';
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const b100IdentityWorkflowSha='1113c9388e69abea0b9b14a029b68a906befdb31';
const b101IdentityWorkflowSha='744daab32ba9e55c1546b38ab2dd049562777906';
const b102IdentityWorkflowSha='3a14efd69c46d464c50543431565b57b4517ae39';
const b103IdentityWorkflowSha='ba0517693b06a0360e1254f47e8b9004942bba0f';
const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';
const b105IdentityWorkflowSha='0aded293ae69be3844c73f6613f0a70b05320156';

const active=new Map(policy.active_workflows.map(x=>[x.file,x]));
const successors=new Map(lifecycle.workflow_successors.map(x=>[x.file,x]));
const texts=new Map([...active.keys()].map(file=>[file,readFileSync(`${wfRoot}/${file}`,'utf8')]));
const all=[...texts.values()].join('\n');
const currentShas=new Map([...texts].map(([file,text])=>[file,gitBlobSha(text)]));
const baselineMode=[...active].every(([file,item])=>currentShas.get(file)===item.historical_git_blob_sha);
const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha];
const successorMode=[...active].every(([file,item])=>{
  const successor=successors.get(file);
  if(successor?.v4562_git_blob_sha!==item.historical_git_blob_sha)return false;
  const current=currentShas.get(file);
  return current===successor.v4564_diagnostic_git_blob_sha||(file==='identity-fix-retirement-regression.yml'&&published.includes(current));
});

test('v4.5.63 authorization is review-only and pinned to exact v4.5.62 production',()=>{
  assert.equal(policy.schema_version,'engineer-osint-action-node24-authorization-v1');
  assert.equal(policy.status,'AUTHORIZED_EXACT_ACTIVE_ACTION_NODE24_UPGRADE_NOT_EXECUTED');
  assert.equal(policy.reviewed_main_sha,'c40cf6de1a4083d67000e64338af3983685a9067');
  assert.equal(active.size,5);
  for(const value of Object.values(policy.safety_boundary))assert.equal(value,false);
});

test('v4.5.63 pins every active baseline and accepts only exact action/B100/B101/B102/B103/B104/B105 successors',()=>{
  assert.ok(baselineMode||successorMode,'active workflows are neither the exact v4.5.63 baseline nor exact permitted successor set');
  for(const [file,item] of active){
    const text=texts.get(file);
    const current=currentShas.get(file);
    if(current!==item.historical_git_blob_sha){
      const successor=successors.get(file);
      assert.ok(successor,`${file}: missing successor contract`);
      assert.equal(successor.v4562_git_blob_sha,item.historical_git_blob_sha,`${file}: historical anchor drift`);
      if(file==='identity-fix-retirement-regression.yml'){
        assert.ok([successor.v4564_diagnostic_git_blob_sha,...published].includes(current),`${file}: unauthorized successor blob`);
        if(published.includes(current)){
          assert.match(text,/'engineer-osint-20260902-B100':'58f9d08fa884fd49638f0f57a52dde993c3a22fafc5233c13e4e14d90e30e85d'/);
          if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260902-B101':'c8c134daff25a15b3825680f5e033d83a833f87910e2c94421adf634ee7a7acd'/);
          if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260902-B102':'5122d347541c53638a59c8f3c855c417db8ae2ea5a04b002948d655d91b5e6d7'/);
          if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260902-B103':'68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a'/);
          if([b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260903-B104':'5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c'/);
          if(current===b105IdentityWorkflowSha)assert.match(text,/'engineer-osint-20260904-B105':'25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7'/);
          assert.match(text,/no exact digest authorized for current run/);
        }
      }else assert.equal(current,successor.v4564_diagnostic_git_blob_sha,`${file}: unauthorized successor blob`);
    }
    assert.match(text,/node-version:\s*['"]24['"]/m,`${file}: project Node 24 contract missing`);
  }
  assert.equal(lifecycle.execution_boundary.wildcard_or_current_state_acceptance_authorized,false);
});

test('v4.5.63 action reference counts stay exact under baseline or pinned successor modes',()=>{
  if(baselineMode){
    for(const [ref,count] of Object.entries(policy.expected_baseline_reference_counts)){
      const escaped=ref.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      assert.equal((all.match(new RegExp(escaped,'g'))||[]).length,count,`${ref}: baseline count drift`);
    }
    return;
  }
  assert.equal(successorMode,true);
  for(const item of policy.authorized_substitutions){
    const fromEscaped=item.from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const toEscaped=item.to.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const expected=policy.expected_baseline_reference_counts[item.from];
    assert.equal((all.match(new RegExp(fromEscaped,'g'))||[]).length,0,`${item.from}: pre-upgrade reference survived`);
    assert.equal((all.match(new RegExp(toEscaped,'g'))||[]).length,expected,`${item.to}: successor count drift`);
  }
});

test('v4.5.63 authorizes only explicit Node 24 successor action majors',()=>{
  assert.deepEqual(policy.authorized_substitutions.map(x=>[x.from,x.to,x.successor_runtime]),[
    ['actions/checkout@v4','actions/checkout@v5','node24'],
    ['actions/setup-node@v4','actions/setup-node@v5','node24'],
    ['actions/upload-artifact@v4','actions/upload-artifact@v7','node24'],
    ['actions/configure-pages@v5','actions/configure-pages@v6','node24'],
    ['actions/upload-pages-artifact@v4','actions/upload-pages-artifact@v5','composite_with_upload_artifact_v7_node24'],
    ['actions/deploy-pages@v4','actions/deploy-pages@v5','node24']
  ]);
  assert.deepEqual(policy.historical_workflows_not_authorized.sort(),[
    'identity-fix-retirement-authorization.yml',
    'identity-fix-retirement-readiness.yml'
  ]);
});

test('v4.5.63 execution gate preserves production safety coverage',()=>{
  for(const key of [
    'exact_only_substitutions','all_five_active_workflows_node_version_24_unchanged',
    'triggers_permissions_jobs_commands_unchanged','historical_workflow_blobs_unchanged',
    'p0_p1_success','canonical_chain_success','public_cz_success','browser_regressions_success',
    'pages_build_success','pages_deploy_success','pages_build_version_equals_merged_main',
    'node20_action_warning_count_expected_zero_for_active_workflows'
  ])assert.equal(policy.required_execution_proof[key],true,key);
});
