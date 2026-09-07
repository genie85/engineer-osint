import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4683A_V4682A_LIFECYCLE_SELF_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
const repair=JSON.parse(readFileSync(`${root}/V4686A_B105_POSTWRITE_FIXTURE_REPAIR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.83a pins the exact failed V4682A-authorized implementation and repeated root cause',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4683a-v4682a-lifecycle-self-pin-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'a3c85a7ff931c37b084f672c2b8d81a951781dbe');
  assert.equal(auth.failed_implementation.pr_number,431);
  assert.equal(auth.failed_implementation.head_sha,'fe87b508285f6ff536c495be1ed159e80233dc09');
  assert.deepEqual(auth.failed_implementation.exact_head_workflow_runs,[34017163352,34017163398,34017163361,34017163360]);
  assert.equal(auth.failed_implementation.closed_unmerged,true);
  assert.equal(auth.failed_implementation.root_cause,'AUTHORIZATION_REGRESSION_SOURCE_ONLY_SELF_PIN');
  assert.equal(auth.root_cause.repeated_generalizable_pattern,true);
  assert.equal(auth.root_cause.wildcard_or_dynamic_acceptance_permitted,false);
  assert.equal(auth.root_cause.historical_authorization_rewritten,false);
});

test('v4.6.83a pins one pre-materialized exact V4682A test successor and permits only exact lifecycle endpoints including authorized postwrite repair',()=>{
  assert.equal(auth.authorized_successor.path,'docs/engineer-osint/tests/v4682a-v4680a-phase-boundary-source-pin-correction-authorization.test.mjs');
  assert.equal(auth.authorized_successor.source_git_blob_sha,'1bfbffd2348634fd9126eeffbb878142c5e57624');
  assert.equal(auth.authorized_successor.successor_git_blob_sha,'8cff3e7fd5519ff827472baa17a0971538ef80ee');
  assert.notEqual(auth.authorized_successor.source_git_blob_sha,auth.authorized_successor.successor_git_blob_sha);
  assert.match(auth.authorized_successor.source_git_blob_sha,/^[0-9a-f]{40}$/);
  assert.match(auth.authorized_successor.successor_git_blob_sha,/^[0-9a-f]{40}$/);
  const repairTarget=repair.exact_repair_targets.find(item=>item.path===auth.authorized_successor.path);
  assert.ok(repairTarget,'postwrite repair must pin V4682A target');
  const currentSha=gitBlobSha(readFileSync(auth.authorized_successor.path));
  assert.ok([auth.authorized_successor.source_git_blob_sha,auth.authorized_successor.successor_git_blob_sha,repairTarget.successor_git_blob_sha].includes(currentSha));
  assert.equal(auth.materialization_evidence.successor_git_blob_materialized,true);
  assert.equal(auth.materialization_evidence.successor_git_blob_read_back_verified,true);
});

test('v4.6.83a preserves ordered implementation and canonical/execution boundaries',()=>{
  assert.deepEqual(auth.implementation_sequence,[
    'install_exact_v4682a_regression_successor_only',
    'after_green_merge_retry_exact_v4680a_regression_successor',
    'after_that_green_merge_retry_v4680a_phase_1',
    'continue_remaining_v4680a_phases_only_after_each_prior_phase_green_merge',
    'allow_separately_authorized_b105_executor_retry_only_after_all_required_implementation_phases_green_merge'
  ]);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.exact_v4682a_test_successor_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b105_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});