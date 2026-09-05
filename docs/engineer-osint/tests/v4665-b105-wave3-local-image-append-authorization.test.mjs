import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {canonicalDigest} from '../lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from '../lib/run-store.mjs';
import {validateAuthorizationContract,validateAuthorizationStaticContract,validatePersistedStoreContract} from '../authorized-canonical-executor.mjs';

const root='docs/engineer-osint';
const authorizationPath=`${root}/V4665_B105_WAVE3_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const readinessPath=`${root}/V4654_B105_WAVE3_LOCAL_IMAGE_READINESS.json`;
const discoveryPath=`${root}/V4654_B105_B106_LOCAL_IMAGE_DISCOVERY.json`;
const candidatePath=`${root}/osint-publication-candidates/v4653-b105-wave3-v4584-local-images-public-cz.json`;
const lifecycleSourcePath=`${root}/photo-review-batches/v4584.json`;
const successorPath=`${root}/photo-review-candidates/v4653-b105-v4584-local-image-status.json`;
const acquisitionPath=`${root}/photo-local-acquisitions/v4652-wave3-ready-for-import.json`;
const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const executorPath=`${root}/authorized-canonical-executor.mjs`;
const executorWorkflowPath='.github/workflows/authorized-canonical-executor.yml';
const B104='engineer-osint-20260903-B104';
const B105='engineer-osint-20260904-B105';
const B104_SHA='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const B105_SHA='a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9';
const B105_DIGEST='25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7';
const expectedCards=['ENG-TECH-0014','ENG-TECH-0015','ENG-TECH-0018','ENG-TECH-0019','ENG-TECH-0020'];
const expectedVisuals=['ENG-VIS-LOCAL-0014','ENG-VIS-LOCAL-0015','ENG-VIS-LOCAL-0018','ENG-VIS-LOCAL-0019','ENG-VIS-LOCAL-0020'];
const sha256=value=>createHash('sha256').update(value).digest('hex');
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};
const json=path=>JSON.parse(readFileSync(path,'utf8'));

function phase(store){
  if(store.report.current_run_id===B104){
    assert.equal(store.report.canonical_sha256,B104_SHA);
    return 'PRE_B105';
  }
  assert.equal(store.report.current_run_id,B105,'canonical head is outside exact B104→B105 lifecycle');
  assert.equal(store.report.canonical_sha256,B105_SHA);
  return 'POST_B105';
}

test('v4.6.65 pins the unchanged B105 candidate, readiness, discovery and exact resulting canonical identity',()=>{
  const auth=json(authorizationPath);
  const readinessRaw=readFileSync(readinessPath,'utf8');
  const discoveryRaw=readFileSync(discoveryPath,'utf8');
  const candidateRaw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(candidateRaw);

  assert.equal(auth.schema_version,'engineer-osint-b105-wave3-local-image-append-authorization-v1');
  assert.equal(auth.status,'READY_FOR_APPEND');
  assert.equal(auth.reviewed_main_sha,'920420c413a7a392869edd1fd2915a743af0d859');
  assert.equal(gitBlobSha(readinessRaw),auth.readiness_git_blob_sha);
  assert.equal(gitBlobSha(discoveryRaw),auth.discovery_git_blob_sha);
  assert.equal(gitBlobSha(candidateRaw),auth.candidate_git_blob_sha);
  assert.equal(sha256(candidateRaw),auth.exact_candidate_file_sha256);
  assert.equal(candidate.state.run_id,B105);
  assert.equal(candidate.state.parent_run_id,B104);
  assert.equal(auth.expected_parent_run_id,B104);
  assert.equal(auth.expected_parent_canonical_sha256,B104_SHA);
  assert.equal(auth.expected_resulting_canonical_sha256,B105_SHA);
  assert.deepEqual(candidate.updated_records.map(item=>item.id),expectedCards);
  assert.deepEqual(candidate.visuals.map(item=>item.id),expectedVisuals);
  assert.deepEqual(auth.expected_card_ids,expectedCards);
  assert.deepEqual(auth.expected_visual_ids,expectedVisuals);
  assert.equal(auth.expected_updated_record_count,5);
  assert.equal(auth.expected_new_visual_count,5);
  assert.equal(auth.expected_new_media_count,0);
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.continuity.photo_review_status_successor_applied,false);
});

test('v4.6.65 exact executor contract is valid both before append and after the one authorized persisted B105 append',()=>{
  const authorization=json(authorizationPath);
  const candidateRaw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(candidateRaw);
  const normalizedCandidate=JSON.stringify(candidate,null,2)+'\n';
  const sourceRaw=readFileSync(lifecycleSourcePath,'utf8');
  const successorRaw=readFileSync(successorPath,'utf8');
  const store=loadCanonicalRunStore({root});
  const currentPhase=phase(store);

  assert.doesNotThrow(()=>validateAuthorizationStaticContract({
    authorization,
    candidate,
    normalizedCandidate,
    authorizationPath,
    candidatePath,
    runId:B105
  }));

  if(currentPhase==='PRE_B105'){
    assert.equal(gitBlobSha(sourceRaw),authorization.photo_review_status_successor.source_git_blob_sha);
    assert.equal(sha256(sourceRaw),authorization.photo_review_status_successor.source_sha256);
    const validation=validateAuthorizationContract({
      authorization,
      candidate,
      normalizedCandidate,
      store,
      authorizationPath,
      candidatePath,
      runId:B105
    });
    assert.equal(validation.resultingCanonical,B105_SHA);
    assert.equal(canonicalDigest(applyStrictPatchToCanonicalData(store.data,candidate)),B105_SHA);
  }else{
    assert.equal(sourceRaw,successorRaw,'persisted v4584 lifecycle source must equal exact authorized B105 successor');
    assert.equal(gitBlobSha(sourceRaw),authorization.photo_review_status_successor.successor_git_blob_sha);
    assert.equal(sha256(sourceRaw),authorization.photo_review_status_successor.successor_sha256);
    assert.doesNotThrow(()=>validatePersistedStoreContract({authorization,store,runId:B105}));
    const persisted=readFileSync(`${root}/data/runs/${B105}.json`,'utf8');
    assert.equal(sha256(persisted),authorization.exact_candidate_file_sha256);
    assert.deepEqual(JSON.parse(persisted),candidate);
  }
});

test('v4.6.65 pins exact v4584 lifecycle promotion, acquisition manifest and all five local binary identities',()=>{
  const auth=json(authorizationPath);
  const successorRaw=readFileSync(successorPath,'utf8');
  const successor=JSON.parse(successorRaw);
  const acquisitionRaw=readFileSync(acquisitionPath,'utf8');

  assert.equal(gitBlobSha(successorRaw),auth.photo_review_status_successor.successor_git_blob_sha);
  assert.equal(sha256(successorRaw),auth.photo_review_status_successor.successor_sha256);
  assert.deepEqual(successor.entries.filter(item=>expectedCards.includes(item.card_id)).map(item=>item.card_id),expectedCards);
  assert.ok(successor.entries.filter(item=>expectedCards.includes(item.card_id)).every(item=>item.status==='LOCAL_IMAGE'));
  assert.equal(auth.photo_review_status_successor.expected_cards_with_local_image,17);
  assert.equal(auth.photo_review_status_successor.expected_ready_for_import,2);
  assert.equal(auth.photo_review_status_successor.expected_photo_coverage_percent,34);
  assert.equal(gitBlobSha(acquisitionRaw),auth.source_acquisition_manifest.git_blob_sha);
  assert.equal(sha256(acquisitionRaw),auth.source_acquisition_manifest.sha256);

  assert.equal(auth.local_files.length,5);
  for(const item of auth.local_files){
    assert.ok(expectedCards.includes(item.card_id));
    const raw=readFileSync(item.path);
    assert.equal(sha256(raw),item.sha256,`${item.card_id}: local binary SHA256 drift`);
    assert.equal(gitBlobSha(raw),item.git_blob_sha,`${item.card_id}: local binary Git blob drift`);
  }
});

test('v4.6.65 proves the exact B105 browser successor and protected executor remained installed and green',()=>{
  const auth=json(authorizationPath);
  const workflow=readFileSync(workflowPath,'utf8');
  const pair=`'${B105}':'${B105_DIGEST}'`;

  assert.equal(gitBlobSha(workflow),auth.browser_workflow_successor.installed_git_blob_sha);
  assert.equal(auth.browser_workflow_successor.installed_git_blob_sha,'0aded293ae69be3844c73f6613f0a70b05320156');
  assert.equal(auth.browser_workflow_successor.guarded_run_id,B105);
  assert.equal(auth.browser_workflow_successor.normalized_dom_sha256,B105_DIGEST);
  assert.equal(workflow.split(pair).length-1,2,'B105 run/digest pair must exist in exactly both workflow digest maps');
  assert.equal(auth.browser_workflow_successor.exact_successor_merged_and_green,true);
  assert.equal(auth.fresh_revalidation.browser_successor_merge.post_merge_final_retirement_conclusion,'success');
  assert.equal(auth.fresh_revalidation.browser_successor_merge.post_merge_first_three_conclusion,'success');
  assert.equal(auth.fresh_revalidation.browser_successor_merge.post_merge_pages_conclusion,'success');
  assert.equal(gitBlobSha(readFileSync(executorPath,'utf8')),auth.protected_baseline.authorized_executor_git_blob_sha);
  assert.equal(gitBlobSha(readFileSync(executorWorkflowPath,'utf8')),auth.protected_baseline.authorized_executor_workflow_git_blob_sha);
});

test('v4.6.65 remains fail-closed, authorizes one isolated exact B105 append only and explicitly defers B106',()=>{
  const auth=json(authorizationPath);
  const readiness=json(readinessPath);
  const discovery=json(discoveryPath);
  const a=auth.authorization;

  assert.equal(readiness.execution_permitted_by_this_artifact,false,'historical readiness must remain non-executing evidence');
  assert.equal(readiness.authorization_required,true);
  assert.equal(discovery.status,'PASS');
  assert.equal(discovery.architecture.authoritative_write_performed,false);
  assert.equal(auth.authorized_guard_successor_contract.authorization_path,authorizationPath);
  assert.equal(auth.authorized_guard_successor_contract.guarded_run_id,B105);
  assert.equal(auth.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
  for(const key of ['append_exact_candidate_only','standard_append_run_write_required','apply_exact_photo_review_status_successor','one_run_only','isolated_review_branch_required','execution_requires_separate_slice'])assert.equal(a[key],true,key);
  for(const key of ['allow_candidate_mutation','allow_manual_manifest_or_hash_edit','allow_photo_binary_mutation','allow_photo_status_other_than_exact_successor','allow_future_run_same_slice','allow_canonical_history_rewrite','allow_historical_authorization_rewrite','allow_executor_change','allow_other_workflow_change','allow_runtime_change','allow_unrelated_content_change'])assert.equal(a[key],false,key);
  assert.equal(auth.b106_deferred.authorization_permitted_in_this_slice,false);
  assert.equal(auth.b106_deferred.execution_permitted_in_this_slice,false);
  assert.equal(auth.b106_deferred.fresh_revalidation_after_actual_b105_merge_required,true);
  assert.deepEqual(auth.execution_state,{canonical_write_performed:false,run_file_created:false,manifest_updated:false,photo_review_status_successor_applied:false});
});
