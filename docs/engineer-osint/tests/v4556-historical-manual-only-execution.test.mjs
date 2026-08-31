import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {assertActiveProtectionCurrentOrV4557,assertV4556Applied,gitBlobSha,v4556} from './v4556-workflow-lifecycle-helper.mjs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4555_HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION.json`,'utf8'));

test('v4.5.56 consumes exactly the two v4.5.55 authorized historical anchors',()=>{
  assert.equal(v4556.reviewed_main_sha,'a3d6caf23b00a15a011ef5a1b954c900b006b844');
  assert.equal(v4556.authorization_policy,'V4555_HISTORICAL_TRIGGER_MANUAL_ONLY_AUTHORIZATION.json');
  assert.deepEqual(v4556.targets.map(x=>[x.file,x.historical_git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])),auth.targets.map(x=>[x.file,x.current_git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])));
  assertV4556Applied();
});

test('v4.5.56 keeps exactly five active protection anchors with only exact v4.5.57 browser-guard successor allowed',()=>{
  const files=readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')).sort();
  assert.equal(files.length,7);
  assert.equal(v4556.unchanged_active_protections.length,5);
  assert.deepEqual(v4556.unchanged_active_protections,auth.required_unchanged_active_protections);
  for(const item of v4556.unchanged_active_protections)assertActiveProtectionCurrentOrV4557(item);
});

test('v4.5.56 changes no data/runtime/history safety boundary',()=>{
  const r=v4556.result;
  assert.deepEqual({
    canonical_data_edited:r.canonical_data_edited,
    run_store_manifest_edited:r.run_store_manifest_edited,
    run_appended:r.run_appended,
    runtime_module_edited:r.runtime_module_edited,
    historical_policy_edited:r.historical_policy_edited,
    historical_audit_edited:r.historical_audit_edited,
    manual_hash_edit:r.manual_hash_edit
  },{
    canonical_data_edited:false,
    run_store_manifest_edited:false,
    run_appended:false,
    runtime_module_edited:false,
    historical_policy_edited:false,
    historical_audit_edited:false,
    manual_hash_edit:false
  });
  assert.equal(v4556.required_unchanged_state.b99_run_id,'engineer-osint-20260830-B99');
  assert.equal(v4556.required_unchanged_state.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(v4556.required_unchanged_state.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(v4556.required_unchanged_state.active_legacy_factual_overlay_count,0);
  assert.equal(v4556.required_unchanged_state.active_legacy_baseline_module_count,0);
});
