import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from '../runtime-modules.mjs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4530_FIRST_THREE_OVERLAY_RETIREMENT.json`,'utf8'));
const baseline=JSON.parse(readFileSync(`${root}/legacy-runtime-overlay-baseline.json`,'utf8'));
const audit=readFileSync(`${root}/audit-first-three-overlay-retirement.mjs`,'utf8');
const dispatcher=readFileSync(`${root}/audit-post-b98-steady-state.mjs`,'utf8');
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const firstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];
const firstThreeIds=['engineer-rich-backfill-module','engineer-rich-backfill-israel-turkiye-eod-module','engineer-rich-backfill-usa-rok-module'];

test('v4.5.30 authorization is exact, no-canonical-write and identity-fix excluded',()=>{
  assert.equal(policy.schema_version,'engineer-osint-first-three-overlay-retirement-v1');
  assert.equal(policy.status,'READY_FOR_RETIREMENT');
  assert.equal(policy.reviewed_against_main_commit,'7f7d08867052716d95ba75472afbafdcee4484ef');
  assert.equal(policy.historical_b98_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.historical_b98_file_sha256,'ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79');
  assert.equal(policy.historical_b98_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(policy.pre_retirement_public_data_sha256,'3633ba18cc69e06bdc72ca574157d901da5b43644993b4c8760e6302b728460f');
  assert.deepEqual(policy.retired_modules.map(item=>item.file),firstThree);
  assert.equal(policy.authorization.allow_canonical_run_append,false);
  assert.equal(policy.authorization.allow_run_store_manifest_edit,false);
  assert.equal(policy.authorization.allow_canonical_data_edit,false);
  assert.equal(policy.authorization.allow_identity_fix_migration,false);
  assert.equal(policy.authorization.keep_identity_fix_active,true);
});

test('v4.5.30 active runtime contains identity-fix only and no guarded retired files',()=>{
  assert.deepEqual(LEGACY_FACTUAL_OVERLAY_MODULES,[['engineer-data-integrity-identity-fixes-module','data-integrity-identity-fixes.js']]);
  assert.deepEqual([...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES],[]);
  for(const file of firstThree)assert.equal(PUBLIC_RUNTIME_MODULES.some(([,candidate])=>candidate===file),false);
  assert.ok(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='data-integrity-identity-fixes.js'));
  assert.ok(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='overlay-transition-runtime-guard.js'));
});

test('retired source files are retained as historical artifacts with pinned hashes',()=>{
  for(const item of policy.retired_modules){
    assert.ok(existsSync(`${root}/${item.file}`));
    assert.match(item.archive_file_sha256,/^[a-f0-9]{64}$/);
  }
  assert.equal(policy.authorization.retain_first_three_files_as_historical_migration_artifacts,true);
});

test('active legacy baseline is cleaned atomically to identity-fix only',()=>{
  assert.equal(baseline.version,2);
  assert.equal(baseline.status,'IDENTITY_FIX_MIGRATION_DEBT_ONLY');
  assert.deepEqual(Object.keys(baseline.modules),['data-integrity-identity-fixes.js']);
  assert.equal(baseline.modules['data-integrity-identity-fixes.js'].file_sha256,policy.required_active_identity_fix.file_sha256);
  for(const file of firstThree)assert.equal(baseline.modules[file],undefined);
});

test('retirement audit pins exact B98 retirement digest but permits later append-only descendants',()=>{
  assert.match(audit,/const exactB98=store\.report\.current_run_id===b98/);
  assert.match(audit,/if\(exactB98&&publicDataSha!==preRetirementPublicSha\)fail/);
  assert.match(audit,/POST_B98_DESCENDANT_RETIRED_RUNTIME/);
  assert.match(audit,/pre_retirement_digest_applicable:exactB98/);
  assert.match(audit,/retired_runtime_module_count:3/);
  assert.match(audit,/active_legacy_factual_module_count:1/);
  assert.match(audit,/identity_fix_active:true/);
  assert.match(audit,/identity_fix_migration_authorized:false/);
  assert.match(audit,/canonical_write_performed:false/);
  assert.match(audit,/run_store_manifest_edit_performed:false/);
});

test('built-artifact retirement contract requires three script IDs absent and identity-fix present',()=>{
  for(const id of firstThreeIds)assert.ok(policy.retired_modules.some(item=>item.runtime_id===id));
  assert.match(audit,/retired runtime script still injected/);
  assert.match(audit,/identity-fix runtime script missing from built artifact/);
  assert.match(audit,/transition guard runtime script unexpectedly missing/);
});

test('v4.5.29 dispatcher preserves historical proof and delegates retired current state to v4.5.30',()=>{
  assert.match(dispatcher,/activeFirstThree/);
  assert.match(dispatcher,/retiredFirstThree/);
  assert.match(dispatcher,/partial\/inconsistent first-three runtime retirement state/);
  assert.match(dispatcher,/audit-post-b98-steady-state-active\.mjs/);
  assert.match(dispatcher,/audit-first-three-overlay-retirement\.mjs/);
  assert.match(dispatcher,/POST_RETIREMENT_COMPATIBILITY/);
});

test('retirement slice does not modify canonical run-store lineage',()=>{
  const current=manifest.runs.at(-1);
  assert.equal(current.run_id,'engineer-osint-20260830-B98');
  assert.equal(current.file_sha256,'ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79');
  assert.equal(current.canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
});
