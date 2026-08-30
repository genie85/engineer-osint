import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {validateMediaSweepExceptionRegistry} from '../lib/media-sweep-exceptions.mjs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4525_B98_POST_CI_READINESS.json`,'utf8'));
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const lib=readFileSync(`${root}/lib/media-sweep-exceptions.mjs`,'utf8');
const audit=readFileSync(`${root}/audit-persistent-b98.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/b98-post-ci-readiness.yml','utf8');
const attestation=readFileSync(`${root}/data/attestations/engineer-osint-20260830-B98-media-omission.md`,'utf8');
const sha256=text=>createHash('sha256').update(text).digest('hex');

test('v4.5.25 pins exact B98 hashes but keeps append blocked',()=>{
  assert.equal(policy.schema_version,'engineer-osint-b98-post-ci-readiness-v1');
  assert.equal(policy.status,'BLOCKED_PENDING_POST_B98_CI_READINESS');
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260830-B97');
  assert.equal(policy.expected_parent_canonical_sha256,'9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4');
  assert.equal(policy.exact_candidate_file_sha256,'ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79');
  assert.equal(policy.expected_resulting_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(policy.required_preconditions.post_b98_ci_pipeline_ready,false);
  assert.equal(policy.required_preconditions.pages_post_b98_phase_ready,false);
  assert.equal(policy.authorization.append_allowed,false);
  assert.equal(policy.authorization.standard_append_run_write_allowed,false);
  assert.equal(policy.authorization.allow_overlay_retirement,false);
  assert.equal(policy.authorization.allow_identity_fix_migration,false);
  assert.equal(existsSync(`${root}/data/runs/engineer-osint-20260830-B98.json`),false);
});

test('B98 media attestation is exact, one-run and assessment-migration-only',()=>{
  validateMediaSweepExceptionRegistry(registry);
  const entry=registry.exceptions.find(item=>item.run_id==='engineer-osint-20260830-B98');
  assert.ok(entry);
  assert.equal(registry.exceptions.filter(item=>item.run_id==='engineer-osint-20260830-B98').length,1);
  assert.equal(entry.exception_id,'MEDIA-SWEEP-ATTEST-B98-INTELLIGENCE-MIGRATION');
  assert.equal(entry.parent_run_id,'engineer-osint-20260830-B97');
  assert.equal(entry.attestation_basis,'REPOSITORY_REVIEWED_MIGRATION');
  assert.equal(entry.attestation_reference,'V4524_B98_READINESS+V4525_B98_POST_CI_READINESS');
  assert.equal(entry.waiver_scope,'INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(entry.resolved_status,'MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(entry.repository_file_sha256,policy.exact_candidate_file_sha256);
  assert.equal(entry.repository_canonical_sha256,policy.expected_resulting_canonical_sha256);
  assert.equal(sha256(attestation),entry.report_text_sha256);
  assert.match(lib,/ensureIntelligenceAssessmentMigrationNoMediaAddition/);
  assert.match(lib,/NEW_EVIDENCE!==2/);
  assert.match(lib,/intel\.assessments\.length!==4/);
  assert.match(lib,/ENG-ASMT-B98-OVL-/);
});

test('persistent B98 audit has symmetric simulated and persistent exact-hash modes',()=>{
  assert.match(audit,/--simulate-from-generated/);
  assert.match(audit,/simulation requires exact persistent B97/);
  assert.match(audit,/persistent audit requires exact B98 tip/);
  assert.match(audit,/generated B98 candidate SHA drift/);
  assert.match(audit,/persistent B98 manifest entry drift/);
  assert.match(audit,/expected_guard_short_circuits_after/);
  assert.match(audit,/guarded B98 overlay path mutated factual state/);
  assert.match(audit,/post_b98_pages_validation_ready:true/);
  assert.match(audit,/overlay_retirement_authorized:false/);
  assert.match(audit,/identity_fix_migration_authorized:false/);
});

test('POST_B98 readiness workflow regenerates and dry-runs exact B98 without writes',()=>{
  assert.match(workflow,/build-b98-readiness\.mjs/);
  assert.match(workflow,/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/audit-persistent-b98\.mjs --simulate-from-generated/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.match(workflow,/exact_candidate_file_sha256/);
  assert.match(workflow,/expected_resulting_canonical_sha256/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
});
