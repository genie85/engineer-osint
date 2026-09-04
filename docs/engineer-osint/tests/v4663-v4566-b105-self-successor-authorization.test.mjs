import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const authText=readFileSync(`${root}/V4663_V4566_B105_SELF_SUCCESSOR_AUTHORIZATION.json`,'utf8');
const auth=JSON.parse(authText);
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const source='a74bdbbf767cdc986862da828ee394cfc09b3334';
const successor='1b889cd96fb1a057dc374af269a44601bf920444';

test('v4.6.63 pins the exact failed B105 retry and current reviewed main',()=>{
  assert.equal(gitBlobSha(authText),'4055a24660602d9a42d81fa80e283fe3810402ae');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_dynamic_state.main_sha,'db4989546d49b8222829736dcdd84f1acdddd0de');
  assert.equal(auth.reviewed_dynamic_state.open_pull_request_count,0);
  assert.equal(auth.reviewed_dynamic_state.canonical_current_run_id,'engineer-osint-20260903-B104');
  assert.equal(auth.failed_exact_implementation.pull_request,392);
  assert.equal(auth.failed_exact_implementation.head_sha,'32d478e525567f3ee475ed3c2406a5bbb6c4f135');
  assert.equal(auth.failed_exact_implementation.audit_workflow_run_id,33923487411);
  assert.deepEqual(auth.failed_exact_implementation.test_summary,{total:580,pass:576,fail:1,skip:3});
  assert.equal(auth.failed_exact_implementation.failing_test_git_blob_sha,'78472bc727d9b11a3a0258ee180f4dcfbcb290f1');
});

test('v4.6.63 authorizes only the exact B104-to-B105 v4565 dependency successor in v4566 guard',()=>{
  const t=auth.target_transition;
  assert.equal(t.guard_path,'docs/engineer-osint/tests/v4566-self-successor-authorization.test.mjs');
  assert.equal(t.guard_source_git_blob_sha,'78472bc727d9b11a3a0258ee180f4dcfbcb290f1');
  assert.equal(t.exact_b104_dependency_git_blob_sha,source);
  assert.equal(t.exact_b105_dependency_git_blob_sha,successor);
  const current=gitBlobSha(readFileSync(t.observed_dependency_path,'utf8'));
  assert.ok([source,successor].includes(current),`v4.5.65 dependency is outside exact B104/B105 states: ${current}`);
  const a=auth.authorized_change;
  assert.equal(a.authorized,true);
  assert.equal(a.authorized_test_file,t.guard_path);
  assert.equal(a.add_exact_b105_v4565_test_successor_only,true);
  assert.equal(a.exact_b105_v4565_test_successor_git_blob_sha,successor);
  assert.equal(a.preserve_all_existing_exact_lifecycle_successors,true);
  assert.equal(a.allow_wildcard_or_current_state_acceptance,false);
  assert.equal(a.allow_other_test_file_change,false);
  assert.equal(a.implementation_requires_separate_slice,true);
  assert.equal(a.may_bundle_with_exact_v4658_v4660_v4661_b105_retry,true);
});

test('v4.6.63 remains authorization-only and canonical execution stays forbidden',()=>{
  const a=auth.authorized_change;
  for(const key of ['allow_canonical_or_run_store_change','allow_runtime_or_ui_change','allow_deployment_or_permission_change','b105_canonical_execution_authorized','b106_candidate_or_authorization_authorized'])assert.equal(a[key],false,key);
  assert.equal(auth.execution_state.v4566_b105_successor_implemented,false);
  assert.equal(auth.execution_state.b105_workflow_compatibility_merged,false);
  assert.equal(auth.execution_state.canonical_write_performed,false);
  assert.match(auth.forbidden_changes.join('\n'),/wildcard/);
  assert.match(auth.forbidden_changes.join('\n'),/canonical/);
});
