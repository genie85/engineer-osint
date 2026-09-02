import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4595-b101.json';
const authorizationPath='docs/engineer-osint/V4596_B101_APPEND_AUTHORIZATION.json';
const appendRunPath='docs/engineer-osint/append-run.mjs';
const persistedPath='docs/engineer-osint/data/runs/engineer-osint-20260902-B101.json';
const manifestPath='docs/engineer-osint/data/run-store-manifest.json';
const raw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(raw);
const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
const appendRunRaw=readFileSync(appendRunPath,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const exactExecutionSuccessor='6ba92129fb4b4f8f2a7e69755c02b2d0cee5fbd0';
const exactB102ExecutionSuccessor='174cc646b8d3ecf6e338f6460b95335130154ffb';
const exactExecutorSuccessor='376bdf810c47c3bf934d0cadeacff3b1f61e1115';

test('v4.5.96 pins the exact frozen B101 candidate and deterministic canonical successor',()=>{
  assert.equal(gitBlobSha(raw),authorization.candidate_git_blob_sha);
  assert.equal(candidate.state.run_id,authorization.candidate_run_id);
  assert.equal(candidate.state.parent_run_id,authorization.expected_parent_run_id);
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,authorization.expected_parent_canonical_sha256);
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.qa.multimedia_status,authorization.expected_multimedia_status);
  if(!existsSync(persistedPath)){
    const plan=JSON.parse(execFileSync(process.execPath,[appendRunPath,candidatePath],{encoding:'utf8'}));
    assert.equal(plan.status,'VALIDATED_DRY_RUN');
    assert.equal(plan.entry.file_sha256,authorization.exact_candidate_file_sha256);
    assert.equal(plan.entry.canonical_sha256,authorization.expected_resulting_canonical_sha256);
    assert.equal(plan.entry.parent_canonical_sha256,authorization.expected_parent_canonical_sha256);
  }else{
    const persistedRaw=readFileSync(persistedPath,'utf8');
    assert.equal(createHash('sha256').update(persistedRaw).digest('hex'),authorization.exact_candidate_file_sha256);
    const entry=JSON.parse(readFileSync(manifestPath,'utf8')).runs.find(item=>item.run_id===authorization.candidate_run_id);
    assert.ok(entry,'B101 manifest entry missing');
    assert.equal(entry.parent_run_id,authorization.expected_parent_run_id);
    assert.equal(entry.file_sha256,authorization.exact_candidate_file_sha256);
    assert.equal(entry.canonical_sha256,authorization.expected_resulting_canonical_sha256);
  }
});

test('v4.5.96 authorization stays exact-scope and execution-separated',()=>{
  assert.equal(authorization.schema_version,'engineer-osint-b101-append-authorization-v1');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.deepEqual(candidate.new_records.map(item=>item.id),authorization.expected_record_ids);
  assert.deepEqual(candidate.sources.map(item=>item.id),authorization.expected_source_ids);
  assert.deepEqual(candidate.evidence.map(item=>item.evidence_id),authorization.expected_evidence_ids);
  assert.equal(candidate.new_records.length,authorization.expected_new_record_count);
  assert.equal(candidate.sources.length,authorization.expected_new_source_count);
  assert.equal(candidate.evidence.length,authorization.expected_new_evidence_count);
  assert.equal((candidate.relations||[]).length,authorization.expected_new_relation_count);
  assert.equal((candidate.updated_records||[]).length,authorization.expected_updated_record_count);
  assert.equal(authorization.authorization.append_exact_candidate_only,true);
  assert.equal(authorization.authorization.install_exact_b101_append_guard_successor,true);
  assert.equal(authorization.authorization.standard_append_run_write_required,true);
  assert.equal(authorization.authorization.execution_requires_separate_slice,true);
  for(const key of ['allow_candidate_mutation','allow_manual_manifest_or_hash_edit','allow_future_run_same_slice','allow_canonical_history_rewrite','allow_runtime_change','allow_workflow_change','allow_photo_or_media_change']) assert.equal(authorization.authorization[key],false,key);
  assert.deepEqual(authorization.execution_state,{append_run_successor_installed:false,canonical_write_performed:false,run_file_created:false,manifest_updated:false});
});

test('v4.5.96 keeps its B100 append-helper baseline immutable while accepting only exact authorized B101/B102/executor successors',()=>{
  const current=gitBlobSha(appendRunRaw);
  assert.ok(new Set([authorization.protected_baseline.append_run_blob_sha,exactExecutionSuccessor,exactB102ExecutionSuccessor,exactExecutorSuccessor]).has(current),'append-run is outside the exact authorized lifecycle');
  assert.equal(authorization.protected_baseline.append_run_blob_sha,'7edb68db4950d011b18de0ca7bf1e2655bdbdbf0');
  assert.equal(authorization.authorized_guard_successor_contract.guarded_run_id,'engineer-osint-20260902-B101');
  assert.equal(authorization.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
  assert.equal(authorization.required_preconditions.authorization_stage_append_run_must_remain_baseline,true);
  if(current===exactExecutionSuccessor){
    assert.match(appendRunRaw,/guardedB101='engineer-osint-20260902-B101'/);
    assert.match(appendRunRaw,/V4596_B101_APPEND_AUTHORIZATION\.json/);
  }
  if(current===exactB102ExecutionSuccessor||current===exactExecutorSuccessor){
    assert.match(appendRunRaw,/guardedB102='engineer-osint-20260902-B102'/);
    assert.match(appendRunRaw,/V4599_B102_APPEND_AUTHORIZATION\.json/);
  }
  if(current===exactExecutorSuccessor){
    assert.match(appendRunRaw,/--authorization/);
    assert.match(appendRunRaw,/READY_FOR_APPEND/);
    assert.match(appendRunRaw,/allow_wildcard_or_current_state_acceptance/);
  }
});
