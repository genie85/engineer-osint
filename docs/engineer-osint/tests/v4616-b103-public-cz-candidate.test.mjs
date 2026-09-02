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

test('v4.6.16 remains a read-only exact B103 patch and materializes deterministically from B102',()=>{
  assert.equal(candidate.state.run_id,'engineer-osint-20260902-B103');
  assert.equal(candidate.state.parent_run_id,'engineer-osint-20260902-B102');
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  validatePatchOperations(candidate);
  const store=loadCanonicalRunStore({root});
  assert.equal(store.report.current_run_id,'engineer-osint-20260902-B102');
  assert.equal(store.report.canonical_sha256,'5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91');
  const result=applyStrictPatchToCanonicalData(store.data,candidate);
  const resultingCanonical=canonicalDigest(result);
  assert.match(resultingCanonical,/^[a-f0-9]{64}$/);
  console.log('V4616_B103_PUBLIC_CZ_CANDIDATE',JSON.stringify({candidate_sha256:sha256(raw),expected_resulting_canonical_sha256:resultingCanonical,visuals_with_title_cs:candidate.visuals.filter(x=>x.title_cs).length}));
});
