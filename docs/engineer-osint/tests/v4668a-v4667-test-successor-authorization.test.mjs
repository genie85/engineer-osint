import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const historicalAuthPath='docs/engineer-osint/V4668A_V4667_TEST_SUCCESSOR_AUTHORIZATION.json';
const correctionPath='docs/engineer-osint/V4669A_B105_SUCCESSOR_INVENTORY_CORRECTION_AUTHORIZATION.json';
const historicalAuth=JSON.parse(readFileSync(historicalAuthPath,'utf8'));
const correction=JSON.parse(readFileSync(correctionPath,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

const byPath=pairs=>new Map(pairs.map(([path,source,successor])=>[path,{source,successor}]));

test('v4.6.69a preserves historical v4.6.68a authorization and applies only the superseding inventory correction',()=>{
  assert.equal(correction.schema_version,'engineer-osint-b105-successor-inventory-correction-authorization-v1');
  assert.equal(correction.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(correction.historical_v4668a_authorization.path,historicalAuthPath);
  assert.equal(gitBlobSha(readFileSync(historicalAuthPath)),correction.historical_v4668a_authorization.git_blob_sha);
  assert.equal(historicalAuth.schema_version,'engineer-osint-v4667-test-successor-authorization-v1');
  assert.equal(historicalAuth.status,'READY_FOR_IMPLEMENTATION');
  const historical=byPath(historicalAuth.exact_test_state_pairs);
  const corrected=byPath(correction.corrected_exact_test_state_pairs);
  assert.equal(historical.size,17);
  assert.equal(corrected.size,17);
  assert.equal(historical.get('docs/engineer-osint/tests/v4605-canonical-executor-authorization.test.mjs').successor,'c12146e366eb4c1f28f5ec4c911433176b70f7df');
  assert.equal(corrected.get('docs/engineer-osint/tests/v4605-canonical-executor-authorization.test.mjs').successor,'c12146e71a4af724748904739ac4ddaaf7abafdd');
  assert.equal(historical.get('docs/engineer-osint/tests/v4606-authorized-canonical-executor.test.mjs').successor,'89354a2af0439cb5b68563ef3f4c929821205407');
  assert.equal(corrected.get('docs/engineer-osint/tests/v4606-authorized-canonical-executor.test.mjs').successor,'89354a2ec0ae6c213dec0df203ca8ec5ba748d3b');
});

test('v4.6.69a admits only historical or corrected v4667 guard and complete corrected 17-file states',()=>{
  const targetPath='docs/engineer-osint/tests/v4667-b105-postwrite-lifecycle-authorization.test.mjs';
  const targetBlob=gitBlobSha(readFileSync(targetPath));
  const allowedTargetBlobs=new Set([
    historicalAuth.authorized_target.source_git_blob_sha,
    historicalAuth.authorized_target.successor_git_blob_sha,
    correction.corrected_guard_targets.v4667_test.successor_git_blob_sha
  ]);
  assert.ok(allowedTargetBlobs.has(targetBlob),'v4667 guard is outside exact historical/corrected states');
  const observed=correction.corrected_exact_test_state_pairs.map(([path,source,successor])=>({path,source,successor,actual:gitBlobSha(readFileSync(path))}));
  const allSource=observed.every(item=>item.actual===item.source);
  const allSuccessor=observed.every(item=>item.actual===item.successor);
  assert.ok(allSource||allSuccessor,'corrected 17-target state must be complete source or complete exact successor');
  assert.equal(allSource&&allSuccessor,false);
  assert.equal(correction.validated_successor_tree_sha,'424023597322a092ac7da6908799405696e24342');
});

test('v4.6.69a correction remains fail-closed and does not authorize canonical execution',()=>{
  assert.equal(correction.corrected_guard_targets.v4667_test.source_git_blob_sha,'2e032f86c83e405a7bc341c8b7aa57c9edb854b3');
  assert.equal(correction.corrected_guard_targets.v4667_test.successor_git_blob_sha,'ff4c40de42c7675c0b7f3701b142fee9c7fc989d');
  assert.equal(correction.corrected_guard_targets.v4668a_test.source_git_blob_sha,'5daa7909237801497f11870a898c7398c43f4dd2');
  for(const value of Object.values(correction.forbidden))assert.equal(value,true);
  assert.equal(correction.authorization.guard_test_correction_permitted,true);
  assert.equal(correction.authorization.change_17_targets_same_slice,false);
  assert.equal(correction.authorization.canonical_execution_permitted,false);
  assert.equal(correction.authorization.b106_permitted,false);
});
