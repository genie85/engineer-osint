import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4680A_B105_CORRECTED_TARGET_TRANSITIVE_CLOSURE_AUTHORIZATION.json`,'utf8'));
const repair=JSON.parse(readFileSync(`${root}/V4686A_B105_POSTWRITE_FIXTURE_REPAIR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};
const correctedPostwriteByPath=new Map([
  [`${root}/tests/v4675a-v4673-test-lifecycle-compatibility-authorization.test.mjs`,'e1ab1715d9ececcd44b77eea1e22c865b843639d'],
  [`${root}/tests/v4676a-v4675-successor-pin-correction-authorization.test.mjs`,'354cf52682ec31b927e83ba67bdfe8807bcbf8b5'],
  [`${root}/tests/v4677a-v4675-test-lifecycle-correction-authorization.test.mjs`,'76466667d81f8269a51cb8f6ffe50605411db454'],
  [`${root}/tests/v4678a-v4669a-successor-materialization-correction-authorization.test.mjs`,'a04f91b7f49b24e286021563d1f67ff3d70b16da'],
  [`${root}/tests/v4679a-v4678a-transitive-dependency-closure-authorization.test.mjs`,'966b7652ab5c413b688e75fb1a9152a6ca713533'],
  [`${root}/tests/v4673a-v4671-v4672a-lifecycle-compatibility-authorization.test.mjs`,'f683427cba704ebd2f5b3d3c139f9152620415c8'],
  [`${root}/tests/v4674a-v4673-successor-pin-correction-authorization.test.mjs`,'49e7ecbfa96be9dfc990fce328c86e6fcb83687f'],
  [`${root}/tests/v4671-v4670-test-lifecycle-compatibility-authorization.test.mjs`,'0f503e8a3393ca116b955e45b7f896ff83d78589'],
  [`${root}/tests/v4672a-v4671-successor-pin-correction-authorization.test.mjs`,'e2fda7495906fa2587566835b21dd6abcc00bcee'],
  [`${root}/tests/v4670-v4669a-lifecycle-compatibility-authorization.test.mjs`,'0057f57722486cb7e82c23d6acc9fdbfc58ef874'],
  [`${root}/tests/v4669a-b105-successor-inventory-correction-authorization.test.mjs`,'a0bc5d5be5ad84dc70420abb6209eb4e3bf98355']
]);

test('v4.6.80a pins failed #426 and closes the second-generation exact dependency graph',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4680a-b105-corrected-target-transitive-closure-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'29f903b23b958b325e46128ede29293063eaa04d');
  assert.equal(auth.blocked_implementation.pr_number,426);
  assert.equal(auth.blocked_implementation.head_sha,'872e3bbece7951fb3bebcedb0ff1cf46a9fc89a5');
  assert.deepEqual(auth.blocked_implementation.exact_head_workflow_runs,[34004520505,34004520542,34004520540,34004520526]);
  assert.equal(auth.blocked_implementation.closed_unmerged,true);
  assert.equal(auth.blocked_implementation.root_cause,'PREDICTABLE_SECOND_GENERATION_TRANSITIVE_LIFECYCLE_DEPENDENCY_BLOCKER');
  assert.equal(auth.root_cause.wildcard_or_dynamic_acceptance_permitted,false);
  assert.equal(auth.root_cause.historical_authorizations_rewritten,false);
});

test('v4.6.80a pins thirteen materialized successors and accepts only exact ordered phase-boundary or authorized postwrite-repair state',()=>{
  assert.equal(auth.materialized_successors.length,13);
  assert.equal(new Set(auth.materialized_successors.map(item=>item.path)).size,13);
  assert.equal(new Set(auth.materialized_successors.map(item=>item.successor_git_blob_sha)).size,13);
  for(const item of auth.materialized_successors){
    assert.match(item.source_git_blob_sha,/^[0-9a-f]{40}$/);
    assert.match(item.successor_git_blob_sha,/^[0-9a-f]{40}$/);
    assert.notEqual(item.source_git_blob_sha,item.successor_git_blob_sha,item.path);
    assert.ok(Number.isInteger(item.phase)&&item.phase>=1&&item.phase<=6,item.path);
  }
  const repairByPath=new Map(repair.exact_repair_targets.map(item=>[item.path,item]));
  const actual=new Map(auth.materialized_successors.map(item=>[item.path,gitBlobSha(readFileSync(item.path))]));
  const exactBoundaryMatches=[];
  for(let completedPhase=0;completedPhase<=6;completedPhase++){
    const matches=auth.materialized_successors.every(item=>actual.get(item.path)===(item.phase<=completedPhase?item.successor_git_blob_sha:item.source_git_blob_sha));
    if(matches)exactBoundaryMatches.push(completedPhase);
  }
  const repairFinal=auth.materialized_successors.every(item=>actual.get(item.path)===(correctedPostwriteByPath.get(item.path)??repairByPath.get(item.path)?.successor_git_blob_sha??item.successor_git_blob_sha));
  assert.equal(exactBoundaryMatches.length+(repairFinal?1:0),1,`repository must match exactly one authorized ordered phase boundary or exact postwrite-repair state; matched=${JSON.stringify(exactBoundaryMatches)}, repair=${repairFinal}`);
  assert.equal(auth.materialization_evidence.all_successor_git_blobs_materialized,true);
  assert.equal(auth.materialization_evidence.all_successor_git_blobs_read_back_verified,true);
  assert.equal(auth.materialization_evidence.successor_count,13);
});

test('v4.6.80a orders lifecycle repair before exact 17-target retry and keeps execution separated',()=>{
  assert.deepEqual(auth.implementation_sequence,[
    'phase_1_install_exact_compatibility_envelope_successors_for_v4661_v4675_v4676_v4677_v4678_v4679_only',
    'phase_2_after_phase_1_green_merge_install_exact_v4660_successor_only',
    'phase_3_after_phase_2_green_merge_install_exact_v4673_and_v4674_successors_only',
    'phase_4_after_phase_3_green_merge_install_exact_v4671_and_v4672a_successors_only',
    'phase_5_after_phase_4_green_merge_install_exact_v4670_successor_only',
    'phase_6_after_phase_5_green_merge_install_exact_v4669a_successor_only',
    'phase_7_only_after_phase_6_green_merge_retry_the_exact_17_corrected_b105_target_successors',
    'phase_8_only_after_phase_7_green_merge_allow_a_separately_authorized_b105_executor_retry'
  ]);
  assert.equal(auth.implementation_requirements.one_active_write_slice,true);
  assert.equal(auth.implementation_requirements.separate_ordered_phases,true);
  assert.equal(auth.implementation_requirements.exact_source_required,true);
  assert.equal(auth.implementation_requirements.exact_materialized_successor_required,true);
  assert.equal(auth.implementation_requirements.full_exact_head_ci_each_phase,true);
  assert.equal(auth.implementation_requirements.fresh_main_and_pr_gate_before_each_merge,true);
  assert.equal(auth.implementation_requirements.expected_head_sha_required,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.ordered_exact_lifecycle_repair_permitted,true);
  assert.equal(auth.authorization.exact_17_target_retry_after_phase_6_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted_in_this_authorization_slice,false);
  assert.equal(auth.authorization.b105_execution_permitted_before_phase_7_green_merge,false);
  assert.equal(auth.authorization.b106_permitted,false);
});