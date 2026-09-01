import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4592-b100.json';
const persistedPath='docs/engineer-osint/data/runs/engineer-osint-20260902-B100.json';
const manifestPath='docs/engineer-osint/data/run-store-manifest.json';
const candidate=JSON.parse(readFileSync(candidatePath,'utf8'));

test('v4.5.92 publication candidate keeps exact Phase F scope',()=>{
  assert.equal(candidate.schema_version,'engineer-osint-patch-v1');
  assert.equal(candidate.state.run_id,'engineer-osint-20260902-B100');
  assert.equal(candidate.state.parent_run_id,'engineer-osint-20260830-B99');
  assert.equal(candidate.continuity.reviewed_main_sha,'c82a91a9afa07bbad7c80126525f7b04f6cd5d8a');
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.qa.canonical_write_performed,false);
  assert.equal(candidate.new_records.length,3);
  assert.deepEqual(candidate.new_records.map(item=>item.id),['ENG-TECH-0043','ENG-TECH-0044','ENG-TECH-0045']);
  assert.deepEqual(candidate.sources.map(item=>item.id),['ENG-SRC-0527','ENG-SRC-0528','ENG-SRC-0529']);
  assert.deepEqual(candidate.evidence.map(item=>item.evidence_id),['ENG-EVID-0215','ENG-EVID-0216','ENG-EVID-0217']);
  assert.equal(candidate.state.counts.NEW,3);
  assert.equal(candidate.state.counts.NEW_SOURCES,3);
  assert.equal(candidate.state.counts.NEW_EVIDENCE,3);
});

test('v4.5.92 keeps exact variant and evidence relationships fail-closed',()=>{
  const byId=new Map(candidate.new_records.map(item=>[item.id,item]));
  assert.match(byId.get('ENG-TECH-0043').title_en,/AEV3 Kodiak/);
  assert.match(byId.get('ENG-TECH-0044').title_en,/Keiler Next Generation/);
  assert.match(byId.get('ENG-TECH-0045').title_en,/M1074 Joint Assault Bridge/);
  assert.match(byId.get('ENG-TECH-0044').analysis_en,/distinct from the legacy Minenräumpanzer Keiler/);
  for(const record of candidate.new_records){
    assert.equal(record.source_ids.length,1);
    assert.equal(record.evidence_ids.length,1);
    const evidence=candidate.evidence.find(item=>item.evidence_id===record.evidence_ids[0]);
    assert.ok(evidence);
    assert.deepEqual(evidence.related_ids,[record.id]);
    assert.deepEqual(evidence.source_ids,record.source_ids);
  }
  for(const source of candidate.sources){
    assert.match(source.url,/^https:\/\//);
    assert.match(source.verification_status,/2026-09-02$/);
  }
});

test('v4.5.92 reviewed B100 candidate remains byte-equivalent to the later persisted append',()=>{
  const persistedRaw=readFileSync(persistedPath,'utf8');
  assert.deepEqual(JSON.parse(persistedRaw),candidate);
  assert.equal(createHash('sha256').update(persistedRaw).digest('hex'),'ef6d592306a213d22fee36aa32e5eca2f0673dde8773eeda1c444eef55af7b92');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  assert.deepEqual(manifest.runs.at(-1),{
    run_id:'engineer-osint-20260902-B100',
    parent_run_id:'engineer-osint-20260830-B99',
    parent_canonical_sha256:'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30',
    path:'data/runs/engineer-osint-20260902-B100.json',
    file_sha256:'ef6d592306a213d22fee36aa32e5eca2f0673dde8773eeda1c444eef55af7b92',
    canonical_sha256:'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141'
  });
});
