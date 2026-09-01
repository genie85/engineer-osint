import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';
import {auditPhotoReviewQueue} from '../photo-review-queue.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const entry=registry.entries.find(item=>item.card_id==='ENG-TECH-0005');

test('v4.5.80 records licensed UK-German M3 provenance without overclaiming M3 EVO identity',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  assert.ok(entry,'missing ENG-TECH-0005 photo review entry');
  assert.equal(entry.system_name,'UK-German Wide Wet Gap Crossing programme / M3 family');
  assert.ok(['READY_FOR_IMPORT','LOCAL_IMAGE'].includes(entry.status));
  assert.equal(entry.review_batch,'v4.5.80');
  assert.equal(entry.origin_url,'https://commons.wikimedia.org/wiki/File:NATO_Bridging_Operation_In_Germany_MOD_45162595.jpg');
  assert.equal(entry.source_type,'WIKIMEDIA_COMMONS_FILE_PAGE');
  assert.equal(entry.author_rightsholder,'Stuart A Hill AMS / UK Ministry of Defence, Crown copyright 2017');
  assert.equal(entry.license,'Open Government Licence v1.0');
  assert.equal(entry.license_url,'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/1/');
  assert.equal(entry.reviewed_at,'2026-09-01');
  assert.match(entry.identity_evidence,/UK M3 Amphibious Rig/i);
  assert.match(entry.identity_evidence,/joint UK\/German bridging operation/i);
  assert.match(entry.identity_evidence,/M3 EVO/i);
  assert.match(entry.identity_evidence,/not claimed to depict the new M3 EVO/i);
  assert.match(entry.license_evidence,/Open Government Licence/i);
  assert.match(entry.license_evidence,/Crown copyright 2017/i);
  if(entry.status==='READY_FOR_IMPORT'){
    for(const field of ['local_image_path','sha256','acquired_at']){
      assert.ok(!Object.hasOwn(entry,field),`READY_FOR_IMPORT must not fabricate ${field}`);
    }
  }
});

test('v4.5.80 removes ENG-TECH-0005 from the unassessed review queue',()=>{
  const queue=auditPhotoReviewQueue();
  assert.ok(!queue.items.some(item=>item.card_id==='ENG-TECH-0005'));
});
