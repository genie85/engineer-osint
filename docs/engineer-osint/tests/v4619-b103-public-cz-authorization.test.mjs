import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

const root='docs/engineer-osint';
const read=rel=>readFileSync(`${root}/${rel}`);
const readRepo=rel=>readFileSync(rel);
const json=rel=>JSON.parse(read(rel).toString('utf8'));
const sha256=buf=>createHash('sha256').update(buf).digest('hex');
const gitBlobSha=buf=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`),buf])).digest('hex');
const auth=json('V4619_B103_PUBLIC_CZ_APPEND_AUTHORIZATION.json');
const oldAuth=json('V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
const candidate=json('osint-publication-candidates/v4616-b103-local-images-public-cz.json');
const b103WorkflowSuccessorSha='ba0517693b06a0360e1254f47e8b9004942bba0f';
const v4616LifecycleSuccessorSha='52cdd53dbc247b0c887725fea160b89066e9ddb4';
const v4618LifecycleSuccessorSha='31a7112cb443014e717bdbd8c0c408997bda0d73';
const expectedCards=['ENG-TECH-0003','ENG-TECH-0004','ENG-TECH-0005','ENG-TECH-0006','ENG-TECH-0016','ENG-TECH-0017','ENG-TECH-0022','ENG-TECH-0028','ENG-TECH-0029'];
const expectedVisuals=expectedCards.map(id=>`ENG-VIS-LOCAL-${id.slice(-4)}`);
const B102='engineer-osint-20260902-B102';
const B103='engineer-osint-20260902-B103';

test('v4.6.19 authorizes only the exact PUBLIC-CZ-safe B103 successor',()=>{
  assert.equal(auth.schema_version,'engineer-osint-b103-public-cz-append-authorization-v1');
  assert.equal(auth.status,'READY_FOR_APPEND');
  assert.equal(auth.reviewed_main_sha,'a4fbf729e51c4acfb7681f2e32a5ec4e41f9b05a');
  assert.equal(auth.supersedes_for_execution,'docs/engineer-osint/V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json');
  assert.equal(auth.candidate_run_id,B103);
  assert.equal(auth.expected_parent_run_id,B102);
  assert.equal(auth.expected_parent_canonical_sha256,'5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91');
  assert.equal(auth.expected_resulting_canonical_sha256,'d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c');
  assert.deepEqual(auth.expected_card_ids,expectedCards);
  assert.deepEqual(auth.expected_visual_ids,expectedVisuals);

  const raw=read('osint-publication-candidates/v4616-b103-local-images-public-cz.json');
  assert.equal(sha256(raw),auth.exact_candidate_file_sha256);
  assert.equal(gitBlobSha(raw),auth.candidate_git_blob_sha);
  assert.equal(candidate.state.run_id,auth.candidate_run_id);
  assert.equal(candidate.state.parent_run_id,auth.expected_parent_run_id);
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.ok(candidate.visuals.every(item=>typeof item.title_cs==='string'&&item.title_cs.trim()));

  const store=loadCanonicalRunStore({root});
  if(store.report.current_run_id===B102){
    assert.equal(store.report.canonical_sha256,auth.expected_parent_canonical_sha256);
    assert.equal(canonicalDigest(applyStrictPatchToCanonicalData(store.data,candidate)),auth.expected_resulting_canonical_sha256);
  } else {
    assert.equal(store.report.current_run_id,B103,'canonical head is outside exact B102→B103 lifecycle');
    assert.equal(store.report.canonical_sha256,auth.expected_resulting_canonical_sha256);
    const persisted=read('data/runs/engineer-osint-20260902-B103.json');
    assert.equal(sha256(persisted),auth.exact_candidate_file_sha256);
    assert.deepEqual(JSON.parse(persisted.toString('utf8')),candidate);
  }
});

test('v4.6.19 pins the exact photo lifecycle successor and preserves all nine binary identities',()=>{
  const source=read('photo-review-status.json');
  const successor=read('photo-review-candidates/v4603-b103-local-image-status.json');
  const store=loadCanonicalRunStore({root});
  if(store.report.current_run_id===B102){
    assert.equal(sha256(source),auth.photo_review_status_successor.source_sha256);
    assert.equal(gitBlobSha(source),auth.photo_review_status_successor.source_git_blob_sha);
  } else {
    assert.equal(store.report.current_run_id,B103);
    assert.equal(source.toString('utf8'),successor.toString('utf8'));
    assert.equal(sha256(source),auth.photo_review_status_successor.successor_sha256);
    assert.equal(gitBlobSha(source),auth.photo_review_status_successor.successor_git_blob_sha);
  }
  assert.equal(sha256(successor),auth.photo_review_status_successor.successor_sha256);
  assert.equal(gitBlobSha(successor),auth.photo_review_status_successor.successor_git_blob_sha);
  assert.equal(oldAuth.local_files.length,9);
  for(const entry of oldAuth.local_files){
    const bytes=read(entry.path.replace(/^docs\/engineer-osint\//,''));
    assert.equal(sha256(bytes),entry.sha256,`${entry.card_id} SHA-256 drift`);
    assert.equal(gitBlobSha(bytes),entry.git_blob_sha,`${entry.card_id} Git blob drift`);
  }
});

test('v4.6.19 pins the reviewed protected B102 baseline and simulation evidence',()=>{
  assert.equal(gitBlobSha(read('append-run.mjs')),auth.protected_baseline.append_run_blob_sha);
  assert.equal(gitBlobSha(read('lib/run-store.mjs')),auth.protected_baseline.run_store_blob_sha);
  assert.equal(gitBlobSha(read('lib/integrity.mjs')),auth.protected_baseline.integrity_blob_sha);
  const store=loadCanonicalRunStore({root});
  if(store.report.current_run_id===B102){
    assert.equal(gitBlobSha(read('data/run-store-manifest.json')),auth.protected_baseline.manifest_blob_sha);
  } else {
    assert.equal(store.report.current_run_id,B103);
    assert.equal(store.report.canonical_sha256,auth.expected_resulting_canonical_sha256);
    const entry=store.manifest.runs.at(-1);
    assert.equal(entry.run_id,B103);
    assert.equal(entry.parent_run_id,B102);
    assert.equal(entry.file_sha256,auth.exact_candidate_file_sha256);
    assert.equal(entry.canonical_sha256,auth.expected_resulting_canonical_sha256);
  }
  assert.equal(gitBlobSha(read('data/runs/engineer-osint-20260902-B102.json')),auth.protected_baseline.b102_run_blob_sha);
  assert.ok([auth.protected_baseline.v4616_candidate_test_blob_sha,v4616LifecycleSuccessorSha].includes(gitBlobSha(read('tests/v4616-b103-public-cz-candidate.test.mjs'))));
  assert.ok([auth.protected_baseline.v4618_preauthorization_simulation_test_blob_sha,v4618LifecycleSuccessorSha].includes(gitBlobSha(read('tests/v4618-b103-preauthorization-simulation.test.mjs'))));
  const workflowSha=gitBlobSha(readRepo('.github/workflows/identity-fix-retirement-regression.yml'));
  assert.ok([auth.protected_baseline.identity_fix_retirement_workflow_blob_sha,b103WorkflowSuccessorSha].includes(workflowSha));
});

test('v4.6.19 remains fail-closed and blocks execution until the B103 browser-digest workflow successor exists',()=>{
  assert.equal(auth.authorized_guard_successor_contract.authorization_path,'docs/engineer-osint/V4619_B103_PUBLIC_CZ_APPEND_AUTHORIZATION.json');
  assert.equal(auth.authorized_guard_successor_contract.allow_wildcard_or_current_state_acceptance,false);
  assert.equal(auth.execution_dependencies.identity_fix_retirement_b103_browser_digest_successor_required,true);
  assert.equal(auth.execution_dependencies.current_workflow_accepts_only_through_run,'engineer-osint-20260902-B102');
  assert.equal(auth.execution_dependencies.workflow_successor_must_be_separately_authorized_and_implemented_before_b103_execution,true);
  assert.equal(auth.execution_dependencies.this_authorization_does_not_authorize_workflow_mutation,true);
  assert.equal(auth.authorization.append_exact_candidate_only,true);
  assert.equal(auth.authorization.standard_append_run_write_required,true);
  assert.equal(auth.authorization.apply_exact_photo_review_status_successor,true);
  assert.equal(auth.authorization.execution_requires_separate_slice,true);
  assert.equal(auth.authorization.allow_candidate_mutation,false);
  assert.equal(auth.authorization.allow_manual_manifest_or_hash_edit,false);
  assert.equal(auth.authorization.allow_photo_binary_mutation,false);
  assert.equal(auth.authorization.allow_canonical_history_rewrite,false);
  assert.equal(auth.authorization.allow_historical_authorization_rewrite,false);
  assert.equal(auth.authorization.allow_workflow_change,false);
  assert.deepEqual(auth.execution_state,{
    append_run_successor_installed:false,
    canonical_write_performed:false,
    run_file_created:false,
    manifest_updated:false,
    photo_review_status_successor_applied:false
  });
});
