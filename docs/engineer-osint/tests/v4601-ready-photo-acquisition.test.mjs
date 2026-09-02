import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const STATUS=JSON.parse(readFileSync(join(ROOT,'photo-review-status.json'),'utf8'));
const ACQUISITION_DIR=join(ROOT,'photo-local-acquisitions');
const SHA256_RE=/^[a-f0-9]{64}$/;
const hashFile=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

function loadAcquisitions(){
  assert.ok(existsSync(ACQUISITION_DIR),'photo-local-acquisitions directory must exist');
  const manifests=readdirSync(ACQUISITION_DIR).filter(name=>name.endsWith('.json')).sort();
  assert.ok(manifests.length>0,'at least one local photo acquisition manifest is required');
  const entries=[];
  for(const name of manifests){
    const manifest=JSON.parse(readFileSync(join(ACQUISITION_DIR,name),'utf8'));
    assert.equal(manifest.schema_version,1,`${name} schema_version`);
    assert.ok(/^v\d+\.\d+\.\d+$/.test(manifest.batch||''),`${name} batch`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(manifest.acquired_at||''),`${name} acquired_at`);
    assert.ok(Array.isArray(manifest.entries),`${name} entries`);
    entries.push(...manifest.entries.map(entry=>({...entry,manifest:name})));
  }
  return entries;
}

test('every archived photo has exact local bytes and provenance',()=>{
  const entries=loadAcquisitions();
  const seen=new Set();
  for(const entry of entries){
    assert.match(entry.card_id||'',/^ENG-TECH-\d+$/,`${entry.manifest} card_id`);
    assert.ok(!seen.has(entry.card_id),`duplicate local acquisition for ${entry.card_id}`);
    seen.add(entry.card_id);
    for(const field of ['origin_url','source_title','author_rightsholder','license','license_url','attribution_requirement','source_sha256','local_image_path','local_sha256','modifications']){
      assert.ok(String(entry[field]||'').trim(),`${entry.card_id} missing ${field}`);
    }
    assert.match(entry.source_sha256,SHA256_RE,`${entry.card_id} source SHA-256`);
    assert.match(entry.local_sha256,SHA256_RE,`${entry.card_id} local SHA-256`);
    assert.match(entry.local_image_path,/^assets\/photos\/[a-z0-9-]+\.webp$/,`${entry.card_id} local path`);
    const local=join(ROOT,entry.local_image_path);
    assert.ok(existsSync(local),`${entry.card_id} local image missing: ${entry.local_image_path}`);
    assert.equal(hashFile(local),entry.local_sha256,`${entry.card_id} local image SHA-256 mismatch`);
    assert.ok(Number.isInteger(entry.local_bytes)&&entry.local_bytes>0,`${entry.card_id} local_bytes`);
    assert.equal(readFileSync(local).byteLength,entry.local_bytes,`${entry.card_id} local byte count mismatch`);
    assert.ok(Array.isArray(entry.local_dimensions)&&entry.local_dimensions.length===2&&entry.local_dimensions.every(x=>Number.isInteger(x)&&x>0),`${entry.card_id} local_dimensions`);
  }
});

test('READY_FOR_IMPORT cannot accumulate without immediate local archival',()=>{
  const acquisitions=new Map(loadAcquisitions().map(entry=>[entry.card_id,entry]));
  const ready=STATUS.entries.filter(entry=>entry.status==='READY_FOR_IMPORT');
  assert.ok(ready.length>0,'expected reviewed READY_FOR_IMPORT entries');
  for(const review of ready){
    const archived=acquisitions.get(review.card_id);
    assert.ok(archived,`${review.card_id} is READY_FOR_IMPORT but has no local acquisition; archive it in the same safe slice`);
    for(const field of ['origin_url','source_title','author_rightsholder','license','license_url','attribution_requirement']){
      assert.equal(archived[field],review[field],`${review.card_id} acquisition ${field} diverges from reviewed provenance`);
    }
  }
});
