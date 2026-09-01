import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPhotoBaseline,buildPhotoBaseline,resolveLocalImagePath} from '../audit-photo-baseline.mjs';

test('photo baseline rejects remote URLs as local assets',()=>{
  assert.equal(resolveLocalImagePath('https://example.org/image.jpg'),null);
  assert.equal(resolveLocalImagePath('//example.org/image.webp'),null);
  assert.equal(resolveLocalImagePath('data:image/png;base64,AA'),null);
  assert.equal(resolveLocalImagePath('../escape.jpg'),null);
});

test('photo baseline keeps confirmed dispositions separate from unassessed backlog',()=>{
  const data={records:{records:[
    {id:'ENG-TECH-0001',title:'A',visual_ids:['ENG-VIS-0001']},
    {id:'ENG-TECH-0002',title:'B'},
    {id:'ENG-EVT-0001',title:'Not a technical card'}
  ]},visual_registry:{visuals:[{asset_id:'ENG-VIS-0001',image_url:'https://example.org/a.jpg'}]}};
  const report=buildPhotoBaseline({data,statusRegistry:{entries:[{card_id:'ENG-TECH-0002',status:'NOT_FOUND'}]}});
  assert.equal(report.total_cards,2);
  assert.equal(report.cards_with_local_image,0);
  assert.equal(report.cards_without_image,2);
  assert.equal(report.license_blocked,0);
  assert.equal(report.not_found,1);
  assert.equal(report.unassessed,1);
  assert.equal(report.cards_with_remote_visual_but_no_local_image,1);
});

test('current canonical store produces internally consistent photo KPI',()=>{
  const report=auditPhotoBaseline();
  assert.ok(report.total_cards>0,'expected at least one ENG-TECH card');
  assert.equal(report.cards_with_local_image+report.cards_without_image,report.total_cards);
  assert.ok(report.license_blocked+report.not_found<=report.cards_without_image);
  assert.equal(report.unassessed,report.cards_without_image-report.license_blocked-report.not_found);
  assert.ok(report.photo_coverage_percent>=0&&report.photo_coverage_percent<=100);
  assert.match(report.canonical_sha256,/^[a-f0-9]{64}$/);
  console.log('PHOTO_BASELINE_METRICS',JSON.stringify({
    total_cards:report.total_cards,
    cards_with_local_image:report.cards_with_local_image,
    cards_without_image:report.cards_without_image,
    license_blocked:report.license_blocked,
    not_found:report.not_found,
    unassessed:report.unassessed,
    photo_coverage_percent:report.photo_coverage_percent
  }));
});
