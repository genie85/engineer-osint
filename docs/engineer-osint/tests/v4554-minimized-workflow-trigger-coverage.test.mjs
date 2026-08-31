import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {assertHistoricalWorkflowCurrentOrV4556,assertActiveProtectionCurrentOrV4557,assertV4556Applied,gitBlobSha as lifecycleBlobSha} from './v4556-workflow-lifecycle-helper.mjs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4554_MINIMIZED_WORKFLOW_TRIGGER_COVERAGE.json`,'utf8'));
const audit=readFileSync(`${root}/audit-minimized-workflow-trigger-coverage.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.54 is read-only trigger coverage review over exact v4.5.53 production',()=>{
  assert.equal(policy.schema_version,'engineer-osint-minimized-workflow-trigger-coverage-v1');
  assert.equal(policy.status,'READ_ONLY_TRIGGER_COVERAGE_REVIEW_NO_TRIGGER_CHANGE_AUTHORIZED');
  assert.equal(policy.reviewed_main_sha,'483ddeb2da16a29043902f14e265b31b2c8cbc98');
  assert.equal(policy.reviewed_v4553_policy_git_blob_sha,'aa16712ecf935936719522ff15ab7b7599d3e6aa');
  const v4553=readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8');
  assert.equal(gitBlobSha(v4553),policy.reviewed_v4553_policy_git_blob_sha);
  for(const value of Object.values(policy.authorization))assert.equal(value,false);
});

test('v4.5.54 pins exactly seven historical workflow identities with 5 active and 2 later-authorized successors',()=>{
  assert.deepEqual(policy.workflow_inventory,{total:7,active_production_protection:5,historical_evidence_keep:2,migration_ci_debt_candidate:0});
  const expected=[...policy.active_production_protections,...policy.historical_evidence_workflows];
  const actual=readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')).sort();
  assert.equal(expected.length,7);
  assert.deepEqual(actual,expected.map(x=>x.file).sort());
  for(const item of policy.active_production_protections)assertActiveProtectionCurrentOrV4557(item);
  for(const item of policy.historical_evidence_workflows)assertHistoricalWorkflowCurrentOrV4556(item);
});

test('v4.5.54 explains observed 6 PR and 3 push runs without relying on historical workflows for current coverage',()=>{
  const observed=policy.observed_v4553_ci;
  assert.equal(observed.final_pr_head_sha,'79b839ea5e9943cc3dcd4ccb3ea42ea5fe086644');
  assert.equal(observed.pull_request_workflows_triggered,6);
  assert.equal(observed.pull_request_workflows_success,6);
  assert.equal(observed.pull_request_workflows_failed,0);
  assert.equal(observed.production_main_sha,policy.reviewed_main_sha);
  assert.equal(observed.push_workflows_triggered,3);
  assert.equal(observed.push_workflows_success,3);
  assert.equal(observed.push_workflows_failed,0);
  assert.equal(observed.pages_run_id,33445402934);
  assert.equal(observed.pages_artifact_id,9777837903);
  assert.equal(observed.pages_build_version,policy.reviewed_main_sha);
  assert.equal(observed.pages_environment_url,'https://genie85.github.io/engineer-osint/');
  assert.equal(policy.coverage_proof.broad_active_pull_request_main_docs_workflow_count,4);
  assert.equal(policy.coverage_proof.broad_active_push_main_docs_workflow_count,3);
  assert.equal(policy.coverage_proof.historical_workflows_required_for_current_pull_request_coverage,false);
  assert.equal(policy.coverage_proof.historical_workflows_required_for_current_main_push_coverage,false);
});

test('v4.5.54 identifies both historical automatic PR triggers only as candidates for separate manual-only review',()=>{
  assert.deepEqual(policy.historical_evidence_workflows.map(x=>x.file).sort(),['identity-fix-retirement-authorization.yml','identity-fix-retirement-readiness.yml']);
  for(const item of policy.historical_evidence_workflows){
    assert.equal(item.pull_request_main_docs_broad,true,item.file);
    assert.equal(item.push_main,false,item.file);
    assert.equal(item.push_historical_branches_only,true,item.file);
    assert.equal(item.workflow_dispatch,true,item.file);
    assert.equal(item.automatic_current_pr_trigger_disposition,'REDUNDANT_CANDIDATE_FOR_SEPARATE_MANUAL_ONLY_REVIEW',item.file);
  }
  assert.equal(policy.required_next_slice.must_preserve_workflow_dispatch_for_historical_evidence,true);
  assert.equal(policy.required_next_slice.must_not_delete_historical_evidence_files,true);
  assert.equal(policy.required_next_slice.must_preserve_all_five_active_protection_blobs,true);
});

test('v4.5.54 audit remains immutable while v4.5.56 separately consumes its recommendation',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  assert.equal(lifecycleBlobSha(audit),'ff922f8ac9578381d0311adb2134c30edbff32de');
  assertV4556Applied();
});
