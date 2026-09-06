import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4681A_V4680A_PHASE_BOUNDARY_SUCCESSOR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.81a pins the exact red phase-1 attempt and deterministic authorization self-incompatibility',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4681a-v4680a-phase-boundary-successor-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'d4078fc4957e2fb661f97024bfe3915f8c161c36');
  assert.equal(auth.blocked_implementation.pr_number,428);
  assert.equal(auth.blocked_implementation.head_sha,'f0e931206a20fc3fca67dd8b8f66f90b1d64cc2a');
  assert.deepEqual(auth.blocked_implementation.exact_head_workflow_runs,[34009898389,34009898377,34009898425,34009898410]);
  assert.equal(auth.blocked_implementation.closed_unmerged,true);
  assert.equal(auth.blocked_implementation.root_cause,'V4680A_AUTHORIZATION_TEST_NOT_LIFECYCLE_AWARE_FOR_ITS_OWN_ORDERED_PHASES');
  assert.equal(auth.root_cause.browser_flake_root_cause,false);
  assert.equal(auth.root_cause.wildcard_or_dynamic_acceptance_permitted,false);
  assert.equal(auth.root_cause.historical_v4680a_authorization_rewritten,false);
});

test('v4.6.81a authorizes one pre-materialized exact V4680A regression successor while this slice remains source state',()=>{
  assert.equal(auth.authorized_successor.path,'docs/engineer-osint/tests/v4680a-b105-corrected-target-transitive-closure-authorization.test.mjs');
  assert.equal(auth.authorized_successor.source_git_blob_sha,'e28c381c92bcb597c713239453567009d4e78c19');
  assert.equal(auth.authorized_successor.successor_git_blob_sha,'5b9658da3363273c15b58331c3b44f64c050300b');
  assert.equal(gitBlobSha(readFileSync(auth.authorized_successor.path)),auth.authorized_successor.source_git_blob_sha);
  assert.equal(auth.materialization_evidence.successor_git_blob_materialized,true);
  assert.equal(auth.materialization_evidence.successor_git_blob_read_back_verified,true);
});

test('v4.6.81a preserves exact ordered phases and all canonical/execution boundaries',()=>{
  assert.deepEqual(auth.implementation_sequence,[
    'install_exact_v4680a_test_successor_only',
    'after_green_merge_retry_v4680a_phase_1_exact_six_successors',
    'continue_v4680a_phases_2_through_7_only_after_each_prior_phase_green_merge',
    'allow_separately_authorized_b105_executor_retry_only_after_phase_7_green_merge'
  ]);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.exact_v4680a_test_successor_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b105_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
