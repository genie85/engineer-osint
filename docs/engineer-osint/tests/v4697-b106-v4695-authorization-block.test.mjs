import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const blockPath=`${root}/V4697_B106_V4695_AUTHORIZATION_BLOCK.json`;
const authPath=`${root}/V4695_B106_BROWSER_COMPATIBILITY_AUTHORIZATION.json`;
const authTestPath=`${root}/tests/v4695-b106-browser-compatibility-authorization.test.mjs`;
const manifestPath=`${root}/data/run-store-manifest.json`;
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

const block=JSON.parse(readFileSync(blockPath,'utf8'));
const authRaw=readFileSync(authPath);
const auth=JSON.parse(authRaw);
const authTest=readFileSync(authTestPath,'utf8');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));

test('v4.6.97 blocks reuse of the exact V4695 implementation authorization after deterministic red CI',()=>{
  assert.equal(block.status,'BLOCKED_INCOMPLETE_SEMANTIC_CLOSURE');
  assert.equal(block.reviewed_main_sha,'33daaf9caf737663d4e800ebeba79fa4548e378d');
  assert.equal(block.blocked_authorization.path,'docs/engineer-osint/V4695_B106_BROWSER_COMPATIBILITY_AUTHORIZATION.json');
  assert.equal(gitBlobSha(authRaw),block.blocked_authorization.git_blob_sha);
  assert.equal(block.blocked_authorization.historical_evidence_remains_immutable,true);
  assert.equal(block.blocked_authorization.implementation_permission_superseded,true);
  assert.equal(block.blocked_authorization.must_not_be_used_for_future_implementation,true);
  assert.equal(block.deterministic_red_evidence.implementation_pr,457);
  assert.equal(block.deterministic_red_evidence.implementation_pr_closed_unmerged,true);
  assert.equal(block.deterministic_red_evidence.exact_head_sha,'7c2ee6e3763a0b36a184b88bff5be686086c0905');
  assert.equal(block.deterministic_red_evidence.exact_tree_sha,'1714035e9c21823f61b59f4afa7c447e462ec475');
  assert.equal(block.deterministic_red_evidence.final_identity_workflow_run_id,34254552438);
  assert.equal(block.deterministic_red_evidence.final_identity_workflow_job_id,102156931742);
  assert.equal(block.deterministic_red_evidence.workflow_conclusion,'failure');
  assert.deepEqual(
    [block.deterministic_red_evidence.test_total,block.deterministic_red_evidence.test_pass,block.deterministic_red_evidence.test_fail,block.deterministic_red_evidence.test_skip],
    [656,636,17,3]
  );
  assert.equal(block.deterministic_red_evidence.failure_class,'DETERMINISTIC_EXACT_LIFECYCLE_SEMANTIC_CLOSURE');
});

test('v4.6.97 proves the V4695 self-closure defect from repository-local immutable evidence',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4695-b106-browser-compatibility-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION','historical authorization must remain immutable evidence');
  assert.equal(auth.exact_final_targets.length,35);
  const targetPaths=new Set(auth.exact_final_targets.map(item=>item.path));
  assert.equal(targetPaths.has('docs/engineer-osint/tests/v4695-b106-browser-compatibility-authorization.test.mjs'),false,'V4695 guard unexpectedly entered its own preauthorization target closure');
  assert.equal(block.repository_self_consistency_evidence.v4695_exact_target_count,35);
  assert.equal(block.repository_self_consistency_evidence.v4695_authorization_guard_in_exact_target_vector,false);

  assert.match(authTest,/for\(const target of targets\)/,'V4695 guard target loop missing');
  assert.match(authTest,/assert\.equal\(actual,target\.source_git_blob_sha,`\$\{target\.path\}: exact source vector drifted`\)/,'V4695 guard no longer proves source-only state');
  assert.equal(block.repository_self_consistency_evidence.v4695_guard_requires_source_sha_for_each_target,true);
});

test('v4.6.97 preserves B105 canonical and requires a fresh semantic closure before any B106 retry',()=>{
  const current=manifest.runs.at(-1)??manifest.snapshot;
  assert.equal(current.run_id,'engineer-osint-20260904-B105');
  assert.equal(current.canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(block.canonical_precondition.current_run_id,current.run_id);
  assert.equal(block.canonical_precondition.current_canonical_sha256,current.canonical_sha256);
  assert.equal(block.canonical_precondition.b105_must_remain_canonical,true);

  for(const key of [
    'fresh_semantic_dependency_closure_materialization_required',
    'preserve_immutable_historical_authorization_identities',
    'model_exact_b106_descendants_separately',
    'authorization_guard_must_be_included_in_final_state_simulation',
    'full_p0_p1_must_pass_against_exact_materialized_final_candidate_tree_before_new_authorization',
    'all_future_successor_git_objects_must_be_materialized_and_read_back_verified_before_new_authorization',
    'new_separate_authorization_required',
    'new_separate_implementation_required',
    'postmerge_green_required_before_b106_canonical_authorization'
  ]) assert.equal(block.required_recovery[key],true,key);

  for(const key of [
    'retry_v4695_exact_35_file_vector',
    'reuse_pr457_red_head_as_implementation',
    'manual_canonical_or_run_store_write',
    'b106_canonical_execution',
    'prompt_or_executor_change_in_this_slice',
    'historical_v4695_mutation',
    'wildcard_or_unknown_descendant_acceptance'
  ]) assert.equal(block.forbidden[key],true,key);

  assert.deepEqual(block.execution_state,{
    canonical_write_performed:false,
    run_store_write_performed:false,
    b106_execution_performed:false,
    replacement_authorization_created:false
  });
});
