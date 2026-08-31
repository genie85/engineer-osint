import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4538_B99_PAGES_READINESS.json`,'utf8'));
const dispatcher=readFileSync(`${root}/audit-post-b98-steady-state.mjs`,'utf8');
const gate=readFileSync(`${root}/verify-b99-pages-readiness.mjs`,'utf8');
const pages=readFileSync('.github/workflows/pages.yml','utf8');

test('v4.5.38 pins exact B99 Pages scope without append or retirement authorization',()=>{
  assert.equal(policy.status,'PAGES_LIFECYCLE_HARDENING_NO_APPEND_AUTHORIZATION');
  assert.equal(policy.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(policy.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(policy.operation_count,36);
  assert.equal(policy.replace_field_count,27);
  assert.equal(policy.remove_field_count,9);
  assert.equal(policy.mirror_sync_request_count,1);
  assert.equal(policy.mirror_sync_target_id,'ENG-TECH-0036');
  assert.equal(policy.mirror_sync_field_count,18);
  assert.equal(policy.expected_identity_overlay_residual,0);
  for(const value of Object.values(policy.safety))assert.equal(value,false);
});

test('post-B98 Pages hook runs persistent B99 audit and accepts only active-blocked or later retired-authorized identity state',()=>{
  assert.match(dispatcher,/const b99Index=runs\.findIndex/);
  assert.match(dispatcher,/b99Persistent=b99Index>=0&&runs\.length-1>=b99Index/);
  assert.match(dispatcher,/audit-persistent-b99-identity\.mjs/);
  assert.match(dispatcher,/verify-b99-pages-readiness\.mjs/);
  assert.match(dispatcher,/b99_pages_gate_passed:b99Persistent\?true:null/);
  assert.match(dispatcher,/identity_overlay_residual_mutations!==0/);
  assert.match(dispatcher,/const identityActive=/);
  assert.match(dispatcher,/identityRetired=!identityActive&&activeFiles\.length===0/);
  assert.match(dispatcher,/IDENTITY_RETIRED_AUTHORIZED/);
});

test('B99 Pages gate requires exact persistent hash, migration and mirror-sync scope',()=>{
  assert.match(gate,/historical B99 identity\/hash drift/);
  assert.match(gate,/audit\.operation_count!==policy\.operation_count/);
  assert.match(gate,/audit\.replace_field_count!==policy\.replace_field_count/);
  assert.match(gate,/audit\.remove_field_count!==policy\.remove_field_count/);
  assert.match(gate,/audit\.mirror_sync_request_count!==policy\.mirror_sync_request_count/);
  assert.match(gate,/audit\.mirror_sync_target_id!==policy\.mirror_sync_target_id/);
  assert.match(gate,/audit\.mirror_sync_field_count!==policy\.mirror_sync_field_count/);
  assert.match(gate,/audit\.identity_overlay_residual_mutations!==policy\.expected_identity_overlay_residual/);
});

test('B99 Pages gate preserves historical active-blocked path and validates later authorized retirement separately',()=>{
  assert.match(gate,/if\(audit\.identity_fix_runtime_active===true\)/);
  assert.match(gate,/active identity lifecycle safety state mismatch/);
  assert.match(gate,/retirement=blocked/);
  assert.match(gate,/retired identity lifecycle authorization\/validation mismatch/);
  assert.match(gate,/audit-identity-fix-retirement\.mjs/);
  assert.match(gate,/identity retirement zero-debt proof failed/);
  assert.match(gate,/identity retirement built runtime contract failed/);
  assert.match(gate,/identity-runtime=retired-authorized/);
  assert.match(gate,/audit\.b99_append_authorized!==false\|\|audit\.canonical_write_performed!==false/);
  assert.doesNotMatch(gate,/append-run\.mjs/);
  assert.doesNotMatch(dispatcher,/append-run\.mjs/);
});

test('existing Pages order executes post-B98 steady-state hook before PUBLIC-CZ and final verification',()=>{
  const steady=pages.indexOf('Audit post-B98 steady state and first-three semantic parity');
  const publicCz=pages.indexOf('Audit PUBLIC-CZ-UI runtime');
  const finalVerify=pages.indexOf('Verify deployable artifact and freshness');
  assert.ok(steady>=0&&publicCz>steady&&finalVerify>publicCz);
  assert.match(pages,/audit-post-b98-steady-state\.mjs/);
});

test('PRE_B99 remains a no-op for the historical gate and cannot fabricate persistent evidence',()=>{
  assert.match(gate,/if\(b99Index<0\)/);
  assert.match(gate,/B99 Pages gate PRE_B99: not yet persistent; no append authorization/);
  assert.match(gate,/process\.exit\(0\)/);
});
