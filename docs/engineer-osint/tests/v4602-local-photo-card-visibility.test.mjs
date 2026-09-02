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

test('all locally acquired photos have deployable files',()=>{
  assert.ok(entries.length>0);
  for(const entry of entries){
    assert.ok(entry.card_id,'missing card_id');
    assert.ok(entry.local_image_path,'missing local_image_path');
    assert.ok(fs.existsSync(path.join(root,entry.local_image_path)),`${entry.card_id} local image missing`);
  }
});

test('build materializes every acquisition manifest and copies photo assets',()=>{
  assert.match(build,/readdirSync\(localPhotoDir\)/);
  assert.match(build,/local_photo_acquisitions=\$\{localPhotoEntries\.length\}/);
  assert.match(build,/cpSync\(join\(source,'assets'\),join\(output,'assets'\),\{recursive:true\}\)/);
});

test('v4.3 detail renders a local photo for every matching card id',()=>{
  assert.match(ui,/localPhotoAcquisitions/);
  assert.match(ui,/localPhotoFor=r=>/);
  assert.match(ui,/data-v43-local-photo/);
  assert.match(ui,/\$\{renderLocalPhoto\(r\)\}/);
  const entry=entries.find(x=>x.card_id==='ENG-TECH-0016');
  assert.ok(entry,'ENG-TECH-0016 must have a local acquisition');
  assert.equal(entry.local_image_path,'assets/photos/eng-tech-0016-jgsdf-07msb.webp');
});

test('master prompt requires visible card completion, not archive-only state',()=>{
  assert.match(prompt,/READY_FOR_IMPORT` je execution trigger/);
  assert.match(prompt,/detail odpovídající karty obrázek skutečně renderuje/);
  assert.match(prompt,/produkční UX\/media defect/);
});
