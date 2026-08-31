import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4537_B99_LIFECYCLE.json`,'utf8'));
const retirement=JSON.parse(readFileSync(`${root}/V4546_IDENTITY_FIX_RETIREMENT.json`,'utf8'));
const audit=readFileSync(`${root}/audit-persistent-b99-identity.mjs`,'utf8');
const runtime=readFileSync(`${root}/runtime-modules.mjs`,'utf8');
const workflows=[
  '.github/workflows/identity-fix-readiness.yml',
  '.github/workflows/identity-fix-b99-candidate-readiness.yml',
  '.github/workflows/identity-mirror-parity-readiness.yml',
  '.github/workflows/identity-fix-b99-mirror-sync-candidate-readiness.yml'
].map(path=>[path,readFileSync(path,'utf8')]);

test('v4.5.37 pins exact B99 lifecycle hashes without authorizing publication or retirement',()=>{
  assert.equal(policy.status,'LIFECYCLE_HARDENING_NO_APPEND_AUTHORIZATION');
  assert.equal(policy.b98_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.b98_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(policy.b99_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(policy.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  for(const value of Object.values(policy.safety))assert.equal(value,false);
});

test('persistent B99 audit requires exact lineage, exact migration scope and zero identity-overlay residual',()=>{
  assert.match(audit,/unique persistent B99 manifest entry missing/);
  assert.match(audit,/entry\.parent_run_id!==policy\.b98_run_id/);
  assert.match(audit,/entry\.file_sha256!==policy\.b99_file_sha256/);
  assert.match(audit,/entry\.canonical_sha256!==policy\.b99_canonical_sha256/);
  assert.match(audit,/operations\.length!==policy\.operation_count/);
  assert.match(audit,/REPLACE_FIELD/);
  assert.match(audit,/REMOVE_FIELD/);
  assert.match(audit,/legacy_mirror_sync_v1/);
  assert.match(audit,/identity overlay residual after persistent B99/);
  assert.match(audit,/identity_overlay_residual_mutations:residual\.length/);
});

test('v4.5.37 itself keeps retirement blocked while current audit accepts only later authorized v4.5.46 retirement',()=>{
  for(const value of Object.values(policy.safety))assert.equal(value,false);
  assert.doesNotMatch(runtime,/\['engineer-data-integrity-identity-fixes-module','data-integrity-identity-fixes\.js'\]/);
  assert.match(audit,/const identityActive=/);
  assert.match(audit,/const identityRetired=/);
  assert.match(audit,/identity retirement lacks v4\.5\.45 authorization/);
  assert.match(audit,/v4\.5\.46 retirement policy\/B99 handoff drift/);
  assert.match(audit,/IDENTITY_RETIRED_AUTHORIZED/);
  assert.match(audit,/identity_fix_runtime_active:identityActive/);
  assert.match(audit,/identity_fix_runtime_removal_authorized:removalAuthorized/);
  assert.match(audit,/identity_overlay_retirement_authorized:retirementAuthorized/);
  assert.equal(retirement.status,'AUTHORIZED_RETIREMENT_APPLIED');
  assert.equal(retirement.required_b99_file_sha256,policy.b99_file_sha256);
  assert.equal(retirement.required_b99_canonical_sha256,policy.b99_canonical_sha256);
});

test('all four identity workflows distinguish PRE_B99, POST_B99 and POST_B99_STEADY',()=>{
  for(const [path,workflow] of workflows){
    assert.match(workflow,/Detect B99 lifecycle phase/,path);
    assert.match(workflow,/phase=PRE_B99/,path);
    assert.match(workflow,/phase=POST_B99/,path);
    assert.match(workflow,/phase=POST_B99_STEADY/,path);
    assert.match(workflow,/audit-persistent-b99-identity\.mjs/,path);
    assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/,path);
  }
});

test('PRE_B99 historical evidence remains present while POST_B99 never regenerates B99',()=>{
  const map=Object.fromEntries(workflows);
  assert.match(map['.github/workflows/identity-fix-readiness.yml'],/audit-identity-fix-migration-readiness\.mjs/);
  assert.match(map['.github/workflows/identity-fix-b99-candidate-readiness.yml'],/build-identity-fix-b99-candidate\.mjs/);
  assert.match(map['.github/workflows/identity-mirror-parity-readiness.yml'],/audit-identity-mirror-parity-readiness\.mjs/);
  assert.match(map['.github/workflows/identity-mirror-parity-readiness.yml'],/HEADLESS_IDENTITY_MIRROR_PARITY=PASS/);
  assert.match(map['.github/workflows/identity-fix-b99-mirror-sync-candidate-readiness.yml'],/build-identity-fix-b99-mirror-sync-candidate\.mjs/);
  for(const workflow of Object.values(map))assert.match(workflow,/if: steps\.lifecycle\.outputs\.phase == 'PRE_B99'/);
});

test('v4.5.37 lifecycle hardening itself cannot write canonical data',()=>{
  assert.doesNotMatch(audit,/append-run\.mjs/);
  assert.doesNotMatch(audit,/writeFileSync\(join\(src/);
  for(const [,workflow] of workflows)assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
});
