import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4670A_B105_GUARD_COMPATIBILITY_SUPERSESSION_AUTHORIZATION.json`,'utf8'));
const predecessor=JSON.parse(readFileSync(auth.supersedes.authorization_path,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.70a pins the failed exact-head compatibility blocker and immutable predecessor authorization',()=>{
  assert.equal(auth.schema_version,'engineer-osint-b105-guard-compatibility-supersession-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'a77faab3db9b9b52b16f0699f89617985d6a570f');
  assert.equal(auth.supersedes.failed_pull_request,401);
  assert.equal(auth.supersedes.failed_head_sha,'98ff5969a8270a4192d33c5116c1980f9cc9b1c0');
  assert.equal(gitBlobSha(readFileSync(auth.supersedes.authorization_path)),auth.supersedes.authorization_git_blob_sha);
  assert.equal(auth.supersedes.authorization_git_blob_sha,'9fbdd5a65816aace6be15700f36d4fa807641ef6');
  assert.equal(auth.root_cause.class,'AUTHORIZATION_TEST_LIFECYCLE_COMPATIBILITY_BLOCKER');
  assert.equal(auth.root_cause.blocked_test_source_git_blob_sha,'616405eaa413ec5552099dfec419f298c47a9440');
  assert.equal(auth.root_cause.required_successor_git_blob_sha,'de25e77c83b51d818e0043412d2b0eac4aba80cf');
  assert.equal(predecessor.corrected_exact_test_state_pairs.length,17);
});

test('v4.6.70a authorizes one atomic exact three-guard source-to-successor transition',()=>{
  assert.equal(auth.authorized_guard_targets.length,3);
  assert.equal(new Set(auth.authorized_guard_targets.map(item=>item.path)).size,3);
  const observed=auth.authorized_guard_targets.map(item=>({
    ...item,
    actual:gitBlobSha(readFileSync(item.path))
  }));
  const sourceState=observed.every(item=>item.actual===item.source_git_blob_sha);
  const successorState=observed.every(item=>item.actual===item.successor_git_blob_sha);
  assert.ok(sourceState||successorState,'three-guard compatibility state must be complete exact source or complete exact successor');
  assert.equal(sourceState&&successorState,false,'source and successor states must remain distinct');
  assert.deepEqual(observed.map(item=>item.successor_git_blob_sha),[
    'ff4c40de42c7675c0b7f3701b142fee9c7fc989d',
    'f2cd9e4663cbb8cdb83140a89dde624f3cfa8f95',
    'de25e77c83b51d818e0043412d2b0eac4aba80cf'
  ]);
});

test('v4.6.70a preserves the 17-target, canonical, executor and B106 boundaries',()=>{
  for(const [path,source] of predecessor.corrected_exact_test_state_pairs){
    assert.equal(gitBlobSha(readFileSync(path)),source,`${path}: authorization slice must remain on exact source blob`);
  }
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.implementation_requirements.change_exactly_three_guard_tests,true);
  assert.equal(auth.implementation_requirements.use_exact_successor_blobs,true);
  assert.equal(auth.implementation_requirements.atomic_source_or_successor_state_required,true);
  assert.equal(auth.authorization.three_guard_compatibility_implementation_permitted,true);
  assert.equal(auth.authorization.change_17_targets_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b105_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
