import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const root='docs/engineer-osint';
const readiness=JSON.parse(readFileSync(`${root}/V4645_B104_CC0_LOCAL_IMAGE_READINESS.json`,'utf8'));
const authorization=JSON.parse(readFileSync(`${root}/V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`,'utf8'));
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const candidatePath=`${root}/osint-publication-candidates/v4645-b104-wave2-local-images-cc0-public-cz.json`;
const successorPath=`${root}/photo-review-candidates/v4645-b104-v4639-local-image-status-cc0.json`;
const sourcePath=`${root}/photo-review-batches/v4639.json`;
const correctionPath=`${root}/photo-research/v4644-leguan-license-authority-correction.json`;
const staleAuthPath=`${root}/V4643_B104_WAVE2_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const B103='engineer-osint-20260902-B103';
const B104='engineer-osint-20260903-B104';
const B104_SHA='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';

test('v4.6.45 readiness pins exact corrected B104 discovery evidence before and after its separately authorized execution',()=>{
  const store=loadCanonicalRunStore({root});
  const correction=JSON.parse(readFileSync(correctionPath,'utf8'));
  const staleAuth=JSON.parse(readFileSync(staleAuthPath,'utf8'));

  assert.equal(readiness.schema_version,'engineer-osint-b104-cc0-local-image-readiness-v1');
  assert.equal(readiness.status,'READY_FOR_EXACT_REVIEW');
  assert.equal(readiness.reviewed_main_sha,'d2336831802af1f04fd797b313db0a34d9644900');
  assert.equal(readiness.parent_run_id,B103);
  assert.equal(readiness.parent_canonical_sha256,'d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c');
  assert.equal(readiness.candidate_run_id,B104);
  assert.equal(readiness.candidate_path,candidatePath);
  assert.equal(readiness.candidate_file_sha256,'0ee11a836cd5b60bd969caf0a2591d94be66eaf24bbc9de25993f0490850e4e9');
  assert.equal(readiness.candidate_file_sha256,sha256(candidatePath));
  assert.equal(readiness.expected_resulting_canonical_sha256,B104_SHA);
  assert.equal(readiness.lifecycle_source_path,sourcePath);
  assert.equal(readiness.lifecycle_source_sha256,'acb2021c7f04cc5387d8c8c320e0d5f724559b18742da05368a2d14954e2a841');
  assert.equal(readiness.lifecycle_successor_path,successorPath);
  assert.equal(readiness.lifecycle_successor_sha256,'016de834e7261c9678d7415d07be932347fae9e6f8ca644661a7994393ded3c6');
  assert.equal(readiness.lifecycle_successor_sha256,sha256(successorPath));

  if(store.report.current_run_id===B103){
    assert.equal(store.report.canonical_sha256,readiness.parent_canonical_sha256);
    assert.equal(readiness.lifecycle_source_sha256,sha256(sourcePath));
  } else {
    assert.equal(store.report.current_run_id,B104,'canonical head is outside exact B103→B104 lifecycle');
    assert.equal(store.report.canonical_sha256,B104_SHA);
    assert.equal(authorization.expected_parent_run_id,B103);
    assert.equal(authorization.expected_parent_canonical_sha256,readiness.parent_canonical_sha256);
    assert.equal(authorization.exact_candidate_file_sha256,readiness.candidate_file_sha256);
    assert.equal(authorization.expected_resulting_canonical_sha256,B104_SHA);
    assert.equal(sha256(sourcePath),readiness.lifecycle_successor_sha256);
    assert.equal(readFileSync(sourcePath,'utf8'),readFileSync(successorPath,'utf8'));
  }

  assert.deepEqual(readiness.expected_card_ids,['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049']);
  assert.deepEqual(readiness.expected_visual_ids,['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049']);
  assert.equal(readiness.expected_updated_record_count,3);
  assert.equal(readiness.expected_new_visual_count,3);
  assert.equal(readiness.expected_new_media_count,0);
  assert.deepEqual(readiness.resulting_photo_baseline,{total_cards:50,cards_with_local_image:12,ready_for_import:7,photo_coverage_percent:24});

  assert.equal(correction.authoritative_license,'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(readiness.license_authority.license,correction.authoritative_license);
  assert.equal(readiness.license_authority.license_url,correction.license_url);
  assert.equal(readiness.license_authority.vrt_ticket,correction.vrt_ticket);
  assert.equal(readiness.license_authority.historical_acquisition_license_assertion_superseded,true);
  assert.notEqual(readiness.candidate_file_sha256,staleAuth.exact_candidate_file_sha256);
  assert.equal(readiness.stale_authorization.path,staleAuthPath);
  assert.equal(readiness.stale_authorization.superseded,true);
  assert.equal(readiness.stale_authorization.execution_permitted,false);

  assert.equal(readiness.discovery_ci.head_sha,'7bde2609910fa0076a46f57019d612f4ed6a4b1e');
  assert.equal(readiness.discovery_ci.workflow_run_id,33833409269);
  assert.equal(readiness.discovery_ci.job_id,100900943536);
  assert.equal(readiness.discovery_ci.conclusion,'success');
  assert.equal(readiness.discovery_ci.test_total,544);
  assert.equal(readiness.discovery_ci.test_pass,541);
  assert.equal(readiness.discovery_ci.test_fail,0);
  assert.equal(readiness.discovery_ci.test_skipped,3);
  assert.equal(readiness.discovery_ci.public_cz_ratchet,'PUBLIC_CZ_RATCHET_PASS');
  assert.equal(readiness.discovery_ci.new_missing_fields,0);
  assert.equal(readiness.discovery_ci.normalized_dom_sha256,'5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c');
  assert.deepEqual(readiness.supporting_ci.map(item=>[item.workflow_run_id,item.conclusion]),[
    [33833409256,'success'],
    [33833409250,'success'],
    [33833409254,'success']
  ]);

  assert.deepEqual(readiness.execution_state,{
    canonical_write_performed:false,
    run_file_created:false,
    manifest_updated:false,
    lifecycle_successor_applied:false,
    workflow_successor_applied:false
  });
  assert.equal(readiness.authorization_required,true);
  assert.equal(readiness.execution_permitted_by_this_artifact,false);
});
