import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {canonicalDigest} from '../lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from '../lib/run-store.mjs';
import {validateAuthorizationContract} from '../authorized-canonical-executor.mjs';

const root='docs/engineer-osint';
const authorizationPath=`${root}/V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const readinessPath=`${root}/V4645_B104_CC0_LOCAL_IMAGE_READINESS.json`;
const candidatePath=`${root}/osint-publication-candidates/v4645-b104-wave2-local-images-cc0-public-cz.json`;
const successorPath=`${root}/photo-review-candidates/v4645-b104-v4639-local-image-status-cc0.json`;
const lifecycleSourcePath=`${root}/photo-review-batches/v4639.json`;
const acquisitionPath=`${root}/photo-local-acquisitions/v4641-wave2-ready-for-import.json`;
const correctionPath=`${root}/photo-research/v4644-leguan-license-authority-correction.json`;
const staleAuthorizationPath=`${root}/V4643_B104_WAVE2_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const executorPath=`${root}/authorized-canonical-executor.mjs`;
const executorWorkflowPath='.github/workflows/authorized-canonical-executor.yml';
const runId='engineer-osint-20260903-B104';
const parentRunId='engineer-osint-20260902-B103';
const parentCanonicalSha='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const resultingCanonicalSha='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const expectedDigest='5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c';
const exactWorkflowSuccessorSha='cb7e4d186ff3a79675ace8c48754317ffdede233';
const expectedCards=['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049'];
const expectedVisuals=['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049'];
const sha256=value=>createHash('sha256').update(value).digest('hex');
const gitBlobSha=value=>createHash('sha1').update(`blob ${Buffer.byteLength(value)}\0`).update(value).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));

function assertAuthorizedWorkflowLifecycle(authorization,workflowRaw){
  const current=gitBlobSha(workflowRaw);
  if(current===authorization.browser_workflow_successor.source_git_blob_sha)return false;
  assert.equal(current,exactWorkflowSuccessorSha,'only exact v4.6.47 browser workflow successor is permitted');
  const pair=`'${runId}':'${expectedDigest}'`;
  assert.equal(workflowRaw.split(pair).length-1,2,'B104 pair must occur exactly twice');
  const predecessor=workflowRaw
    .replace(`,\n              ${pair}`, '')
    .replace(`,\n            ${pair}`, '');
  assert.equal(gitBlobSha(predecessor),authorization.browser_workflow_successor.source_git_blob_sha,'v4.6.47 workflow does not reduce to authorized predecessor');
  return true;
}

test('v4.6.46 authorizes only the corrected CC0 B104 candidate and exact lifecycle successor',()=>{
  const authorization=json(authorizationPath);
  const readiness=json(readinessPath);
  const candidateRaw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(candidateRaw);
  const successorRaw=readFileSync(successorPath,'utf8');
  const successor=JSON.parse(successorRaw);
  const lifecycleSourceRaw=readFileSync(lifecycleSourcePath,'utf8');
  const correction=json(correctionPath);
  const acquisition=json(acquisitionPath);
  const staleAuthorization=json(staleAuthorizationPath);

  assert.equal(authorization.schema_version,'engineer-osint-b104-cc0-local-image-append-authorization-v1');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.reviewed_main_sha,'8d6912ac7bc5929d9eb30b87d4ee77a8668fd2ff');
  assert.equal(authorization.readiness_path,readinessPath);
  assert.equal(authorization.readiness_git_blob_sha,gitBlobSha(readFileSync(readinessPath,'utf8')));
  assert.equal(authorization.candidate_path,candidatePath);
  assert.equal(authorization.candidate_git_blob_sha,gitBlobSha(candidateRaw));
  assert.equal(authorization.candidate_run_id,runId);
  assert.equal(authorization.expected_parent_run_id,parentRunId);
  assert.equal(authorization.expected_parent_canonical_sha256,parentCanonicalSha);
  assert.equal(authorization.exact_candidate_file_sha256,sha256(candidateRaw));
  assert.equal(authorization.expected_resulting_canonical_sha256,resultingCanonicalSha);
  assert.deepEqual(authorization.expected_card_ids,expectedCards);
  assert.deepEqual(authorization.expected_visual_ids,expectedVisuals);

  assert.equal(readiness.status,'READY_FOR_EXACT_REVIEW');
  assert.equal(readiness.candidate_file_sha256,authorization.exact_candidate_file_sha256);
  assert.equal(readiness.expected_resulting_canonical_sha256,resultingCanonicalSha);
  assert.equal(readiness.execution_permitted_by_this_artifact,false);
  assert.equal(readiness.authorization_required,true);

  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.continuity.photo_review_status_successor_applied,false);
  assert.deepEqual(candidate.updated_records.map(item=>item.id),expectedCards);
  assert.deepEqual(candidate.visuals.map(item=>item.id),expectedVisuals);

  assert.equal(authorization.photo_review_status_successor.source_path,lifecycleSourcePath);
  assert.equal(authorization.photo_review_status_successor.source_git_blob_sha,gitBlobSha(lifecycleSourceRaw));
  assert.equal(authorization.photo_review_status_successor.source_sha256,sha256(lifecycleSourceRaw));
  assert.equal(authorization.photo_review_status_successor.successor_path,successorPath);
  assert.equal(authorization.photo_review_status_successor.successor_git_blob_sha,gitBlobSha(successorRaw));
  assert.equal(authorization.photo_review_status_successor.successor_sha256,sha256(successorRaw));
  assert.deepEqual(successor.entries.map(item=>item.card_id),expectedCards);
  assert.ok(successor.entries.every(item=>item.status==='LOCAL_IMAGE'));

  const candidateLeguan=candidate.visuals.find(item=>item.id==='ENG-VIS-LOCAL-0049');
  const successorLeguan=successor.entries.find(item=>item.card_id==='ENG-TECH-0049');
  const acquisitionLeguan=acquisition.entries.find(item=>item.card_id==='ENG-TECH-0049');
  assert.equal(correction.status,'AUTHORITATIVE_SOURCE_CORRECTION');
  assert.equal(correction.authoritative_license,'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(authorization.source_license_authority.license,correction.authoritative_license);
  assert.equal(authorization.source_license_authority.license_url,correction.license_url);
  assert.equal(candidateLeguan.license,correction.authoritative_license);
  assert.equal(successorLeguan.license,correction.authoritative_license);
  assert.equal(acquisitionLeguan.license,'CC BY-SA 4.0');
  assert.equal(authorization.source_acquisition_manifest.historical_leguan_license_assertion_superseded,true);
  assert.notEqual(authorization.exact_candidate_file_sha256,staleAuthorization.exact_candidate_file_sha256);
  assert.equal(authorization.supersedes_authorization.path,staleAuthorizationPath);

  for(const item of authorization.local_files){
    assert.ok(expectedCards.includes(item.card_id));
    const raw=readFileSync(item.path);
    assert.equal(sha256(raw),item.sha256,`${item.card_id} local binary SHA mismatch`);
    assert.equal(gitBlobSha(raw),item.git_blob_sha,`${item.card_id} local binary Git blob mismatch`);
  }

  assert.equal(authorization.required_preconditions.leguan_file_license_is_cc0,true);
  assert.equal(authorization.required_preconditions.historical_cc_by_sa_assertion_is_superseded,true);
  assert.equal(authorization.required_preconditions.browser_workflow_successor_must_be_implemented_and_green_before_execution,true);
  assert.equal(authorization.authorization.append_exact_candidate_only,true);
  assert.equal(authorization.authorization.apply_exact_photo_review_status_successor,true);
  assert.equal(authorization.authorization.execution_requires_separate_slice,true);
  assert.equal(authorization.authorization.allow_candidate_mutation,false);
  assert.equal(authorization.authorization.allow_photo_binary_mutation,false);
  assert.equal(authorization.authorization.allow_canonical_history_rewrite,false);
  assert.equal(authorization.authorization.allow_executor_change,false);
  assert.equal(authorization.authorization.allow_other_workflow_change,false);
  assert.equal(authorization.authorization.allow_runtime_change,false);
});

test('v4.6.46 is accepted by the existing exact canonical executor contract without writing',()=>{
  const authorization=json(authorizationPath);
  const candidateRaw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(candidateRaw);
  const normalizedCandidate=JSON.stringify(candidate,null,2)+'\n';
  const store=loadCanonicalRunStore({root});

  assert.equal(store.report.current_run_id,parentRunId);
  assert.equal(store.report.canonical_sha256,parentCanonicalSha);
  const validation=validateAuthorizationContract({
    authorization,
    candidate,
    normalizedCandidate,
    store,
    authorizationPath,
    candidatePath,
    runId
  });
  assert.equal(validation.resultingCanonical,resultingCanonicalSha);
  assert.equal(canonicalDigest(applyStrictPatchToCanonicalData(store.data,candidate)),resultingCanonicalSha);
});

test('v4.6.46 keeps the browser workflow successor exact across its separately authorized v4.6.47 lifecycle and pins protected executor baselines',()=>{
  const authorization=json(authorizationPath);
  const workflowRaw=readFileSync(workflowPath,'utf8');
  const executorRaw=readFileSync(executorPath,'utf8');
  const executorWorkflowRaw=readFileSync(executorWorkflowPath,'utf8');

  const successorApplied=assertAuthorizedWorkflowLifecycle(authorization,workflowRaw);
  assert.equal(gitBlobSha(executorRaw),authorization.protected_baseline.authorized_executor_git_blob_sha);
  assert.equal(gitBlobSha(executorWorkflowRaw),authorization.protected_baseline.authorized_executor_workflow_git_blob_sha);

  assert.equal(authorization.browser_workflow_successor.guarded_run_id,runId);
  assert.equal(authorization.browser_workflow_successor.normalized_dom_sha256,expectedDigest);
  assert.equal(authorization.browser_workflow_successor.require_both_expected_digest_maps,true);
  assert.equal(authorization.browser_workflow_successor.allow_only_exact_b104_pair_addition,true);
  assert.equal(authorization.browser_workflow_successor.implementation_requires_separate_slice,true);
  assert.equal(authorization.browser_workflow_successor.must_be_merged_and_green_before_canonical_execution,true);

  assert.equal(workflowRaw.includes(`'${runId}':'${expectedDigest}'`),successorApplied);
  assert.equal(authorization.execution_state.browser_workflow_successor_applied,false,'historical authorization execution_state remains immutable evidence');
  assert.equal(authorization.execution_state.canonical_write_performed,false);
  assert.equal(authorization.execution_state.run_file_created,false);
  assert.equal(authorization.execution_state.manifest_updated,false);
  assert.equal(authorization.execution_state.photo_review_status_successor_applied,false);
});
