import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {assertHistoricalWorkflowCurrentOrV4556,assertActiveProtectionCurrentOrV4557} from './v4556-workflow-lifecycle-helper.mjs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const policy=JSON.parse(readFileSync(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-readonly-migration-workflow-disposition.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const v4553Path=`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`;
const v4553=existsSync(v4553Path)?JSON.parse(readFileSync(v4553Path,'utf8')):null;
const laterAuthorizedWorkflow='authorized-canonical-executor.yml';
const historicalWorkflowSurface=()=>readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')&&x!==laterAuthorizedWorkflow).sort();

const candidateFiles=[
  'b97-readiness.yml','b98-readiness.yml','b98-post-ci-readiness.yml',
  'identity-fix-b99-candidate-readiness.yml','identity-fix-b99-mirror-sync-candidate-readiness.yml',
  'identity-fix-readiness.yml','identity-mirror-parity-readiness.yml'
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

test('v4.5.51 historical 5/2/7 inventory remains pinned across the authorized v4.5.53/v4.5.56/v4.5.57 lifecycle',()=>{
  const replacements=Object.values(policy.replacement_protections);
  const historical=policy.historical_evidence_workflows;
  const candidates=policy.candidates;
  assert.equal(replacements.length,5);
  assert.equal(historical.length,2);
  assert.equal(candidates.length,7);
  if(!v4553){
    const expected=[...replacements,...historical,...candidates];
    const actual=historicalWorkflowSurface();
    assert.equal(expected.length,14);
    assert.deepEqual(actual,expected.map(x=>x.file).sort());
    for(const item of expected)assert.equal(gitBlobSha(readFileSync(`${workflowsDir}/${item.file}`,'utf8')),item.git_blob_sha,item.file);
    return;
  }
  assert.equal(v4553.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED');
  assert.equal(v4553.classification_policy_git_blob_sha,'71c41f006375fbbf44ec53d94272777bc4f74370');
  assert.equal(v4553.classification_audit_git_blob_sha,'2890b5ce742aaf6a2c0e7bf2c8208a60266541c4');
  assert.deepEqual(v4553.removed_targets.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])),candidates.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])));
  const remaining=[...replacements,...historical];
  const actual=historicalWorkflowSurface();
  assert.deepEqual(actual,remaining.map(x=>x.file).sort());
  for(const item of candidates)assert.equal(existsSync(`${workflowsDir}/${item.file}`),false,item.file);
  for(const item of replacements)assertActiveProtectionCurrentOrV4557(item);
  for(const item of historical)assertHistoricalWorkflowCurrentOrV4556(item);
});

test('v4.5.51 candidate read-only/replacement proof remains historical evidence after authorized removal',()=>{
  const activeFiles=new Set(Object.values(policy.replacement_protections).map(x=>x.file));
  for(const item of policy.candidates){
    assert.ok(item.replacement_reason.length>40,item.file);
    assert.ok(item.replacement_workflows.length>=1,item.file);
    for(const replacement of item.replacement_workflows)assert.ok(activeFiles.has(replacement),`${item.file} -> ${replacement}`);
    if(v4553){
      const removed=v4553.removed_targets.find(x=>x.file===item.file);
      assert.ok(removed,item.file);
      assert.equal(removed.git_blob_sha,item.git_blob_sha,item.file);
      continue;
    }
    const text=readFileSync(`${workflowsDir}/${item.file}`,'utf8');
    assert.match(text,/permissions:\s*\n\s*contents:\s*read\b/,item.file);
    assert.doesNotMatch(text,/contents:\s*write\b/,item.file);
    assert.doesNotMatch(text,/workflow_call\s*:/,item.file);
    assert.match(text,/node-version:\s*['"]?20['"]?/,item.file);
  }
});

test('v4.5.51 preserves exact B99 lineage and separate authorization boundary historically',()=>{
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

test('v4.5.51 disposition audit stays immutable; execute only in its applicable lifecycle',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  if(v4553){
    assert.equal(gitBlobSha(audit),v4553.classification_audit_git_blob_sha);
    assert.equal(v4553.removal_result.deleted_workflow_count,7);
    return;
  }
  const output=execFileSync(process.execPath,[`${root}/audit-readonly-migration-workflow-disposition.mjs`],{encoding:'utf8'});
  assert.match(output,/READONLY_MIGRATION_WORKFLOW_DISPOSITION=PASS/);
  assert.match(output,/workflows=14 candidates=7 active=5 historical=2 cross-workflow-refs=0 removal-authorized=0 b99=engineer-osint-20260830-B99/);
});
