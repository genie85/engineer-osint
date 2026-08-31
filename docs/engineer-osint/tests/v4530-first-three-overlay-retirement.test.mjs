import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from '../runtime-modules.mjs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4530_FIRST_THREE_OVERLAY_RETIREMENT.json`,'utf8'));
const baseline=JSON.parse(readFileSync(`${root}/legacy-runtime-overlay-baseline.json`,'utf8'));
const identityRetirement=JSON.parse(readFileSync(`${root}/V4546_IDENTITY_FIX_RETIREMENT.json`,'utf8'));
const audit=readFileSync(`${root}/audit-first-three-overlay-retirement.mjs`,'utf8');
const normalizedAudit=readFileSync(`${root}/audit-first-three-overlay-retirement-normalized.mjs`,'utf8');
const dispatcher=readFileSync(`${root}/audit-post-b98-steady-state.mjs`,'utf8');
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const firstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];
const firstThreeIds=['engineer-rich-backfill-module','engineer-rich-backfill-israel-turkiye-eod-module','engineer-rich-backfill-usa-rok-module'];
const b98Id='engineer-osint-20260830-B98';
const b98FileSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const b98CanonicalSha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';

test('v4.5.30 authorization is exact, no-canonical-write and identity-fix excluded',()=>{
  assert.equal(policy.schema_version,'engineer-osint-first-three-overlay-retirement-v1');
  assert.equal(policy.status,'READY_FOR_RETIREMENT');
  assert.equal(policy.reviewed_against_main_commit,'7f7d08867052716d95ba75472afbafdcee4484ef');
  assert.equal(policy.historical_b98_run_id,b98Id);
  assert.equal(policy.historical_b98_file_sha256,b98FileSha);
  assert.equal(policy.historical_b98_canonical_sha256,b98CanonicalSha);
  assert.equal(policy.pre_retirement_public_data_sha256,'3633ba18cc69e06bdc72ca574157d901da5b43644993b4c8760e6302b728460f');
  assert.deepEqual(policy.retired_modules.map(item=>item.file),firstThree);
  assert.equal(policy.authorization.allow_canonical_run_append,false);
  assert.equal(policy.authorization.allow_run_store_manifest_edit,false);
  assert.equal(policy.authorization.allow_canonical_data_edit,false);
  assert.equal(policy.authorization.allow_identity_fix_migration,false);
  assert.equal(policy.authorization.keep_identity_fix_active,true);
});

test('current runtime preserves first-three retirement and applies later authorized identity-fix retirement',()=>{
  assert.deepEqual(LEGACY_FACTUAL_OVERLAY_MODULES,[]);
  assert.deepEqual([...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES],[]);
  for(const file of firstThree)assert.equal(PUBLIC_RUNTIME_MODULES.some(([,candidate])=>candidate===file),false);
  assert.equal(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='data-integrity-identity-fixes.js'),false);
  assert.ok(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='overlay-transition-runtime-guard.js'));
  assert.equal(policy.authorization.keep_identity_fix_active,true,'historical v4.5.30 boundary must remain pinned');
  assert.equal(identityRetirement.status,'AUTHORIZED_RETIREMENT_APPLIED');
  assert.equal(identityRetirement.retirement.resulting_active_legacy_factual_module_count,0);
});

test('retired source files are retained as historical artifacts with pinned hashes',()=>{
  for(const item of policy.retired_modules){
    assert.ok(existsSync(`${root}/${item.file}`));
    assert.match(item.archive_file_sha256,/^[a-f0-9]{64}$/);
  }
  assert.ok(existsSync(`${root}/${identityRetirement.identity_fix.file}`));
  assert.equal(policy.authorization.retain_first_three_files_as_historical_migration_artifacts,true);
  assert.equal(identityRetirement.identity_fix.historical_source_retained,true);
});

test('active legacy baseline reaches zero debt only in later v4.5.46 retirement',()=>{
  assert.equal(policy.authorization.keep_identity_fix_active,true);
  assert.equal(baseline.version,3);
  assert.equal(baseline.status,'NO_ACTIVE_LEGACY_FACTUAL_OVERLAY_DEBT');
  assert.deepEqual(Object.keys(baseline.modules),[]);
  assert.equal(baseline.retired_identity_fix_at,'v4.5.46');
  assert.equal(identityRetirement.retirement.resulting_active_legacy_baseline_module_count,0);
  for(const file of firstThree)assert.equal(baseline.modules[file],undefined);
});

test('retirement audit pins exact B98 first-three digest while permitting later authorized identity retirement on descendants',()=>{
  assert.match(audit,/const exactB98=store\.report\.current_run_id===b98/);
  assert.match(audit,/if\(exactB98&&publicDataSha!==preRetirementPublicSha\)fail/);
  assert.match(audit,/POST_B98_DESCENDANT_FIRST_THREE_RETIRED_/);
  assert.match(audit,/IDENTITY_RETIRED_AUTHORIZED/);
  assert.match(audit,/pre_retirement_digest_applicable:exactB98/);
  assert.match(audit,/retired_runtime_module_count:3/);
  assert.match(audit,/active_legacy_factual_module_count:activeLegacyFiles\.length/);
  assert.match(audit,/identity_fix_active:identityActive/);
  assert.match(audit,/identity_fix_retired:identityRetired/);
  assert.match(audit,/identity_fix_migration_authorized:laterIdentityRetirementAuthorized/);
  assert.match(audit,/canonical_write_performed:false/);
  assert.match(audit,/run_store_manifest_edit_performed:false/);
});

test('normalized retirement wrapper preserves the v4.5.29 structured-clone serialization contract',()=>{
  assert.match(normalizedAudit,/structuredClone/);
  assert.match(normalizedAudit,/audit-first-three-overlay-retirement\.mjs/);
  assert.match(normalizedAudit,/originalStringify/);
});

test('built-artifact retirement contract requires first-three and later identity scripts absent while transition guard remains',()=>{
  for(const id of firstThreeIds)assert.ok(policy.retired_modules.some(item=>item.runtime_id===id));
  assert.match(audit,/retired first-three runtime script still injected/);
  assert.match(audit,/retired identity-fix runtime script still injected/);
  assert.match(audit,/transition guard runtime script unexpectedly missing/);
});

test('v4.5.29 dispatcher preserves historical proof and delegates retired current state to normalized v4.5.30 audit',()=>{
  assert.match(dispatcher,/activeFirstThree/);
  assert.match(dispatcher,/retiredFirstThree/);
  assert.match(dispatcher,/partial\/inconsistent first-three runtime retirement state/);
  assert.match(dispatcher,/audit-post-b98-steady-state-active\.mjs/);
  assert.match(dispatcher,/audit-first-three-overlay-retirement-normalized\.mjs/);
  assert.match(dispatcher,/POST_RETIREMENT_COMPATIBILITY/);
  assert.match(dispatcher,/IDENTITY_RETIRED_AUTHORIZED/);
});

test('retirement slice preserves the exact historical B98 anchor under append-only descendants',()=>{
  const b98Index=manifest.runs.findIndex(item=>item.run_id===b98Id);
  assert.ok(b98Index>=0,'historical B98 retirement anchor missing');
  const b98Entry=manifest.runs[b98Index];
  assert.equal(b98Entry.file_sha256,b98FileSha);
  assert.equal(b98Entry.canonical_sha256,b98CanonicalSha);
  for(let i=b98Index+1;i<manifest.runs.length;i++){
    const parent=manifest.runs[i-1];
    const descendant=manifest.runs[i];
    assert.equal(descendant.parent_run_id,parent.run_id,`post-B98 descendant ${descendant.run_id} parent drift`);
    assert.equal(descendant.parent_canonical_sha256,parent.canonical_sha256,`post-B98 descendant ${descendant.run_id} parent canonical SHA drift`);
  }
});
