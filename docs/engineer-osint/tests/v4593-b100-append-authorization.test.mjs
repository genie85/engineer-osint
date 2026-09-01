import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4592-b100.json';
const authorizationPath='docs/engineer-osint/V4593_B100_APPEND_AUTHORIZATION.json';
const appendRunPath='docs/engineer-osint/append-run.mjs';
const raw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(raw);
const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
const appendRun=readFileSync(appendRunPath,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.93 pins the exact frozen B100 candidate and deterministic canonical successor',()=>{
  assert.equal(gitBlobSha(raw),authorization.candidate_git_blob_sha);
  assert.equal(authorization.candidate_git_blob_sha,'a2563118ce95c969c37acc45d666a2f8e419df3a');
  assert.equal(candidate.state.run_id,authorization.candidate_run_id);
  assert.equal(candidate.state.parent_run_id,authorization.expected_parent_run_id);
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,authorization.expected_parent_canonical_sha256);
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  const plan=JSON.parse(execFileSync(process.execPath,[appendRunPath,candidatePath],{encoding:'utf8'}));
  assert.equal(plan.status,'VALIDATED_DRY_RUN');
  assert.equal(plan.entry.file_sha256,'ef6d592306a213d22fee36aa32e5eca2f0673dde8773eeda1c444eef55af7b92');
  assert.equal(plan.entry.file_sha256,authorization.exact_candidate_file_sha256);
  assert.equal(plan.entry.canonical_sha256,'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141');
  assert.equal(plan.entry.canonical_sha256,authorization.expected_resulting_canonical_sha256);
  assert.equal(plan.entry.parent_canonical_sha256,authorization.expected_parent_canonical_sha256);
});

test('v4.5.93 authorization is exact-scope and remains pre-execution',()=>{
  assert.equal(authorization.schema_version,'engineer-osint-b100-append-authorization-v1');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.deepEqual(candidate.new_records.map(item=>item.id),authorization.expected_record_ids);
  assert.deepEqual(candidate.sources.map(item=>item.id),authorization.expected_source_ids);
  assert.deepEqual(candidate.evidence.map(item=>item.id),authorization.expected_evidence_ids);
  assert.equal(candidate.new_records.length,authorization.expected_new_record_count);
  assert.equal(candidate.sources.length,authorization.expected_new_source_count);
  assert.equal(candidate.evidence.length,authorization.expected_new_evidence_count);
  assert.equal((candidate.relations||[]).length,authorization.expected_new_relation_count);
  assert.equal((candidate.updated_records||[]).length,authorization.expected_updated_record_count);
  assert.equal(authorization.authorization.append_exact_candidate_only,true);
  assert.equal(authorization.authorization.standard_append_run_write_required,true);
  assert.equal(authorization.authorization.one_run_only,true);
  assert.equal(authorization.authorization.isolated_review_branch_required,true);
  assert.equal(authorization.authorization.execution_requires_separate_slice,true);
  for(const key of ['allow_candidate_mutation','allow_manual_manifest_or_hash_edit','allow_future_run_same_slice','allow_canonical_history_rewrite','allow_runtime_change','allow_workflow_change','allow_photo_or_media_change']) assert.equal(authorization.authorization[key],false,key);
  assert.deepEqual(authorization.execution_state,{canonical_write_performed:false,run_file_created:false,manifest_updated:false});
  assert.equal(existsSync('docs/engineer-osint/data/runs/engineer-osint-20260902-B100.json'),false);
});

test('standard append helper fail-closes B100 write behind exact authorization',()=>{
  assert.match(appendRun,/guardedB100='engineer-osint-20260902-B100'/);
  assert.match(appendRun,/V4593_B100_APPEND_AUTHORIZATION\.json/);
  assert.match(appendRun,/B100 append candidate file SHA differs from reviewed authorization/);
  assert.match(appendRun,/B100 append resulting canonical SHA differs from reviewed authorization/);
  assert.match(appendRun,/B100 append exact ID scope mismatch/);
  assert.match(appendRun,/B100 frozen candidate self-authorization\/no-write state drifted/);
  assert.match(appendRun,/B100 authorization artifact must remain pre-execution/);
});
