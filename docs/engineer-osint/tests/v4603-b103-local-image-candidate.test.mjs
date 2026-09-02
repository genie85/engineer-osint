import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const expected=['ENG-TECH-0003','ENG-TECH-0004','ENG-TECH-0005','ENG-TECH-0006','ENG-TECH-0016','ENG-TECH-0017','ENG-TECH-0022','ENG-TECH-0028','ENG-TECH-0029'];
const candidatePath=`${root}/osint-publication-candidates/v4603-b103-local-images.json`;
const successorPath=`${root}/photo-review-candidates/v4603-b103-local-image-status.json`;
const reportPath=`${root}/V4603_B103_LOCAL_IMAGE_CANDIDATE_READINESS.json`;

test('B103 local-image candidate is exact, review-only and nine-card scoped',()=>{
  for(const path of [candidatePath,successorPath,reportPath])assert.ok(existsSync(path),`${path} missing`);
  const candidate=JSON.parse(readFileSync(candidatePath,'utf8'));
  assert.equal(candidate.state.run_id,'engineer-osint-20260902-B103');
  assert.equal(candidate.state.parent_run_id,'engineer-osint-20260902-B102');
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.qa.multimedia_status,'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION');
  assert.deepEqual(candidate.updated_records.map(x=>x.id),expected);
  assert.deepEqual(candidate.visuals.map(x=>x.related_ids?.[0]),expected);
  assert.deepEqual(candidate.visuals.map(x=>x.asset_id),expected.map(id=>`ENG-VIS-LOCAL-${id.slice('ENG-TECH-'.length)}`));
  assert.equal(candidate.media.length,0);
  assert.equal(candidate.state.counts.UPDATE,9);
  assert.equal(candidate.state.counts.NEW_VISUALS,9);
  assert.equal(candidate.state.counts.NEW_MEDIA,0);
});

test('B103 status successor advances exactly the nine acquired cards to LOCAL_IMAGE',()=>{
  const successor=JSON.parse(readFileSync(successorPath,'utf8'));
  const local=successor.entries.filter(x=>x.status==='LOCAL_IMAGE').sort((a,b)=>a.card_id.localeCompare(b.card_id));
  assert.deepEqual(local.map(x=>x.card_id),expected);
  for(const entry of local){
    assert.match(entry.local_image_path,/^assets\/photos\/.*\.webp$/);
    assert.match(entry.sha256,/^[a-f0-9]{64}$/);
    assert.ok(entry.acquired_at);
    assert.ok(!('import_blocker' in entry));
  }
  assert.equal(successor.entries.filter(x=>x.status==='READY_FOR_IMPORT').length,0);
});

test('B103 readiness pins deterministic canonical and local-byte scope without executing it',()=>{
  const report=JSON.parse(readFileSync(reportPath,'utf8'));
  assert.equal(report.status,'READY_FOR_EXACT_REVIEW');
  assert.equal(report.parent_run_id,'engineer-osint-20260902-B102');
  assert.match(report.parent_canonical_sha256,/^[a-f0-9]{64}$/);
  assert.match(report.candidate_file_sha256,/^[a-f0-9]{64}$/);
  assert.match(report.expected_resulting_canonical_sha256,/^[a-f0-9]{64}$/);
  assert.match(report.status_successor_sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(report.expected_card_ids,expected);
  assert.equal(report.local_files.length,9);
  assert.equal(report.resulting_photo_baseline.cards_with_local_image,9);
  assert.equal(report.resulting_photo_baseline.ready_for_import,0);
  assert.deepEqual(report.execution_state,{canonical_write_performed:false,run_file_created:false,manifest_updated:false,photo_review_status_successor_applied:false});
  assert.equal(report.authorization_required,true);
});
