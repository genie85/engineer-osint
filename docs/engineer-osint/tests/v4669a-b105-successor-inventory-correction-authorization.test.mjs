import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4669A_B105_SUCCESSOR_INVENTORY_CORRECTION_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.69a pins the historical authorization and exact two-entry transcription correction',()=>{
  assert.equal(auth.schema_version,'engineer-osint-b105-successor-inventory-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'20ae89f1975dd458701956206210a5676bee8904');
  assert.equal(gitBlobSha(readFileSync(auth.historical_v4668a_authorization.path)),auth.historical_v4668a_authorization.git_blob_sha);
  assert.equal(auth.historical_v4668a_authorization.git_blob_sha,'2007457061ea4815064db7cfbf8ca9d4fda6d8ff');
  assert.equal(auth.historical_v4668a_authorization.immutable_historical_evidence,true);
  assert.equal(auth.correction_reason.class,'MANUAL_SHA_TRANSCRIPTION_ERROR');
  assert.equal(auth.correction_reason.invalid_entries.length,2);
  assert.deepEqual(auth.correction_reason.invalid_entries.map(item=>item.path),[
    `${root}/tests/v4605-canonical-executor-authorization.test.mjs`,
    `${root}/tests/v4606-authorized-canonical-executor.test.mjs`
  ]);
  assert.equal(auth.correction_reason.invalid_entries[0].correct_successor_git_blob_sha,'c12146e71a4af724748904739ac4ddaaf7abafdd');
  assert.equal(auth.correction_reason.invalid_entries[1].correct_successor_git_blob_sha,'89354a2ec0ae6c213dec0df203ca8ec5ba748d3b');
  assert.equal(auth.validated_successor_tree_sha,'424023597322a092ac7da6908799405696e24342');
});

test('v4.6.69a pins all 17 corrected successor identities while the authorization slice remains exact source state',()=>{
  assert.equal(auth.corrected_exact_test_state_pairs.length,17);
  assert.equal(new Set(auth.corrected_exact_test_state_pairs.map(([path])=>path)).size,17);
  for(const [path,source,successor] of auth.corrected_exact_test_state_pairs){
    assert.match(source,/^[0-9a-f]{40}$/);
    assert.match(successor,/^[0-9a-f]{40}$/);
    assert.notEqual(source,successor,`${path}: source and successor must differ`);
    assert.equal(gitBlobSha(readFileSync(path)),source,`${path}: authorization slice must remain on exact source blob`);
  }
});

test('v4.6.69a authorizes only two exact guard successors and forbids publication in the same slice',()=>{
  const v4667=auth.corrected_guard_targets.v4667_test;
  const v4668a=auth.corrected_guard_targets.v4668a_test;
  assert.equal(gitBlobSha(readFileSync(v4667.path)),v4667.source_git_blob_sha);
  assert.equal(gitBlobSha(readFileSync(v4668a.path)),v4668a.source_git_blob_sha);
  assert.equal(v4667.source_git_blob_sha,'2e032f86c83e405a7bc341c8b7aa57c9edb854b3');
  assert.equal(v4667.successor_git_blob_sha,'ff4c40de42c7675c0b7f3701b142fee9c7fc989d');
  assert.equal(v4668a.source_git_blob_sha,'5daa7909237801497f11870a898c7398c43f4dd2');
  assert.equal(v4668a.successor_git_blob_sha,'f2cd9e4663cbb8cdb83140a89dde624f3cfa8f95');
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.guard_test_correction_permitted,true);
  assert.equal(auth.authorization.change_17_targets_same_slice,false);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
