import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync(new URL('../audit-overlay-production-preview.mjs',import.meta.url),'utf8');
const resolution=JSON.parse(fs.readFileSync(new URL('../V454_MIGRATION_RESOLUTION.json',import.meta.url),'utf8'));
const policy=fs.readFileSync(new URL('../V45_OVERLAY_RETIREMENT_POLICY.md',import.meta.url),'utf8');
const intelligence=fs.readFileSync(new URL('../INTELLIGENCE_V1_CONTRACT.md',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');
const pagesVerifier=fs.readFileSync(new URL('../verify-pages-artifact.mjs',import.meta.url),'utf8');

test('v4.5.4 resolves the four substantive provenance blockers explicitly',()=>{
  const special=resolution.special_resolutions;
  assert.equal(special['records:ENG-TECH-0011:weight'].final_value,'10.7 t (machine only)');
  assert.equal(special['records:ENG-TECH-0014:weight'].resolution,'OMIT_NO_CANONICAL_FACTUAL_WRITE');
  assert.equal(special['records:ENG-TECH-0013:summary_cs'].resolution,'NARROW_TO_CURRENT_REVIEWED_SOURCE_SCOPE');
  assert.equal(special['records:ENG-TECH-0013:technical_profile'].resolution,'NARROW_TO_CURRENT_REVIEWED_SOURCE_SCOPE');
  assert.match(special['records:ENG-TECH-0013:summary_cs'].final_value,/nedokládají konkrétní ženijní konfiguraci/i);
});

test('v4.5.4 routes analytical fields to native Intelligence v1 preparation rather than factual operations',()=>{
  assert.equal(resolution.analytical_routes.intelligence_gaps,'INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED');
  assert.match(resolution.analytical_routes.why_it_matters,/ASSESSMENT/);
  assert.match(resolution.analytical_routes.what_it_does_not_prove,/ASSESSMENT_LIMITATION/);
  assert.match(intelligence,/analytical conclusion, not a factual source record/i);
  assert.match(preview,/production_intelligence_id:null/);
  assert.match(preview,/requires_supporting_evidence_binding:true/);
});

test('v4.5.4 preserves pre-existing canonical source ids when adding reviewed overlay sources',()=>{
  assert.equal(resolution.administrative_routes.source_ids,'UNION_CANONICAL_AND_REVIEWED_SOURCE_IDS');
  assert.match(preview,/const merged=union\(before,after,sourceIdsFor\(candidate\)\)/);
  assert.match(preview,/source union lost a pre-overlay canonical source/);
});

test('v4.5.4 does not persist stale presentation metadata or absence sentinels',()=>{
  assert.equal(resolution.administrative_routes.rich_backfill_status,'DROP_LEGACY_PRESENTATION_STATUS_NO_WRITE');
  assert.equal(resolution.administrative_routes.verification_note,'DROP_LEGACY_MIGRATION_NOTE_NO_WRITE');
  assert.match(preview,/cannot omit absence sentinel because a pre-overlay canonical value exists/);
  assert.match(preview,/Legacy presentation\/migration metadata is not canonical production truth/);
});

test('v4.5.4 validates Stage A through the production strict materializer in memory',()=>{
  assert.match(preview,/applyStrictPatchToCanonicalData/);
  assert.match(preview,/SYNTHETIC_PREVIEW_ONLY/);
  assert.match(preview,/engineer-osint-20991231-B9954/);
  assert.match(preview,/strict Stage A preview failed/);
  assert.match(preview,/expected 104 Stage A operation templates/);
  assert.match(preview,/expected 15 source appends/);
});

test('v4.5.4 keeps real append and overlay retirement disabled',()=>{
  assert.equal(resolution.safety.canonical_write_performed,false);
  assert.equal(resolution.safety.append_run_invoked,false);
  assert.equal(resolution.safety.production_operation_ids_generated,false);
  assert.equal(resolution.safety.production_run_id_generated,false);
  assert.equal(resolution.safety.safe_to_append,false);
  assert.equal(resolution.safety.safe_to_retire_overlays,false);
  assert.match(preview,/safe_to_append:false/);
  assert.match(preview,/safe_to_retire_overlays:false/);
  assert.doesNotMatch(preview,/append-run\.mjs/);
  assert.match(policy,/read-only with respect to canonical data and persistence/i);
});

test('Pages publishes and gates the v4.5.4 production preview before deployment through the final verifier',()=>{
  assert.match(workflow,/Preview resolved overlay production migration/);
  assert.match(workflow,/audit-overlay-production-preview\.mjs/);
  assert.match(workflow,/verify-pages-artifact\.mjs/);
  assert.match(pagesVerifier,/overlay-production-migration-preview\.json/);
  assert.match(pagesVerifier,/overlay-production-migration-preview\.md/);
  assert.match(pagesVerifier,/overlay_production_preview=pass/);
  assert.match(pagesVerifier,/overlay_production_preview_stage_a_strict=pass/);
  assert.match(pagesVerifier,/overlay_production_preview_safe_to_append=0/);
});
