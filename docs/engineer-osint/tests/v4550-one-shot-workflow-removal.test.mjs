import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`,'utf8'));
const audit=readFileSync(`${root}/audit-one-shot-workflow-removal.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const targets=['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml'];

test('v4.5.50 applies exactly the v4.5.49-authorized four-workflow deletion',()=>{
  assert.equal(policy.schema_version,'engineer-osint-one-shot-workflow-removal-v1');
  assert.equal(policy.status,'AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED');
  assert.equal(policy.reviewed_authorization_main_sha,'3433ec2c636ebb1c87a04ff34d9c7cbc2af4cb79');
  assert.equal(policy.authorization_policy_git_blob_sha,'8ef9ab22c1d92dd8caa29c5a71360df3d7888499');
  assert.deepEqual(policy.removed_targets.map(x=>x.file).sort(),targets.sort());
  for(const file of targets)assert.equal(existsSync(`.github/workflows/${file}`),false,file);
});

test('v4.5.50 historical 14-workflow post-state remains pinned across authorized v4.5.53 cleanup',()=>{
  const expected=Object.values(policy.required_remaining_workflows).flat();
  const actual=readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')).sort();
  assert.equal(expected.length,14);
  assert.equal(policy.required_remaining_workflows.ACTIVE_PRODUCTION_PROTECTION.length,5);
  assert.equal(policy.required_remaining_workflows.HISTORICAL_EVIDENCE_KEEP.length,2);
  assert.equal(policy.required_remaining_workflows.REMAINING_REMOVABLE_CI_DEBT_CANDIDATE.length,7);
  if(actual.length===14){
    assert.deepEqual(actual,expected.map(x=>x.file).sort());
    for(const item of expected){
      const text=readFileSync(`.github/workflows/${item.file}`,'utf8');
      assert.equal(gitBlobSha(text),item.git_blob_sha,item.file);
    }
    return;
  }
  assert.equal(actual.length,7);
  const v4553=JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8'));
  assert.equal(v4553.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED');
  const remaining=Object.values(v4553.required_remaining_workflows).flat();
  assert.deepEqual(actual,remaining.map(x=>x.file).sort());
  for(const item of remaining){
    const text=readFileSync(`.github/workflows/${item.file}`,'utf8');
    assert.equal(gitBlobSha(text),item.git_blob_sha,item.file);
  }
  const candidates=policy.required_remaining_workflows.REMAINING_REMOVABLE_CI_DEBT_CANDIDATE;
  assert.deepEqual(v4553.removed_targets.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])),candidates.map(x=>[x.file,x.git_blob_sha]).sort((a,b)=>a[0].localeCompare(b[0])));
  for(const item of candidates)assert.equal(existsSync(`.github/workflows/${item.file}`),false,item.file);
});

test('v4.5.50 preserves immutable v4.5.48/v4.5.49 policy and audit evidence',()=>{
  assert.equal(gitBlobSha(readFileSync(`${root}/V4549_ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION.json`,'utf8')),policy.authorization_policy_git_blob_sha);
  assert.equal(gitBlobSha(readFileSync(`${root}/V4548_MIGRATION_WORKFLOW_CLASSIFICATION.json`,'utf8')),policy.classification_policy_git_blob_sha);
  for(const item of policy.historical_audits_retained){
    assert.equal(gitBlobSha(readFileSync(`${root}/${item.file}`,'utf8')),item.git_blob_sha,item.file);
  }
  assert.equal(policy.removal_result.historical_policy_edited,false);
  assert.equal(policy.removal_result.historical_audit_edited,false);
});

test('v4.5.50 preserves exact B96-B99 historical anchors and canonical safety boundary',()=>{
  assert.deepEqual(policy.removed_targets.map(x=>[x.historical_run_id,x.run_file_sha256,x.canonical_sha256]),[
    ['engineer-osint-20260829-B96','3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1','4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5'],
    ['engineer-osint-20260830-B97','b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad','9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4'],
    ['engineer-osint-20260830-B98','ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79','4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201'],
    ['engineer-osint-20260830-B99','ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab','754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30']
  ]);
  for(const key of ['other_workflow_deleted','other_workflow_edited','canonical_data_edited','run_store_manifest_edited','run_appended','runtime_module_edited','manual_hash_edit'])assert.equal(policy.removal_result[key],false,key);
});

test('v4.5.50 post-removal audit is immutable and runs only before the v4.5.53 cleanup',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  const actual=readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')).sort();
  if(actual.length===14){
    const output=execFileSync(process.execPath,[`${root}/audit-one-shot-workflow-removal.mjs`],{encoding:'utf8'});
    assert.match(output,/ONE_SHOT_WORKFLOW_REMOVAL=PASS/);
    assert.match(output,/removed=4 workflows=14 active=5 historical=2 remaining-debt=7 write-one-shots=0 b96-b99-history=unchanged/);
    return;
  }
  assert.equal(actual.length,7);
  assert.equal(gitBlobSha(audit),'fcd7dc8bf4f570ca270d4348a5f45de5196cf4ee');
  const v4553=JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8'));
  assert.equal(v4553.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED');
  assert.equal(v4553.removal_result.workflow_count_before,14);
  assert.equal(v4553.removal_result.workflow_count_after,7);
  assert.equal(v4553.removal_result.deleted_workflow_count,7);
});

test('v4.5.50 does not authorize the next seven-workflow cleanup or historical trigger changes',()=>{
  assert.equal(policy.required_next_slice.remaining_candidate_removal_authorized,false);
  assert.equal(policy.required_next_slice.automatic_historical_evidence_trigger_deactivation_authorized,false);
  assert.equal(policy.required_next_slice.active_protection_modernization_authorized,false);
  assert.match(policy.required_next_slice.goal,/seven remaining read-only migration-era CI-debt candidates/);
});
