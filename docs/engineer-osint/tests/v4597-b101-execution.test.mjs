import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const root='docs/engineer-osint';
const authorization=JSON.parse(readFileSync(`${root}/V4596_B101_APPEND_AUTHORIZATION.json`,'utf8'));
const candidateRaw=readFileSync(`${root}/osint-publication-candidates/v4595-b101.json`,'utf8');
const persistedRaw=readFileSync(`${root}/data/runs/engineer-osint-20260902-B101.json`,'utf8');
const appendRunRaw=readFileSync(`${root}/append-run.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');

const B101_RUN='engineer-osint-20260902-B101';
const B101_FILE_SHA='e02c5b0c52a98c36da8db9bbfef9d429edc068ce18c825c791dc8c180e186aea';
const B101_CANONICAL_SHA='146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b';
const B100_CANONICAL_SHA='518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141';
const B101_APPEND_SUCCESSOR='6ba92129fb4b4f8f2a7e69755c02b2d0cee5fbd0';
const B102_APPEND_SUCCESSOR='174cc646b8d3ecf6e338f6460b95335130154ffb';
const EXECUTOR_APPEND_SUCCESSOR='376bdf810c47c3bf934d0cadeacff3b1f61e1115';

test('v4.5.97 persists exactly the separately authorized B101 append as a canonical ancestor',()=>{
  const store=loadCanonicalRunStore({root});
  const entry=store.manifest.runs.find(item=>item.run_id===B101_RUN);
  assert.ok(entry,'B101 manifest entry missing');
  assert.equal(entry.canonical_sha256,B101_CANONICAL_SHA);
  assert.equal(sha256(persistedRaw),B101_FILE_SHA);
  assert.equal(persistedRaw,candidateRaw,'persisted B101 bytes drifted from the frozen reviewed candidate');
  const index=store.manifest.runs.findIndex(item=>item.run_id===B101_RUN);
  const previous=store.manifest.runs[index-1];
  assert.equal(previous.run_id,'engineer-osint-20260902-B100');
  assert.equal(previous.canonical_sha256,B100_CANONICAL_SHA);
  assert.deepEqual(entry,{
    run_id:B101_RUN,
    parent_run_id:'engineer-osint-20260902-B100',
    parent_canonical_sha256:B100_CANONICAL_SHA,
    path:'data/runs/engineer-osint-20260902-B101.json',
    file_sha256:B101_FILE_SHA,
    canonical_sha256:B101_CANONICAL_SHA
  });
});

test('v4.5.97 preserves only exact B101/B102/executor append guard successors',()=>{
  const current=gitBlobSha(appendRunRaw);
  assert.ok(new Set([B101_APPEND_SUCCESSOR,B102_APPEND_SUCCESSOR,EXECUTOR_APPEND_SUCCESSOR]).has(current),`unexpected append-run lifecycle blob ${current}`);
  assert.equal(authorization.protected_baseline.append_run_blob_sha,'7edb68db4950d011b18de0ca7bf1e2655bdbdbf0');
  assert.match(appendRunRaw,/guardedB101='engineer-osint-20260902-B101'/);
  assert.match(appendRunRaw,/V4596_B101_APPEND_AUTHORIZATION\.json/);
  if(current===B102_APPEND_SUCCESSOR||current===EXECUTOR_APPEND_SUCCESSOR){
    assert.match(appendRunRaw,/guardedB102='engineer-osint-20260902-B102'/);
    assert.match(appendRunRaw,/V4599_B102_APPEND_AUTHORIZATION\.json/);
  }
  if(current===EXECUTOR_APPEND_SUCCESSOR){
    assert.match(appendRunRaw,/Explicit append authorization required for unrecognized write run/);
    assert.match(appendRunRaw,/--authorization requires an explicit repository path/);
  }
  assert.match(appendRunRaw,/COMPLETE_NO_CANONICAL_MEDIA_ADDITION/);
  assert.match(appendRunRaw,/allow_wildcard_or_current_state_acceptance!==false/);
  assert.equal(authorization.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
  assert.equal(gitBlobSha(readFileSync(`${root}/lib/run-store.mjs`,'utf8')),authorization.protected_baseline.run_store_blob_sha);
  assert.equal(gitBlobSha(readFileSync(`${root}/lib/integrity.mjs`,'utf8')),authorization.protected_baseline.integrity_blob_sha);
  assert.equal(gitBlobSha(readFileSync(`${root}/data/runs/engineer-osint-20260902-B100.json`,'utf8')),authorization.protected_baseline.b100_run_blob_sha);
});

test('v4.5.97 publishes only the reviewed B101 identity and evidence scope',()=>{
  const persisted=JSON.parse(persistedRaw);
  assert.deepEqual(persisted.new_records.map(x=>x.id),['ENG-TECH-0046','ENG-TECH-0047','ENG-TECH-0048']);
  assert.deepEqual(persisted.sources.map(x=>x.id),['ENG-SRC-0530','ENG-SRC-0531','ENG-SRC-0532','ENG-SRC-0533']);
  assert.deepEqual(persisted.evidence.map(x=>x.evidence_id),['ENG-EVID-0218','ENG-EVID-0219','ENG-EVID-0220','ENG-EVID-0221']);
  assert.equal(persisted.new_records.length,3);
  assert.equal(persisted.sources.length,4);
  assert.equal(persisted.evidence.length,4);
  assert.equal(persisted.relations.length,0);
  assert.equal(persisted.updated_records.length,0);
  assert.equal(persisted.visuals.length,0);
  assert.equal(persisted.media.length,0);
  assert.equal(persisted.qa.multimedia_status,'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
  for(const record of persisted.new_records){
    for(const sourceId of record.source_ids) assert.ok(persisted.sources.some(x=>x.id===sourceId),`${record.id}: orphan source ${sourceId}`);
    for(const evidenceId of record.evidence_ids) assert.ok(persisted.evidence.some(x=>x.evidence_id===evidenceId),`${record.id}: orphan evidence ${evidenceId}`);
  }
});

test('v4.5.97 preserves the v4.5.96 authorization artifact as immutable pre-execution evidence',()=>{
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.candidate_git_blob_sha,'89d5981b5e85c0b913a5ad856f0ab3953c968345');
  assert.equal(authorization.exact_candidate_file_sha256,B101_FILE_SHA);
  assert.equal(authorization.expected_resulting_canonical_sha256,B101_CANONICAL_SHA);
  assert.deepEqual(authorization.execution_state,{append_run_successor_installed:false,canonical_write_performed:false,run_file_created:false,manifest_updated:false});
  assert.equal(authorization.authorization.allow_canonical_history_rewrite,false);
  assert.equal(authorization.authorization.allow_future_run_same_slice,false);
  assert.equal(authorization.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
});
