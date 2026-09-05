import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

const root='docs/engineer-osint';
const read=rel=>readFileSync(`${root}/${rel}`);
const readRepo=rel=>readFileSync(rel);
const json=rel=>JSON.parse(read(rel).toString('utf8'));
const sha256=buf=>createHash('sha256').update(buf).digest('hex');
const gitBlobSha=buf=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`),buf])).digest('hex');
const auth=json('V4643_B104_WAVE2_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
const readiness=json('V4642_B104_WAVE2_LOCAL_IMAGE_READINESS.json');
const correctedAuth=json('V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
const candidate=json('osint-publication-candidates/v4642-b104-wave2-local-images-public-cz.json');
const B103='engineer-osint-20260902-B103';
const B104='engineer-osint-20260903-B104';
const B105='engineer-osint-20260904-B105';
const correctedB104CanonicalSha='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const expectedCards=['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049'];
const expectedVisuals=['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049'];
const expectedBrowserDigest='5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c';
const expectedB105BrowserDigest='25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7';
const exactB104WorkflowSuccessorSha='cb7e4d186ff3a79675ace8c48754317ffdede233';
const exactB105WorkflowSuccessorSha='0aded293ae69be3844c73f6613f0a70b05320156';
const exactV4649BrowserDiscoverySha='868159b7ea8a104db962989280bb2953ef9b04f9';
const exactB104Pair=`'${B104}':'${expectedBrowserDigest}'`;
const exactB105Pair=`'${B105}':'${expectedB105BrowserDigest}'`;

function assertHistoricalOrExactB104Workflow(workflow){
  const current=gitBlobSha(workflow);
  if(current===auth.browser_workflow_successor.source_git_blob_sha)return false;
  const text=workflow.toString('utf8');
  if(current===exactB105WorkflowSuccessorSha){
    assert.equal(text.split(exactB105Pair).length-1,2,'B105 pair must exist in exactly both digest maps');
    const b104Text=text
      .replace(`,\n              ${exactB105Pair}`, '')
      .replace(`,\n            ${exactB105Pair}`, '');
    assert.equal(gitBlobSha(Buffer.from(b104Text)),exactB104WorkflowSuccessorSha,'B105 successor does not reduce to exact B104 workflow');
  }else{
    assert.equal(current,exactB104WorkflowSuccessorSha,'historical authorization may only be followed by the exact separately authorized B104/B105 successors');
  }
  assert.equal(text.split(exactB104Pair).length-1,2,'B104 pair must exist in exactly both digest maps');
  const predecessor=text
    .replace(`,\n              ${exactB105Pair}`, '')
    .replace(`,\n            ${exactB105Pair}`, '')
    .replace(`,\n              ${exactB104Pair}`, '')
    .replace(`,\n            ${exactB104Pair}`, '');
  assert.equal(gitBlobSha(Buffer.from(predecessor)),auth.browser_workflow_successor.source_git_blob_sha,'authorized successor chain does not reduce to v4.6.43 protected workflow baseline');
  return true;
}

function assertLivePreOrCorrectedB104(store){
  if(store.report.current_run_id===B103){
    assert.equal(store.report.canonical_sha256,auth.expected_parent_canonical_sha256);
    return 'PRE_CORRECTED_B104';
  }
  assert.equal(store.report.current_run_id,B104,'canonical head is outside exact B103→corrected B104 lifecycle');
  assert.equal(store.report.canonical_sha256,correctedB104CanonicalSha);
  assert.equal(correctedAuth.expected_parent_run_id,B103);
  assert.equal(correctedAuth.expected_parent_canonical_sha256,auth.expected_parent_canonical_sha256);
  assert.equal(correctedAuth.expected_resulting_canonical_sha256,correctedB104CanonicalSha);
  return 'POST_CORRECTED_B104';
}

test('v4.6.43 historical authorization still pins the original frozen B104 candidate',()=>{
  assert.equal(auth.schema_version,'engineer-osint-b104-wave2-local-image-append-authorization-v1');
  assert.equal(auth.status,'READY_FOR_APPEND');
  assert.equal(auth.reviewed_main_sha,'79a925a3c812f2798e3652021be351407d6d0318');
  assert.equal(auth.candidate_run_id,B104);
  assert.equal(auth.expected_parent_run_id,B103);
  assert.equal(auth.expected_parent_canonical_sha256,'d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c');
  assert.equal(auth.expected_resulting_canonical_sha256,'34479f18aac998b8ee5feae6b28276fc1fb3f2dcd90f95c60b656ae1d3eb21e0');
  assert.deepEqual(auth.expected_card_ids,expectedCards);
  assert.deepEqual(auth.expected_visual_ids,expectedVisuals);
  assert.equal(auth.expected_updated_record_count,3);
  assert.equal(auth.expected_new_visual_count,3);
  assert.equal(auth.expected_new_media_count,0);

  const candidateRaw=read('osint-publication-candidates/v4642-b104-wave2-local-images-public-cz.json');
  assert.equal(sha256(candidateRaw),auth.exact_candidate_file_sha256);
  assert.equal(gitBlobSha(candidateRaw),auth.candidate_git_blob_sha);
  assert.equal(candidate.state.run_id,B104);
  assert.equal(candidate.state.parent_run_id,B103);
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.continuity.photo_review_status_successor_applied,false);
  assert.equal(candidate.qa.canonical_write_performed,false);
  assert.equal(candidate.qa.photo_review_status_successor_applied,false);
  assert.deepEqual(candidate.updated_records.map(item=>item.id),expectedCards);
  assert.deepEqual(candidate.visuals.map(item=>item.id),expectedVisuals);

  const store=loadCanonicalRunStore({root});
  const phase=assertLivePreOrCorrectedB104(store);
  if(phase==='PRE_CORRECTED_B104'){
    assert.equal(canonicalDigest(applyStrictPatchToCanonicalData(store.data,candidate)),auth.expected_resulting_canonical_sha256);
  } else {
    const persisted=read(`data/runs/${B104}.json`);
    assert.equal(sha256(persisted),correctedAuth.exact_candidate_file_sha256);
    assert.notEqual(correctedAuth.exact_candidate_file_sha256,auth.exact_candidate_file_sha256);
    assert.notEqual(correctedAuth.expected_resulting_canonical_sha256,auth.expected_resulting_canonical_sha256);
  }
});

test('v4.6.44 source correction makes the v4.6.43 exact lifecycle successor non-executable and remains historical after corrected B104',()=>{
  const source=read('photo-review-batches/v4639.json');
  const successor=read('photo-review-candidates/v4642-b104-v4639-local-image-status.json');
  const store=loadCanonicalRunStore({root});
  const phase=assertLivePreOrCorrectedB104(store);
  if(phase==='PRE_CORRECTED_B104'){
    assert.equal(sha256(source),auth.photo_review_status_successor.source_sha256);
    assert.equal(gitBlobSha(source),auth.photo_review_status_successor.source_git_blob_sha);
  } else {
    const correctedSuccessor=read('photo-review-candidates/v4645-b104-v4639-local-image-status-cc0.json');
    assert.equal(source.toString('utf8'),correctedSuccessor.toString('utf8'));
    assert.equal(sha256(source),correctedAuth.photo_review_status_successor.successor_sha256);
    assert.equal(gitBlobSha(source),correctedAuth.photo_review_status_successor.successor_git_blob_sha);
  }
  assert.notEqual(sha256(successor),auth.photo_review_status_successor.successor_sha256);
  assert.notEqual(gitBlobSha(successor),auth.photo_review_status_successor.successor_git_blob_sha);
  const successorJson=JSON.parse(successor.toString('utf8'));
  assert.deepEqual(successorJson.entries.map(item=>item.card_id),expectedCards);
  assert.ok(successorJson.entries.every(item=>item.status==='LOCAL_IMAGE'));
  const leguan=successorJson.entries.find(item=>item.card_id==='ENG-TECH-0049');
  assert.equal(leguan.license,'CC0 1.0 Universal Public Domain Dedication');
  assert.match(leguan.provenance_correction,/file-level CC0 1\.0/i);

  assert.equal(auth.local_files.length,3);
  for(const entry of auth.local_files){
    const bytes=readRepo(entry.path);
    assert.equal(sha256(bytes),entry.sha256,`${entry.card_id} SHA-256 drift`);
    assert.equal(gitBlobSha(bytes),entry.git_blob_sha,`${entry.card_id} Git blob drift`);
  }
  assert.equal(gitBlobSha(read('photo-local-acquisitions/v4641-wave2-ready-for-import.json')),auth.source_acquisition_manifest.git_blob_sha);
  assert.equal(auth.photo_review_status_successor.expected_cards_with_local_image,12);
  assert.equal(auth.photo_review_status_successor.expected_ready_for_import,7);
  assert.equal(auth.photo_review_status_successor.expected_photo_coverage_percent,24);
});

test('v4.6.44 blocks the old readiness while retaining its frozen historical evidence',()=>{
  assert.notEqual(gitBlobSha(read('V4642_B104_WAVE2_LOCAL_IMAGE_READINESS.json')),auth.readiness_git_blob_sha);
  assert.equal(readiness.status,'BLOCKED_SOURCE_LICENSE_CORRECTION');
  assert.equal(readiness.candidate_file_sha256,auth.exact_candidate_file_sha256);
  assert.equal(readiness.expected_resulting_canonical_sha256,auth.expected_resulting_canonical_sha256);
  assert.equal(readiness.lifecycle_source_sha256,auth.photo_review_status_successor.source_sha256);
  assert.equal(readiness.lifecycle_successor_sha256,auth.photo_review_status_successor.successor_sha256);
  assert.equal(readiness.authorization_required,true);
  assert.equal(readiness.blocking_correction.authoritative_license,'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(readiness.blocking_correction.execution_permitted,false);
  assert.equal(readiness.blocking_correction.requires_fresh_corrected_discovery,true);
  assert.equal(readiness.blocking_correction.requires_new_authorization,true);

  const evidence=auth.preauthorization_evidence;
  assert.equal(evidence.discovery_head_sha,'2ee57990e0cc50e53b73e13d9db66f84a28a8424');
  assert.equal(evidence.exact_head_workflow_run_id,33808971940);
  assert.equal(evidence.exact_head_job_id,100826206043);
  assert.equal(evidence.workflow_conclusion,'success');
  assert.equal(evidence.test_total,537);
  assert.equal(evidence.test_pass,534);
  assert.equal(evidence.test_fail,0);
  assert.equal(evidence.public_cz_ratchet,'PUBLIC_CZ_RATCHET_PASS');
  assert.equal(evidence.new_missing_fields,0);
  assert.equal(evidence.expected_b104_browser_normalized_dom_sha256,expectedBrowserDigest);
  assert.ok([evidence.browser_discovery_test_git_blob_sha,exactV4649BrowserDiscoverySha].includes(gitBlobSha(read('tests/v4642-b104-browser-digest-discovery.test.mjs'))));
});

test('v4.6.43 historical workflow authorization boundary remains pinned across exact v4.6.47/B105 successors',()=>{
  const workflow=readRepo('.github/workflows/identity-fix-retirement-regression.yml');
  const successorApplied=assertHistoricalOrExactB104Workflow(workflow);
  const text=workflow.toString('utf8');
  assert.ok(text.includes("'engineer-osint-20260902-B103':'68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a'"));
  assert.equal(text.includes(exactB104Pair),successorApplied);
  if(gitBlobSha(workflow)===exactB105WorkflowSuccessorSha)assert.equal(text.includes(exactB105Pair),true);
  assert.equal(auth.browser_workflow_successor.guarded_run_id,B104);
  assert.equal(auth.browser_workflow_successor.normalized_dom_sha256,expectedBrowserDigest);
  assert.equal(auth.browser_workflow_successor.require_both_expected_digest_maps,true);
  assert.equal(auth.browser_workflow_successor.allow_only_exact_b104_pair_addition,true);
  assert.equal(auth.browser_workflow_successor.implementation_requires_separate_slice,true);
  assert.equal(auth.browser_workflow_successor.must_be_merged_and_green_before_canonical_execution,true);
  assert.equal(auth.authorization.browser_workflow_successor_authorized,true);
  assert.equal(auth.authorization.browser_workflow_successor_requires_separate_slice,true);
  assert.equal(auth.authorization.allow_other_workflow_change,false);
  assert.equal(auth.authorization.allow_runtime_change,false);
});

test('v4.6.43 preserves executor isolation across exact later browser successors and all fail-closed publication boundaries',()=>{
  assert.equal(gitBlobSha(read('authorized-canonical-executor.mjs')),auth.protected_baseline.authorized_executor_git_blob_sha);
  assert.equal(gitBlobSha(readRepo('.github/workflows/authorized-canonical-executor.yml')),auth.protected_baseline.authorized_executor_workflow_git_blob_sha);
  assertHistoricalOrExactB104Workflow(readRepo('.github/workflows/identity-fix-retirement-regression.yml'));
  assert.equal(auth.authorized_guard_successor_contract.authorization_path,'docs/engineer-osint/V4643_B104_WAVE2_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
  assert.equal(auth.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
  assert.equal(auth.authorization.append_exact_candidate_only,true);
  assert.equal(auth.authorization.standard_append_run_write_required,true);
  assert.equal(auth.authorization.apply_exact_photo_review_status_successor,true);
  assert.equal(auth.authorization.execution_requires_separate_slice,true);
  assert.equal(auth.authorization.allow_candidate_mutation,false);
  assert.equal(auth.authorization.allow_manual_manifest_or_hash_edit,false);
  assert.equal(auth.authorization.allow_photo_binary_mutation,false);
  assert.equal(auth.authorization.allow_photo_status_other_than_exact_successor,false);
  assert.equal(auth.authorization.allow_future_run_same_slice,false);
  assert.equal(auth.authorization.allow_canonical_history_rewrite,false);
  assert.equal(auth.authorization.allow_historical_authorization_rewrite,false);
  assert.equal(auth.authorization.allow_executor_change,false);
  assert.equal(auth.authorization.allow_unrelated_content_change,false);
  assert.equal(auth.execution_order.length,2);
  assert.match(auth.execution_order[0],/browser-digest successor/i);
  assert.match(auth.execution_order[1],/canonical execution-request PR/i);
  assert.deepEqual(auth.execution_state,{
    browser_workflow_successor_applied:false,
    canonical_write_performed:false,
    run_file_created:false,
    manifest_updated:false,
    photo_review_status_successor_applied:false
  });
});
