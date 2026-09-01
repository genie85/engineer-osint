import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';
import {auditPhotoReviewQueue} from '../photo-review-queue.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const entry=registry.entries.find(item=>item.card_id==='ENG-TECH-0017');

test('v4.5.77 records exact Type 92 redistribution provenance without claiming a local binary',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  assert.ok(entry,'missing ENG-TECH-0017 photo review entry');
  assert.equal(entry.system_name,'JGSDF Type 92 Minefield Clearing Vehicle');
  assert.ok(['READY_FOR_IMPORT','LOCAL_IMAGE'].includes(entry.status));
  assert.equal(entry.review_batch,'v4.5.77');
  assert.equal(entry.origin_url,'https://commons.wikimedia.org/wiki/File:92%E5%BC%8F%E5%9C%B0%E9%9B%B7%E5%8E%9F%E5%87%A6%E7%90%86%E8%BB%8A_%288465401362%29.jpg');
  assert.equal(entry.source_title,'92式地雷原処理車 (8465401362).jpg');
  assert.equal(entry.source_type,'WIKIMEDIA_COMMONS_FILE_PAGE');
  assert.equal(entry.author_rightsholder,'Japan Ground Self-Defense Force (JGSDF)');
  assert.equal(entry.license,'CC BY 2.0');
  assert.equal(entry.license_url,'https://creativecommons.org/licenses/by/2.0/');
  assert.equal(entry.reviewed_at,'2026-09-01');
  assert.match(entry.identity_evidence,/Type 92 Minefield Clearing Vehicle/i);
  assert.match(entry.identity_evidence,/ENG-VIS-0028/);
  assert.match(entry.license_evidence,/8465401362/);
  assert.match(entry.license_evidence,/FlickreviewR/i);
  assert.match(entry.license_evidence,/29 March 2014/);
  if(entry.status==='READY_FOR_IMPORT'){
    for(const field of ['local_image_path','sha256','acquired_at']){
      assert.ok(!Object.hasOwn(entry,field),`READY_FOR_IMPORT must not fabricate ${field}`);
    }
  }
});

test('v4.5.77 removes ENG-TECH-0017 from the unassessed review queue',()=>{
  const queue=auditPhotoReviewQueue();
  assert.ok(!queue.items.some(item=>item.card_id==='ENG-TECH-0017'));
});
