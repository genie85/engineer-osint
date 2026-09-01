import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';

const registry=JSON.parse(readFileSync('docs/engineer-osint/photo-review-status.json','utf8'));
const byId=new Map(registry.entries.map(entry=>[entry.card_id,entry]));

const expected={
  'ENG-TECH-0003':{
    system_name:'UBIM',
    origin_url:'https://commons.wikimedia.org/wiki/File:UBIM_Engineer_Vehicle_Army-2022_2022-08-20_2554.jpg',
    source_title:'UBIM Engineer Vehicle Army-2022 2022-08-20 2554.jpg',
    author_rightsholder:'Mike1979 Russia',
    license:'CC BY-SA 4.0',
    license_url:'https://creativecommons.org/licenses/by-sa/4.0/'
  },
  'ENG-TECH-0006':{
    system_name:'JGSDF Type 07 Mobility Support Bridge (07MSB)',
    origin_url:'https://commons.wikimedia.org/wiki/File:JGSDF_Type_07_Mobility_support_bridge_20121021-02.JPG',
    source_title:'JGSDF Type 07 Mobility support bridge 20121021-02.JPG',
    author_rightsholder:'Los688',
    license:'CC0 1.0',
    license_url:'https://creativecommons.org/publicdomain/zero/1.0/'
  }
};

test('v4.5.71 second photo research batch pins exactly UBIM and JGSDF Type 07 provenance',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry(registry));
  const batch=registry.entries.filter(entry=>entry.review_batch==='v4.5.71').map(entry=>entry.card_id).sort();
  assert.deepEqual(batch,Object.keys(expected).sort());
  for(const [cardId,fields] of Object.entries(expected)){
    const entry=byId.get(cardId);
    assert.ok(entry,`missing ${cardId}`);
    assert.equal(entry.status,'READY_FOR_IMPORT');
    assert.equal(entry.reviewed_at,'2026-09-01');
    assert.match(entry.identity_evidence,/explicitly identifies/i);
    assert.ok(entry.license_evidence.length>40);
    assert.match(entry.import_blocker,/no LOCAL_IMAGE claim is made/);
    for(const [field,value] of Object.entries(fields))assert.equal(entry[field],value,`${cardId} ${field}`);
  }
});
