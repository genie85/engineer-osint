import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPhotoReviewQueue} from '../photo-review-queue.mjs';

test('v4.5.72 photo review queue is fail-closed and deterministic',()=>{
  assert.throws(()=>buildPhotoReviewQueue(null),/invalid photo baseline report/);
  const queue=buildPhotoReviewQueue({
    current_run_id:'engineer-osint-test-B100',
    canonical_sha256:'a'.repeat(64),
    items:[
      {card_id:'ENG-TECH-0005',title:'No visual',local_images:[],remote_visual_count:0,review_status:null},
      {card_id:'ENG-TECH-0004',title:'Remote one',local_images:[],remote_visual_count:1,review_status:null},
      {card_id:'ENG-TECH-0002',title:'Remote two',local_images:[],remote_visual_count:2,review_status:null},
      {card_id:'ENG-TECH-0003',title:'Already reviewed',local_images:[],remote_visual_count:4,review_status:'READY_FOR_IMPORT'},
      {card_id:'ENG-TECH-0001',title:'Already local',local_images:[{visual_id:'VIS-1',path:'media/x.webp'}],remote_visual_count:0,review_status:'LOCAL_IMAGE'}
    ]
  });
  assert.equal(queue.schema_version,1);
  assert.equal(queue.queued_cards,3);
  assert.equal(queue.queued_with_remote_visual,2);
  assert.equal(queue.queued_without_visual,1);
  assert.equal(queue.source_current_run_id,'engineer-osint-test-B100');
  assert.equal(queue.source_canonical_sha256,'a'.repeat(64));
  assert.deepEqual(queue.items.map(item=>item.card_id),['ENG-TECH-0002','ENG-TECH-0004','ENG-TECH-0005']);
  assert.deepEqual(queue.items.map(item=>item.review_priority),['REMOTE_VISUAL_PRESENT','REMOTE_VISUAL_PRESENT','NO_VISUAL']);
  assert.match(queue.scope,/never implies redistribution permission/);
});
