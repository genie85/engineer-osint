import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowsDir='.github/workflows';
const policy=JSON.parse(readFileSync(`${root}/V4552_READONLY_WORKFLOW_REMOVAL_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const targetFiles=[
  'b97-readiness.yml',
  'b98-readiness.yml',
  'b98-post-ci-readiness.yml',
  'identity-fix-b99-candidate-readiness.yml',
  'identity-fix-b99-mirror-sync-candidate-readiness.yml',
  'identity-fix-readiness.yml',
  'identity-mirror-parity-readiness.yml'
].sort();

const remainingFiles=[
  'first-three-overlay-retirement-regression.yml',
  'i18n-switch-regression.yml',
  'identity-fix-retirement-regression.yml',
  'pages.yml',
  'runtime-audit-snapshot.yml',
  'identity-fix-retirement-readiness.yml',
  'identity-fix-retirement-authorization.yml'
].sort();

test('v4.5.52 authorizes exactly all seven classified read-only workflows and nothing broader',()=>{
  assert.equal(policy.schema_version,'engineer-osint-readonly-workflow-removal-authorization-v1');
  assert.equal(policy.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOW_REMOVAL');
  assert.equal(policy.reviewed_main_sha,'1d7f9a5f7dbf0ada8c09d95fbd8b4d3dca437d07');
  assert.equal(policy.reviewed_v4551_policy_git_blob_sha,'71c41f006375fbbf44ec53d94272777bc4f74370');
  assert.equal(policy.reviewed_v4551_audit_git_blob_sha,'2890b5ce742aaf6a2c0e7bf2c8208a60266541c4');
  assert.deepEqual(policy.targets.map(x=>x.file).sort(),targetFiles);
  assert.equal(policy.authorization.exact_all_seven_workflow_deletion_authorized,true);
  for(const [key,value] of Object.entries(policy.authorization)){
    if(key==='exact_all_seven_workflow_deletion_authorized')continue;
    assert.equal(value,false,key);
  }
  assert.equal(policy.application_contract.this_slice_performs_deletion,false);
});

test('v4.5.52 re-pins all fourteen current workflow blobs before future removal',()=>{
  const active=policy.required_remaining_workflows.ACTIVE_PRODUCTION_PROTECTION;
  const historical=policy.required_remaining_workflows.HISTORICAL_EVIDENCE_KEEP;
  assert.equal(active.length,5);
  assert.equal(historical.length,2);
  assert.deepEqual([...active,...historical].map(x=>x.file).sort(),remainingFiles);
  const expected=[...policy.targets,...active,...historical];
  const actual=readdirSync(workflowsDir).filter(x=>x.endsWith('.yml')).sort();
  assert.equal(expected.length,14);
  assert.deepEqual(actual,expected.map(x=>x.file).sort());
  for(const item of expected){
    const text=readFileSync(`${workflowsDir}/${item.file}`,'utf8');
    assert.equal(gitBlobSha(text),item.git_blob_sha,item.file);
  }
});

test('v4.5.52 target set exactly equals v4.5.51 classified candidates',()=>{
  const v4551Text=readFileSync(`${root}/V4551_READONLY_MIGRATION_WORKFLOW_DISPOSITION.json`,'utf8');
  const v4551=JSON.parse(v4551Text);
  const auditText=readFileSync(`${root}/audit-readonly-migration-workflow-disposition.mjs`,'utf8');
  assert.equal(gitBlobSha(v4551Text),policy.reviewed_v4551_policy_git_blob_sha);
  assert.equal(gitBlobSha(auditText),policy.reviewed_v4551_audit_git_blob_sha);
  assert.equal(v4551.status,'SEVEN_SAFE_REMOVAL_CANDIDATES_NO_REMOVAL_AUTHORIZED');
  assert.deepEqual(
    policy.targets.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])),
    v4551.candidates.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0]))
  );
  assert.ok(v4551.candidates.every(x=>x.disposition==='SAFE_REMOVAL_CANDIDATE_AFTER_EXACT_AUTHORIZATION'));
});

test('v4.5.52 preserves B99, zero-overlay runtime, and exact post-removal inventory contract',()=>{
  const unchanged=policy.required_unchanged_state;
  assert.equal(unchanged.b99_run_id,'engineer-osint-20260830-B99');
  assert.equal(unchanged.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(unchanged.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(unchanged.runtime_modules_git_blob_sha,'247843bed41af69812cae40aecbfba27cb0022db');
  assert.equal(unchanged.active_legacy_factual_overlay_count,0);
  assert.equal(unchanged.active_legacy_baseline_module_count,0);
  assert.equal(policy.dependency_proof.expected_workflow_count_after_exact_removal,7);
  assert.equal(policy.dependency_proof.expected_active_production_protection_count_after,5);
  assert.equal(policy.dependency_proof.expected_historical_evidence_keep_count_after,2);
  assert.equal(policy.dependency_proof.expected_remaining_migration_ci_debt_candidate_count_after,0);
});

test('v4.5.52 authorization audit is read-only and passes fail-closed',()=>{
  const audit=readFileSync(`${root}/audit-readonly-workflow-removal-authorization.mjs`,'utf8');
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  const output=execFileSync(process.execPath,[`${root}/audit-readonly-workflow-removal-authorization.mjs`],{encoding:'utf8'});
  assert.match(output,/READONLY_WORKFLOW_REMOVAL_AUTHORIZATION=PASS/);
  assert.match(output,/targets=7 workflows=14 after=7 active=5 historical=2 read=7 write=0 workflow-call=0 cross-refs=0 authorization=exact-all-seven-only b99=engineer-osint-20260830-B99/);
});
