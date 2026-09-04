import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4661_V4660_TEST_SUCCESSOR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const targetPath=auth.target_test.path;
const source='e6bd4b89b9f7802103c092c2c67d2da594c32e81';
const successor='001a6625e2bdc2fa20f5f0d97b5eb23c29bb4388';

test('v4.6.61 pins one exact v4660 test successor and the reviewed main',()=>{
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_dynamic_state.main_sha,'bb0bde6165610b3c42adf62e72ad43f137f6b872');
  assert.equal(auth.target_test.source_git_blob_sha,source);
  assert.equal(auth.target_test.successor_git_blob_sha,successor);
  assert.equal(auth.target_test.implementation_requires_separate_slice,true);
  const current=gitBlobSha(readFileSync(targetPath,'utf8'));
  assert.ok([source,successor].includes(current),`v4.6.60 test is outside exact authorized source/successor states: ${current}`);
});

test('v4.6.61 pins the exact complete B105 transition identities and forbids mixed/wildcard modes',()=>{
  const c=auth.exact_transition_contract;
  assert.equal(c.workflow_predecessor_git_blob_sha,'cb7e4d186ff3a79675ace8c48754317ffdede233');
  assert.equal(c.workflow_successor_git_blob_sha,'0aded293ae69be3844c73f6613f0a70b05320156');
  assert.equal(c.helper_predecessor_git_blob_sha,'7e9480f421cdd811c2660033e4539f926ce5ad7b');
  assert.equal(c.helper_successor_git_blob_sha,'c7527860a5f175000b634a25d170698d70569b53');
  assert.equal(c.historical_test_source_and_successor_blobs.length,8);
  assert.equal(new Set(c.historical_test_source_and_successor_blobs.map(x=>x[0])).size,8);
  for(const [path,src,dst] of c.historical_test_source_and_successor_blobs){
    assert.match(src,/^[0-9a-f]{40}$/);assert.match(dst,/^[0-9a-f]{40}$/);assert.notEqual(src,dst,path);
  }
  assert.equal(c.partial_or_mixed_state_authorized,false);
  assert.equal(c.wildcard_or_current_state_acceptance_authorized,false);
});

test('v4.6.61 remains authorization-only and canonical execution stays forbidden',()=>{
  const i=auth.implementation_authorization;
  assert.equal(i.authorized,true);
  assert.equal(i.authorized_path,targetPath);
  assert.equal(i.implementation_requires_separate_slice,true);
  assert.equal(i.may_bundle_with_exact_v4660_eight_test_retry_and_v4658_workflow_helper_successors,true);
  for(const key of ['canonical_write_authorized','run_store_edit_authorized','photo_review_status_write_authorized','executor_change_authorized','runtime_or_ui_change_authorized','deployment_change_authorized','permission_change_authorized','b105_canonical_execution_authorized','b106_candidate_or_authorization_authorized'])assert.equal(i[key],false,key);
  assert.equal(auth.execution_state.target_test_successor_implemented,false);
  assert.equal(auth.execution_state.canonical_write_performed,false);
});
