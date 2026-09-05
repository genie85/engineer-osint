import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4673A_V4671_V4672A_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`,'utf8'));
const correction=JSON.parse(readFileSync(`${root}/V4674A_V4673_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.73a pins failed exact-head implementation and two exact guard transitions',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4671-v4672a-lifecycle-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'7ae96c484e2561950737efba41074991ef5d2413');
  assert.equal(auth.failed_implementation.pr_number,406);
  assert.equal(auth.failed_implementation.head_sha,'fa8c814792ef223f082b0335361927c905e4ab82');
  assert.deepEqual(auth.failed_implementation.exact_head_workflow_runs,[33960104147,33960104097,33960104093,33960104096]);
  assert.equal(auth.authorized_targets.length,2);
  assert.deepEqual(auth.authorized_targets.map(({source_git_blob_sha,successor_git_blob_sha})=>[source_git_blob_sha,successor_git_blob_sha]),[
    ['328471797d7a421769c706d6913c5bcaa7cf0c59','2e2941a782162d1a74fa61bb9f2e1ad73de04dac'],
    ['cb71fdd36081fa6b17cd5a560d1303354ec41660','bb7b82ff8d4a86f430cb1df36a223d3bb6a7b183']
  ]);
});

test('v4.6.73a is lifecycle-compatible with exact historical and corrected guard successors',()=>{
  assert.equal(correction.superseded_authorization.path,`${root}/V4673A_V4671_V4672A_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`);
  assert.equal(correction.superseded_authorization.git_blob_sha,'6abeb6ad9a111cfb421a2cf9297aad70ac6f113d');
  assert.equal(gitBlobSha(readFileSync(correction.superseded_authorization.path)),correction.superseded_authorization.git_blob_sha);
  for(const target of auth.authorized_targets){
    const matches=correction.authorized_targets.filter(value=>value.path===target.path);
    assert.equal(matches.length,1,`${target.path} must have exactly one corrected target`);
    const corrected=matches[0];
    assert.equal(corrected.source_git_blob_sha,target.source_git_blob_sha);
    const blob=gitBlobSha(readFileSync(target.path));
    assert.ok([target.source_git_blob_sha,target.successor_git_blob_sha,corrected.replacement_successor_git_blob_sha].includes(blob),`${target.path} must be exact source, exact historical successor, or exact corrected successor`);
  }
});

test('v4.6.73a keeps implementation, canonical execution and B106 separated',()=>{
  assert.ok(auth.authorized_semantics.some(value=>/no wildcard, dynamic-current-state, partial, mixed or unknown/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_two_guard_tests,true);
  assert.equal(auth.implementation_requirements.separate_v4670_implementation_retry_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.two_guard_successors_permitted,true);
  assert.equal(auth.authorization.v4670_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
