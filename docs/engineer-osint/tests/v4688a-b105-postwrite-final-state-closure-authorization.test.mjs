import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const authPath=`${root}/V4688A_B105_POSTWRITE_FINAL_STATE_CLOSURE_AUTHORIZATION.json`;
const auth=JSON.parse(readFileSync(authPath,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.88a pins #447 exact-head failure and the corrected final-state root cause',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4688a-b105-postwrite-final-state-closure-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'6f7abbca949aba4f3fe2f9ff1e3bf761593e7aa4');
  assert.equal(auth.reviewed_main_tree_sha,'0247887bc8be9280aeea729a6397157c91a47e47');
  assert.equal(auth.blocked_implementation.pull_request,447);
  assert.equal(auth.blocked_implementation.head_sha,'b75056978b108fa14cf8392a7781fee3caea8597');
  assert.equal(auth.blocked_implementation.implementation_tree_sha,'d962c4b0f391005ad1a5ccd5d80de6bc2438c7cc');
  assert.equal(auth.blocked_implementation.closed_unmerged,true);
  assert.equal(auth.blocked_implementation.canonical_persisted,false);
  assert.equal(auth.blocked_implementation.all_four_workflows_failed,true);
  assert.deepEqual(auth.blocked_implementation.exact_head_workflow_runs,[34167420907,34167421035,34167420961,34167420933]);
  assert.equal(auth.root_cause.class,'POSTWRITE_FINAL_STATE_BASELINE_AND_TRANSITIVE_SELF_PIN_CLOSURE_OMISSION');
  assert.equal(auth.root_cause.current_17_file_baseline,'EXACT_COMPLETE_B105_SUCCESSOR_VECTOR');
  assert.equal(auth.root_cause.browser_or_ci_flake,false);
  assert.equal(auth.root_cause.wildcard_or_dynamic_acceptance_permitted,false);
});

test('v4.6.88a preserves upstream authorizations and admits only complete exact source or complete exact final successor vectors',()=>{
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorizations.v4686a_path)),auth.upstream_authorizations.v4686a_git_blob_sha);
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorizations.v4687a_path)),auth.upstream_authorizations.v4687a_git_blob_sha);
  assert.equal(auth.upstream_authorizations.must_remain_immutable,true);
  assert.equal(auth.exact_final_targets.length,20);
  assert.equal(new Set(auth.exact_final_targets.map(item=>item.path)).size,20);
  assert.equal(new Set(auth.exact_final_targets.map(item=>item.source_git_blob_sha)).size,20);
  assert.equal(new Set(auth.exact_final_targets.map(item=>item.successor_git_blob_sha)).size,20);
  const observed=auth.exact_final_targets.map(item=>({item,actual:gitBlobSha(readFileSync(item.path))}));
  for(const {item} of observed){
    assert.match(item.source_git_blob_sha,/^[0-9a-f]{40}$/);
    assert.match(item.successor_git_blob_sha,/^[0-9a-f]{40}$/);
    assert.notEqual(item.source_git_blob_sha,item.successor_git_blob_sha,item.path);
  }
  const sourceMode=observed.every(({item,actual})=>actual===item.source_git_blob_sha);
  const successorMode=observed.every(({item,actual})=>actual===item.successor_git_blob_sha);
  assert.ok(sourceMode||successorMode,'twenty-target set must be one complete exact authorized vector; partial/mixed/unknown state rejected');
  assert.equal(sourceMode&&successorMode,false);
  assert.equal(auth.state_vectors.intermediate_states_permitted,false);
  assert.equal(auth.state_vectors.partial_or_mixed_state_permitted,false);
});

test('v4.6.88a pins preauthorization materialization and deterministic phase-boundary closure',()=>{
  assert.equal(auth.materialization_evidence.all_final_successor_git_blobs_materialized,true);
  assert.equal(auth.materialization_evidence.all_final_successor_git_blobs_read_back_verified,true);
  assert.equal(auth.materialization_evidence.successor_count,20);
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_sha,'6ebcc386ae2cece55ecb66e0692f8a80d8eb57ae');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_base_sha,'0247887bc8be9280aeea729a6397157c91a47e47');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_read_back_verified,true);
  assert.equal(auth.materialization_evidence.candidate_tree_is_authoritative,false);
  assert.equal(auth.deterministic_simulation.v4660_current_git_blob_sha,'de600491ea27773a6ac8758bc11bbb13b2c89f01');
  assert.equal(auth.deterministic_simulation.v4661_current_git_blob_sha,'f615341ea7b6f2de560eeadaefa1a5d02500d93e');
  assert.equal(auth.deterministic_simulation.v4680_phase_boundary_baseline_verified,true);
  assert.equal(auth.deterministic_simulation.final_guard_chain_closed_over_known_exact_dependencies,true);
  assert.equal(auth.deterministic_simulation.outer_v4686a_atomic_guard_included,true);
  assert.equal(auth.deterministic_simulation.v4687a_regression_self_pin_included,true);
});

test('v4.6.88a authorizes only a future atomic twenty-file implementation and preserves execution boundaries',()=>{
  assert.equal(auth.implementation_requirements.one_active_write_slice,true);
  assert.equal(auth.implementation_requirements.authorization_merged_before_implementation,true);
  assert.equal(auth.implementation_requirements.atomic_exact_20_file_tree_required,true);
  assert.equal(auth.implementation_requirements.exact_source_vector_required,true);
  assert.equal(auth.implementation_requirements.exact_successor_vector_required,true);
  assert.equal(auth.implementation_requirements.full_exact_head_ci_required,true);
  assert.equal(auth.implementation_requirements.fresh_green_gate_before_merge,true);
  assert.equal(auth.implementation_requirements.expected_head_sha_required,true);
  assert.equal(auth.implementation_requirements.b105_execution_requires_separate_trusted_executor_slice,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.exact_atomic_20_file_final_state_closure_permitted_after_merge,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b105_execution_permitted_in_same_slice,false);
  assert.equal(auth.authorization.b106_permitted,false);
});