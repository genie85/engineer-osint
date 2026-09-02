import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const json = (rel) => JSON.parse(read(rel).toString('utf8'));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const gitBlobSha = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');

const auth = json('V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
const readiness = json('V4603_B103_LOCAL_IMAGE_CANDIDATE_READINESS.json');
const candidate = json('osint-publication-candidates/v4603-b103-local-images.json');
const manifest = json('data/run-store-manifest.json');

const expectedCards = [
  'ENG-TECH-0003','ENG-TECH-0004','ENG-TECH-0005','ENG-TECH-0006','ENG-TECH-0016',
  'ENG-TECH-0017','ENG-TECH-0022','ENG-TECH-0028','ENG-TECH-0029'
];
const expectedVisuals = expectedCards.map((id) => `ENG-VIS-LOCAL-${id.slice(-4)}`);

test('v4.6.04 authorization pins the exact B103 local-image candidate and canonical successor', () => {
  assert.equal(auth.schema_version, 'engineer-osint-b103-local-image-append-authorization-v1');
  assert.equal(auth.status, 'READY_FOR_APPEND');
  assert.equal(auth.reviewed_main_sha, '4f57572d0f126646cddac344d72f4c7b16783541');
  assert.equal(auth.candidate_run_id, 'engineer-osint-20260902-B103');
  assert.equal(auth.expected_parent_run_id, 'engineer-osint-20260902-B102');
  assert.equal(auth.expected_parent_canonical_sha256, '5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91');
  assert.equal(auth.expected_resulting_canonical_sha256, '5c81535081adba0957efa85a15d2dc63cf566e98279e5754a8c0796e0d9f2066');
  assert.deepEqual(auth.expected_card_ids, expectedCards);
  assert.deepEqual(auth.expected_visual_ids, expectedVisuals);
  assert.equal(auth.expected_updated_record_count, 9);
  assert.equal(auth.expected_new_visual_count, 9);
  assert.equal(auth.expected_new_media_count, 0);

  const candidateBytes = read('osint-publication-candidates/v4603-b103-local-images.json');
  assert.equal(sha256(candidateBytes), auth.exact_candidate_file_sha256);
  assert.equal(gitBlobSha(candidateBytes), auth.candidate_git_blob_sha);
  assert.equal(candidate.state.run_id, auth.candidate_run_id);
  assert.equal(candidate.state.parent_run_id, auth.expected_parent_run_id);
  assert.equal(candidate.continuity.canonical_write_authorized, false);
  assert.equal(candidate.continuity.canonical_write_performed, false);
  assert.equal(candidate.continuity.photo_review_status_successor_applied, false);

  assert.equal(readiness.expected_resulting_canonical_sha256, auth.expected_resulting_canonical_sha256);
  assert.equal(readiness.candidate_file_sha256, auth.exact_candidate_file_sha256);
  assert.equal(readiness.expected_updated_record_count, 9);
  assert.equal(readiness.expected_new_visual_count, 9);
  assert.deepEqual(readiness.expected_card_ids, expectedCards);
  assert.deepEqual(readiness.expected_visual_ids, expectedVisuals);
});

test('v4.6.04 authorization pins the exact photo lifecycle successor and acquisition provenance', () => {
  const sourceStatus = read('photo-review-status.json');
  const successor = read('photo-review-candidates/v4603-b103-local-image-status.json');
  const acquisition = read('photo-local-acquisitions/v4601-ready-for-import.json');

  assert.equal(sha256(sourceStatus), auth.photo_review_status_successor.source_sha256);
  assert.equal(gitBlobSha(sourceStatus), auth.photo_review_status_successor.source_git_blob_sha);
  assert.equal(sha256(successor), auth.photo_review_status_successor.successor_sha256);
  assert.equal(gitBlobSha(successor), auth.photo_review_status_successor.successor_git_blob_sha);
  assert.equal(sha256(acquisition), auth.source_acquisition_manifest.sha256);
  assert.equal(gitBlobSha(acquisition), auth.source_acquisition_manifest.git_blob_sha);

  const successorJson = JSON.parse(successor.toString('utf8'));
  for (const cardId of expectedCards) {
    const item = successorJson.items.find((entry) => entry.id === cardId || entry.card_id === cardId);
    assert.ok(item, `missing successor lifecycle entry for ${cardId}`);
    assert.equal(item.status, 'LOCAL_IMAGE', `${cardId} must become LOCAL_IMAGE`);
  }
});

test('v4.6.04 authorization pins all nine immutable repository-local WebP binaries', () => {
  assert.equal(auth.local_files.length, 9);
  assert.deepEqual(auth.local_files.map((entry) => entry.card_id), expectedCards);
  for (const entry of auth.local_files) {
    const rel = entry.path.replace(/^docs\/engineer-osint\//, '');
    const bytes = read(rel);
    assert.equal(sha256(bytes), entry.sha256, `${entry.card_id} local SHA-256 drift`);
    assert.equal(gitBlobSha(bytes), entry.git_blob_sha, `${entry.card_id} Git blob drift`);
  }
});

test('v4.6.04 authorization preserves canonical and execution boundaries', () => {
  const runs = manifest.runs;
  const current = runs[runs.length - 1];
  assert.equal(current.run_id, 'engineer-osint-20260902-B102');
  assert.equal(current.canonical_sha256, auth.expected_parent_canonical_sha256);

  assert.equal(gitBlobSha(read('append-run.mjs')), auth.protected_baseline.append_run_blob_sha);
  assert.equal(gitBlobSha(read('lib/run-store.mjs')), auth.protected_baseline.run_store_blob_sha);
  assert.equal(gitBlobSha(read('lib/integrity.mjs')), auth.protected_baseline.integrity_blob_sha);
  assert.equal(gitBlobSha(read('data/run-store-manifest.json')), auth.protected_baseline.manifest_blob_sha);
  assert.equal(gitBlobSha(read('data/runs/engineer-osint-20260902-B102.json')), auth.protected_baseline.b102_run_blob_sha);
  assert.equal(gitBlobSha(read('V4603_B103_LOCAL_IMAGE_CANDIDATE_READINESS.json')), auth.protected_baseline.candidate_readiness_blob_sha);

  assert.equal(auth.authorization.append_exact_candidate_only, true);
  assert.equal(auth.authorization.install_exact_b103_append_guard_successor, true);
  assert.equal(auth.authorization.standard_append_run_write_required, true);
  assert.equal(auth.authorization.apply_exact_photo_review_status_successor, true);
  assert.equal(auth.authorization.execution_requires_separate_slice, true);
  assert.equal(auth.authorization.allow_candidate_mutation, false);
  assert.equal(auth.authorization.allow_manual_manifest_or_hash_edit, false);
  assert.equal(auth.authorization.allow_photo_binary_mutation, false);
  assert.equal(auth.authorization.allow_workflow_change, false);
  assert.equal(auth.authorization.allow_unrelated_content_change, false);
  assert.deepEqual(auth.execution_state, {
    append_run_successor_installed: false,
    canonical_write_performed: false,
    run_file_created: false,
    manifest_updated: false,
    photo_review_status_successor_applied: false
  });
});
