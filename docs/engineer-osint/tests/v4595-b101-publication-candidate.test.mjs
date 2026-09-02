import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4595-b101.json';
const persistedPath='docs/engineer-osint/data/runs/engineer-osint-20260902-B101.json';
const manifestPath='docs/engineer-osint/data/run-store-manifest.json';
const candidateRaw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(candidateRaw);

test('v4.5.95 B101 candidate keeps exact Phase F publication scope',()=>{
  assert.equal(candidate.schema_version,'engineer-osint-patch-v1');
  assert.equal(candidate.state.run_id,'engineer-osint-20260902-B101');
  assert.equal(candidate.state.parent_run_id,'engineer-osint-20260902-B100');
  assert.equal(candidate.continuity.reviewed_main_sha,'4a56e5d121827e2a111681fda910f3a19069a5e0');
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141');
  assert.deepEqual(candidate.continuity.research_batches,['v4.5.90']);
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.new_records.length,3);
  assert.deepEqual(candidate.new_records.map(item=>item.id),['ENG-TECH-0046','ENG-TECH-0047','ENG-TECH-0048']);
  assert.deepEqual(candidate.sources.map(item=>item.id),['ENG-SRC-0530','ENG-SRC-0531','ENG-SRC-0532','ENG-SRC-0533']);
  assert.deepEqual(candidate.evidence.map(item=>item.evidence_id),['ENG-EVID-0218','ENG-EVID-0219','ENG-EVID-0220','ENG-EVID-0221']);
  assert.equal(candidate.state.counts.NEW,3);
  assert.equal(candidate.state.counts.NEW_SOURCES,4);
  assert.equal(candidate.state.counts.NEW_EVIDENCE,4);
  assert.equal(candidate.state.counts.NEW_MEDIA,0);
  assert.equal(candidate.state.counts.NEW_VISUALS,0);
});

test('v4.5.95 preserves Terrier and WiSENT configuration boundaries',()=>{
  const byId=new Map(candidate.new_records.map(item=>[item.id,item]));
  assert.match(byId.get('ENG-TECH-0046').title_en,/Terrier/);
  assert.match(byId.get('ENG-TECH-0046').analysis_en,/not as proof that every Terrier carries this configuration/);
  assert.deepEqual(byId.get('ENG-TECH-0046').source_ids,['ENG-SRC-0530','ENG-SRC-0531']);
  assert.deepEqual(byId.get('ENG-TECH-0046').evidence_ids,['ENG-EVID-0218','ENG-EVID-0219']);
  assert.match(byId.get('ENG-TECH-0047').analysis_en,/does not imply that recovery, AEV, mine-clearing and bridge-laying equipment is carried simultaneously/);
  assert.match(byId.get('ENG-TECH-0048').analysis_en,/does not infer current unit allocation, readiness, quantities, tactics or employment procedures/);
});

test('v4.5.95 source and evidence links are exact and primary-source scoped',()=>{
  const sourceIds=new Set(candidate.sources.map(item=>item.id));
  const evidenceIds=new Set(candidate.evidence.map(item=>item.evidence_id));
  for(const record of candidate.new_records){
    assert.ok(record.source_ids.length>=1);
    assert.ok(record.evidence_ids.length>=1);
    for(const id of record.source_ids)assert.ok(sourceIds.has(id),`${record.id}: missing source ${id}`);
    for(const id of record.evidence_ids){
      assert.ok(evidenceIds.has(id),`${record.id}: missing evidence ${id}`);
      const evidence=candidate.evidence.find(item=>item.evidence_id===id);
      assert.ok(evidence.related_ids.includes(record.id),`${record.id}: evidence relation mismatch`);
      assert.ok(evidence.source_ids.some(sourceId=>record.source_ids.includes(sourceId)),`${record.id}: evidence/source intersection missing`);
    }
  }
  for(const source of candidate.sources){
    assert.match(source.url,/^https:\/\//);
    assert.match(source.verification_status,/2026-09-02$/);
    assert.ok([1,2].includes(source.source_tier));
  }
});

test('v4.5.95 candidate keeps explicit no-media status and is exact in pre- or post-append lifecycle',()=>{
  assert.equal(candidate.qa.multimedia_status,'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
  assert.deepEqual(candidate.visuals,[]);
  assert.deepEqual(candidate.media,[]);
  if(!existsSync(persistedPath)){
    const stdout=execFileSync(process.execPath,['docs/engineer-osint/append-run.mjs',candidatePath],{encoding:'utf8'});
    const plan=JSON.parse(stdout);
    assert.equal(plan.status,'VALIDATED_DRY_RUN');
    assert.equal(plan.entry.run_id,'engineer-osint-20260902-B101');
    assert.equal(plan.entry.parent_run_id,'engineer-osint-20260902-B100');
    assert.equal(plan.entry.parent_canonical_sha256,'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141');
    assert.equal(plan.entry.file_sha256,'e02c5b0c52a98c36da8db9bbfef9d429edc068ce18c825c791dc8c180e186aea');
    assert.equal(plan.entry.canonical_sha256,'146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b');
  }else{
    const persistedRaw=readFileSync(persistedPath,'utf8');
    assert.equal(persistedRaw,candidateRaw);
    assert.equal(createHash('sha256').update(persistedRaw).digest('hex'),'e02c5b0c52a98c36da8db9bbfef9d429edc068ce18c825c791dc8c180e186aea');
    const entry=JSON.parse(readFileSync(manifestPath,'utf8')).runs.find(item=>item.run_id==='engineer-osint-20260902-B101');
    assert.deepEqual(entry,{
      run_id:'engineer-osint-20260902-B101',
      parent_run_id:'engineer-osint-20260902-B100',
      parent_canonical_sha256:'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141',
      path:'data/runs/engineer-osint-20260902-B101.json',
      file_sha256:'e02c5b0c52a98c36da8db9bbfef9d429edc068ce18c825c791dc8c180e186aea',
      canonical_sha256:'146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b'
    });
  }
});
