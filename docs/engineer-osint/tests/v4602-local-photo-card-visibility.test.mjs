import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root='docs/engineer-osint';
const ui=fs.readFileSync(path.join(root,'ui-v43-entity-detail.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build-pages.mjs'),'utf8');
const prompt=fs.readFileSync(path.join(root,'MASTER_PROMPT.md'),'utf8');
const dir=path.join(root,'photo-local-acquisitions');
const manifests=fs.readdirSync(dir).filter(name=>name.endsWith('.json')).sort();
const entries=manifests.flatMap(name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')).entries||[]);
const cardIds=entries.map(entry=>entry.card_id);
const wave3Ids=['ENG-TECH-0014','ENG-TECH-0015','ENG-TECH-0018','ENG-TECH-0019','ENG-TECH-0020','ENG-TECH-0038','ENG-TECH-0041'];

test('all locally acquired photos have deployable files',()=>{
  assert.ok(entries.length>0);
  for(const entry of entries){
    assert.ok(entry.card_id,'missing card_id');
    assert.ok(entry.local_image_path,'missing local_image_path');
    assert.ok(fs.existsSync(path.join(root,entry.local_image_path)),`${entry.card_id} local image missing`);
  }
});

test('local acquisition registry is unique and ratchets the complete wave-3 archive',()=>{
  assert.equal(entries.length,19,'expected all 19 locally archived acquisition records');
  assert.equal(new Set(cardIds).size,cardIds.length,'duplicate local acquisition card_id would make render selection ambiguous');
  for(const cardId of wave3Ids){
    const entry=entries.find(item=>item.card_id===cardId);
    assert.ok(entry,`${cardId} wave-3 acquisition missing`);
    assert.ok(entry.local_image_path,`${cardId} wave-3 local image path missing`);
  }
});

test('build materializes every acquisition manifest and copies photo assets',()=>{
  assert.match(build,/readdirSync\(localPhotoDir\)/);
  assert.match(build,/local_photo_acquisitions=\$\{localPhotoEntries\.length\}/);
  assert.match(build,/cpSync\(join\(source,'assets'\),join\(output,'assets'\),\{recursive:true\}\)/);
});

test('v4.3 detail uses one generic local-photo resolver for every locally archived card',()=>{
  assert.match(ui,/localPhotoAcquisitions/);
  assert.match(ui,/localPhotoFor=r=>localPhotoAcquisitions\(\)\.filter\(p=>p\?\.card_id===r\?\.id&&p\?\.local_image_path\)\.at\(-1\)\|\|null/);
  assert.match(ui,/data-v43-local-photo/);
  assert.match(ui,/\$\{renderLocalPhoto\(r\)\}/);
  for(const cardId of cardIds){
    const matches=entries.filter(item=>item.card_id===cardId&&item.local_image_path);
    assert.equal(matches.length,1,`${cardId} must resolve to exactly one locally archived image`);
  }
});

test('master prompt requires visible card completion, not archive-only state',()=>{
  assert.match(prompt,/READY_FOR_IMPORT` je execution trigger/);
  assert.match(prompt,/detail odpovídající karty obrázek skutečně renderuje/);
  assert.match(prompt,/produkční UX\/media defect/);
});
