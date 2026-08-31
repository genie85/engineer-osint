import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4552_EXACT_SEVEN_WORKFLOW_AUTHORIZATION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-exact-seven-workflow-authorization.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.52 authorizes exactly seven previously classified read-only workflows and nothing broader',()=>{
  assert.equal(policy.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_FOR_NEXT_SLICE_ONLY');
  assert.equal(policy.reviewed_main_sha,'1d7f9a5f7dbf0ada8c09d95fbd8b4d3dca437d07');
  assert.equal(policy.authorization.exact_seven_workflow_removal_authorized,true);
  for(const key of ['partial_subset_removal_authorized','workflow_content_edit_authorized','trigger_deactivation_without_removal_authorized','historical_evidence_workflow_change_authorized','active_protection_workflow_change_authorized','canonical_data_edit_authorized','run_store_edit_authorized','run_append_authorized','runtime_edit_authorized','manual_hash_edit_authorized'])assert.equal(policy.authorization[key],false,key);
  assert.equal(policy.authorized_targets.length,7);
  assert.equal(new Set(policy.authorized_targets.map(x=>x.file)).size,7);
});

test('v4.5.52 repins all seven targets and all seven preserved workflows',()=>{
  const active=policy.required_preserved_workflows.active_production_protection;
  const historical=policy.required_preserved_workflows.historical_evidence_keep;
  assert.equal(active.length,5);
  assert.equal(historical.length,2);
  for(const item of [...policy.authorized_targets,...active,...historical]){
    const text=readFileSync(`.github/workflows/${item.file}`,'utf8');
    assert.equal(gitBlobSha(text),item.git_blob_sha,item.file);
  }
  const actual=readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')).sort();
  assert.deepEqual(actual,[...policy.authorized_targets,...active,...historical].map(x=>x.file).sort());
});

test('v4.5.52 remains authorization-only and fail-closed before execution',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  const output=execFileSync(process.execPath,[`${root}/audit-exact-seven-workflow-authorization.mjs`],{encoding:'utf8'});
  assert.match(output,/EXACT_SEVEN_WORKFLOW_AUTHORIZATION=PASS/);
  assert.match(output,/targets=7 active=5 historical=2 refs=0 b99=engineer-osint-20260830-B99/);
});

test('v4.5.52 next execution is exact-all-seven only and preserves canonical/runtime',()=>{
  const exec=policy.execution_contract;
  assert.equal(exec.authorization_applies_only_if_all_seven_blobs_match,true);
  assert.equal(exec.next_slice_must_remove_exactly_all_seven_targets,true);
  assert.equal(exec.next_slice_must_not_modify_other_workflows,true);
  assert.equal(exec.next_slice_must_not_edit_canonical_or_runtime,true);
  assert.equal(exec.next_slice_must_revalidate_p0_p1_build_browser_and_pages,true);
  assert.equal(exec.authorization_is_invalid_after_any_authorized_target_blob_drift,true);
});
