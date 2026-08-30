import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
const audit=fs.readFileSync(new URL('../audit-persistent-b96.mjs',import.meta.url),'utf8');
const verifier=fs.readFileSync(new URL('../verify-pages-artifact.mjs',import.meta.url),'utf8');
const baseline=JSON.parse(fs.readFileSync(new URL('../V4512_POST_B96_RESIDUAL_BASELINE.json',import.meta.url),'utf8'));
const authorization=JSON.parse(fs.readFileSync(new URL('../V4511_B96_APPEND_AUTHORIZATION.json',import.meta.url),'utf8'));

test('v4.5.12 pins the reviewed post-Stage-A residual debt exactly',()=>{
  assert.equal(baseline.schema_version,'engineer-osint-post-b96-residual-baseline-v1');
  assert.equal(baseline.candidate_run_id,'engineer-osint-20260829-B96');
  assert.equal(baseline.candidate_file_sha256,'3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1');
  assert.equal(baseline.resulting_canonical_sha256,'4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5');
  assert.equal(baseline.expected_total_residual_signatures,61);
  assert.equal(baseline.expected_total_factual_leaf_mutations,81);
  assert.equal(baseline.modules['rich-backfill.js'].residual_signature_count,17);
  assert.equal(baseline.modules['rich-backfill-israel-turkiye-eod.js'].residual_signature_count,35);
  assert.equal(baseline.modules['rich-backfill-usa-rok.js'].residual_signature_count,9);
  assert.equal(Object.values(baseline.modules).reduce((sum,item)=>sum+item.residual_signatures.length,0),61);
});

test('post-B96 audit supports simulation and persistent modes with exact hashes and fail-safe overlay behavior',()=>{
  assert.match(audit,/--simulate-from-candidate/);
  assert.match(audit,/SIMULATED_PRE_APPEND_READINESS/);
  assert.match(audit,/PERSISTENT_POST_APPEND/);
  assert.match(audit,/exact_candidate_file_sha256/);
  assert.match(audit,/expected_resulting_canonical_sha256/);
  assert.match(audit,/expected_operation_count/);
  assert.match(audit,/expected_source_append_count/);
  assert.match(audit,/ENG-OP-B96-OVL-MIG-/);
  assert.match(audit,/ENG-GAP-B97-OVL-/);
  assert.match(audit,/ENG-ASMT-B98-OVL-/);
  assert.match(audit,/guard_short_circuit_count/);
  assert.match(audit,/persistent_b96_pages_validation_ready=1/);
});

test('Pages workflow is migration-phase aware and PR validation cannot deploy',()=>{
  assert.match(workflow,/pull_request:\n    branches: \[main\]/);
  assert.match(workflow,/Detect canonical migration phase/);
  assert.match(workflow,/phase='PRE_B96'/);
  assert.match(workflow,/phase='POST_B96'/);
  assert.match(workflow,/if: steps\.migration-phase\.outputs\.phase == 'PRE_B96'/);
  assert.match(workflow,/if: steps\.migration-phase\.outputs\.phase == 'POST_B96'/);
  assert.match(workflow,/audit-persistent-b96\.mjs --simulate-from-candidate/);
  assert.match(workflow,/audit-persistent-b96\.mjs\n/);
  assert.match(workflow,/verify-pages-artifact\.mjs/);
  assert.match(workflow,/if: github\.event_name != 'pull_request'/);
});

test('phase-aware final verifier preserves pre-B96 proof and adds a separate B96 contract',()=>{
  assert.match(verifier,/phase=currentRun===b95\?'PRE_B96':currentRun===b96\?'POST_B96':null/);
  assert.match(verifier,/unsupported canonical migration phase/);
  assert.match(verifier,/overlay_migration_dry_run=pass/);
  assert.match(verifier,/overlay_compat_transition=pass/);
  assert.match(verifier,/persistent_b96_mode=simulated-pre-append/);
  assert.match(verifier,/persistent_b96_mode=persistent/);
  assert.match(verifier,/PERSISTENT_POST_APPEND/);
  assert.match(verifier,/authorization\.status!=='READY_FOR_APPEND'/);
});

test('authorization intentionally remains blocked during initial v4.5.12 review',()=>{
  assert.equal(authorization.status,'BLOCKED_PENDING_POST_B96_CI_READINESS');
  assert.equal(authorization.required_preconditions.post_b96_ci_pipeline_ready,false);
});
