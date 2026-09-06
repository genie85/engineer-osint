import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4686A_B105_POSTWRITE_FIXTURE_REPAIR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.86a pins failed #443 and preserves the exact B104/B105 canonical identities',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4686a-b105-postwrite-fixture-repair-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'c4a7347a674bc8667c2634ba807c8e89ae0e5a09');
  assert.equal(auth.reviewed_main_tree_sha,'7b523d1ec70c653643ad4111cb5d98f2483e1806');
  assert.equal(auth.blocked_execution.pr_number,443);
  assert.equal(auth.blocked_execution.head_sha,'e66205fd6c2a0fa8e98cd05cdc79b4e4867987df');
  assert.equal(auth.blocked_execution.workflow_run_id,34061868783);
  assert.equal(auth.blocked_execution.job_id,101563699821);
  assert.equal(auth.blocked_execution.closed_unmerged,true);
  assert.equal(auth.blocked_execution.canonical_persisted_to_pr_or_main,false);
  assert.equal(auth.blocked_execution.temporary_resulting_canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(auth.historical_fixture.pre_b105_v4584_sha256,'8a417c5e647758a584613ebbb657be922a4739b920b84bef84a3a2f5f23192c9');
  assert.equal(auth.historical_fixture.b104_canonical_sha256,'0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca');
  assert.equal(auth.historical_fixture.b105_expected_canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(auth.root_cause.expected_historical_hash_change_permitted,false);
  assert.equal(auth.root_cause.browser_flake_root_cause,false);
  assert.equal(auth.root_cause.canonical_candidate_changed,false);
});

test('v4.6.86a permits only the exact atomic source or exact atomic repaired sixteen-target state',()=>{
  assert.equal(auth.exact_repair_targets.length,16);
  assert.equal(new Set(auth.exact_repair_targets.map(item=>item.path)).size,16);
  assert.equal(new Set(auth.exact_repair_targets.map(item=>item.source_git_blob_sha)).size,16);
  assert.equal(new Set(auth.exact_repair_targets.map(item=>item.successor_git_blob_sha)).size,16);
  const actual=auth.exact_repair_targets.map(item=>gitBlobSha(readFileSync(item.path)));
  const source=auth.exact_repair_targets.map(item=>item.source_git_blob_sha);
  const successor=auth.exact_repair_targets.map(item=>item.successor_git_blob_sha);
  for(const item of auth.exact_repair_targets){
    assert.match(item.source_git_blob_sha,/^[0-9a-f]{40}$/);
    assert.match(item.successor_git_blob_sha,/^[0-9a-f]{40}$/);
    assert.notEqual(item.source_git_blob_sha,item.successor_git_blob_sha,item.path);
  }
  const sourceMode=actual.every((blob,index)=>blob===source[index]);
  const successorMode=actual.every((blob,index)=>blob===successor[index]);
  assert.ok(sourceMode||successorMode,'repair target set must be exact atomic source or exact atomic successor state; mixed state is forbidden');
  assert.equal(auth.state_vectors.intermediate_states_permitted,false);
  assert.equal(auth.state_vectors.partial_or_mixed_state_permitted,false);
});

test('v4.6.86a pins read-back materialization and separates repair from trusted execution and B106',()=>{
  assert.equal(auth.materialization_evidence.all_successor_git_blobs_materialized,true);
  assert.equal(auth.materialization_evidence.all_successor_git_blobs_read_back_verified,true);
  assert.equal(auth.materialization_evidence.successor_count,16);
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_sha,'e8b7334f5fccc9a0263dc6adce2939e5d8271abc');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_read_back_verified,true);
  assert.equal(auth.materialization_evidence.candidate_tree_is_authoritative,false);
  assert.equal(auth.implementation_requirements.authorization_merged_before_implementation,true);
  assert.equal(auth.implementation_requirements.atomic_exact_tree_required,true);
  assert.equal(auth.implementation_requirements.exact_source_vector_required,true);
  assert.equal(auth.implementation_requirements.exact_successor_vector_required,true);
  assert.equal(auth.implementation_requirements.failed_execution_rerun_forbidden,true);
  assert.equal(auth.implementation_requirements.b105_retry_requires_separate_trusted_executor_gate,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.exact_atomic_postwrite_fixture_repair_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b105_execution_permitted_in_same_slice,false);
  assert.equal(auth.authorization.b105_retry_permitted_before_trusted_executor_gate,false);
  assert.equal(auth.authorization.b106_permitted,false);
});