import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const expectedRecords=['ENG-TECH-0043','ENG-TECH-0044','ENG-TECH-0045'];
const expectedSources=['ENG-SRC-0527','ENG-SRC-0528','ENG-SRC-0529'];
const expectedEvidence=['ENG-EVID-0215','ENG-EVID-0216','ENG-EVID-0217'];
const exactB101AppendSuccessor='6ba92129fb4b4f8f2a7e69755c02b2d0cee5fbd0';

test('v4.5.94 preserves the separately authorized B100 append as an immutable canonical ancestor',()=>{
  const store=loadCanonicalRunStore();
  const b99=store.manifest.runs.find(item=>item.run_id==='engineer-osint-20260830-B99');
  const b100=store.manifest.runs.find(item=>item.run_id==='engineer-osint-20260902-B100');
  assert.ok(b99);
  assert.ok(b100);
  assert.equal(b99.canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.deepEqual(b100,{
    run_id:'engineer-osint-20260902-B100',parent_run_id:'engineer-osint-20260830-B99',
    parent_canonical_sha256:'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30',
    path:'data/runs/engineer-osint-20260902-B100.json',
    file_sha256:'ef6d592306a213d22fee36aa32e5eca2f0673dde8773eeda1c444eef55af7b92',
    canonical_sha256:'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141'
  });
  const b100Index=store.manifest.runs.findIndex(item=>item.run_id===b100.run_id);
  assert.equal(store.manifest.runs[b100Index-1]?.run_id,'engineer-osint-20260830-B99');
});

test('v4.5.94 preserves the exact B100 guard while permitting only the exact B101 successor',()=>{
  const current=gitBlobSha(readFileSync('docs/engineer-osint/append-run.mjs','utf8'));
  assert.ok(new Set(['7edb68db4950d011b18de0ca7bf1e2655bdbdbf0',exactB101AppendSuccessor]).has(current),`unexpected append-run successor ${current}`);
  assert.equal(gitBlobSha(readFileSync('docs/engineer-osint/lib/run-store.mjs','utf8')),'a97184dbd825fab3e5485b72a760bde04749af0b');
  assert.equal(gitBlobSha(readFileSync('docs/engineer-osint/lib/integrity.mjs','utf8')),'8c9a9aa766e910e0bccdb9308acc8af5a3aadac7');
  assert.equal(gitBlobSha(readFileSync('docs/engineer-osint/data/runs/engineer-osint-20260830-B99.json','utf8')),'a629f94b68b926faf7226fe5d7df60eb1c888a51');
  assert.equal(gitBlobSha(readFileSync('docs/engineer-osint/osint-publication-candidates/v4592-b100.json','utf8')),'a2563118ce95c969c37acc45d666a2f8e419df3a');
  if(current===exactB101AppendSuccessor) assert.match(readFileSync('docs/engineer-osint/append-run.mjs','utf8'),/guardedB101='engineer-osint-20260902-B101'/);
});

test('v4.5.94 publishes the three reviewed systems with exact evidence provenance',()=>{
  const {data}=loadCanonicalRunStore();
  const records=data.records.records.filter(item=>expectedRecords.includes(item.id));
  const sources=data.sources.sources.filter(item=>expectedSources.includes(item.id));
  const evidence=data.evidence.evidence.filter(item=>expectedEvidence.includes(item.evidence_id||item.id));
  assert.deepEqual(records.map(item=>item.id),expectedRecords);
  assert.deepEqual(sources.map(item=>item.id),expectedSources);
  assert.deepEqual(evidence.map(item=>item.evidence_id||item.id),expectedEvidence);
  for(const record of records){
    assert.equal(record.first_seen_run,'engineer-osint-20260902-B100');
    assert.equal(record.last_update_run,'engineer-osint-20260902-B100');
    assert.equal(record.source_ids.length,1);
    assert.equal(record.evidence_ids.length,1);
    const item=evidence.find(candidate=>(candidate.evidence_id||candidate.id)===record.evidence_ids[0]);
    assert.ok(item);
    assert.deepEqual(item.related_ids,[record.id]);
    assert.deepEqual(item.source_ids,record.source_ids);
  }
  const keiler=records.find(item=>item.id==='ENG-TECH-0044');
  assert.match(keiler.title_en,/Keiler Next Generation/);
  assert.match(keiler.analysis_en,/distinct from the legacy Minenräumpanzer Keiler/);
});
