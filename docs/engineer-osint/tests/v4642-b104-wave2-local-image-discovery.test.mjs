import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

const root='docs/engineer-osint';
const candidatePath=`${root}/osint-publication-candidates/v4642-b104-wave2-local-images-public-cz.json`;
const successorPath=`${root}/photo-review-candidates/v4642-b104-v4639-local-image-status.json`;
const lifecycleSourcePath=`${root}/photo-review-batches/v4639.json`;
const acquisitionPath=`${root}/photo-local-acquisitions/v4641-wave2-ready-for-import.json`;
const readinessPath=`${root}/V4642_B104_WAVE2_LOCAL_IMAGE_READINESS.json`;
const executorPath=`${root}/authorized-canonical-executor.mjs`;
const correctedAuthorizationPath=`${root}/V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const correctedSuccessorPath=`${root}/photo-review-candidates/v4645-b104-v4639-local-image-status-cc0.json`;
const runId='engineer-osint-20260903-B104';
const parentRunId='engineer-osint-20260902-B103';
const parentCanonicalSha='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const staleExpectedCanonicalSha='34479f18aac998b8ee5feae6b28276fc1fb3f2dcd90f95c60b656ae1d3eb21e0';
const correctedCandidateSha='0ee11a836cd5b60bd969caf0a2591d94be66eaf24bbc9de25993f0490850e4e9';
const correctedCanonicalSha='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const expectedCards=['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049'];
const expectedVisuals=['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049'];
const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
const run=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const correctedAuthorization=JSON.parse(readFileSync(correctedAuthorizationPath,'utf8'));

const assertLivePhase=store=>{
  if(store.report.current_run_id===parentRunId){
    assert.equal(store.report.canonical_sha256,parentCanonicalSha);
    return 'PRE_CORRECTED_B104';
  }
  assert.equal(store.report.current_run_id,runId,'canonical head is outside exact B103→corrected B104 lifecycle');
  assert.equal(store.report.canonical_sha256,correctedCanonicalSha);
  assert.equal(correctedAuthorization.exact_candidate_file_sha256,correctedCandidateSha);
  assert.equal(correctedAuthorization.expected_parent_run_id,parentRunId);
  assert.equal(correctedAuthorization.expected_parent_canonical_sha256,parentCanonicalSha);
  assert.equal(correctedAuthorization.expected_resulting_canonical_sha256,correctedCanonicalSha);
  return 'POST_CORRECTED_B104';
};

const reconstructB103=temp=>{
  const tempRoot=join(temp,root);
  const manifestPath=join(tempRoot,'data/run-store-manifest.json');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(manifest.runs.at(-1)?.run_id===runId){
    const entry=manifest.runs.pop();
    assert.equal(entry.parent_run_id,parentRunId);
    assert.equal(entry.parent_canonical_sha256,parentCanonicalSha);
    assert.equal(entry.file_sha256,correctedCandidateSha);
    assert.equal(entry.canonical_sha256,correctedCanonicalSha);
    rmSync(join(tempRoot,'data/runs',`${runId}.json`),{force:true});
    writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  }
  const restored=loadCanonicalRunStore({root:tempRoot});
  assert.equal(restored.report.current_run_id,parentRunId);
  assert.equal(restored.report.canonical_sha256,parentCanonicalSha);
};

test('v4.6.42 B104 candidate is exact three-card local-image enrichment with pinned local bytes',()=>{
  const raw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(raw);
  const acquisition=JSON.parse(readFileSync(acquisitionPath,'utf8'));
  const acquisitionByCard=new Map(acquisition.entries.map(item=>[item.card_id,item]));

  assert.equal(candidate.state.run_id,runId);
  assert.equal(candidate.state.parent_run_id,parentRunId);
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,parentCanonicalSha);
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.continuity.photo_review_status_successor_applied,false);
  assert.equal(candidate.state.counts.ENTITY_ENRICHMENT,3);
  assert.equal(candidate.state.counts.UPDATE,3);
  assert.equal(candidate.state.counts.CONFIRMATION,3);
  assert.equal(candidate.state.counts.NEW_VISUALS,3);
  assert.equal(candidate.state.counts.NEW_MEDIA,0);
  assert.deepEqual(candidate.updated_records.map(item=>item.id),expectedCards);
  assert.deepEqual(candidate.visuals.map(item=>item.id),expectedVisuals);
  assert.ok(candidate.visuals.every(item=>typeof item.title_cs==='string'&&item.title_cs.trim()));

  for(const visual of candidate.visuals){
    const cardId=visual.related_ids?.[0];
    const archived=acquisitionByCard.get(cardId);
    assert.ok(archived,`missing acquisition for ${cardId}`);
    assert.equal(visual.local_image_path,archived.local_image_path);
    assert.equal(visual.sha256,archived.local_sha256);
    assert.equal(visual.source_sha256,archived.source_sha256);
    assert.equal(visual.license,archived.license);
    const local=join(root,visual.local_image_path);
    assert.ok(existsSync(local),`missing local image ${local}`);
    assert.equal(sha256(readFileSync(local)),visual.sha256,`${cardId} local SHA mismatch`);
  }
});

test('v4.6.42 lifecycle successor remains source-corrected while exact live source may be pre- or post-corrected-B104',()=>{
  const sourceRaw=readFileSync(lifecycleSourcePath);
  const source=JSON.parse(sourceRaw);
  const successor=JSON.parse(readFileSync(successorPath,'utf8'));
  const acquisition=JSON.parse(readFileSync(acquisitionPath,'utf8'));
  const acquisitionByCard=new Map(acquisition.entries.map(item=>[item.card_id,item]));
  const live=loadCanonicalRunStore({root});
  const phase=assertLivePhase(live);

  assert.deepEqual(source.entries.map(item=>item.card_id),expectedCards);
  if(phase==='PRE_CORRECTED_B104'){
    assert.ok(source.entries.every(item=>item.status==='READY_FOR_IMPORT'));
    assert.equal(sha256(sourceRaw),correctedAuthorization.photo_review_status_successor.source_sha256);
  } else {
    const correctedSuccessorRaw=readFileSync(correctedSuccessorPath);
    assert.equal(sourceRaw.toString('utf8'),correctedSuccessorRaw.toString('utf8'));
    assert.equal(sha256(sourceRaw),correctedAuthorization.photo_review_status_successor.successor_sha256);
    assert.ok(source.entries.every(item=>item.status==='LOCAL_IMAGE'));
  }
  assert.deepEqual(successor.entries.map(item=>item.card_id),expectedCards);
  assert.ok(successor.entries.every(item=>item.status==='LOCAL_IMAGE'));
  for(const entry of successor.entries){
    const archived=acquisitionByCard.get(entry.card_id);
    assert.equal(entry.local_image_path,archived.local_image_path);
    assert.equal(entry.sha256,archived.local_sha256);
    if(entry.card_id!=='ENG-TECH-0049')assert.equal(entry.license,archived.license);
    assert.ok(!('import_blocker' in entry));
  }
  const leguan=successor.entries.find(item=>item.card_id==='ENG-TECH-0049');
  const archivedLeguan=acquisitionByCard.get('ENG-TECH-0049');
  assert.equal(leguan.license,'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(archivedLeguan.license,'CC BY-SA 4.0');
  assert.match(leguan.provenance_correction,/file-level CC0 1\.0/i);
});

test('v4.6.42 readiness remains frozen and blocked after corrected B104 publication',()=>{
  const readiness=JSON.parse(readFileSync(readinessPath,'utf8'));
  const candidateRaw=readFileSync(candidatePath,'utf8');
  const successorRaw=readFileSync(successorPath,'utf8');
  const sourceRaw=readFileSync(lifecycleSourcePath,'utf8');
  const live=loadCanonicalRunStore({root});
  const phase=assertLivePhase(live);
  const candidate=JSON.parse(candidateRaw);
  const resultingCanonicalSha=phase==='PRE_CORRECTED_B104'
    ?canonicalDigest(applyStrictPatchToCanonicalData(live.data,candidate))
    :staleExpectedCanonicalSha;

  assert.equal(readiness.status,'BLOCKED_SOURCE_LICENSE_CORRECTION');
  assert.equal(readiness.reviewed_main_sha,'c2ad3befded2b69f4490b1778f5e2535f690ab08');
  assert.equal(readiness.parent_run_id,parentRunId);
  assert.equal(readiness.parent_canonical_sha256,parentCanonicalSha);
  assert.equal(readiness.candidate_run_id,runId);
  assert.equal(readiness.candidate_path,candidatePath);
  assert.equal(readiness.candidate_file_sha256,sha256(candidateRaw));
  assert.equal(readiness.expected_resulting_canonical_sha256,resultingCanonicalSha);
  assert.equal(readiness.expected_resulting_canonical_sha256,staleExpectedCanonicalSha);
  assert.equal(readiness.lifecycle_source_path,lifecycleSourcePath);
  if(phase==='PRE_CORRECTED_B104')assert.equal(readiness.lifecycle_source_sha256,sha256(sourceRaw));
  else {
    assert.equal(sha256(sourceRaw),correctedAuthorization.photo_review_status_successor.successor_sha256);
    assert.notEqual(readiness.lifecycle_source_sha256,sha256(sourceRaw));
  }
  assert.equal(readiness.lifecycle_successor_path,successorPath);
  assert.notEqual(readiness.lifecycle_successor_sha256,sha256(successorRaw));
  assert.equal(readiness.blocking_correction.card_id,'ENG-TECH-0049');
  assert.equal(readiness.blocking_correction.authoritative_license,'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(readiness.blocking_correction.execution_permitted,false);
  assert.equal(readiness.blocking_correction.requires_fresh_corrected_discovery,true);
  assert.equal(readiness.blocking_correction.requires_new_authorization,true);
  assert.deepEqual(readiness.expected_card_ids,expectedCards);
  assert.deepEqual(readiness.expected_visual_ids,expectedVisuals);
  assert.equal(readiness.expected_updated_record_count,3);
  assert.equal(readiness.expected_new_visual_count,3);
  assert.equal(readiness.expected_new_media_count,0);
  assert.deepEqual(readiness.resulting_photo_baseline,{cards_with_local_image:12,ready_for_import:7,photo_coverage_percent:24});
  assert.equal(readiness.execution_state.canonical_write_performed,false);
  assert.equal(readiness.execution_state.run_file_created,false);
  assert.equal(readiness.execution_state.manifest_updated,false);
  assert.equal(readiness.execution_state.lifecycle_successor_applied,false);
  assert.equal(readiness.authorization_required,true);

  const acquisition=JSON.parse(readFileSync(acquisitionPath,'utf8'));
  const acquisitionByCard=new Map(acquisition.entries.map(item=>[item.card_id,item]));
  for(const file of readiness.local_files){
    const archived=acquisitionByCard.get(file.card_id);
    assert.ok(archived,`readiness local file missing acquisition: ${file.card_id}`);
    assert.equal(file.local_image_path,archived.local_image_path);
    assert.equal(file.local_sha256,archived.local_sha256);
    assert.equal(file.source_sha256,archived.source_sha256);
    assert.equal(sha256(readFileSync(join(root,file.local_image_path))),file.local_sha256);
  }
});

test('current canonical executor supports an exact pinned lifecycle source path without code changes',()=>{
  const source=readFileSync(executorPath,'utf8');
  assert.match(source,/sourcePath=safeRepoPath\(item\.source_path\)/);
  assert.match(source,/copyFileSync\(resolve\(repoRoot,lifecycle\.successorPath\),resolve\(repoRoot,lifecycle\.sourcePath\)\)/);
  assert.match(source,/expectedChanged=new Set\(\[requestPath,`\$\{osintRoot\}\/data\/run-store-manifest\.json`,runPath,\.\.\.\(lifecycle\?\[lifecycle\.sourcePath\]:\[\]\)\]\)/);
});

test('v4.6.42 discovery reconstructs B103 and simulates the historical B104 append plus corrected stale successor',()=>{
  const raw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(raw);
  const candidateSha=sha256(raw);
  const successorRaw=readFileSync(successorPath,'utf8');
  const successorSha=sha256(successorRaw);
  const live=loadCanonicalRunStore({root});
  const phase=assertLivePhase(live);
  const resultingCanonicalSha=phase==='PRE_CORRECTED_B104'
    ?canonicalDigest(applyStrictPatchToCanonicalData(live.data,candidate))
    :staleExpectedCanonicalSha;
  assert.equal(resultingCanonicalSha,staleExpectedCanonicalSha);

  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4642-b104-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    reconstructB103(temp);
    const authRel=`${root}/.v4642-b104-discovery-authorization.json`;
    const auth={
      schema_version:'engineer-osint-b104-discovery-simulation-v1',
      status:'READY_FOR_APPEND',
      candidate_path:candidatePath,
      candidate_run_id:runId,
      expected_parent_run_id:parentRunId,
      expected_parent_canonical_sha256:parentCanonicalSha,
      exact_candidate_file_sha256:candidateSha,
      expected_resulting_canonical_sha256:resultingCanonicalSha,
      authorized_guard_successor_contract:{
        guarded_run_id:runId,
        authorization_path:authRel,
        schema_version:'engineer-osint-b104-discovery-simulation-v1',
        required_status:'READY_FOR_APPEND',
        require_exact_candidate_hashes:true,
        allow_wildcard_or_current_state_acceptance:false
      },
      authorization:{
        append_exact_candidate_only:true,
        standard_append_run_write_required:true,
        one_run_only:true,
        isolated_review_branch_required:true,
        execution_requires_separate_slice:true,
        allow_manual_manifest_or_hash_edit:false,
        allow_future_run_same_slice:false,
        allow_canonical_history_rewrite:false
      }
    };
    writeFileSync(join(temp,authRel),JSON.stringify(auth,null,2)+'\n');
    const append=JSON.parse(run(temp,`${root}/append-run.mjs`,candidatePath,'--write','--authorization',authRel));
    assert.equal(append.status,'APPENDED');
    assert.equal(append.entry.run_id,runId);
    assert.equal(append.entry.parent_run_id,parentRunId);
    assert.equal(append.entry.canonical_sha256,resultingCanonicalSha);

    cpSync(join(temp,successorPath),join(temp,lifecycleSourcePath));
    const photo=JSON.parse(run(temp,`${root}/audit-photo-baseline.mjs`));
    assert.equal(photo.current_run_id,runId);
    assert.equal(photo.canonical_sha256,resultingCanonicalSha);
    assert.equal(photo.cards_with_local_image,12);
    assert.equal(photo.ready_for_import,7);
    assert.equal(photo.photo_coverage_percent,24);
    for(const cardId of expectedCards){
      const item=photo.items.find(entry=>entry.card_id===cardId);
      assert.ok(item,`photo audit missing ${cardId}`);
      assert.equal(item.review_status,'LOCAL_IMAGE');
      assert.equal(item.local_images.length,1);
    }

    run(temp,`${root}/build-pages.mjs`);
    run(temp,`${root}/materialize-canonical-media-history.mjs`);
    run(temp,`${root}/audit-public-cz-ui-latest.mjs`);
    const ratchet=JSON.parse(run(temp,`${root}/validate-public-cz-regression.mjs`));
    assert.equal(ratchet.pass,true);
    assert.deepEqual(ratchet.new_missing_fields,[]);

    console.log('V4642_B104_DISCOVERY',JSON.stringify({
      candidate_sha256:candidateSha,
      expected_resulting_canonical_sha256:resultingCanonicalSha,
      lifecycle_source_sha256:sha256(readFileSync(lifecycleSourcePath)),
      lifecycle_successor_sha256:successorSha,
      cards_with_local_image:photo.cards_with_local_image,
      ready_for_import:photo.ready_for_import,
      photo_coverage_percent:photo.photo_coverage_percent,
      public_cz_ratchet:ratchet.status,
      new_missing_fields:ratchet.new_missing_fields.length
    }));
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});
