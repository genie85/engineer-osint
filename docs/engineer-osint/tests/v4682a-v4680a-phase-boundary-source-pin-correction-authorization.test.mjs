import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4682A_V4680A_PHASE_BOUNDARY_SOURCE_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.82a pins the exact failed authorization attempt and deterministic source-pin root cause',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4682a-v4680a-phase-boundary-source-pin-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'d4078fc4957e2fb661f97024bfe3915f8c161c36');
  assert.equal(auth.failed_authorization.pr_number,429);
  assert.equal(auth.failed_authorization.head_sha,'3c139b05357a765bbf93a768862748c6f74b6e30');
  assert.deepEqual(auth.failed_authorization.exact_head_workflow_runs,[34012108877,34012108875,34012108863,34012108860]);
  assert.equal(auth.failed_authorization.closed_unmerged,true);
  assert.equal(auth.failed_authorization.root_cause,'EXACT_SOURCE_GIT_BLOB_SHA_TRANSCRIPTION_ERROR');
  assert.equal(auth.root_cause.browser_flake_root_cause,false);
  assert.equal(auth.root_cause.successor_semantics_changed,false);
  assert.equal(auth.root_cause.wildcard_or_dynamic_acceptance_permitted,false);
  assert.equal(auth.root_cause.historical_authorization_rewritten,false);
});

test('v4.6.82a pins the fresh exact main source and unchanged pre-materialized successor',()=>{
  assert.equal(auth.authorized_successor.path,'docs/engineer-osint/tests/v4680a-b105-corrected-target-transitive-closure-authorization.test.mjs');
  assert.equal(auth.authorized_successor.source_git_blob_sha,'e28c381c7b1f4e57338b9ff5027895b7cc9a1de7');
  assert.equal(auth.authorized_successor.successor_git_blob_sha,'5b9658da3363273c15b58331c3b44f64c050300b');
  const currentAuthorizedSha=gitBlobSha(readFileSync(auth.authorized_successor.path));
  assert.ok(
    [auth.authorized_successor.source_git_blob_sha,auth.authorized_successor.successor_git_blob_sha].includes(currentAuthorizedSha),
    `V4680A authorization test must be exact source or exact authorized successor, got ${currentAuthorizedSha}`
  );
  assert.equal(auth.materialization_evidence.successor_git_blob_materialized,true);
  assert.equal(auth.materialization_evidence.successor_git_blob_read_back_verified,true);
});

test('v4.6.82a preserves exact ordered phases and all canonical/execution boundaries',()=>{
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
