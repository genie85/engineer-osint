import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4598-b102.json';
const authorizationPath='docs/engineer-osint/V4599_B102_APPEND_AUTHORIZATION.json';
const appendRunPath='docs/engineer-osint/append-run.mjs';
const persistedPath='docs/engineer-osint/data/runs/engineer-osint-20260902-B102.json';
const manifestPath='docs/engineer-osint/data/run-store-manifest.json';
const raw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(raw);
const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
const appendRunRaw=readFileSync(appendRunPath,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const exactB102AppendSuccessor='174cc646b8d3ecf6e338f6460b95335130154ffb';

test('v4.5.99 pins the exact frozen B102 candidate and deterministic canonical successor',()=>{
  assert.equal(gitBlobSha(raw),authorization.candidate_git_blob_sha);
  assert.equal(candidate.state.run_id,authorization.candidate_run_id);
  assert.equal(candidate.state.parent_run_id,authorization.expected_parent_run_id);
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,authorization.expected_parent_canonical_sha256);
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.qa.canonical_write_performed,false);
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
    const entry=JSON.parse(readFileSync(manifestPath,'utf8')).runs.at(-1);
    assert.equal(entry.run_id,authorization.candidate_run_id);
    assert.equal(entry.parent_run_id,authorization.expected_parent_run_id);
    assert.equal(entry.file_sha256,authorization.exact_candidate_file_sha256);
    assert.equal(entry.canonical_sha256,authorization.expected_resulting_canonical_sha256);
  }
});

test('v4.5.99 authorization stays exact-scope and execution-separated',()=>{
  assert.equal(authorization.schema_version,'engineer-osint-b102-append-authorization-v1');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.reviewed_main_sha,'ab48fe462efbad89eabe8cc48f6cb913b4617ae0');
  assert.deepEqual(candidate.new_records.map(item=>item.id),authorization.expected_record_ids);
  assert.deepEqual(candidate.sources.map(item=>item.id),authorization.expected_source_ids);
  assert.deepEqual(candidate.evidence.map(item=>item.evidence_id),authorization.expected_evidence_ids);
  assert.equal(candidate.new_records.length,authorization.expected_new_record_count);
  assert.equal(candidate.sources.length,authorization.expected_new_source_count);
  assert.equal(candidate.evidence.length,authorization.expected_new_evidence_count);
  assert.equal((candidate.relations||[]).length,authorization.expected_new_relation_count);
  assert.equal((candidate.updated_records||[]).length,authorization.expected_updated_record_count);
  assert.equal(authorization.authorization.append_exact_candidate_only,true);
  assert.equal(authorization.authorization.install_exact_b102_append_guard_successor,true);
  assert.equal(authorization.authorization.standard_append_run_write_required,true);
  assert.equal(authorization.authorization.one_run_only,true);
  assert.equal(authorization.authorization.isolated_review_branch_required,true);
  assert.equal(authorization.authorization.execution_requires_separate_slice,true);
  for(const key of ['allow_candidate_mutation','allow_manual_manifest_or_hash_edit','allow_future_run_same_slice','allow_canonical_history_rewrite','allow_runtime_change','allow_workflow_change','allow_photo_or_media_change']) assert.equal(authorization.authorization[key],false,key);
  assert.deepEqual(authorization.execution_state,{append_run_successor_installed:false,canonical_write_performed:false,run_file_created:false,manifest_updated:false});
});

test('v4.5.99 freezes the B101-era append helper and permits only the exact B102 execution successor',()=>{
  assert.equal(authorization.protected_baseline.append_run_blob_sha,'6ba92129fb4b4f8f2a7e69755c02b2d0cee5fbd0');
  assert.equal(authorization.protected_baseline.run_store_blob_sha,'a97184dbd825fab3e5485b72a760bde04749af0b');
  assert.equal(authorization.protected_baseline.integrity_blob_sha,'8c9a9aa766e910e0bccdb9308acc8af5a3aadac7');
  assert.equal(authorization.protected_baseline.manifest_blob_sha,'74abe383deed939b8560d59b303cc2d0091ea26e');
  assert.equal(authorization.protected_baseline.b101_run_blob_sha,'89d5981b5e85c0b913a5ad856f0ab3953c968345');
  assert.equal(authorization.authorized_guard_successor_contract.guarded_run_id,'engineer-osint-20260902-B102');
  assert.equal(authorization.authorized_guard_successor_contract.authorization_path,authorizationPath);
  assert.equal(authorization.authorized_guard_successor_contract.schema_version,'engineer-osint-b102-append-authorization-v1');
  assert.equal(authorization.authorized_guard_successor_contract.required_status,'READY_FOR_APPEND');
  assert.equal(authorization.authorized_guard_successor_contract.require_exact_candidate_hashes,true);
  assert.equal(authorization.authorized_guard_successor_contract.require_exact_collection_counts,true);
  assert.equal(authorization.authorized_guard_successor_contract.require_exact_record_source_evidence_ids,true);
  assert.equal(authorization.authorized_guard_successor_contract.require_candidate_no_write_flags,true);
  assert.equal(authorization.authorized_guard_successor_contract.require_multimedia_status,'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
  assert.equal(authorization.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
  assert.equal(authorization.required_preconditions.authorization_stage_append_run_must_remain_baseline,true);
  assert.equal(gitBlobSha(appendRunRaw),exactB102AppendSuccessor);
  assert.match(appendRunRaw,/guardedB102='engineer-osint-20260902-B102'/);
  assert.match(appendRunRaw,/V4599_B102_APPEND_AUTHORIZATION\.json/);
  assert.match(appendRunRaw,/allow_wildcard_or_current_state_acceptance!==false/);
});
