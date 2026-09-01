import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4563_ACTION_NODE24_AUTHORIZATION.json`,'utf8'));
const lifecycle=JSON.parse(readFileSync(`${root}/V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json`,'utf8'));
const wfRoot='.github/workflows';
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const active=new Map(policy.active_workflows.map(x=>[x.file,x]));
const successors=new Map(lifecycle.workflow_successors.map(x=>[x.file,x]));
const texts=new Map([...active.keys()].map(file=>[file,readFileSync(`${wfRoot}/${file}`,'utf8')]));
const all=[...texts.values()].join('\n');
const currentShas=new Map([...texts].map(([file,text])=>[file,gitBlobSha(text)]));
const baselineMode=[...active].every(([file,item])=>currentShas.get(file)===item.historical_git_blob_sha);
const successorMode=[...active].every(([file,item])=>{
  const successor=successors.get(file);
  return successor?.v4562_git_blob_sha===item.historical_git_blob_sha&&currentShas.get(file)===successor.v4564_diagnostic_git_blob_sha;
});

test('v4.5.63 authorization is review-only and pinned to exact v4.5.62 production',()=>{
  assert.equal(policy.schema_version,'engineer-osint-action-node24-authorization-v1');
  assert.equal(policy.status,'AUTHORIZED_EXACT_ACTIVE_ACTION_NODE24_UPGRADE_NOT_EXECUTED');
  assert.equal(policy.reviewed_main_sha,'c40cf6de1a4083d67000e64338af3983685a9067');
  assert.equal(active.size,5);
  for(const value of Object.values(policy.safety_boundary))assert.equal(value,false);
});

test('v4.5.63 pins every active baseline and accepts only the exact authorized successor set',()=>{
  assert.ok(baselineMode||successorMode,'active workflows are neither the exact v4.5.63 baseline nor exact v4.5.65 successor set');
  for(const [file,item] of active){
    const text=texts.get(file);
    const current=currentShas.get(file);
    if(current!==item.historical_git_blob_sha){
      const successor=successors.get(file);
      assert.ok(successor,`${file}: missing successor contract`);
      assert.equal(successor.v4562_git_blob_sha,item.historical_git_blob_sha,`${file}: historical anchor drift`);
      assert.equal(current,successor.v4564_diagnostic_git_blob_sha,`${file}: unauthorized successor blob`);
    }
    assert.match(text,/node-version:\s*['"]24['"]/m,`${file}: project Node 24 contract missing`);
  }
  assert.equal(lifecycle.execution_boundary.wildcard_or_current_state_acceptance_authorized,false);
});

test('v4.5.63 action reference counts are exact for baseline or exact successor mode',()=>{
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
