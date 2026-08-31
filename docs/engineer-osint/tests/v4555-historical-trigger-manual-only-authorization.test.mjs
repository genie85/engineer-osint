import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4555_HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-historical-trigger-manual-only-authorization.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.55 separately authorizes only the future manual-only trigger conversion',()=>{
  assert.equal(policy.schema_version,'engineer-osint-historical-trigger-manual-only-authorization-v1');
  assert.equal(policy.status,'AUTHORIZED_EXACT_TWO_HISTORICAL_WORKFLOWS_MANUAL_ONLY_NEXT_SLICE');
  assert.equal(policy.reviewed_main_sha,'fe989b673b069f2d584f9dcdaf2f15fa931995ba');
  assert.equal(policy.reviewed_v4554_policy_git_blob_sha,'d9ce01ae676a942dc1e22433acb138d5330dde5e');
  const v4554=readFileSync(`${root}/V4554_MINIMIZED_WORKFLOW_TRIGGER_COVERAGE.json`,'utf8');
  assert.equal(gitBlobSha(v4554),policy.reviewed_v4554_policy_git_blob_sha);
  assert.equal(policy.application_contract.this_slice_performs_trigger_change,false);
});

test('v4.5.55 target set is exactly both retained historical evidence workflows',()=>{
  assert.deepEqual(policy.targets.map(x=>x.file).sort(),[
    'identity-fix-retirement-authorization.yml',
    'identity-fix-retirement-readiness.yml'
  ]);
  for(const target of policy.targets){
    const text=readFileSync(`.github/workflows/${target.file}`,'utf8');
    assert.equal(gitBlobSha(text),target.current_git_blob_sha,target.file);
    assert.equal(target.authorized_next_state,'WORKFLOW_DISPATCH_ONLY',target.file);
    assert.equal(target.file_must_be_retained,true,target.file);
    assert.equal(target.jobs_and_permissions_must_be_preserved,true,target.file);
    assert.match(text,/workflow_dispatch\s*:/,target.file);
    assert.match(text,/pull_request\s*:/,target.file);
    assert.match(text,/push\s*:/,target.file);
  }
});

test('v4.5.55 freezes all five active protections and keeps seven workflow files',()=>{
  assert.equal(policy.required_unchanged_active_protections.length,5);
  const actual=readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')).sort();
  assert.equal(actual.length,7);
  for(const item of policy.required_unchanged_active_protections){
    const text=readFileSync(`.github/workflows/${item.file}`,'utf8');
    assert.equal(gitBlobSha(text),item.git_blob_sha,item.file);
  }
});

test('v4.5.55 future state preserves current active CI coverage while making historical evidence manual-only',()=>{
  assert.deepEqual(policy.coverage_after_authorized_future_change,{
    workflow_file_count:7,
    active_production_protection_count:5,
    historical_evidence_file_count:2,
    automatic_historical_pull_request_trigger_count:0,
    automatic_historical_push_trigger_count:0,
    manual_historical_workflow_dispatch_count:2,
    broad_active_pull_request_main_docs_workflow_count:4,
    broad_active_push_main_docs_workflow_count:3,
    path_scoped_i18n_specialist_retained:true,
    current_pull_request_coverage_preserved_without_historical_automatic_triggers:true,
    current_main_push_coverage_preserved_without_historical_automatic_triggers:true
  });
});

test('v4.5.55 authorization is exact and forbids deletion, job edits and all data/runtime changes',()=>{
  const auth=policy.authorization;
  for(const key of ['one_execution_slice_only','edit_exact_two_target_workflow_trigger_blocks','remove_pull_request_triggers_from_targets','remove_push_triggers_from_targets','retain_workflow_dispatch_on_targets','retain_target_files'])assert.equal(auth[key],true,key);
  for(const key of ['edit_target_jobs','edit_target_permissions','delete_target_files','edit_any_active_protection','delete_any_active_protection','edit_any_other_workflow','delete_any_other_workflow','canonical_data_edit','run_store_manifest_edit','run_append','runtime_module_edit','historical_policy_or_audit_rewrite','manual_hash_edit'])assert.equal(auth[key],false,key);
});

test('v4.5.55 pins reviewed production evidence and B99 invariants',()=>{
  const evidence=policy.reviewed_v4554_production_evidence;
  assert.equal(evidence.v4554_final_pr_head_sha,'3a774fed64c3bfd5e4d759fe9e3f53dacbaf2f4b');
  assert.equal(evidence.v4554_pr_workflows_success,6);
  assert.equal(evidence.v4554_pr_workflows_failed,0);
  assert.equal(evidence.v4554_merge_sha,policy.reviewed_main_sha);
  assert.equal(evidence.v4554_push_workflows_success,3);
  assert.equal(evidence.v4554_push_workflows_failed,0);
  assert.equal(evidence.pages_run_id,33446070096);
  assert.equal(evidence.pages_artifact_id,9778082196);
  assert.equal(evidence.pages_build_version,policy.reviewed_main_sha);
  assert.equal(policy.required_unchanged_state.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(policy.required_unchanged_state.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
});

test('v4.5.55 authorization audit is read-only and passes fail-closed',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  const output=execFileSync(process.execPath,[`${root}/audit-historical-trigger-manual-only-authorization.mjs`],{encoding:'utf8'});
  assert.match(output,/HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION=PASS/);
  assert.match(output,/targets=2 workflows=7 active=5 future-historical-auto-pr=0 future-historical-auto-push=0 future-manual=2 broad-pr-active=4 broad-push-active=3 this-slice-trigger-change=0 next-slice-authorized=1/);
});
