import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4679A_V4678A_TRANSITIVE_DEPENDENCY_CLOSURE_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.79a pins failed #419, immutable V4678A and a closed exact dependency graph',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4678a-transitive-dependency-closure-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'8710d56861b4294a5c5eb27a92a65fdb11cc6678');
  assert.equal(auth.upstream_authorization.path,`${root}/V4678A_V4669A_SUCCESSOR_MATERIALIZATION_CORRECTION_AUTHORIZATION.json`);
  assert.equal(auth.upstream_authorization.git_blob_sha,'c2c46171a3fec6f757a7a6473ffc3fd8c7f01afe');
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorization.path)),auth.upstream_authorization.git_blob_sha);
  assert.equal(auth.blocked_implementation.pr_number,419);
  assert.equal(auth.blocked_implementation.head_sha,'20f7bf2216696b8ff3dd5d156b5aa0ffa4994632');
  assert.deepEqual(auth.blocked_implementation.exact_head_workflow_runs,[33984685516,33984685204,33984685090,33984685079]);
  assert.equal(auth.blocked_implementation.closed_unmerged,true);
  assert.equal(auth.blocked_implementation.root_cause,'PREDICTABLE_TRANSITIVE_LIFECYCLE_DEPENDENCY_CLOSURE_BLOCKER');
  assert.equal(auth.dependency_closure.closed_over_known_exact_dependencies,true);
  assert.equal(auth.dependency_closure.wildcard_or_dynamic_acceptance,false);
});

test('v4.6.79a compatibility preparation is exact and lifecycle-compatible before and after each transition',()=>{
  assert.equal(auth.compatibility_prep_targets.length,5);
  assert.equal(auth.guard_targets.length,2);
  for(const target of [...auth.compatibility_prep_targets,...auth.guard_targets]){
    const blob=gitBlobSha(readFileSync(target.path));
    assert.ok([target.source_git_blob_sha,target.successor_git_blob_sha].includes(blob),`${target.path} must be exact source or exact materialized successor`);
  }
  for(const target of Object.values(auth.downstream_exact_transitions)){
    const blob=gitBlobSha(readFileSync(target.path));
    assert.ok([target.source_git_blob_sha,target.successor_git_blob_sha].includes(blob),`${target.path} must be exact source or exact V4678A successor`);
    assert.equal(target.authorized_by_v4678a,true);
  }
});

test('v4.6.79a pins only materialized/read-back successors and an ordered fail-closed implementation',()=>{
  assert.equal(auth.materialization_evidence.all_successor_git_blobs_materialized,true);
  assert.equal(auth.materialization_evidence.all_successor_git_blobs_read_back_verified,true);
  assert.equal(auth.materialization_evidence.successor_git_blob_shas.length,9);
  assert.equal(new Set(auth.materialization_evidence.successor_git_blob_shas).size,9);
  assert.deepEqual(auth.implementation_sequence,[
    'step_1_change_exactly_five_compatibility_prep_tests_to_their_exact_materialized_successors',
    'step_2_after_step_1_is_merged_and_green_change_exactly_two_guard_tests_to_their_exact_materialized_successors',
    'step_3_after_step_2_is_merged_and_green_retry_v4678a_v4670_exact_successor_as_one_file_slice',
    'step_4_after_step_3_is_merged_and_green_apply_v4678a_v4669a_exact_successor_as_one_file_slice',
    'step_5_only_after_step_4_is_merged_and_green_resume_the_existing_original_b105_guard_chain'
  ]);
  assert.equal(auth.implementation_requirements.one_active_write_slice,true);
  assert.equal(auth.implementation_requirements.separate_ordered_implementation_slices,true);
  assert.equal(auth.implementation_requirements.exact_materialized_successor_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.five_test_compatibility_prep_permitted,true);
  assert.equal(auth.authorization.two_guard_transition_after_green_prep_permitted,true);
  assert.equal(auth.authorization.resume_v4678a_only_after_green_guard_transition,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
