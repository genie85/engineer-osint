import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4670_V4669A_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`,'utf8'));
const correction=JSON.parse(readFileSync(`${root}/V4678A_V4669A_SUCCESSOR_MATERIALIZATION_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.70 pins the exact red V4669B implementation and immutable V4669A authorization',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4669a-lifecycle-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'a77faab3db9b9b52b16f0699f89617985d6a570f');
  assert.equal(auth.blocked_implementation.pr_number,401);
  assert.equal(auth.blocked_implementation.head_sha,'98ff5969a8270a4192d33c5116c1980f9cc9b1c0');
  assert.deepEqual(auth.blocked_implementation.exact_head_workflow_runs,[33953105994,33953105996,33953106046,33953106030]);
  assert.equal(auth.upstream_authorization.path,`${root}/V4669A_B105_SUCCESSOR_INVENTORY_CORRECTION_AUTHORIZATION.json`);
  assert.equal(auth.upstream_authorization.git_blob_sha,'9fbdd5a65816aace6be15700f36d4fa807641ef6');
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorization.path)),auth.upstream_authorization.git_blob_sha);
  assert.equal(auth.upstream_authorization.immutable,true);
});

test('v4.6.70 authorizes one exact V4669A test successor from the exact current source',()=>{
  assert.equal(auth.authorized_target.path,`${root}/tests/v4669a-b105-successor-inventory-correction-authorization.test.mjs`);
  assert.equal(auth.authorized_target.source_git_blob_sha,'616405eaa413ec5552099dfec419f298c47a9440');
  assert.equal(auth.authorized_target.successor_git_blob_sha,'4396d5e87af72ddeb90ca080ea0b105411076cad');
  assert.notEqual(auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha);
  assert.equal(correction.authorized_targets.v4669a_test.path,auth.authorized_target.path);
  assert.equal(correction.authorized_targets.v4669a_test.source_git_blob_sha,auth.authorized_target.source_git_blob_sha);
  assert.equal(correction.authorized_targets.v4669a_test.unavailable_successor_git_blob_sha,auth.authorized_target.successor_git_blob_sha);
  assert.ok([auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha,correction.authorized_targets.v4669a_test.replacement_successor_git_blob_sha].includes(gitBlobSha(readFileSync(auth.authorized_target.path))));
});

test('v4.6.70 compatibility scope stays atomic, fail-closed and separate from B105 publication',()=>{
  assert.ok(auth.authorized_semantics.some(value=>value.includes('exact atomic source-pair OR exact atomic authorized-successor-pair')));
  assert.ok(auth.authorized_semantics.some(value=>/reject mixed, partial, unknown, wildcard/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_one_test,true);
  assert.equal(auth.implementation_requirements.separate_original_two_guard_implementation_slice_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.v4669a_lifecycle_test_successor_permitted,true);
  assert.equal(auth.authorization.original_two_guard_implementation_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
