import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

const root='docs/engineer-osint';
const originalPath=`${root}/osint-publication-candidates/v4603-b103-local-images.json`;
const candidatePath=`${root}/osint-publication-candidates/v4616-b103-local-images-public-cz.json`;
const original=JSON.parse(readFileSync(originalPath,'utf8'));
const raw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(raw);
const expectedIds=['ENG-VIS-LOCAL-0003','ENG-VIS-LOCAL-0004','ENG-VIS-LOCAL-0005','ENG-VIS-LOCAL-0006','ENG-VIS-LOCAL-0016','ENG-VIS-LOCAL-0017','ENG-VIS-LOCAL-0022','ENG-VIS-LOCAL-0028','ENG-VIS-LOCAL-0029'];
const sha256=text=>createHash('sha256').update(text).digest('hex');
const B102='engineer-osint-20260902-B102';
const B102_SHA='5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91';
const B103='engineer-osint-20260902-B103';
const B103_SHA='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const B104='engineer-osint-20260903-B104';
const B104_SHA='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';

test('v4.6.16 changes V4603 only by adding nine explicit Czech visual titles',()=>{
  const stripped=structuredClone(candidate);
  assert.deepEqual(stripped.visuals.map(x=>x.id),expectedIds);
  for(const visual of stripped.visuals){
    assert.equal(typeof visual.title_cs,'string');
    assert.ok(visual.title_cs.trim().length>0);
    assert.notEqual(visual.title_cs,visual.title);
    assert.match(visual.title_cs,/[áčďéěíňóřšťúůýž]|obrázek|mostní|ženijní|vozidlo|překážek|odminování|obrněný/i);
    delete visual.title_cs;
  }
  assert.deepEqual(stripped,original);
});

test('v4.6.16 remains a read-only exact B103 patch and materializes deterministically from B102 or persists as an exact ancestor',()=>{
  assert.equal(candidate.state.run_id,B103);
  assert.equal(candidate.state.parent_run_id,B102);
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  validatePatchOperations(candidate);
  const store=loadCanonicalRunStore({root});
  if(store.report.current_run_id===B102){
    assert.equal(store.report.canonical_sha256,B102_SHA);
    const result=applyStrictPatchToCanonicalData(store.data,candidate);
    const resultingCanonical=canonicalDigest(result);
    assert.equal(resultingCanonical,B103_SHA);
    console.log('V4616_B103_PUBLIC_CZ_CANDIDATE',JSON.stringify({candidate_sha256:sha256(raw),expected_resulting_canonical_sha256:resultingCanonical,visuals_with_title_cs:candidate.visuals.filter(x=>x.title_cs).length}));
    return;
  }
  if(store.report.current_run_id===B104)assert.equal(store.report.canonical_sha256,B104_SHA);
  else {
    assert.equal(store.report.current_run_id,B103,'canonical head is outside exact B102→B103→B104 lifecycle');
    assert.equal(store.report.canonical_sha256,B103_SHA);
  }
  const entry=store.manifest.runs.find(item=>item.run_id===B103);
  assert.ok(entry,'exact B103 manifest ancestor missing');
  assert.equal(entry.parent_run_id,B102);
  assert.equal(entry.file_sha256,sha256(raw));
  assert.equal(entry.canonical_sha256,B103_SHA);
  const persisted=readFileSync(`${root}/data/runs/${B103}.json`,'utf8');
  assert.equal(sha256(persisted),sha256(raw));
  assert.deepEqual(JSON.parse(persisted),candidate);
});
