import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPhotoBaseline,validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';
import registry from '../photo-review-status.json' with {type:'json'};

test('v4.5.69 photo research batch preserves exact AM-50 and MT-55A provenance',()=>{
  const validated=validatePhotoReviewRegistry(registry);
  const byId=new Map(validated.entries.map(entry=>[entry.card_id,entry]));
  const am50=byId.get('ENG-TECH-0028');
  const mt55a=byId.get('ENG-TECH-0029');
  assert.ok(am50,'ENG-TECH-0028 photo review entry missing');
  assert.ok(mt55a,'ENG-TECH-0029 photo review entry missing');
  assert.equal(am50.system_name,'AM-50');
  assert.equal(am50.license,'CC0 1.0');
  assert.match(am50.origin_url,/commons\.wikimedia\.org\/wiki\/File:Mostn%C3%AD_automobil_AM-50_pic2\.JPG$/);
  assert.equal(mt55a.system_name,'MT-55A');
  assert.equal(mt55a.license,'CC BY-SA 4.0');
  assert.equal(mt55a.author_rightsholder,'Srđan Popović');
  assert.match(mt55a.origin_url,/commons\.wikimedia\.org\/wiki\/File:MT-55A_VS2\.jpg$/);
});

test('photo lifecycle accounting distinguishes researched READY_FOR_IMPORT cards from unassessed and local coverage',()=>{
  const data={records:{records:[
    {id:'ENG-TECH-0028',title:'AM-50'},
    {id:'ENG-TECH-0029',title:'MT-55A'},
    {id:'ENG-TECH-0099',title:'Unassessed'}
  ]},visual_registry:{visuals:[]}};
  const syntheticRegistry={
    ...registry,
    entries:registry.entries
      .filter(entry=>['ENG-TECH-0028','ENG-TECH-0029'].includes(entry.card_id))
      .map(entry=>({...entry,status:'READY_FOR_IMPORT'}))
  };
  const report=buildPhotoBaseline({data,statusRegistry:syntheticRegistry});
  assert.equal(report.total_cards,3);
  assert.equal(report.cards_with_local_image,0);
  assert.equal(report.ready_for_import,2);
  assert.equal(report.unassessed,1);
  assert.equal(report.remaining_unassessed,1);
  assert.equal(report.license_blocked,0);
  assert.equal(report.not_found,0);
  assert.equal(report.photo_coverage_percent,0);
});
