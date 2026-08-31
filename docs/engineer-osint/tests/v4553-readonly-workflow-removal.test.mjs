import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {assertHistoricalWorkflowCurrentOrV4556,assertV4556Applied} from './v4556-workflow-lifecycle-helper.mjs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const policy=JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const removed=[
  'b97-readiness.yml','b98-readiness.yml','b98-post-ci-readiness.yml',
  'identity-fix-b99-candidate-readiness.yml','identity-fix-b99-mirror-sync-candidate-readiness.yml',
  'identity-fix-readiness.yml','identity-mirror-parity-readiness.yml'
].sort();
const remaining=[
  'first-three-overlay-retirement-regression.yml','i18n-switch-regression.yml','identity-fix-retirement-regression.yml',
  'pages.yml','runtime-audit-snapshot.yml','identity-fix-retirement-readiness.yml','identity-fix-retirement-authorization.yml'
].sort();

test('v4.5.53 applies exactly the v4.5.52 all-seven authorization',()=>{
  assert.equal(policy.schema_version,'engineer-osint-readonly-workflow-removal-v1');
  assert.equal(policy.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED');
  assert.equal(policy.reviewed_authorization_main_sha,'2f3afc8d44e949ef115a2e7ce0d13746355ba5e2');
  assert.equal(policy.authorization_policy_git_blob_sha,'9394a1f6a4749b12c127128b8555ac358e751f4c');
  assert.equal(policy.authorization_audit_git_blob_sha,'51321a5230a78fa80a608a41856d2fd1be0b174d');
  assert.deepEqual(policy.removed_targets.map(x=>x.file).sort(),removed);
  for(const file of removed)assert.equal(existsSync(`${workflowsDir}/${file}`),false,file);
});

test('v4.5.53 leaves exactly five active protections and two historical-evidence anchors',()=>{
  const active=policy.required_remaining_workflows.ACTIVE_PRODUCTION_PROTECTION;
  const historical=policy.required_remaining_workflows.HISTORICAL_EVIDENCE_KEEP;
  assert.equal(active.length,5);
  assert.equal(historical.length,2);
  const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
  assert.deepEqual(actual,remaining);
  assert.deepEqual([...active,...historical].map(x=>x.file).sort(),remaining);
  for(const item of active)assert.equal(gitBlobSha(readFileSync(`${workflowsDir}/${item.file}`,'utf8')),item.git_blob_sha,item.file);
  for(const item of historical)assertHistoricalWorkflowCurrentOrV4556(item);
});

test('v4.5.53 retains v4.5.51 classification and v4.5.52 authorization byte-for-byte',()=>{
  const classification=readFileSync(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`,'utf8');
  const classificationAudit=readFileSync(`${root}/audit-readonly-migration-workflow-disposition.mjs`,'utf8');
  const authorization=readFileSync(`${root}/V4552_READONLY_WORKFLOW_REMOVAL_AUTHORIZATION.json`,'utf8');
  const authorizationAudit=readFileSync(`${root}/audit-readonly-workflow-removal-authorization.mjs`,'utf8');
  assert.equal(gitBlobSha(classification),policy.classification_policy_git_blob_sha);
  assert.equal(gitBlobSha(classificationAudit),policy.classification_audit_git_blob_sha);
  assert.equal(gitBlobSha(authorization),policy.authorization_policy_git_blob_sha);
  assert.equal(gitBlobSha(authorizationAudit),policy.authorization_audit_git_blob_sha);
  const auth=JSON.parse(authorization);
  assert.equal(auth.authorization.exact_all_seven_workflow_deletion_authorized,true);
  assert.equal(auth.authorization.partial_subset_deletion_authorized,false);
});

test('v4.5.53 preserves exact B99 and zero legacy factual overlay debt',()=>{
  const unchanged=policy.required_unchanged_state;
  assert.equal(unchanged.b99_run_id,'engineer-osint-20260830-B99');
  assert.equal(unchanged.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(unchanged.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(unchanged.runtime_modules_git_blob_sha,'247843bed41af69812cae40aecbfba27cb0022db');
  assert.equal(unchanged.active_legacy_factual_overlay_count,0);
  assert.equal(unchanged.active_legacy_baseline_module_count,0);
  assert.equal(unchanged.retired_browser_dom_sha256,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
});

test('v4.5.53 records only the exact authorized workflow deletion scope',()=>{
  const r=policy.removal_result;
  assert.equal(r.workflow_count_before,14);
  assert.equal(r.workflow_count_after,7);
  assert.equal(r.deleted_workflow_count,7);
  assert.equal(r.active_production_protection_count,5);
  assert.equal(r.historical_evidence_keep_count,2);
  assert.equal(r.remaining_migration_ci_debt_candidate_count,0);
  assert.equal(r.remaining_write_capable_migration_one_shot_count,0);
  for(const [key,value] of Object.entries(r))if(typeof value==='boolean')assert.equal(value,false,key);
});

test('v4.5.53 post-removal audit remains immutable after separately authorized v4.5.56 successor',()=>{
  const audit=readFileSync(`${root}/audit-readonly-workflow-removal.mjs`,'utf8');
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  assert.equal(gitBlobSha(audit),'a1eee801731d42934d26cf200d0591d324249240');
  assertV4556Applied();
});
