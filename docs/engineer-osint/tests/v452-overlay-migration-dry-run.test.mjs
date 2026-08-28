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

test('v4.5.2 re-runs each overlay and fails on unexplained factual residuals',()=>{
  assert.match(dryRun,/vm\.runInNewContext/);
  assert.match(dryRun,/deepDiff\(beforeProbe,afterProbe\)/);
  assert.match(dryRun,/unexpected_residual_signatures/);
  assert.match(dryRun,/STRUCTURAL_EQUIVALENCE_FAILED_UNEXPECTED_RESIDUAL/);
  assert.match(dryRun,/unexpectedResiduals===0/);
});

test('v4.5.2 preserves manual migration debt instead of inventing a removal operation',()=>{
  assert.match(dryRun,/expected_manual_signatures/);
  assert.match(dryRun,/STRUCTURALLY_EQUIVALENT_EXCEPT_MANUAL_FIELDS/);
  assert.doesNotMatch(dryRun,/REMOVE_FIELD/);
  assert.match(policy,/unexpected residual is a CI failure/i);
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
});

test('Pages publishes and gates the v4.5.2 dry-run artifact',()=>{
  assert.match(workflow,/Strict dry-run overlay canonical migration/);
  assert.match(workflow,/audit-overlay-migration-dry-run\.mjs/);
  assert.match(workflow,/overlay-migration-dry-run\.json/);
  assert.match(workflow,/overlay-migration-dry-run\.md/);
  assert.match(workflow,/overlay_migration_dry_run=pass/);
  assert.match(workflow,/unexpected_residual_signatures/);
});
