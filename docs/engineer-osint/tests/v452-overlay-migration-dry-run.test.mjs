import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dryRun=fs.readFileSync(new URL('../audit-overlay-migration-dry-run.mjs',import.meta.url),'utf8');
const policy=fs.readFileSync(new URL('../V45_OVERLAY_RETIREMENT_POLICY.md',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');

test('v4.5.2 exercises the production strict materializer only in memory',()=>{
  assert.match(dryRun,/applyStrictPatchToCanonicalData/);
  assert.match(dryRun,/structuredClone\(canonical\)/);
  assert.match(dryRun,/engineer-osint-20991231-B/);
  assert.match(dryRun,/SYNTHETIC_DRY_RUN_ONLY/);
  assert.match(dryRun,/IN_MEMORY_STRICT_PATCH_EQUIVALENCE_NO_CANONICAL_WRITE/);
  assert.match(policy,/synthetic, in-memory-only/i);
});

test('v4.5.2 re-runs each overlay and fails on unexplained canonical residuals',()=>{
  assert.match(dryRun,/vm\.runInNewContext/);
  assert.match(dryRun,/deepDiff\(beforeProbe,afterProbe\)/);
  assert.match(dryRun,/canonicalLocations/);
  assert.match(dryRun,/residualClass/);
  assert.match(dryRun,/STRUCTURAL_EQUIVALENCE_FAILED_UNEXPECTED_CANONICAL_RESIDUAL/);
  assert.match(dryRun,/unexpectedResiduals===0/);
  assert.match(policy,/unexpected canonical or unscoped residual is a CI failure/i);
});

test('v4.5.2 separates legacy mirror debt without treating it as canonical truth',()=>{
  assert.match(dryRun,/LEGACY_OR_DERIVED_MIRROR/);
  assert.match(dryRun,/legacy_mirror_residual_signatures/);
  assert.match(dryRun,/legacy_mirror_residual_leaf_mutations/);
  assert.match(dryRun,/CANONICALLY_EQUIVALENT_WITH_LEGACY_MIRROR_DEBT/);
  assert.match(dryRun,/safe_to_retire_overlays:false/);
  assert.match(policy,/remain explicit migration debt/i);
  assert.match(policy,/continue to block overlay retirement/i);
});

test('v4.5.2 preserves manual migration debt instead of inventing a removal operation',()=>{
  assert.match(dryRun,/expected_manual_signatures/);
  assert.match(dryRun,/STRUCTURALLY_EQUIVALENT_EXCEPT_MANUAL_FIELDS/);
  assert.doesNotMatch(dryRun,/REMOVE_FIELD/);
});

test('v4.5.2 authoritative locations match the strict canonical collection contract',()=>{
  for(const location of [
    'records.records','sources.sources','relations.relations','evidence.evidence','visual_registry.visuals','media_registry.media',
    'dashboard_patch_extras.technology_signals','leads.leads','dashboard_patch_extras.observed_minimum_updates','lessons_learned.lessons'
  ])assert.ok(dryRun.includes(`'${location}'`),`missing authoritative canonical location ${location}`);
  assert.ok(!dryRun.includes("'dashboard_patch_extras.updated_records'"),'historical updated_records must not be promoted to authoritative canonical storage');
  assert.ok(!dryRun.includes("'visuals.visuals'"),'legacy visual mirror must not be promoted to authoritative canonical storage');
});

test('v4.5.2 requires source hints for every synthetic correction operation',()=>{
  assert.match(dryRun,/source_id_hints\.length===0/);
  assert.match(dryRun,/has no supporting source hint/);
  assert.match(dryRun,/source_ids:\[\.\.\.item\.source_id_hints\]/);
  assert.match(policy,/provenance is independently checked/i);
});

test('v4.5.2 cannot write or append persistent canonical state',()=>{
  assert.doesNotMatch(dryRun,/writeFileSync\(join\(src/);
  assert.doesNotMatch(dryRun,/appendFileSync\(join\(src/);
  assert.doesNotMatch(dryRun,/append-run\.mjs/);
  assert.match(dryRun,/canonical_write_performed:false/);
  assert.match(dryRun,/append_run_invoked:false/);
  assert.match(dryRun,/safe_to_append:false/);
  assert.match(dryRun,/safe_to_retire_overlays:false/);
});

test('Pages publishes and gates the v4.5.2 dry-run artifact',()=>{
  assert.match(workflow,/Strict dry-run overlay canonical migration/);
  assert.match(workflow,/audit-overlay-migration-dry-run\.mjs/);
  assert.match(workflow,/overlay-migration-dry-run\.json/);
  assert.match(workflow,/overlay-migration-dry-run\.md/);
  assert.match(workflow,/overlay_migration_dry_run=pass/);
  assert.match(workflow,/unexpected_residual_signatures/);
});
