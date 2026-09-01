import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditPhotoBaseline,validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const entry=registry.entries.find(item=>item.card_id==='ENG-TECH-0001');

test('v4.5.73 records exact MV-8 manufacturer provenance without inventing redistribution rights',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  assert.ok(entry,'missing ENG-TECH-0001 photo review entry');
  assert.equal(entry.system_name,'MV-8 KOMODO Unmanned Breaching System');
  assert.equal(entry.status,'SOURCE_FOUND');
  assert.equal(entry.review_batch,'v4.5.73');
  assert.equal(entry.origin_url,'https://www.rheinmetall.com/en/media/news-watch/news/2026/06/2026-06-15-rheinmetall-at-eurosatory-mv-8-komodo');
  assert.equal(entry.source_type,'MANUFACTURER_PRESS_RELEASE');
  assert.equal(entry.reviewed_at,'2026-09-01');
  assert.match(entry.identity_evidence,/explicitly identifies/i);
  assert.match(entry.license_evidence,/do not demonstrate a compatible open redistribution license/i);
  assert.match(entry.import_blocker,/redistribution rights .* have not been demonstrated/i);
  for(const field of ['license','license_url','local_image_path','sha256','acquired_at']){
    assert.ok(!Object.hasOwn(entry,field),`SOURCE_FOUND must not fabricate ${field}`);
  }
});

test('v4.5.73 MV-8 provenance remains valid at the exact v4.5.74 lifecycle successor',()=>{
  const report=auditPhotoBaseline();
  assert.equal(report.total_cards,41);
  assert.equal(report.cards_with_local_image,0);
  assert.equal(report.cards_without_image,41);
  assert.equal(report.source_found,2);
  assert.equal(report.license_verified,0);
  assert.equal(report.identity_verified,0);
  assert.equal(report.ready_for_import,4);
  assert.equal(report.license_blocked,0);
  assert.equal(report.not_found,0);
  assert.equal(report.unassessed,35);
  assert.equal(report.photo_coverage_percent,0);
});
