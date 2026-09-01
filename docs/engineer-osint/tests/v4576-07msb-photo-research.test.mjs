import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';
import {auditPhotoReviewQueue} from '../photo-review-queue.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const entry=registry.entries.find(item=>item.card_id==='ENG-TECH-0016');

test('v4.5.76 records exact 07MSB redistribution provenance without claiming a local binary',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  assert.ok(entry,'missing ENG-TECH-0016 photo review entry');
  assert.equal(entry.system_name,'JGSDF Type 07 Mobility Support Bridge (07MSB)');
  assert.ok(['READY_FOR_IMPORT','LOCAL_IMAGE'].includes(entry.status));
  assert.equal(entry.review_batch,'v4.5.76');
  assert.equal(entry.origin_url,'https://commons.wikimedia.org/wiki/File:JGSDF_Type_07_Mobility_support_bridge.jpg');
  assert.equal(entry.source_type,'WIKIMEDIA_COMMONS_FILE_PAGE');
  assert.equal(entry.author_rightsholder,'Japan Ground Self-Defense Force');
  assert.equal(entry.license,'CC BY 2.0');
  assert.equal(entry.license_url,'https://creativecommons.org/licenses/by/2.0/');
  assert.equal(entry.reviewed_at,'2026-09-01');
  assert.match(entry.identity_evidence,/official JGSDF/i);
  assert.match(entry.identity_evidence,/07MSB/i);
  assert.match(entry.identity_evidence,/8465492238/);
  assert.match(entry.license_evidence,/FlickreviewR/i);
  assert.match(entry.license_evidence,/CC BY|Attribution 2\.0/i);
  if(entry.status==='READY_FOR_IMPORT'){
    for(const field of ['local_image_path','sha256','acquired_at']){
      assert.ok(!Object.hasOwn(entry,field),`READY_FOR_IMPORT must not fabricate ${field}`);
    }
  }
});

test('v4.5.76 removes ENG-TECH-0016 from the unassessed review queue',()=>{
  const queue=auditPhotoReviewQueue();
  assert.ok(!queue.items.some(item=>item.card_id==='ENG-TECH-0016'));
});
