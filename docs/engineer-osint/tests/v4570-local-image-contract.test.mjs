import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildPhotoBaseline,validatePhotoReviewRegistry} from '../audit-photo-baseline.mjs';

const provenance={
  card_id:'ENG-TECH-0028',
  system_name:'AM-50',
  status:'LOCAL_IMAGE',
  origin_url:'https://commons.wikimedia.org/wiki/File:Mostn%C3%AD_automobil_AM-50_pic2.JPG',
  source_title:'Mostní automobil AM-50 pic2.JPG',
  author_rightsholder:'Alf van Beem',
  license:'CC0 1.0',
  license_url:'https://creativecommons.org/publicdomain/zero/1.0/',
  identity_evidence:'Commons explicitly identifies the depicted vehicle as AM-50.',
  license_evidence:'Commons records own work released under CC0 1.0.',
  reviewed_at:'2026-09-01',
  acquired_at:'2026-09-01',
  local_image_path:'assets/photos/eng-tech-0028-am-50.webp',
  sha256:'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
};

test('LOCAL_IMAGE requires provenance, acquisition metadata, supported local path and lowercase SHA-256',()=>{
  assert.doesNotThrow(()=>validatePhotoReviewRegistry({schema_version:2,entries:[provenance]}));
  for(const field of ['origin_url','source_title','author_rightsholder','license','license_url','identity_evidence','license_evidence','reviewed_at','acquired_at','local_image_path','sha256']){
    const broken={...provenance,[field]:''};
    assert.throws(()=>validatePhotoReviewRegistry({schema_version:2,entries:[broken]}),new RegExp(`LOCAL_IMAGE ENG-TECH-0028 missing ${field}`));
  }
  assert.throws(()=>validatePhotoReviewRegistry({schema_version:2,entries:[{...provenance,sha256:'not-a-sha'}]}),/requires lowercase SHA-256/);
  assert.throws(()=>validatePhotoReviewRegistry({schema_version:2,entries:[{...provenance,sha256:provenance.sha256.toUpperCase()}]}),/requires lowercase SHA-256/);
  assert.throws(()=>validatePhotoReviewRegistry({schema_version:2,entries:[{...provenance,local_image_path:'assets/photos/am50.svg'}]}),/requires a supported local image path/);
});

test('LOCAL_IMAGE declaration must point to the exact linked local visual',()=>{
  const root=mkdtempSync(join(tmpdir(),'engineer-osint-photo-'));
  mkdirSync(join(root,'assets/photos'),{recursive:true});
  writeFileSync(join(root,'assets/photos/eng-tech-0028-am-50.webp'),'test-image');
  writeFileSync(join(root,'assets/photos/other.webp'),'other-image');
  const data={records:{records:[{id:'ENG-TECH-0028',title:'AM-50',visual_ids:['ENG-VIS-AM50']}]},visual_registry:{visuals:[{
    id:'ENG-VIS-AM50',
    local_image_path:'assets/photos/eng-tech-0028-am-50.webp'
  }]}};
  const valid=buildPhotoBaseline({data,statusRegistry:{schema_version:2,entries:[provenance]},root});
  assert.equal(valid.cards_with_local_image,1);
  assert.equal(valid.photo_coverage_percent,100);
  const mismatch={...provenance,local_image_path:'assets/photos/other.webp'};
  assert.throws(()=>buildPhotoBaseline({data,statusRegistry:{schema_version:2,entries:[mismatch]},root}),/metadata does not match a linked local image/);
});
