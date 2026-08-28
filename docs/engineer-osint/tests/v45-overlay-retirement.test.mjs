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

test('retirement audit never writes canonical run-store state',()=>{
  assert.doesNotMatch(audit,/writeFileSync\([^\n]*(?:data\/runs|run-store-manifest|state_latest)/);
  assert.doesNotMatch(audit,/append-run\.mjs/);
  assert.doesNotMatch(audit,/__ENGINEER_DATA__\s*=/);
  assert.match(policy,/never hand-edited manifest hashes or an unregistered run file/);
});

test('Pages pipeline publishes and gates the retirement audit artifact',()=>{
  assert.match(workflow,/Audit overlay retirement readiness/);
  assert.match(workflow,/audit-overlay-retirement\.mjs/);
  assert.match(workflow,/overlay-retirement-audit\.json/);
  assert.match(workflow,/overlay-retirement-audit\.md/);
  assert.match(workflow,/overlay_retirement_audit=pass/);
  assert.match(workflow,/overlay_retirement_policy=zero-current-mutations/);
});

test('health exposes readiness counts and total current mutations',()=>{
  assert.match(audit,/overlay_retirement_ready=\$\{ready\}/);
  assert.match(audit,/overlay_retirement_blocked=\$\{blocked\}/);
  assert.match(audit,/legacy_factual_overlay_mutations=\$\{mutations\}/);
});
