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
const candidate=json('osint-publication-candidates/v4642-b104-wave2-local-images-public-cz.json');
const B103='engineer-osint-20260902-B103';
const B104='engineer-osint-20260903-B104';
const expectedCards=['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049'];
const expectedVisuals=['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049'];
const expectedBrowserDigest='5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c';

test('v4.6.43 authorizes only the exact frozen B104 wave 2 candidate',()=>{
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
  assert.equal(store.report.current_run_id,B103);
  assert.equal(store.report.canonical_sha256,auth.expected_parent_canonical_sha256);
  assert.equal(canonicalDigest(applyStrictPatchToCanonicalData(store.data,candidate)),auth.expected_resulting_canonical_sha256);
});

test('v4.6.43 pins exact lifecycle predecessor, successor and three immutable local binaries',()=>{
  const source=read('photo-review-batches/v4639.json');
  const successor=read('photo-review-candidates/v4642-b104-v4639-local-image-status.json');
  assert.equal(sha256(source),auth.photo_review_status_successor.source_sha256);
  assert.equal(gitBlobSha(source),auth.photo_review_status_successor.source_git_blob_sha);
  assert.equal(sha256(successor),auth.photo_review_status_successor.successor_sha256);
  assert.equal(gitBlobSha(successor),auth.photo_review_status_successor.successor_git_blob_sha);
  const successorJson=JSON.parse(successor.toString('utf8'));
  assert.deepEqual(successorJson.entries.map(item=>item.card_id),expectedCards);
  assert.ok(successorJson.entries.every(item=>item.status==='LOCAL_IMAGE'));
  const leguan=successorJson.entries.find(item=>item.card_id==='ENG-TECH-0049');
  assert.equal(leguan.license,'CC BY-SA 4.0');
  assert.match(leguan.provenance_correction,/structured-data CC0/i);

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

test('v4.6.43 pins consolidated B104 discovery evidence including exact browser digest',()=>{
  assert.equal(gitBlobSha(read('V4642_B104_WAVE2_LOCAL_IMAGE_READINESS.json')),auth.readiness_git_blob_sha);
  assert.equal(readiness.status,'READY_FOR_EXACT_REVIEW');
  assert.equal(readiness.candidate_file_sha256,auth.exact_candidate_file_sha256);
  assert.equal(readiness.expected_resulting_canonical_sha256,auth.expected_resulting_canonical_sha256);
  assert.equal(readiness.lifecycle_source_sha256,auth.photo_review_status_successor.source_sha256);
  assert.equal(readiness.lifecycle_successor_sha256,auth.photo_review_status_successor.successor_sha256);
  assert.equal(readiness.authorization_required,true);

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
  assert.equal(gitBlobSha(read('tests/v4642-b104-browser-digest-discovery.test.mjs')),evidence.browser_discovery_test_git_blob_sha);
});

test('v4.6.43 authorizes only the exact B104 browser workflow successor before canonical execution',()=>{
  const workflow=readRepo('.github/workflows/identity-fix-retirement-regression.yml');
  assert.equal(gitBlobSha(workflow),auth.browser_workflow_successor.source_git_blob_sha);
  const text=workflow.toString('utf8');
  assert.ok(text.includes("'engineer-osint-20260902-B103':'68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a'"));
  assert.equal(text.includes(B104),false,'authorization baseline must precede B104 workflow successor');
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

test('v4.6.43 preserves executor isolation and all fail-closed publication boundaries',()=>{
  assert.equal(gitBlobSha(read('authorized-canonical-executor.mjs')),auth.protected_baseline.authorized_executor_git_blob_sha);
  assert.equal(gitBlobSha(readRepo('.github/workflows/authorized-canonical-executor.yml')),auth.protected_baseline.authorized_executor_workflow_git_blob_sha);
  assert.equal(gitBlobSha(readRepo('.github/workflows/identity-fix-retirement-regression.yml')),auth.protected_baseline.identity_fix_retirement_workflow_git_blob_sha);
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
