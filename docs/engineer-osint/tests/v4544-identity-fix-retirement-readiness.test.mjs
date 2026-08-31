import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4544_IDENTITY_FIX_RETIREMENT_READINESS.json`,'utf8'));
const audit=readFileSync(`${root}/audit-identity-fix-retirement-readiness.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/identity-fix-retirement-readiness.yml','utf8');
const runtime=readFileSync(`${root}/runtime-modules.mjs`,'utf8');

const b99File='ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab';
const b99Canonical='754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30';

test('v4.5.44 is readiness-only and pins the exact persistent B99 baseline',()=>{
  assert.equal(policy.schema_version,'engineer-osint-identity-fix-retirement-readiness-v1');
  assert.equal(policy.status,'READINESS_ONLY_NO_RETIREMENT_AUTHORIZATION');
  assert.equal(policy.reviewed_baseline_main_sha,'e1a5ba07aaeeb0559df67a3cddc3f758f04c1e57');
  assert.equal(policy.required_persistent_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.required_b99_file_sha256,b99File);
  assert.equal(policy.required_b99_canonical_sha256,b99Canonical);
  assert.equal(policy.identity_fix.file,'data-integrity-identity-fixes.js');
  assert.equal(policy.identity_fix.runtime_id,'engineer-data-integrity-identity-fixes-module');
  assert.equal(policy.identity_fix.git_blob_sha,'7dd9ae912cdc76159b3c180a6a015054603c0db5');
  assert.equal(policy.identity_fix.sentinel,'__ENGINEER_DATA_IDENTITY_FIX_20260822__');
  for(const value of Object.values(policy.safety))assert.equal(value,false);
});

test('v4.5.44 readiness requires zero residual mutations and zero external sentinel consumers',()=>{
  assert.equal(policy.expected.active_legacy_factual_module_count,1);
  assert.equal(policy.expected.identity_overlay_residual_mutations,0);
  assert.equal(policy.expected.other_public_runtime_sentinel_consumer_count,0);
  assert.equal(policy.expected.built_identity_script_count,1);
  assert.equal(policy.expected.simulated_no_identity_script_count,0);
  assert.equal(policy.expected.browser_normalized_dom_parity,true);
  assert.match(audit,/deepDiff\(store\.data,resolved\)/);
  assert.match(audit,/identity overlay still mutates canonical data/);
  assert.match(audit,/unexpected identity sentinel consumers/);
  assert.match(audit,/PUBLIC_RUNTIME_MODULES/);
  assert.match(audit,/gitBlobSha\(identityCode\)!==identity\.git_blob_sha/);
});

test('v4.5.44 prepares a simulated no-identity artifact without changing active runtime',()=>{
  assert.match(runtime,/LEGACY_FACTUAL_OVERLAY_MODULES=\[/);
  assert.match(runtime,/engineer-data-integrity-identity-fixes-module','data-integrity-identity-fixes\.js'/);
  assert.match(audit,/v4544-identity-active\.html/);
  assert.match(audit,/v4544-identity-retired-simulated\.html/);
  assert.match(audit,/built_identity_script_count:matches\.length/);
  assert.match(audit,/identity_fix_runtime_active:true/);
  assert.doesNotMatch(audit,/writeFileSync\(join\(src/);
});

test('v4.5.44 browser gate compares active and simulated-retired public DOM',()=>{
  assert.match(workflow,/Headless browser active vs simulated retired parity/);
  assert.match(workflow,/v4544-identity-active\.html/);
  assert.match(workflow,/v4544-identity-retired-simulated\.html/);
  assert.match(workflow,/HEADLESS_IDENTITY_RETIREMENT_PARITY=PASS/);
  assert.match(workflow,/bilingual=re\.compile/);
  assert.match(workflow,/s=re\.sub\(r'<script\\b\[\^>\]\*>\[\\s\\S\]\*\?<\/script>'/);
  assert.match(workflow,/active!=retired/);
});

test('v4.5.44 browser completion can only mark readiness for a separate review',()=>{
  assert.match(workflow,/ready_for_separate_retirement_authorization_review=true/);
  assert.match(workflow,/identity_fix_runtime_removal_authorized!==false/);
  assert.match(workflow,/identity_overlay_retirement_authorized!==false/);
  assert.match(workflow,/runtime_manifest_edit_authorized!==false/);
  assert.match(workflow,/identity_fix_file_deletion_authorized!==false/);
  assert.match(workflow,/legacy_baseline_edit_authorized!==false/);
  assert.match(workflow,/IDENTITY_FIX_RETIREMENT_READINESS=PASS_NO_AUTHORIZATION/);
});

test('v4.5.44 cannot write canonical data or perform retirement itself',()=>{
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  assert.doesNotMatch(workflow,/rm[^\n]*data-integrity-identity-fixes\.js/);
  assert.doesNotMatch(workflow,/git (add|commit|push)/);
  assert.doesNotMatch(workflow,/runtime-modules\.mjs[^\n]*(sed|perl|python|node)/);
  assert.doesNotMatch(workflow,/legacy-runtime-overlay-baseline\.json[^\n]*(sed|perl|python|node)/);
});
