import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4672A_V4671_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.72a preserves V4671 as immutable evidence and records the unavailable successor pin',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4671-successor-pin-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'8a51f83ea0bcb21a70a32a84779413fad42dacf0');
  assert.equal(auth.superseded_authorization.path,`${root}/V4671_V4670_TEST_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`);
  assert.equal(auth.superseded_authorization.git_blob_sha,'35d2c228137ec57a2845a56ca811714ecbba834a');
  assert.equal(gitBlobSha(readFileSync(auth.superseded_authorization.path)),auth.superseded_authorization.git_blob_sha);
  assert.equal(auth.superseded_authorization.immutable_historical_evidence,true);
  assert.equal(auth.superseded_authorization.rewrite_forbidden,true);
  assert.equal(auth.correction_reason.class,'UNMATERIALIZED_SUCCESSOR_OBJECT');
  assert.equal(auth.correction_reason.unavailable_successor_git_blob_sha,'02cefca0a160221c0f8545115d32da7b2c6ad032');
});

test('v4.6.72a pins exact source and replacement successor while authorization slice remains source state',()=>{
  assert.equal(auth.authorized_target.path,`${root}/tests/v4670-v4669a-lifecycle-compatibility-authorization.test.mjs`);
  assert.equal(auth.authorized_target.source_git_blob_sha,'e89c25af599f89583690b5b72bbf98f46724fb1a');
  assert.equal(auth.authorized_target.replacement_successor_git_blob_sha,'0e17237a65876cabe8ee14a9b333ddc28d053447');
  assert.notEqual(auth.authorized_target.source_git_blob_sha,auth.authorized_target.replacement_successor_git_blob_sha);
  assert.equal(gitBlobSha(readFileSync(auth.authorized_target.path)),auth.authorized_target.source_git_blob_sha);
});

test('v4.6.72a keeps implementation, B105 publication and B106 strictly separated',()=>{
  assert.ok(auth.replacement_semantics.some(value=>value.includes('exact source-or-exact-authorized-successor membership')));
  assert.ok(auth.replacement_semantics.some(value=>/no wildcard, dynamic-current-state, partial, mixed or unknown identity/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_one_test,true);
  assert.equal(auth.implementation_requirements.separate_v4669a_implementation_slice_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.corrected_v4670_test_successor_permitted,true);
  assert.equal(auth.authorization.v4669a_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
