import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';
import {auditPhotoReviewQueue} from '../photo-review-queue.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const entry=registry.entries.find(item=>item.card_id==='ENG-TECH-0022');

test('v4.5.78 records exact KUNDUZ redistribution provenance without claiming a local binary',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  assert.ok(entry,'missing ENG-TECH-0022 photo review entry');
  assert.equal(entry.system_name,'KUNDUZ / Armoured Amphibious Combat Earthmover (AACE)');
  assert.ok(['READY_FOR_IMPORT','LOCAL_IMAGE'].includes(entry.status));
  assert.equal(entry.review_batch,'v4.5.78');
  assert.equal(entry.origin_url,'https://commons.wikimedia.org/wiki/File:FNSS_Kunduz.png');
  assert.equal(entry.source_type,'WIKIMEDIA_COMMONS_FILE_PAGE');
  assert.equal(entry.author_rightsholder,'Muzo 573');
  assert.equal(entry.license,'CC BY-SA 4.0');
  assert.equal(entry.license_url,'https://creativecommons.org/licenses/by-sa/4.0/');
  assert.equal(entry.reviewed_at,'2026-09-01');
  assert.match(entry.identity_evidence,/FNSS Kunduz/i);
  assert.match(entry.identity_evidence,/AACE/i);
  assert.match(entry.identity_evidence,/ENG-VIS-0048/);
  assert.match(entry.license_evidence,/own work/i);
  assert.match(entry.license_evidence,/Attribution-ShareAlike 4\.0/i);
  if(entry.status==='READY_FOR_IMPORT'){
    for(const field of ['local_image_path','sha256','acquired_at']){
      assert.ok(!Object.hasOwn(entry,field),`READY_FOR_IMPORT must not fabricate ${field}`);
    }
  }
});

test('v4.5.78 removes ENG-TECH-0022 from the unassessed review queue',()=>{
  const queue=auditPhotoReviewQueue();
  assert.ok(!queue.items.some(item=>item.card_id==='ENG-TECH-0022'));
});
