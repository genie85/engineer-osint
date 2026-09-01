import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPhotoBaseline} from '../audit-photo-baseline.mjs';

test('v4.5.71 identifies the next unassessed photo candidates deterministically',()=>{
  const report=auditPhotoBaseline();
  const candidates=report.items
    .filter(item=>!item.local_images.length&&!item.review_status)
    .sort((a,b)=>a.card_id.localeCompare(b.card_id))
    .slice(0,8)
    .map(({card_id,title,remote_visual_count})=>({card_id,title,remote_visual_count}));
  assert.ok(candidates.length>0,'expected unassessed photo candidates');
  console.log('PHOTO_RESEARCH_CANDIDATES',JSON.stringify(candidates));
});
