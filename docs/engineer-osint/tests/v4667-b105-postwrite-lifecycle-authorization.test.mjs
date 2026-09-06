import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const authPath='docs/engineer-osint/V4667_B105_POSTWRITE_LIFECYCLE_COMPATIBILITY_AUTHORIZATION.json';
const auth=JSON.parse(readFileSync(authPath,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

const expectedPaths=[
  'docs/engineer-osint/tests/v4584-open-photo-batch.test.mjs',
  'docs/engineer-osint/tests/v4594-b100-execution.test.mjs',
  'docs/engineer-osint/tests/v4600-b102-execution.test.mjs',
  'docs/engineer-osint/tests/v4604-b103-local-image-authorization.test.mjs',
  'docs/engineer-osint/tests/v4605-canonical-executor-authorization.test.mjs',
  'docs/engineer-osint/tests/v4606-authorized-canonical-executor.test.mjs',
  'docs/engineer-osint/tests/v4616-b103-public-cz-candidate.test.mjs',
  'docs/engineer-osint/tests/v4618-b103-preauthorization-simulation.test.mjs',
  'docs/engineer-osint/tests/v4619-b103-public-cz-authorization.test.mjs',
  'docs/engineer-osint/tests/v4620-b103-browser-digest-discovery.test.mjs',
  'docs/engineer-osint/tests/v4642-b104-browser-digest-discovery.test.mjs',
  'docs/engineer-osint/tests/v4642-b104-wave2-local-image-discovery.test.mjs',
  'docs/engineer-osint/tests/v4643-b104-wave2-local-image-authorization.test.mjs',
  'docs/engineer-osint/tests/v4645-b104-cc0-readiness.test.mjs',
  'docs/engineer-osint/tests/v4645-b104-cc0-rediscovery.test.mjs',
  'docs/engineer-osint/tests/v4646-b104-cc0-authorization.test.mjs',
  'docs/engineer-osint/tests/v4647-b104-browser-digest-successor.test.mjs'
];
const exactSuccessorBlobs=new Map([
  ['docs/engineer-osint/tests/v4584-open-photo-batch.test.mjs','f7040026d29c0110d12fd5304959359a6eedefc2'],
  ['docs/engineer-osint/tests/v4594-b100-execution.test.mjs','60d10d3a255ddc22600a2db85a3cb89212318b6f'],
  ['docs/engineer-osint/tests/v4600-b102-execution.test.mjs','c93ecce95fa927fd5fe47e5982c5dfafd46c4973'],
  ['docs/engineer-osint/tests/v4604-b103-local-image-authorization.test.mjs','b56aa561f2271c5feac39ceb0b463cacb927da84'],
  ['docs/engineer-osint/tests/v4605-canonical-executor-authorization.test.mjs','c12146e71a4af724748904739ac4ddaaf7abafdd'],
  ['docs/engineer-osint/tests/v4606-authorized-canonical-executor.test.mjs','89354a2ec0ae6c213dec0df203ca8ec5ba748d3b'],
  ['docs/engineer-osint/tests/v4616-b103-public-cz-candidate.test.mjs','4e812347b7a69c522d9857f6367a816254964c87'],
  ['docs/engineer-osint/tests/v4618-b103-preauthorization-simulation.test.mjs','abfc216575e1a372faa5ebc0982ee7f4bb52ae30'],
  ['docs/engineer-osint/tests/v4619-b103-public-cz-authorization.test.mjs','c51f6a756a2b4cd86de302a47a93b582e3b6996b'],
  ['docs/engineer-osint/tests/v4620-b103-browser-digest-discovery.test.mjs','97637327b84932cfa3debcb7eb8f819cdf2ed392'],
  ['docs/engineer-osint/tests/v4642-b104-browser-digest-discovery.test.mjs','558bee8f3c599ff4afa5bb1f58e009b69b43903f'],
  ['docs/engineer-osint/tests/v4642-b104-wave2-local-image-discovery.test.mjs','86ec36b718eb1437effefb414b386891c4b87858'],
  ['docs/engineer-osint/tests/v4643-b104-wave2-local-image-authorization.test.mjs','acc1c241f42bc71dbb3638ac117d8317520aa83f'],
  ['docs/engineer-osint/tests/v4645-b104-cc0-readiness.test.mjs','62502ae22d405e3e0e8c57afda80151aff569b29'],
  ['docs/engineer-osint/tests/v4645-b104-cc0-rediscovery.test.mjs','bd4a242f6f910f8cd54dc0a0aad9a020fd336e47'],
  ['docs/engineer-osint/tests/v4646-b104-cc0-authorization.test.mjs','44ee3ea62eaee274bfaeebac5fab6478f9bcc019'],
  ['docs/engineer-osint/tests/v4647-b104-browser-digest-successor.test.mjs','cfa7ec4573761379758babac3b2e71959aa8b1ba']
]);

test('v4.6.67 pins the exact failed B105 postwrite evidence and exact canonical successor',()=>{
  assert.equal(auth.schema_version,'engineer-osint-b105-postwrite-lifecycle-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'7c4d5673a7abe2e8a358a0769a2c02d27499ada6');
  assert.equal(auth.failed_execution.pull_request,396);
  assert.equal(auth.failed_execution.head_sha,'10779f63bd1af6c7b4109dfd24a2c36a4778d5ac');
  assert.equal(auth.failed_execution.executor_run_id,33948225697);
  assert.equal(auth.failed_execution.executor_conclusion,'failure');
  assert.equal(auth.failed_execution.postwrite_test_fail,28);
  assert.equal(auth.failed_execution.materialization_status_before_postwrite_gate,'APPENDED');
  assert.equal(auth.exact_b105_state.run_id,'engineer-osint-20260904-B105');
  assert.equal(auth.exact_b105_state.parent_run_id,'engineer-osint-20260903-B104');
  assert.equal(auth.exact_b105_state.resulting_canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(auth.exact_b105_state.photo_lifecycle_successor_git_blob_sha,'35bc012c9364cd257dd75666a6749a698a2e228b');
});

test('v4.6.67 recognizes only the complete 17-file source set or the exact complete B105 successor set',()=>{
  assert.equal(auth.authorized_test_targets.length,17);
  assert.deepEqual(auth.authorized_test_targets.map(item=>item.path),expectedPaths);
  assert.equal(new Set(auth.authorized_test_targets.map(item=>item.path)).size,17);
  assert.equal(exactSuccessorBlobs.size,17);
  const observed=auth.authorized_test_targets.map(item=>({path:item.path,actual:gitBlobSha(readFileSync(item.path)),source:item.source_git_blob_sha,successor:exactSuccessorBlobs.get(item.path)}));
  assert.ok(observed.every(item=>item.successor), 'exact successor inventory must cover all 17 targets');
  const sourceState=observed.every(item=>item.actual===item.source);
  const successorState=observed.every(item=>item.actual===item.successor);
  assert.ok(sourceState||successorState,'17-file lifecycle must be complete source state or complete exact B105 successor state; mixed/unknown state rejected');
  assert.equal(sourceState&&successorState,false,'source and successor state must remain distinct');
});

test('v4.6.67 permits only exact B105 descendant compatibility and preserves historical fail-closed semantics',()=>{
  assert.ok(auth.authorized_change_semantics.some(value=>value.includes('exact persisted B105 run and canonical hash')));
  assert.ok(auth.authorized_change_semantics.some(value=>value.includes('preserve every historical B100-B104 identity')));
  assert.ok(auth.authorized_change_semantics.some(value=>value.includes('extend explicit lifecycle branching to B105')));
  assert.ok(auth.authorized_change_semantics.some(value=>value.includes('exact successor Git blob identities')));
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.implementation_requirements.only_authorized_test_targets_may_change,true);
  assert.equal(auth.implementation_requirements.exact_successor_blob_inventory_required_before_merge,true);
  assert.equal(auth.implementation_requirements.full_exact_head_ci_required,true);
  assert.equal(auth.implementation_requirements.separate_b105_execution_retry_required,true);
  assert.equal(auth.authorization.implementation_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
