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
const gitBlobSha = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');

const auth = json('V4605_CANONICAL_EXECUTOR_AUTHORIZATION.json');
const manifest = json('data/run-store-manifest.json');
const b103 = json('V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
const IMPLEMENTED_APPEND_RUN_SHA='376bdf810c47c3bf934d0cadeacff3b1f61e1115';
const EXACT_B103_RUN_ID='engineer-osint-20260902-B103';
const EXACT_B103_CANONICAL_SHA='5c81535081adba0957efa85a15d2dc63cf566e98279e5754a8c0796e0d9f2066';

test('v4.6.05 preserves the exact pre-implementation baseline and admits only the v4.6.06 append-run successor', () => {
  assert.equal(auth.schema_version, 'engineer-osint-canonical-executor-authorization-v1');
  assert.equal(auth.status, 'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha, 'eedd4fc12a4f704ec7ee84955d3f2bc9e27ace5c');
  assert.equal(auth.protected_baseline.append_run_blob_sha,'174cc646b8d3ecf6e338f6460b95335130154ffb');
  assert.equal(gitBlobSha(read('append-run.mjs')), IMPLEMENTED_APPEND_RUN_SHA);
  assert.equal(gitBlobSha(read('lib/run-store.mjs')), auth.protected_baseline.run_store_blob_sha);
  assert.equal(gitBlobSha(read('lib/integrity.mjs')), auth.protected_baseline.integrity_blob_sha);
  assert.equal(gitBlobSha(read('V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json')), auth.protected_baseline.b103_authorization_blob_sha);

  const current = manifest.runs.at(-1);
  const exactAllowedTips=new Map([
    [auth.protected_baseline.current_run_id,auth.protected_baseline.current_canonical_sha256],
    [EXACT_B103_RUN_ID,EXACT_B103_CANONICAL_SHA]
  ]);
  assert.ok(exactAllowedTips.has(current.run_id),`unexpected current run ${current.run_id}`);
  assert.equal(current.canonical_sha256,exactAllowedTips.get(current.run_id));
  const protectedB102=manifest.runs.find(entry=>entry.run_id===auth.protected_baseline.current_run_id);
  assert.ok(protectedB102,'protected B102 manifest entry missing');
  assert.equal(protectedB102.canonical_sha256,auth.protected_baseline.current_canonical_sha256);
});

test('v4.6.05 executor implementation is review-branch only and cannot execute B103', () => {
  const p = auth.required_executor_properties;
  assert.equal(p.same_repository_pull_request_only, true);
  assert.equal(p.isolated_execution_request_required, true);
  assert.equal(p.direct_main_write_forbidden, true);
  assert.equal(p.authorization_file_must_already_exist_on_base_main, true);
  assert.equal(p.candidate_file_must_already_exist_on_base_main, true);
  assert.equal(p.fresh_base_sha_required, true);
  assert.equal(p.standard_append_run_write_required, true);
  assert.equal(p.post_write_run_store_validation_required, true);
  assert.equal(p.post_write_full_test_suite_required, true);
  assert.equal(p.post_write_canonical_validation_required, true);
  assert.equal(p.execution_output_committed_only_to_pr_head_branch, true);
  assert.equal(p.no_automatic_merge, true);

  const a = auth.implementation_authorization;
  assert.equal(a.add_exact_executor_workflow, true);
  assert.equal(a.add_executor_script, true);
  assert.equal(a.modify_append_run_for_generic_fail_closed_authorization, true);
  assert.equal(a.add_executor_regression_tests, true);
  assert.equal(a.allow_workflow_change, true);
  assert.equal(a.allow_runtime_product_change, false);
  assert.equal(a.allow_candidate_mutation, false);
  assert.equal(a.allow_canonical_run_write, false);
  assert.equal(a.allow_manifest_change, false);
  assert.equal(a.allow_photo_status_change, false);
  assert.equal(a.allow_photo_binary_change, false);
  assert.equal(a.allow_b103_execution_same_slice, false);
  assert.equal(a.allow_direct_main_write, false);
  assert.equal(a.allow_automatic_merge, false);
  assert.equal(a.allow_unrelated_change, false);

  assert.equal(b103.status, 'READY_FOR_APPEND');
  assert.equal(auth.first_supported_execution.run_id, b103.candidate_run_id);
  assert.equal(auth.first_supported_execution.authorization_path, 'docs/engineer-osint/V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
});

test('v4.6.05 requires fail-closed authorization for every new canonical write', () => {
  const g = auth.required_append_run_successor_properties;
  assert.equal(g.preserve_exact_legacy_guards_b96_through_b102, true);
  assert.equal(g.new_or_unrecognized_write_run_must_fail_without_explicit_authorization, true);
  assert.equal(g.authorization_argument_must_be_explicit, true);
  assert.equal(g.authorization_status_must_be_ready, true);
  assert.equal(g.authorization_candidate_run_must_equal_run_id, true);
  assert.equal(g.authorization_parent_must_equal_current_store_parent, true);
  assert.equal(g.authorization_candidate_sha_must_equal_normalized_run_sha, true);
  assert.equal(g.authorization_resulting_canonical_sha_must_equal_computed_successor, true);
  assert.equal(g.authorization_must_require_standard_append_run_write, true);
  assert.equal(g.authorization_must_forbid_manual_manifest_or_hash_edit, true);
  assert.equal(g.wildcard_or_dynamic_current_state_acceptance_forbidden, true);

  const l = auth.optional_lifecycle_successor_contract;
  assert.equal(l.allowed_only_when_pinned_by_run_authorization, true);
  assert.equal(l.source_path_and_hash_must_match_authorization, true);
  assert.equal(l.successor_path_and_hash_must_match_authorization, true);
  assert.equal(l.successor_copy_must_occur_only_after_successful_canonical_append, true);
  assert.equal(l.arbitrary_lifecycle_edit_forbidden, true);
});
