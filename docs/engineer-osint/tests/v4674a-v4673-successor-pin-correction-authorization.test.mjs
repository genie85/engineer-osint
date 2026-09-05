import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4674A_V4673_SUCCESSOR_PIN_CORRECTION_AUTHORIZATION.json`,'utf8'));
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

test('v4.6.74a pins exact source and replacement successor for both guards',()=>{
  assert.deepEqual(auth.authorized_targets.map(({source_git_blob_sha,replacement_successor_git_blob_sha})=>[source_git_blob_sha,replacement_successor_git_blob_sha]),[
    ['328471797d7a421769c706d6913c5bcaa7cf0c59','aabab65b8717966d93359561f54203e1d498ae99'],
    ['cb71fdd36081fa6b17cd5a560d1303354ec41660','491307796f1737e5dd7f002017b66f81f21c22fa']
  ]);
  for(const target of auth.authorized_targets){
    const blob=gitBlobSha(readFileSync(target.path));
    assert.ok([target.source_git_blob_sha,target.replacement_successor_git_blob_sha].includes(blob),`${target.path} must be exact source or exact corrected successor`);
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
