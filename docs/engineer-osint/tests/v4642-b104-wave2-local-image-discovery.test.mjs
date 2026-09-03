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
const executorPath=`${root}/authorized-canonical-executor.mjs`;
const runId='engineer-osint-20260903-B104';
const parentRunId='engineer-osint-20260902-B103';
const parentCanonicalSha='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const expectedCards=['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049'];
const expectedVisuals=['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049'];
const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
const run=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});

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

test('v4.6.42 lifecycle successor advances exactly v4639 READY_FOR_IMPORT entries to LOCAL_IMAGE without duplicate registry entries',()=>{
  const source=JSON.parse(readFileSync(lifecycleSourcePath,'utf8'));
  const successor=JSON.parse(readFileSync(successorPath,'utf8'));
  const acquisition=JSON.parse(readFileSync(acquisitionPath,'utf8'));
  const acquisitionByCard=new Map(acquisition.entries.map(item=>[item.card_id,item]));
  assert.deepEqual(source.entries.map(item=>item.card_id),expectedCards);
  assert.ok(source.entries.every(item=>item.status==='READY_FOR_IMPORT'));
  assert.deepEqual(successor.entries.map(item=>item.card_id),expectedCards);
  assert.ok(successor.entries.every(item=>item.status==='LOCAL_IMAGE'));
  for(const entry of successor.entries){
    const archived=acquisitionByCard.get(entry.card_id);
    assert.equal(entry.local_image_path,archived.local_image_path);
    assert.equal(entry.sha256,archived.local_sha256);
    assert.equal(entry.license,archived.license);
    assert.ok(!('import_blocker' in entry));
  }
  assert.equal(successor.entries.find(item=>item.card_id==='ENG-TECH-0049').license,'CC BY-SA 4.0');
});

test('current canonical executor supports an exact pinned lifecycle source path without code changes',()=>{
  const source=readFileSync(executorPath,'utf8');
  assert.match(source,/sourcePath=safeRepoPath\(item\.source_path\)/);
  assert.match(source,/copyFileSync\(resolve\(repoRoot,lifecycle\.successorPath\),resolve\(repoRoot,lifecycle\.sourcePath\)\)/);
  assert.match(source,/expectedChanged=new Set\(\[requestPath,`\$\{osintRoot\}\/data\/run-store-manifest\.json`,runPath,\.\.\.\(lifecycle\?\[lifecycle\.sourcePath\]:\[\]\)\]\)/);
});

test('v4.6.42 discovery simulates B103 to B104 append plus exact v4639 lifecycle successor and PUBLIC-CZ gates',()=>{
  const raw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(raw);
  const candidateSha=sha256(raw);
  const successorRaw=readFileSync(successorPath,'utf8');
  const successorSha=sha256(successorRaw);
  const live=loadCanonicalRunStore({root});
  assert.equal(live.report.current_run_id,parentRunId);
  assert.equal(live.report.canonical_sha256,parentCanonicalSha);
  const resultingCanonicalSha=canonicalDigest(applyStrictPatchToCanonicalData(live.data,candidate));

  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4642-b104-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
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
