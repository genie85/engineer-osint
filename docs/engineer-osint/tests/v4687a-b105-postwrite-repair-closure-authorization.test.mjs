import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const authPath='docs/engineer-osint/V4687A_B105_POSTWRITE_REPAIR_CLOSURE_AUTHORIZATION.json';
const upstreamPath='docs/engineer-osint/V4686A_B105_POSTWRITE_FIXTURE_REPAIR_AUTHORIZATION.json';
const auth=JSON.parse(readFileSync(authPath,'utf8'));
const upstream=JSON.parse(readFileSync(upstreamPath,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

test('v4.6.87a pins the red exact-head implementation and deterministic two-guard closure root cause',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4687a-b105-postwrite-repair-closure-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'de0cb288f11c37e76d7023e057d850e1a3560540');
  assert.equal(auth.reviewed_main_tree_sha,'7fb4989d272006a99504cfc66df07028aa3aa35e');
  assert.equal(auth.blocked_implementation.pull_request,445);
  assert.equal(auth.blocked_implementation.head_sha,'09c2ad6fa49e28072d693ae7aefd4c93badfa422');
  assert.equal(auth.blocked_implementation.implementation_tree_sha,'777b3228328eeb31844bf8b321ceec961b3816b2');
  assert.equal(auth.blocked_implementation.closed_unmerged,true);
  assert.equal(auth.blocked_implementation.canonical_persisted,false);
  assert.deepEqual(auth.blocked_implementation.failing_tests,[
    'docs/engineer-osint/tests/v4667-b105-postwrite-lifecycle-authorization.test.mjs',
    'docs/engineer-osint/tests/v4668a-v4667-test-successor-authorization.test.mjs'
  ]);
  assert.match(auth.blocked_implementation.root_cause,/omitted two historical finite-state guards/);
});

test('v4.6.87a preserves V4686A and pins two pre-materialized exact compatibility successors',()=>{
  assert.equal(gitBlobSha(readFileSync(upstreamPath)),auth.upstream_authorization.git_blob_sha);
  assert.equal(auth.upstream_authorization.git_blob_sha,'2f934e4c7e37e8277d4dde6f06eed0d001dce5f4');
  assert.equal(auth.upstream_authorization.exact_repair_target_count,16);
  assert.equal(auth.upstream_authorization.must_remain_immutable,true);
  assert.equal(upstream.exact_repair_targets.length,16);
  assert.equal(auth.compatibility_guard_targets.length,2);
  for(const target of auth.compatibility_guard_targets){
    assert.equal(gitBlobSha(readFileSync(target.path)),target.source_git_blob_sha,`${target.path} must remain exact source before authorization implementation`);
    assert.match(target.successor_git_blob_sha,/^[0-9a-f]{40}$/);
  }
  assert.equal(auth.compatibility_guard_targets[0].successor_git_blob_sha,'9597733075b12debafacb3e3ebf1795f1a426b02');
  assert.equal(auth.compatibility_guard_targets[1].successor_git_blob_sha,'29b096b0d5332497788a8d7d1215b3aed0b143b3');
});

test('v4.6.87a pins exact postwrite projection and a preauthorization combined 18-file tree',()=>{
  assert.deepEqual(auth.exact_postwrite_projection,{
    'docs/engineer-osint/tests/v4642-b104-wave2-local-image-discovery.test.mjs':'238caca505c322d3641021293466b1e309b80a39',
    'docs/engineer-osint/tests/v4645-b104-cc0-rediscovery.test.mjs':'ecdc22f8a15c76eac33264adfa421678aa544f2c'
  });
  assert.equal(auth.materialization_evidence.compatibility_successor_blobs_materialized,true);
  assert.equal(auth.materialization_evidence.compatibility_successor_blobs_read_back_verified,true);
  assert.equal(auth.materialization_evidence.combined_target_count,18);
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_sha,'9f6fe757afd1ede9896ed4707bb44a5151ea3732');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_base_sha,'7fb4989d272006a99504cfc66df07028aa3aa35e');
  assert.equal(auth.materialization_evidence.preauthorization_candidate_tree_read_back_verified,true);
  assert.equal(auth.materialization_evidence.candidate_tree_is_authoritative,false);
});

test('v4.6.87a authorizes only a future atomic 18-file repair and preserves execution boundaries',()=>{
  assert.equal(auth.combined_implementation_requirements.one_active_write_slice,true);
  assert.equal(auth.combined_implementation_requirements.authorization_merged_before_implementation,true);
  assert.equal(auth.combined_implementation_requirements.atomic_exact_18_file_tree_required,true);
  assert.equal(auth.combined_implementation_requirements.all_v4686a_sixteen_successors_required,true);
  assert.equal(auth.combined_implementation_requirements.both_compatibility_guard_successors_required,true);
  assert.equal(auth.combined_implementation_requirements.partial_or_mixed_state_permitted,false);
  assert.equal(auth.combined_implementation_requirements.fresh_main_and_collision_gate_required,true);
  assert.equal(auth.combined_implementation_requirements.full_exact_head_ci_required,true);
  assert.equal(auth.combined_implementation_requirements.fresh_green_gate_before_merge,true);
  assert.equal(auth.combined_implementation_requirements.expected_head_sha_required,true);
  assert.equal(auth.combined_implementation_requirements.postmerge_verification_required,true);
  assert.equal(auth.combined_implementation_requirements.b105_execution_requires_separate_trusted_executor_slice,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.exact_two_guard_compatibility_change_permitted,true);
  assert.equal(auth.authorization.combined_atomic_18_file_implementation_permitted_after_merge,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b105_execution_permitted_in_same_slice,false);
  assert.equal(auth.authorization.b106_permitted,false);
});
