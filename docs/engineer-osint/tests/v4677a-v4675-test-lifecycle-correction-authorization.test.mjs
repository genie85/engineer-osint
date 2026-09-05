import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4677A_V4675_TEST_LIFECYCLE_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.77a pins failed V4673A retry, immutable V4676A correction and exact V4675A test transition',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4675-test-lifecycle-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'2ab668a4683581a36d6eb272c0a12220c636f159');
  assert.equal(auth.failed_implementation.pr_number,412);
  assert.equal(auth.failed_implementation.head_sha,'9a50da056e26d420097eb83b4eb97513a3b9b5a9');
  assert.deepEqual(auth.failed_implementation.exact_head_workflow_runs,[33968075849,33968075834,33968075798,33968075754]);
  assert.equal(auth.immutable_correction_authorization.path,`${root}/V4676A_V4675_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`);
  assert.equal(auth.immutable_correction_authorization.git_blob_sha,'511a26f25f6708024ecb4c4fa0290207cf794266');
  assert.equal(gitBlobSha(readFileSync(auth.immutable_correction_authorization.path)),auth.immutable_correction_authorization.git_blob_sha);
  assert.equal(auth.authorized_target.source_git_blob_sha,'1dc631016cc8971086a1084199ba91b362b2d168');
  assert.equal(auth.authorized_target.successor_git_blob_sha,'2490c698a5840f43c6b16c12f3337678bb991ca3');
});

test('v4.6.77a remains lifecycle-compatible with its own exact V4675A regression successor',()=>{
  const blob=gitBlobSha(readFileSync(auth.authorized_target.path));
  assert.ok([auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha].includes(blob),'V4675A regression test must be exact source or exact authorized successor');
});

test('v4.6.77a keeps V4673A retry, canonical execution and B106 separated',()=>{
  assert.ok(auth.authorized_semantics.some(value=>/reject wildcard, dynamic-current-state, partial, mixed or unknown/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_one_test,true);
  assert.equal(auth.implementation_requirements.materialized_successor_required,true);
  assert.equal(auth.implementation_requirements.separate_v4673a_retry_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.v4675a_test_successor_permitted,true);
  assert.equal(auth.authorization.v4673a_retry_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
