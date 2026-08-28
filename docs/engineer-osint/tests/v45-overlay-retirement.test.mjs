import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const audit=fs.readFileSync(new URL('../audit-overlay-retirement.mjs',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');
const policy=fs.readFileSync(new URL('../V45_OVERLAY_RETIREMENT_POLICY.md',import.meta.url),'utf8');

test('v4.5 retirement audit is current-materialization based and fail-closed on pinned scope',()=>{
  assert.match(audit,/built canonical ENGINEER_DATA/);
  assert.match(audit,/fileHash!==expected\.file_sha256/);
  assert.match(audit,/escaped pinned targets/);
  assert.match(audit,/deepDiff\(before,resolved\)/);
  assert.match(audit,/ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT/);
});

test('v4.5 classifies zero-delta modules without auto-retiring them',()=>{
  assert.match(audit,/changes\.length===0\?'READY_FOR_RETIREMENT_REVIEW':'ACTIVE_MUTATION_DEBT'/);
  assert.match(audit,/necessary but not sufficient/);
  assert.match(policy,/mutation_count === 0/);
  assert.match(policy,/public-output comparison/);
});

test('all four factual overlays remain active until a separate canonical retirement slice',()=>{
  for(const file of [
    'rich-backfill.js',
    'rich-backfill-israel-turkiye-eod.js',
    'rich-backfill-usa-rok.js',
    'data-integrity-identity-fixes.js'
  ])assert.ok(manifest.includes(file),`unsafe early retirement of ${file}`);
});

test('v4.5.1 emits an exact field-level migration map with explicit route semantics',()=>{
  assert.match(audit,/engineer-osint-overlay-migration-map-v1/);
  assert.match(audit,/leafChanges\.length!==mutations/);
  assert.match(audit,/before_value:valueEnvelope\(change\.before\)/);
  assert.match(audit,/after_value:valueEnvelope\(change\.after\)/);
  assert.match(audit,/OPERATIONS_V1_REPLACE_FIELD/);
  assert.match(audit,/STRICT_COLLECTION_APPEND/);
  assert.match(audit,/PROTECTED_FIELD_MANUAL_MIGRATION_REVIEW/);
  assert.match(audit,/FIELD_REMOVAL_MANUAL_MIGRATION_REVIEW/);
  assert.match(audit,/NO_CANONICAL_MIGRATION_OVERLAY_META/);
  assert.match(policy,/source hint copied from a resolved target is not proof of provenance/i);
});

test('nested leaf mutations are consolidated to top-level operation fields',()=>{
  assert.match(audit,/top_level_field:topField/);
  assert.match(audit,/REPLACE_TOP_LEVEL_FIELD/);
  assert.match(audit,/existing\.leaf_paths=\[\.\.\.new Set/);
  assert.match(policy,/REPLACE_FIELD.*top-level field/s);
});

test('retirement audit and migration map never write canonical run-store state',()=>{
  assert.doesNotMatch(audit,/writeFileSync\(join\(src/);
  assert.doesNotMatch(audit,/appendFileSync\(join\(src/);
  assert.doesNotMatch(audit,/append-run\.mjs/);
  assert.match(policy,/never hand-edited manifest hashes or an unregistered run file/);
  assert.match(policy,/read-only with respect to canonical data/i);
});

test('Pages pipeline publishes and gates the retirement and migration-map artifacts',()=>{
  assert.match(workflow,/Audit overlay retirement readiness/);
  assert.match(workflow,/audit-overlay-retirement\.mjs/);
  assert.match(workflow,/overlay-retirement-audit\.json/);
  assert.match(workflow,/overlay-retirement-audit\.md/);
  assert.match(workflow,/overlay-migration-map\.json/);
  assert.match(workflow,/overlay-migration-map\.md/);
  assert.match(workflow,/overlay_retirement_audit=pass/);
  assert.match(workflow,/overlay_retirement_policy=zero-current-mutations/);
  assert.match(workflow,/overlay_migration_map=pass/);
});

test('health exposes retirement readiness and migration-map decomposition',()=>{
  assert.match(audit,/overlay_retirement_ready=\$\{ready\}/);
  assert.match(audit,/overlay_retirement_blocked=\$\{blocked\}/);
  assert.match(audit,/legacy_factual_overlay_mutations=\$\{mutations\}/);
  assert.match(audit,/overlay_migration_leaf_mutations=\$\{leafChanges\.length\}/);
  assert.match(audit,/overlay_migration_canonical_leaf_mutations=\$\{canonicalLeafMutations\}/);
  assert.match(audit,/overlay_migration_meta_mutations=\$\{metaMutations\}/);
  assert.match(audit,/overlay_migration_candidates=\$\{candidates\.length\}/);
  assert.match(audit,/overlay_migration_manual_review=\$\{manualCandidates\}/);
});
