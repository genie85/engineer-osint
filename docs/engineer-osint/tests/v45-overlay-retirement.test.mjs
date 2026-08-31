import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const audit=fs.readFileSync(new URL('../audit-overlay-retirement.mjs',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');
const pagesVerifier=fs.readFileSync(new URL('../verify-pages-artifact-pre-b98.mjs',import.meta.url),'utf8');
const policy=fs.readFileSync(new URL('../V45_OVERLAY_RETIREMENT_POLICY.md',import.meta.url),'utf8');
const v4530=JSON.parse(fs.readFileSync(new URL('../V4530_FIRST_THREE_OVERLAY_RETIREMENT.json',import.meta.url),'utf8'));
const v4546=JSON.parse(fs.readFileSync(new URL('../V4546_IDENTITY_FIX_RETIREMENT.json',import.meta.url),'utf8'));

test('v4.5 retirement audit remains current-materialization based and fail-closed on active pinned scope',()=>{
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

test('v4.5.30 historically retires exactly the first three and v4.5.46 later retires identity-fix separately',()=>{
  for(const file of ['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js']){
    assert.equal(manifest.includes(`['engineer-${file.replace(/\.js$/,'').replaceAll('-','-')}-module','${file}']`),false);
    assert.ok(v4530.retired_modules.some(item=>item.file===file));
  }
  assert.equal(v4530.authorization.keep_identity_fix_active,true);
  assert.equal(v4530.authorization.allow_identity_fix_migration,false);
  assert.doesNotMatch(manifest,/\['engineer-data-integrity-identity-fixes-module','data-integrity-identity-fixes\.js'\]/);
  assert.match(manifest,/export const LEGACY_FACTUAL_OVERLAY_MODULES=\[\]/);
  assert.equal(v4546.status,'AUTHORIZED_RETIREMENT_APPLIED');
  assert.equal(v4546.retirement.identity_fix_removed_from_public_runtime,true);
  assert.equal(v4546.retirement.resulting_active_legacy_factual_module_count,0);
  assert.equal(v4546.identity_fix.historical_source_retained,true);
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

test('Pages pipeline publishes and gates the retirement and migration-map artifacts through the final verifier',()=>{
  assert.match(workflow,/Audit overlay retirement readiness/);
  assert.match(workflow,/audit-overlay-retirement\.mjs/);
  assert.match(workflow,/verify-pages-artifact\.mjs/);
  assert.match(pagesVerifier,/overlay-retirement-audit\.json/);
  assert.match(pagesVerifier,/overlay-retirement-audit\.md/);
  assert.match(pagesVerifier,/overlay-migration-map\.json/);
  assert.match(pagesVerifier,/overlay-migration-map\.md/);
  assert.match(pagesVerifier,/overlay_retirement_audit=pass/);
  assert.match(pagesVerifier,/overlay_retirement_policy=zero-current-mutations/);
  assert.match(pagesVerifier,/overlay_migration_map=pass/);
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
