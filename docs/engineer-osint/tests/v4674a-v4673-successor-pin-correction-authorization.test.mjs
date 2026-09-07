import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4674A_V4673_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
const repair=JSON.parse(readFileSync(`${root}/V4686A_B105_POSTWRITE_FIXTURE_REPAIR_AUTHORIZATION.json`,'utf8'));
const historicalNextGuardSuccessors=new Map([
  [`${root}/tests/v4671-v4670-test-lifecycle-compatibility-authorization.test.mjs`,'9484399067b3defa79439e0054ceb1731902dc0f'],
  [`${root}/tests/v4672a-v4671-successor-pin-correction-authorization.test.mjs`,'f65f730a9060ee1c00b36a1757c355801543dc6c']
]);
const correctedB105GuardSuccessors=new Map([
  [`${root}/tests/v4671-v4670-test-lifecycle-compatibility-authorization.test.mjs`,'eba6a60c87541d4b3c2efd2adc58737716dd19cb'],
  [`${root}/tests/v4672a-v4671-successor-pin-correction-authorization.test.mjs`,'4f7d1c980a426bdec50afeb7dbeff34c78d1c9ec']
]);
const correctedPostwriteGuardSuccessors=new Map([
  [`${root}/tests/v4671-v4670-test-lifecycle-compatibility-authorization.test.mjs`,'c62af7e855930f67b5f4ec3e656261275dfacd4a'],
  [`${root}/tests/v4672a-v4671-successor-pin-correction-authorization.test.mjs`,'2778f959bafa46e0ebcff8db25557615807a9e90']
]);
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.74a preserves V4673A as immutable evidence and corrects only unreachable successor pins',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4673-successor-pin-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'52629a9f4574245b6d84b3a2fde4cb4b2b363abb');
  assert.equal(auth.superseded_authorization.path,`${root}/V4673A_V4671_V4672A_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json`);
  assert.equal(auth.superseded_authorization.git_blob_sha,'6abeb6ad9a111cfb421a2cf9297aad70ac6f113d');
  assert.equal(gitBlobSha(readFileSync(auth.superseded_authorization.path)),auth.superseded_authorization.git_blob_sha);
  assert.equal(auth.superseded_authorization.immutable_historical_evidence,true);
  assert.equal(auth.superseded_authorization.rewrite_forbidden,true);
  assert.deepEqual(auth.correction_reason.unavailable_successor_git_blob_shas,[
    '2e2941a782162d1a74fa61bb9f2e1ad73de04dac',
    'bb7b82ff8d4a86f430cb1df36a223d3bb6a7b183'
  ]);
});

test('v4.6.74a pins exact source, replacement, historical-next, corrected-B105 and authorized postwrite-repair successor for both guards',()=>{
  assert.deepEqual(auth.authorized_targets.map(({source_git_blob_sha,replacement_successor_git_blob_sha})=>[source_git_blob_sha,replacement_successor_git_blob_sha]),[
    ['328471797d7a421769c706d6913c5bcaa7cf0c59','aabab65b8717966d93359561f54203e1d498ae99'],
    ['cb71fdd36081fa6b17cd5a560d1303354ec41660','491307796f1737e5dd7f002017b66f81f21c22fa']
  ]);
  for(const target of auth.authorized_targets){
    const historicalNext=historicalNextGuardSuccessors.get(target.path);
    const correctedB105=correctedB105GuardSuccessors.get(target.path);
    const correctedPostwrite=correctedPostwriteGuardSuccessors.get(target.path);
    const repairTarget=repair.exact_repair_targets.find(item=>item.path===target.path);
    assert.ok(historicalNext&&correctedB105&&correctedPostwrite&&repairTarget,`${target.path} must have exact pinned lifecycle successors`);
    const blob=gitBlobSha(readFileSync(target.path));
    assert.ok([target.source_git_blob_sha,target.replacement_successor_git_blob_sha,historicalNext,correctedB105,repairTarget.successor_git_blob_sha,correctedPostwrite].includes(blob),`${target.path} must be an exact pinned lifecycle state`);
  }
});

test('v4.6.74a keeps guard implementation, v4670 retry, canonical execution and B106 separated',()=>{
  assert.ok(auth.replacement_semantics.some(value=>/no wildcard, dynamic-current-state, partial, mixed or unknown/i.test(value)));
  assert.equal(auth.implementation_requirements.change_exactly_two_guard_tests,true);
  assert.equal(auth.implementation_requirements.separate_v4670_implementation_retry_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.corrected_two_guard_successors_permitted,true);
  assert.equal(auth.authorization.v4670_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});