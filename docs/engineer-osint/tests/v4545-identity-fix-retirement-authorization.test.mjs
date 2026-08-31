import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-identity-fix-retirement-authorization.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/identity-fix-retirement-authorization.yml','utf8');
const runtime=readFileSync(`${root}/runtime-modules.mjs`,'utf8');
const baseline=JSON.parse(readFileSync(`${root}/legacy-runtime-overlay-baseline.json`,'utf8'));

const b99File='ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab';
const b99Canonical='754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30';

test('v4.5.45 authorizes one exact future retirement slice from reviewed v4.5.44 main',()=>{
  assert.equal(auth.schema_version,'engineer-osint-identity-fix-retirement-authorization-v1');
  assert.equal(auth.status,'READY_FOR_EXACT_IDENTITY_FIX_RETIREMENT_SLICE');
  assert.equal(auth.reviewed_baseline_main_sha,'43f686feeba2890afa4784dd2b82e68166ba927c');
  assert.equal(auth.required_persistent_run_id,'engineer-osint-20260830-B99');
  assert.equal(auth.required_b99_file_sha256,b99File);
  assert.equal(auth.required_b99_canonical_sha256,b99Canonical);
  assert.equal(auth.identity_fix.file,'data-integrity-identity-fixes.js');
  assert.equal(auth.identity_fix.runtime_id,'engineer-data-integrity-identity-fixes-module');
  assert.equal(auth.identity_fix.git_blob_sha,'7dd9ae912cdc76159b3c180a6a015054603c0db5');
});

test('v4.5.45 pins the reviewed v4.5.44 CI, artifact and browser evidence exactly',()=>{
  const e=auth.reviewed_readiness_evidence;
  assert.equal(e.v4544_pr_number,263);
  assert.equal(e.v4544_pr_head_sha,'13a01ef785d616519c9baecb9f6281e7ec6c8472');
  assert.equal(e.v4544_pr_merge_ref_sha,'50fedb13c47d98bd7eed0d40dd688a21ac8625fd');
  assert.equal(e.v4544_main_merge_sha,auth.reviewed_baseline_main_sha);
  assert.equal(e.v4544_pr_workflow_run_id,33392271079);
  assert.equal(e.v4544_pr_workflow_job_id,99488457836);
  assert.equal(e.v4544_pr_validation_workflow_count,11);
  assert.equal(e.v4544_pr_validation_success_count,11);
  assert.equal(e.post_merge_push_workflow_count,6);
  assert.equal(e.post_merge_push_success_count,6);
  assert.equal(e.post_merge_push_failure_count,0);
  assert.equal(e.post_merge_push_in_progress_count,0);
  assert.equal(e.v4544_artifact_id,9757942023);
  assert.equal(e.v4544_artifact_sha256,'914d3e90e16c3589353dac7a155fd07b7de48fed8338783c3f2e41e34ce427af');
  assert.equal(e.browser_normalized_dom_sha256,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
  assert.equal(e.identity_overlay_residual_mutations,0);
  assert.equal(e.other_public_runtime_sentinel_consumer_count,0);
  assert.deepEqual([e.test_total,e.test_pass,e.test_fail,e.test_skipped],[337,334,0,3]);
});

test('v4.5.45 authorization is narrow: runtime entry and active baseline only, historical source retained',()=>{
  const a=auth.authorization;
  for(const key of ['one_retirement_slice_only','allow_identity_fix_runtime_removal','allow_identity_overlay_retirement','allow_remove_exact_identity_entry_from_legacy_factual_overlay_modules','allow_remove_exact_identity_entry_from_active_legacy_baseline','retain_identity_fix_source_as_historical_artifact'])assert.equal(a[key],true,key);
  assert.equal(a.expected_resulting_active_legacy_factual_module_count,0);
  assert.equal(a.expected_resulting_active_legacy_baseline_module_count,0);
  for(const key of ['allow_identity_fix_file_deletion','allow_transition_guard_runtime_removal','allow_any_other_runtime_module_removal','allow_canonical_data_edit','allow_run_store_manifest_edit','allow_run_append','allow_b99_file_edit','allow_manual_hash_edit'])assert.equal(a[key],false,key);
  assert.ok(runtime.includes("['engineer-data-integrity-identity-fixes-module','data-integrity-identity-fixes.js']"));
  assert.deepEqual(Object.keys(baseline.modules),['data-integrity-identity-fixes.js']);
});

test('v4.5.45 audit fails closed on runtime, baseline, B99 or readiness drift',()=>{
  assert.match(audit,/runtime module manifest drift since authorization review/);
  assert.match(audit,/legacy active baseline drift since authorization review/);
  assert.match(audit,/identity-fix source blob drift/);
  assert.match(audit,/B99 historical hash drift/);
  assert.match(audit,/current reproduced v4\.5\.44 readiness evidence mismatch/);
  assert.match(audit,/current reproduced browser readiness proof missing/);
  assert.match(audit,/authorization scope broadened/);
});

test('v4.5.45 reproduces browser parity and requires the exact v4.5.44 normalized DOM digest',()=>{
  assert.match(workflow,/Reproduce v4\.5\.44 browser parity/);
  assert.match(workflow,/v4544-identity-active\.html/);
  assert.match(workflow,/v4544-identity-retired-simulated\.html/);
  assert.match(workflow,/6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31/);
  assert.match(workflow,/V4545_BROWSER_PARITY=PASS/);
  assert.match(workflow,/audit-identity-fix-retirement-authorization\.mjs/);
  assert.match(workflow,/V4545_EXACT_RETIREMENT_AUTHORIZATION=PASS_NO_RETIREMENT_PERFORMED/);
});

test('v4.5.45 performs no retirement, source deletion, canonical write or git publication',()=>{
  assert.match(audit,/retirement_performed:false,canonical_write_performed:false,run_store_manifest_edit_performed:false/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  assert.doesNotMatch(workflow,/rm[^\n]*data-integrity-identity-fixes\.js/);
  assert.doesNotMatch(workflow,/git (add|commit|push)/);
  assert.doesNotMatch(workflow,/runtime-modules\.mjs[^\n]*(sed|perl|python|node)/);
  assert.doesNotMatch(workflow,/legacy-runtime-overlay-baseline\.json[^\n]*(sed|perl|python|node)/);
});
