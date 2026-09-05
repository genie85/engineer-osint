import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const authPath='docs/engineer-osint/V4668A_V4667_TEST_SUCCESSOR_AUTHORIZATION.json';
const auth=JSON.parse(readFileSync(authPath,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.68a pins exact v4667 source and successor with immutable upstream authorization',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4667-test-successor-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'dc392e96ecaf498a528e98ea29c941c072d46ca3');
  assert.equal(auth.upstream_authorization.path,'docs/engineer-osint/V4667_B105_POSTWRITE_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json');
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorization.path)),auth.upstream_authorization.git_blob_sha);
  assert.equal(auth.authorized_target.path,'docs/engineer-osint/tests/v4667-b105-postwrite-lifecycle-authorization.test.mjs');
  const targetBlob=gitBlobSha(readFileSync(auth.authorized_target.path));
  assert.ok([auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha].includes(targetBlob),'v4667 test must be exact source or exact authorized successor');
  assert.notEqual(auth.authorized_target.source_git_blob_sha,auth.authorized_target.successor_git_blob_sha);
});

test('v4.6.68a pins a complete exact 17-target source/successor inventory and rejects mixed state',()=>{
  assert.equal(auth.exact_test_state_pairs.length,17);
  assert.equal(new Set(auth.exact_test_state_pairs.map(([path])=>path)).size,17);
  for(const [path,source,successor] of auth.exact_test_state_pairs){
    assert.match(source,/^[0-9a-f]{40}$/);
    assert.match(successor,/^[0-9a-f]{40}$/);
    assert.notEqual(source,successor,`${path}: source and successor must remain distinct`);
  }
  const observed=auth.exact_test_state_pairs.map(([path,source,successor])=>({path,source,successor,actual:gitBlobSha(readFileSync(path))}));
  const allSource=observed.every(item=>item.actual===item.source);
  const allSuccessor=observed.every(item=>item.actual===item.successor);
  assert.ok(allSource||allSuccessor,'17-target state must be complete source or complete exact successor; partial/mixed/unknown state rejected');
  assert.equal(allSource&&allSuccessor,false);
});

test('v4.6.68a authorizes one test successor only and keeps canonical execution forbidden',()=>{
  assert.ok(auth.authorized_semantics.some(value=>value.includes('exact successor blob')));
  assert.ok(auth.authorized_semantics.some(value=>value.includes('complete 17-file source set')));
  assert.ok(auth.authorized_semantics.some(value=>value.includes('Mixed, partial, unknown')));
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.implementation_requirements.exact_target_blob_required,true);
  assert.equal(auth.implementation_requirements.full_exact_head_ci_required,true);
  assert.equal(auth.implementation_requirements.separate_17_target_implementation_slice_required,true);
  assert.equal(auth.authorization.target_test_successor_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
