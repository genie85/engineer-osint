import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4675A_V4673_TEST_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.75a pins failed exact-head retry, immutable V4674A correction and exact V4673A test transition',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4673-test-lifecycle-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'5d64257c96ee64c9bd8ed6570c5c31b6de0b026b');
  assert.equal(auth.failed_implementation.pr_number,409);
  assert.equal(auth.failed_implementation.head_sha,'d828332dbda30d464788c0858f8ba8082558fb3d');
  assert.deepEqual(auth.failed_implementation.exact_head_workflow_runs,[33964222288,33964222297,33964222292,33964222321]);
  assert.equal(auth.immutable_correction_authorization.path,`${root}/V4674A_V4673_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`);
  assert.equal(auth.immutable_correction_authorization.git_blob_sha,'4dd1c333b071bc0f613474fea199a0eb3d9768f7');
  assert.equal(gitBlobSha(readFileSync(auth.immutable_correction_authorization.path)),auth.immutable_correction_authorization.git_blob_sha);
  assert.equal(auth.immutable_correction_authorization.immutable,true);
  assert.equal(auth.authorized_target.source_git_blob_sha,'112f904f14be43f9bafcba26035a92df2d09d203');
  assert.equal(auth.authorized_target.successor_git_blob_sha,'36816faa5823d4887caf66b296fcae9a3411b186');
});

test('v4.6.75a remains lifecycle-compatible with its own exact V4673A successor',()=>{
  const blob=gitBlobSha(readFileSync(auth.authorized_target.path));
  assert.ok([auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha].includes(blob),'V4673A regression test must be exact source or exact authorized successor');
});

test('v4.6.75a preserves strict separation from guard retry, v4670, canonical execution and B106',()=>{
  assert.ok(auth.authorized_semantics.some(value=>/reject missing correction mapping, wildcard, dynamic-current-state, partial, mixed or unknown/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_one_test,true);
  assert.equal(auth.implementation_requirements.separate_two_guard_retry_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.v4673a_test_successor_permitted,true);
  assert.equal(auth.authorization.two_guard_retry_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
