import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const authPath='docs/engineer-osint/V4695_B106_BROWSER_COMPATIBILITY_AUTHORIZATION.json';
const manifestPath='docs/engineer-osint/data/run-store-manifest.json';
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.95 authorizes only the exact pre-materialized atomic B106 browser compatibility vector',()=>{
  const auth=JSON.parse(readFileSync(authPath,'utf8'));
  assert.equal(auth.schema_version,'engineer-osint-v4695-b106-browser-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'98e8b80e614defc5cd4f2a6ddcdd45032c4c2f6d');
  assert.equal(auth.reviewed_main_tree_sha,'5315dbad00ce56187a797204338f86be6d856360');
  assert.equal(auth.canonical_precondition.current_run_id,'engineer-osint-20260904-B105');
  assert.equal(auth.canonical_precondition.current_canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(auth.b106_browser_contract.normalized_dom_sha256,'52ab8b1d862de74128cd25e49b46f4cbb3d316cc8b8413850781a46aa6a8200c');
  assert.equal(auth.b106_browser_contract.workflow_successor_git_blob_sha,'e44cb9caf5fc61c83ad254f7b829977245abec49');
  assert.equal(auth.b106_browser_contract.helper_successor_git_blob_sha,'8c029f4fcf2e969b02887b5d4d5e46a6625948bc');

  const targets=auth.exact_final_targets;
  assert.equal(targets.length,35);
  assert.equal(new Set(targets.map(x=>x.path)).size,35,'target paths must be unique');
  for(const target of targets){
    assert.match(target.source_git_blob_sha,/^[a-f0-9]{40}$/);
    assert.match(target.successor_git_blob_sha,/^[a-f0-9]{40}$/);
    assert.notEqual(target.source_git_blob_sha,target.successor_git_blob_sha,`${target.path}: successor must change`);
    const actual=gitBlobSha(readFileSync(target.path));
    assert.equal(actual,target.source_git_blob_sha,`${target.path}: exact source vector drifted`);
  }

  assert.equal(auth.state_vectors.intermediate_states_permitted,false);
  assert.equal(auth.state_vectors.partial_or_mixed_state_permitted,false);
  assert.equal(auth.materialization_evidence.materialization_pr,455);
  assert.equal(auth.materialization_evidence.materialization_pr_closed_unmerged,true);
  assert.equal(auth.materialization_evidence.exact_materialization_head_sha,'ad4995828dcb4a26741be0c96473a7d89abfbc3c');
  assert.equal(auth.materialization_evidence.dedicated_materializer_run_id,34248457704);
  assert.equal(auth.materialization_evidence.materializer_artifact_id,10064989370);
  assert.equal(auth.materialization_evidence.materializer_artifact_sha256,'a31a7504acd7b688cda3b2ac7097ee55398a187d00626e0e13e1141700ee5949');
  assert.equal(auth.materialization_evidence.all_final_successor_git_blobs_materialized,true);
  assert.equal(auth.materialization_evidence.all_final_successor_git_blobs_read_back_verified,true);
  assert.equal(auth.materialization_evidence.successor_count,35);
  assert.equal(auth.materialization_evidence.fixed_point_iterations,15);
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_sha,'59eecbf2fdf5b93df5dfa53c02e836760fde5299');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_base_sha,'5315dbad00ce56187a797204338f86be6d856360');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_read_back_verified,true);
  assert.equal(auth.materialization_evidence.candidate_tree_is_authoritative,false);
  assert.equal(auth.materialization_evidence.ref_update_performed,false);
  assert.equal(auth.materialization_evidence.canonical_or_run_store_write_performed,false);

  assert.equal(auth.implementation_requirements.authorization_merged_before_implementation,true);
  assert.equal(auth.implementation_requirements.atomic_exact_35_file_tree_required,true);
  assert.equal(auth.implementation_requirements.full_exact_head_ci_required,true);
  assert.equal(auth.implementation_requirements.fresh_green_gate_before_merge,true);
  assert.equal(auth.implementation_requirements.expected_head_sha_required,true);
  assert.equal(auth.forbidden.combine_authorization_with_implementation,true);
  assert.equal(auth.forbidden.partial_or_mixed_installation,true);
  assert.equal(auth.forbidden.manual_canonical_or_run_store_write,true);
  assert.equal(auth.forbidden.b106_canonical_execution_in_this_slice,true);
  assert.equal(auth.authorization.exact_atomic_35_file_browser_compatibility_transition_permitted_after_merge,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_execution_permitted_in_same_slice,false);

  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const current=manifest.runs.at(-1)??manifest.snapshot;
  assert.equal(current.run_id,'engineer-osint-20260904-B105','B105 must remain canonical during compatibility authorization');
  assert.equal(current.canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
});
