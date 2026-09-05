import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4671_V4670_TEST_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.71 pins immutable v4.6.70 authorization and exact v4670 test lifecycle',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4670-test-lifecycle-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'6849738d82f47249d1bd5a4051b5826be6620859');
  assert.equal(auth.upstream_authorization.path,`${root}/V4670_V4669A_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`);
  assert.equal(auth.upstream_authorization.git_blob_sha,'5ab11a756d1e1636cf79f7b9eac348067e538013');
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorization.path)),auth.upstream_authorization.git_blob_sha);
  assert.equal(auth.upstream_authorization.immutable,true);
  assert.equal(auth.authorized_target.path,`${root}/tests/v4670-v4669a-lifecycle-compatibility-authorization.test.mjs`);
  assert.equal(auth.authorized_target.source_git_blob_sha,'e89c25af599f89583690b5b72bbf98f46724fb1a');
  assert.equal(auth.authorized_target.successor_git_blob_sha,'02cefca0a160221c0f8545115d32da7b2c6ad032');
  assert.notEqual(auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha);
});

test('v4.6.71 remains lifecycle-compatible with its own authorized v4670 successor',()=>{
  const targetBlob=gitBlobSha(readFileSync(auth.authorized_target.path));
  assert.ok([auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha,'0e17237a65876cabe8ee14a9b333ddc28d053447'].includes(targetBlob),'v4670 test must be exact source or exact authorized successor');
});

test('v4.6.71 preserves strict separation from V4669A, B105 publication and B106',()=>{
  assert.ok(auth.authorized_semantics.some(value=>value.includes('source-or-exact-authorized-successor')));
  assert.ok(auth.authorized_semantics.some(value=>/no wildcard, dynamic-current-state, unknown or unpinned/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_one_test,true);
  assert.equal(auth.implementation_requirements.separate_v4669a_implementation_slice_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.v4670_test_successor_permitted,true);
  assert.equal(auth.authorization.v4669a_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
