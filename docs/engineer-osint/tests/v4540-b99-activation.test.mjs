import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4540_B99_APPEND_AUTHORIZATION.json`,'utf8'));
const append=readFileSync(`${root}/append-run.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/b99-one-shot-publish.yml','utf8');
const media=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));

test('v4.5.40 authorizes only the exact reviewed B99 after media readiness',()=>{
  assert.equal(auth.status,'READY_FOR_APPEND');
  assert.equal(auth.reviewed_baseline_main_sha,'690aeb73912ca4dd778af624f8c512335ff01e7f');
  assert.equal(auth.candidate_run_id,'engineer-osint-20260830-B99');
  assert.equal(auth.expected_parent_run_id,'engineer-osint-20260830-B98');
  assert.equal(auth.expected_parent_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(auth.exact_candidate_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(auth.expected_resulting_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(auth.expected_operation_count,36);
  assert.equal(auth.expected_replace_field_count,27);
  assert.equal(auth.expected_remove_field_count,9);
  assert.equal(auth.expected_mirror_sync_fields.length,18);
  assert.equal(auth.required_preconditions.v4539_b99_media_attestation_ready,true);
  assert.equal(auth.media_attestation.report_text_sha256,'f1a2ff54960074a532bcffa7411897bc0d8c3172cf96258e780b7205413c4965');
  const exception=media.exceptions.find(item=>item.exception_id===auth.media_attestation.exception_id);
  assert.ok(exception);
  assert.equal(exception.repository_file_sha256,auth.exact_candidate_file_sha256);
  assert.equal(exception.repository_canonical_sha256,auth.expected_resulting_canonical_sha256);
  assert.equal(exception.report_text_sha256,auth.media_attestation.report_text_sha256);
});

test('v4.5.40 standard append helper independently guards B99 exact scope and media attestation',()=>{
  assert.match(append,/guardedB99='engineer-osint-20260830-B99'/);
  assert.match(append,/V4540_B99_APPEND_AUTHORIZATION\.json/);
  assert.match(append,/candidate file SHA differs from reviewed authorization/);
  assert.match(append,/resulting canonical SHA differs from reviewed authorization/);
  assert.match(append,/B99 append REPLACE_FIELD count mismatch/);
  assert.match(append,/B99 append REMOVE_FIELD count mismatch/);
  assert.match(append,/B99 append mirror sync exact field scope mismatch/);
  assert.match(append,/media-sweep-status-exceptions\.json/);
  assert.match(append,/B99 append media attestation mismatch/);
  assert.match(append,/identity_fix_runtime_removal_authorized!==false/);
});

test('v4.5.40 one-shot is main-triggered but writes only an isolated review branch',()=>{
  assert.match(workflow,/branches: \[main\]/);
  assert.match(workflow,/\.github\/workflows\/b99-one-shot-publish\.yml/);
  assert.doesNotMatch(workflow,/pull_request:/);
  assert.match(workflow,/B99_RESULT_BRANCH: automation\/b99-append-result-v1/);
  assert.match(workflow,/build-identity-fix-b99-mirror-sync-candidate\.mjs/);
  assert.match(workflow,/append-run\.mjs docs\/engineer-osint-dist\/identity-fix-b99-mirror-sync-candidate\.json --write/);
  assert.match(workflow,/audit-persistent-b99-identity\.mjs/);
  assert.match(workflow,/validate-media-coverage\.mjs/);
  assert.match(workflow,/MEDIA-SWEEP-ATTEST-B99-IDENTITY-FIX-MIGRATION/);
  assert.match(workflow,/test "\$\{#changed\[@\]\}" -eq 2/);
  assert.match(workflow,/data\/run-store-manifest\.json/);
  assert.match(workflow,/data\/runs\/engineer-osint-20260830-B99\.json/);
  assert.match(workflow,/git switch -c "\$B99_RESULT_BRANCH"/);
  assert.match(workflow,/git push origin "\$B99_RESULT_BRANCH"/);
});

test('v4.5.40 activation cannot authorize identity-fix removal or retirement',()=>{
  assert.equal(auth.authorization.allow_identity_fix_runtime_removal,false);
  assert.equal(auth.authorization.allow_identity_overlay_retirement,false);
  assert.equal(auth.authorization.allow_other_runtime_module_removal,false);
  assert.equal(auth.authorization.allow_manual_manifest_or_hash_edit,false);
  assert.equal(auth.authorization.allow_future_run_same_slice,false);
  assert.equal(auth.authorization.one_run_only,true);
  assert.equal(auth.authorization.isolated_review_branch_required,true);
  assert.doesNotMatch(workflow,/data-integrity-identity-fixes\.js.*rm|rm.*data-integrity-identity-fixes\.js/);
});
