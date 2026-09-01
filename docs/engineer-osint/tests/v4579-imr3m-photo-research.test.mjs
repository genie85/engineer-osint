import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';
import {auditPhotoReviewQueue} from '../photo-review-queue.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const entry=registry.entries.find(item=>item.card_id==='ENG-TECH-0004');

test('v4.5.79 records exact IMR-3M redistribution provenance without overclaiming the 2026 configuration',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  assert.ok(entry,'missing ENG-TECH-0004 photo review entry');
  assert.equal(entry.system_name,'IMR-3M armoured engineering / obstacle-clearing vehicle');
  assert.ok(['READY_FOR_IMPORT','LOCAL_IMAGE'].includes(entry.status));
  assert.equal(entry.review_batch,'v4.5.79');
  assert.equal(entry.origin_url,'https://commons.wikimedia.org/wiki/File:IMR-3M_armoured_engineering_vehicle_at_Engineering_Technologies_2012.jpg');
  assert.equal(entry.source_type,'WIKIMEDIA_COMMONS_FILE_PAGE');
  assert.equal(entry.author_rightsholder,'Mike1979 Russia');
  assert.equal(entry.license,'CC BY-SA 3.0');
  assert.equal(entry.license_url,'https://creativecommons.org/licenses/by-sa/3.0/');
  assert.equal(entry.reviewed_at,'2026-09-01');
  assert.match(entry.identity_evidence,/IMR-3M/i);
  assert.match(entry.identity_evidence,/2012 image establishes platform identity only/i);
  assert.match(entry.identity_evidence,/not claimed to depict the 2026 EW or additional anti-drone protection fit/i);
  assert.match(entry.license_evidence,/own work/i);
  assert.match(entry.license_evidence,/Attribution-ShareAlike 3\.0/i);
  if(entry.status==='READY_FOR_IMPORT'){
    for(const field of ['local_image_path','sha256','acquired_at']){
      assert.ok(!Object.hasOwn(entry,field),`READY_FOR_IMPORT must not fabricate ${field}`);
    }
  }
});

test('v4.5.79 removes ENG-TECH-0004 from the unassessed review queue',()=>{
  const queue=auditPhotoReviewQueue();
  assert.ok(!queue.items.some(item=>item.card_id==='ENG-TECH-0004'));
});
