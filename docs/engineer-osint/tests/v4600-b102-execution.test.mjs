import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const root='docs/engineer-osint';
const authorization=JSON.parse(readFileSync(`${root}/V4599_B102_APPEND_AUTHORIZATION.json`,'utf8'));
const b103Authorization=JSON.parse(readFileSync(`${root}/V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`,'utf8'));
const candidateRaw=readFileSync(`${root}/osint-publication-candidates/v4598-b102.json`,'utf8');
const persistedRaw=readFileSync(`${root}/data/runs/engineer-osint-20260902-B102.json`,'utf8');
const appendRunRaw=readFileSync(`${root}/append-run.mjs`,'utf8');
const sha256=text=>createHash('sha256').update(text).digest('hex');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const RUN='engineer-osint-20260902-B102';
const FILE_SHA='5a24a0cf6fece6dbf61d9224dddefb6d711b5ab9cbd9690f1c13c963c413781a';
const CANONICAL_SHA='5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91';
const HISTORICAL_APPEND_SHA='174cc646b8d3ecf6e338f6460b95335130154ffb';
const EXECUTOR_APPEND_SHA='376bdf810c47c3bf934d0cadeacff3b1f61e1115';

test('v4.6.00 persists the exact authorized B102 standard append across the exact B103 lifecycle successor',()=>{
  const store=loadCanonicalRunStore({root});
  const b102Entry=store.manifest.runs.find(item=>item.run_id===RUN);
  assert.deepEqual(b102Entry,{
    run_id:RUN,
    parent_run_id:'engineer-osint-20260902-B101',
    parent_canonical_sha256:'146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b',
    path:'data/runs/engineer-osint-20260902-B102.json',
    file_sha256:FILE_SHA,
    canonical_sha256:CANONICAL_SHA
  });
  assert.equal(sha256(persistedRaw),FILE_SHA);
  assert.deepEqual(JSON.parse(persistedRaw),JSON.parse(candidateRaw));
  const allowedHeads=new Map([
    [RUN,CANONICAL_SHA],
    [b103Authorization.candidate_run_id,b103Authorization.expected_resulting_canonical_sha256]
  ]);
  assert.equal(allowedHeads.get(store.report.current_run_id),store.report.canonical_sha256,'canonical head is outside exact B102→B103 lifecycle');
});

test('v4.6.00 publishes exactly three reviewed bridging systems with exact provenance',()=>{
  const {data}=loadCanonicalRunStore({root});
  const ids=['ENG-TECH-0049','ENG-TECH-0050','ENG-TECH-0051'];
  const sourceIds=['ENG-SRC-0534','ENG-SRC-0535','ENG-SRC-0536'];
  const evidenceIds=['ENG-EVID-0222','ENG-EVID-0223','ENG-EVID-0224'];
  const records=data.records.records.filter(x=>ids.includes(x.id));
  const sources=data.sources.sources.filter(x=>sourceIds.includes(x.id));
  const evidence=data.evidence.evidence.filter(x=>evidenceIds.includes(x.evidence_id||x.id));
  assert.deepEqual(records.map(x=>x.id),ids);
  assert.deepEqual(sources.map(x=>x.id),sourceIds);
  assert.deepEqual(evidence.map(x=>x.evidence_id||x.id),evidenceIds);
  for(const record of records){
    assert.equal(record.first_seen_run,RUN);
    assert.equal(record.last_update_run,RUN);
    assert.equal(record.source_ids.length,1);
    assert.equal(record.evidence_ids.length,1);
  }
});

test('v4.6.00 keeps B102 no-media scope and immutable authorization evidence',()=>{
  const p=JSON.parse(persistedRaw);
  assert.equal(p.visuals.length,0);
  assert.equal(p.media.length,0);
  assert.equal(p.qa.multimedia_status,'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.candidate_git_blob_sha,'19e6c251708250db1aa294d5e1364be37b7bb008');
  assert.equal(authorization.exact_candidate_file_sha256,FILE_SHA);
  assert.equal(authorization.expected_resulting_canonical_sha256,CANONICAL_SHA);
  assert.deepEqual(authorization.execution_state,{append_run_successor_installed:false,canonical_write_performed:false,run_file_created:false,manifest_updated:false});
  assert.equal(authorization.authorization.allow_canonical_history_rewrite,false);
  assert.equal(authorization.authorization.allow_future_run_same_slice,false);
});

test('v4.6.00 preserves the exact historical B102 guard under the exact authorized executor successor',()=>{
  assert.equal(HISTORICAL_APPEND_SHA,authorization.protected_baseline.append_run_blob_sha);
  assert.equal(gitBlobSha(appendRunRaw),EXECUTOR_APPEND_SHA);
  assert.match(appendRunRaw,/guardedB102='engineer-osint-20260902-B102'/);
  assert.match(appendRunRaw,/V4599_B102_APPEND_AUTHORIZATION\.json/);
  assert.match(appendRunRaw,/allow_wildcard_or_current_state_acceptance!==false/);
  assert.equal(authorization.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
});
