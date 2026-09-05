import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4676A_V4675_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.76a pins immutable V4675A evidence and exact corrected V4673A lifecycle',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4675-successor-pin-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'b4f77f32d62aead5049515da9b57d7feb7688047');
  assert.equal(auth.superseded_authorization.path,`${root}/V4675A_V4673_TEST_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`);
  assert.equal(auth.superseded_authorization.git_blob_sha,'586686a0569c93b0024b9ce1b420df0f1885d7bc');
  assert.equal(gitBlobSha(readFileSync(auth.superseded_authorization.path)),auth.superseded_authorization.git_blob_sha);
  assert.equal(auth.superseded_authorization.immutable_historical_evidence,true);
  assert.equal(auth.authorized_target.path,`${root}/tests/v4673a-v4671-v4672a-lifecycle-compatibility-authorization.test.mjs`);
  assert.equal(auth.authorized_target.source_git_blob_sha,'112f904f14be43f9bafcba26035a92df2d09d203');
  assert.equal(auth.authorized_target.replacement_successor_git_blob_sha,'c635f0f1c671c0fa51561da6742160da8f1bea3b');
  assert.notEqual(auth.authorized_target.source_git_blob_sha,auth.authorized_target.replacement_successor_git_blob_sha);
});

test('v4.6.76a is lifecycle-compatible with its exact corrected target transition',()=>{
  const blob=gitBlobSha(readFileSync(auth.authorized_target.path));
  assert.ok([auth.authorized_target.source_git_blob_sha,auth.authorized_target.replacement_successor_git_blob_sha].includes(blob),'V4673A regression must be exact source or exact corrected successor');
});

test('v4.6.76a preserves fail-closed separation from guard retry, publication and B106',()=>{
  assert.ok(auth.replacement_semantics.some(value=>/exactly one corrected mapping/i.test(value)));
  assert.ok(auth.replacement_semantics.some(value=>/reject missing mapping, wildcard, dynamic-current-state, partial, mixed or unknown/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_one_test,true);
  assert.equal(auth.implementation_requirements.separate_two_guard_retry_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.corrected_v4673a_test_successor_permitted,true);
  assert.equal(auth.authorization.two_guard_retry_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
