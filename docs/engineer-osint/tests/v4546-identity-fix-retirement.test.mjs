import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES,TRANSITION_RUNTIME_MODULES} from '../runtime-modules.mjs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4546_IDENTITY_FIX_RETIREMENT.json`,'utf8'));
const auth=JSON.parse(readFileSync(`${root}/V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json`,'utf8'));
const baseline=JSON.parse(readFileSync(`${root}/legacy-runtime-overlay-baseline.json`,'utf8'));
const audit=readFileSync(`${root}/audit-identity-fix-retirement.mjs`,'utf8');
const persistent=readFileSync(`${root}/audit-persistent-b99-identity.mjs`,'utf8');
const source=readFileSync(`${root}/${policy.identity_fix.file}`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const expectedB99File='ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab';
const expectedB99Canonical='754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30';
const expectedDom='6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31';

test('v4.5.46 applies exactly the retirement authorized by v4.5.45',()=>{
  assert.equal(policy.schema_version,'engineer-osint-identity-fix-retirement-v1');
  assert.equal(policy.status,'AUTHORIZED_RETIREMENT_APPLIED');
  assert.equal(policy.reviewed_authorization_main_sha,'a8a67ac1f3bb5dbdc2841c5df7d552a8f5d3b5f9');
  assert.equal(auth.status,'READY_FOR_EXACT_IDENTITY_FIX_RETIREMENT_SLICE');
  assert.equal(auth.authorization.one_retirement_slice_only,true);
  assert.equal(auth.authorization.allow_identity_fix_runtime_removal,true);
  assert.equal(auth.authorization.allow_identity_overlay_retirement,true);
  assert.equal(auth.authorization.allow_remove_exact_identity_entry_from_legacy_factual_overlay_modules,true);
  assert.equal(auth.authorization.allow_remove_exact_identity_entry_from_active_legacy_baseline,true);
  assert.equal(auth.authorization.retain_identity_fix_source_as_historical_artifact,true);
});

test('v4.5.46 preserves exact B99 anchors and the reviewed browser digest',()=>{
  assert.equal(policy.required_persistent_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.required_b99_file_sha256,expectedB99File);
  assert.equal(policy.required_b99_canonical_sha256,expectedB99Canonical);
  assert.equal(policy.required_b99_file_sha256,auth.required_b99_file_sha256);
  assert.equal(policy.required_b99_canonical_sha256,auth.required_b99_canonical_sha256);
  assert.equal(policy.required_proof.browser_normalized_dom_sha256,expectedDom);
  assert.equal(policy.required_proof.historical_b99_hashes_unchanged,true);
  assert.match(audit,/historical B99 hash drift/);
  assert.match(persistent,/B99 manifest hash drift/);
});

test('v4.5.46 leaves zero active legacy factual overlays and retains the transition guard',()=>{
  assert.deepEqual(LEGACY_FACTUAL_OVERLAY_MODULES,[]);
  assert.equal(PUBLIC_RUNTIME_MODULES.some(([,file])=>file===policy.identity_fix.file),false);
  assert.equal(PUBLIC_RUNTIME_MODULES.some(([id])=>id===policy.identity_fix.runtime_id),false);
  assert.ok(TRANSITION_RUNTIME_MODULES.some(([id,file])=>id===policy.transition_guard.runtime_id&&file===policy.transition_guard.file));
  assert.ok(PUBLIC_RUNTIME_MODULES.some(([id,file])=>id===policy.transition_guard.runtime_id&&file===policy.transition_guard.file));
  assert.equal(policy.retirement.resulting_active_legacy_factual_module_count,0);
  assert.equal(policy.retirement.transition_guard_removed,false);
  assert.equal(policy.retirement.other_runtime_module_removed,false);
});

test('v4.5.46 active legacy baseline is empty and explicitly retirement-marked',()=>{
  assert.equal(baseline.version,3);
  assert.equal(baseline.status,'NO_ACTIVE_LEGACY_FACTUAL_OVERLAY_DEBT');
  assert.equal(baseline.retired_identity_fix_at,'v4.5.46');
  assert.deepEqual(Object.keys(baseline.modules||{}),[]);
  assert.equal(policy.retirement.resulting_active_legacy_baseline_module_count,0);
});

test('v4.5.46 retains and hash-pins the historical identity source',()=>{
  assert.ok(existsSync(`${root}/${policy.identity_fix.file}`));
  assert.equal(policy.identity_fix.historical_source_retained,true);
  assert.equal(policy.retirement.source_file_deleted,false);
  assert.equal(gitBlobSha(source),policy.identity_fix.git_blob_sha);
  assert.match(source,new RegExp(policy.identity_fix.sentinel));
  assert.match(audit,/historical identity-fix source blob drift/);
  assert.match(audit,/historical identity source assertions no longer pass/);
  assert.match(audit,/historical identity source residual/);
});

test('v4.5.46 fail-closed audit proves zero runtime debt without canonical or run-store writes',()=>{
  assert.match(audit,/identity-fix remains active in public runtime/);
  assert.match(audit,/retired active baseline module count drift/);
  assert.match(audit,/unexpected public sentinel consumers/);
  assert.match(audit,/built identity script count/);
  assert.match(audit,/built transition guard count/);
  assert.match(audit,/canonical_write_performed:false/);
  assert.match(audit,/run_store_manifest_edit_performed:false/);
  assert.match(audit,/run_appended:false/);
  assert.match(audit,/source_file_deleted:false/);
  assert.match(audit,/other_runtime_module_removed:false/);
  assert.doesNotMatch(audit,/append-run\.mjs/);
  assert.doesNotMatch(audit,/writeFileSync\(join\(src/);
  assert.equal(policy.retirement.canonical_data_edited,false);
  assert.equal(policy.retirement.run_store_manifest_edited,false);
  assert.equal(policy.retirement.run_appended,false);
});

test('v4.5.46 required proof is zero-effect and browser-gated',()=>{
  assert.equal(policy.required_proof.historical_source_residual_mutations,0);
  assert.equal(policy.required_proof.other_public_runtime_sentinel_consumer_count,0);
  assert.equal(policy.required_proof.built_identity_script_count,0);
  assert.equal(policy.required_proof.transition_guard_script_count,1);
  assert.equal(policy.required_proof.canonical_write_performed,false);
  assert.equal(policy.required_proof.run_store_manifest_edit_performed,false);
  assert.match(audit,/browser_normalized_dom_sha256:null/);
  assert.match(audit,/browser_parity_pending:true/);
});
