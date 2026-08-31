import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const policy=JSON.parse(readFileSync(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-readonly-migration-workflow-disposition.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const candidateFiles=[
  'b97-readiness.yml',
  'b98-readiness.yml',
  'b98-post-ci-readiness.yml',
  'identity-fix-b99-candidate-readiness.yml',
  'identity-fix-b99-mirror-sync-candidate-readiness.yml',
  'identity-fix-readiness.yml',
  'identity-mirror-parity-readiness.yml'
].sort();

test('v4.5.51 classifies exactly seven read-only migration workflows without authorizing removal',()=>{
  assert.equal(policy.schema_version,'engineer-osint-readonly-migration-workflow-disposition-v1');
  assert.equal(policy.status,'SEVEN_SAFE_REMOVAL_CANDIDATES_NO_REMOVAL_AUTHORIZED');
  assert.equal(policy.reviewed_main_sha,'cf846fe1f10a8a06187354bda47a99a8890666a5');
  assert.equal(policy.reviewed_v4550_policy_git_blob_sha,'030a35d5e8c5cb28754e1befa087bba6b5c7d461');
  assert.deepEqual(policy.candidates.map(x=>x.file).sort(),candidateFiles);
  assert.equal(policy.candidates.length,7);
  for(const item of policy.candidates){
    assert.equal(item.disposition,'SAFE_REMOVAL_CANDIDATE_AFTER_EXACT_AUTHORIZATION',item.file);
    assert.equal(item.permissions,'contents: read',item.file);
    assert.equal(item.node_version,'20',item.file);
  }
  for(const [key,value] of Object.entries(policy.authorization))assert.equal(value,false,key);
});

test('v4.5.51 pins the complete 5/2/7 workflow inventory and candidate blobs',()=>{
  const replacements=Object.values(policy.replacement_protections);
  const historical=policy.historical_evidence_workflows;
  const candidates=policy.candidates;
  assert.equal(replacements.length,5);
  assert.equal(historical.length,2);
  assert.equal(candidates.length,7);
  const expected=[...replacements,...historical,...candidates];
  const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
  assert.equal(expected.length,14);
  assert.deepEqual(actual,expected.map(x=>x.file).sort());
  for(const item of expected){
    const text=readFileSync(`${workflowsDir}/${item.file}`,'utf8');
    assert.equal(gitBlobSha(text),item.git_blob_sha,item.file);
  }
});

test('v4.5.51 candidates remain read-only, non-reusable and replacement-backed',()=>{
  const activeFiles=new Set(Object.values(policy.replacement_protections).map(x=>x.file));
  for(const item of policy.candidates){
    const text=readFileSync(`${workflowsDir}/${item.file}`,'utf8');
    assert.match(text,/permissions:\s*\n\s*contents:\s*read\b/,item.file);
    assert.doesNotMatch(text,/contents:\s*write\b/,item.file);
    assert.doesNotMatch(text,/workflow_call\s*:/,item.file);
    assert.match(text,/node-version:\s*['"]?20['"]?/,item.file);
    assert.ok(item.replacement_reason.length>40,item.file);
    assert.ok(item.replacement_workflows.length>=1,item.file);
    for(const replacement of item.replacement_workflows)assert.ok(activeFiles.has(replacement),`${item.file} -> ${replacement}`);
  }
});

test('v4.5.51 preserves exact B99 lineage and future cleanup stays separately gated',()=>{
  assert.equal(policy.required_current_lineage.b99_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.required_current_lineage.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(policy.required_current_lineage.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(policy.required_next_slice.exact_seven_removal_authorized,false);
  assert.equal(policy.required_next_slice.partial_subset_removal_authorized,false);
  assert.equal(policy.required_next_slice.historical_evidence_trigger_deactivation_authorized,false);
  assert.equal(policy.required_next_slice.active_protection_modernization_authorized,false);
  assert.equal(policy.required_next_slice.must_pin_all_seven_blobs_again,true);
  assert.equal(policy.required_next_slice.must_prove_no_workflow_call_or_cross_workflow_dependency,true);
  assert.equal(policy.required_next_slice.must_preserve_five_active_protections,true);
  assert.equal(policy.required_next_slice.must_preserve_two_historical_evidence_workflows,true);
  assert.equal(policy.required_next_slice.must_preserve_b99_hashes,true);
});

test('v4.5.51 disposition audit is read-only and passes fail-closed',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  const output=execFileSync(process.execPath,[`${root}/audit-readonly-migration-workflow-disposition.mjs`],{encoding:'utf8'});
  assert.match(output,/READONLY_MIGRATION_WORKFLOW_DISPOSITION=PASS/);
  assert.match(output,/workflows=14 candidates=7 active=5 historical=2 cross-workflow-refs=0 removal-authorized=0 b99=engineer-osint-20260830-B99/);
});
