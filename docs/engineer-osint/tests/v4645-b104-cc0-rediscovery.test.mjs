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
const candidatePath=`${root}/osint-publication-candidates/v4645-b104-wave2-local-images-cc0-public-cz.json`;
const successorPath=`${root}/photo-review-candidates/v4645-b104-v4639-local-image-status-cc0.json`;
const lifecycleSourcePath=`${root}/photo-review-batches/v4639.json`;
const acquisitionPath=`${root}/photo-local-acquisitions/v4641-wave2-ready-for-import.json`;
const correctionPath=`${root}/photo-research/v4644-leguan-license-authority-correction.json`;
const staleAuthPath=`${root}/V4643_B104_WAVE2_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const staleReadinessPath=`${root}/V4642_B104_WAVE2_LOCAL_IMAGE_READINESS.json`;
const runId='engineer-osint-20260903-B104';
const parentRunId='engineer-osint-20260902-B103';
const parentCanonicalSha='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const reviewedMainSha='d2336831802af1f04fd797b313db0a34d9644900';
const expectedCandidateSha='0ee11a836cd5b60bd969caf0a2591d94be66eaf24bbc9de25993f0490850e4e9';
const expectedCanonicalSha='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const expectedCards=['ENG-TECH-0045','ENG-TECH-0048','ENG-TECH-0049'];
const expectedVisuals=['ENG-VIS-LOCAL-0045','ENG-VIS-LOCAL-0048','ENG-VIS-LOCAL-0049'];
const sha256=value=>createHash('sha256').update(value).digest('hex');
const run=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const findBrowser=()=>{
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{return execFileSync('which',[name],{encoding:'utf8'}).trim();}catch{}
  }
  return '';
};
const normalizeDom=source=>{
  const bilingual=/(?<open><(?<tag>[A-Za-z][A-Za-z0-9:-]*)\b(?=[^>]*\bdata-label-cs="(?<cs>[^"]*)")(?=[^>]*\bdata-label-en="(?<en>[^"]*)")[^>]*>)(?<text>[^<>]*)(?<close><\/\k<tag>>)/gi;
  const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,'\u00a0');
  let s=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  s=s.replace(bilingual,(whole,...args)=>{
    const groups=args.at(-1);
    const text=decode(groups.text).trim();
    const cs=decode(groups.cs).trim();
    const en=decode(groups.en).trim();
    return [cs.toLocaleLowerCase(),en.toLocaleLowerCase()].includes(text.toLocaleLowerCase())
      ? groups.open+groups.cs+groups.close
      : whole;
  });
  return s.replace(/\s+/g,' ').trim();
};

const exactPhase=store=>{
  if(store.report.current_run_id===parentRunId){
    assert.equal(store.report.canonical_sha256,parentCanonicalSha);
    return 'PRE_EXECUTION';
  }
  assert.equal(store.report.current_run_id,runId,'canonical head is outside exact B103→corrected B104 lifecycle');
  assert.equal(store.report.canonical_sha256,expectedCanonicalSha);
  return 'POST_EXECUTION';
};

test('v4.6.45 corrected B104 candidate is exact three-card enrichment and supersedes stale authorization inputs',()=>{
  const raw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(raw);
  const successor=JSON.parse(readFileSync(successorPath,'utf8'));
  const acquisition=JSON.parse(readFileSync(acquisitionPath,'utf8'));
  const correction=JSON.parse(readFileSync(correctionPath,'utf8'));
  const staleAuth=JSON.parse(readFileSync(staleAuthPath,'utf8'));
  const staleReadiness=JSON.parse(readFileSync(staleReadinessPath,'utf8'));
  const acquisitionByCard=new Map(acquisition.entries.map(item=>[item.card_id,item]));

  assert.equal(sha256(raw),expectedCandidateSha);
  assert.equal(candidate.state.run_id,runId);
  assert.equal(candidate.state.parent_run_id,parentRunId);
  assert.equal(candidate.continuity.reviewed_main_sha,reviewedMainSha);
  assert.equal(candidate.continuity.reviewed_parent_canonical_sha256,parentCanonicalSha);
  assert.equal(candidate.continuity.canonical_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(candidate.continuity.photo_review_status_successor_applied,false);
  assert.equal(candidate.continuity.supersedes_stale_authorization_path,staleAuthPath);
  assert.equal(candidate.state.counts.ENTITY_ENRICHMENT,3);
  assert.equal(candidate.state.counts.UPDATE,3);
  assert.equal(candidate.state.counts.CONFIRMATION,3);
  assert.equal(candidate.state.counts.NEW_VISUALS,3);
  assert.equal(candidate.state.counts.NEW_MEDIA,0);
  assert.deepEqual(candidate.updated_records.map(item=>item.id),expectedCards);
  assert.deepEqual(candidate.visuals.map(item=>item.id),expectedVisuals);
  assert.notEqual(sha256(raw),staleAuth.exact_candidate_file_sha256,'corrected candidate must not reuse stale authorized hash');
  assert.equal(staleReadiness.status,'BLOCKED_SOURCE_LICENSE_CORRECTION');
  assert.equal(staleReadiness.blocking_correction.execution_permitted,false);

  assert.deepEqual(successor.entries.map(item=>item.card_id),expectedCards);
  assert.ok(successor.entries.every(item=>item.status==='LOCAL_IMAGE'));
  for(const visual of candidate.visuals){
    const cardId=visual.related_ids?.[0];
    const archived=acquisitionByCard.get(cardId);
    assert.ok(archived,`missing acquisition for ${cardId}`);
    assert.equal(visual.local_image_path,archived.local_image_path);
    assert.equal(visual.sha256,archived.local_sha256);
    assert.equal(visual.source_sha256,archived.source_sha256);
    assert.ok(existsSync(join(root,visual.local_image_path)),`missing local image for ${cardId}`);
    assert.equal(sha256(readFileSync(join(root,visual.local_image_path))),visual.sha256,`${cardId} local SHA mismatch`);
    const lifecycle=successor.entries.find(item=>item.card_id===cardId);
    assert.ok(lifecycle,`missing lifecycle successor for ${cardId}`);
    assert.equal(lifecycle.local_image_path,visual.local_image_path);
    assert.equal(lifecycle.sha256,visual.sha256);
    assert.equal(lifecycle.license,visual.license);
    if(cardId!=='ENG-TECH-0049')assert.equal(visual.license,archived.license);
  }

  const leguan=candidate.visuals.find(item=>item.asset_id==='ENG-VIS-LOCAL-0049');
  const lifecycleLeguan=successor.entries.find(item=>item.card_id==='ENG-TECH-0049');
  const archivedLeguan=acquisitionByCard.get('ENG-TECH-0049');
  assert.equal(correction.authoritative_license,'CC0 1.0 Universal Public Domain Dedication');
  assert.equal(leguan.license,correction.authoritative_license);
  assert.equal(leguan.license_url,correction.license_url);
  assert.equal(lifecycleLeguan.license,correction.authoritative_license);
  assert.equal(archivedLeguan.local_sha256,leguan.sha256);
  assert.equal(archivedLeguan.source_sha256,leguan.source_sha256);
  assert.equal(archivedLeguan.license,'CC BY-SA 4.0','historical acquisition metadata remains immutable evidence of the superseded assertion');
});

test('v4.6.45 discovers or verifies corrected B104 canonical hash, PUBLIC-CZ result and normalized browser DOM digest without authoritative writes',()=>{
  const browser=findBrowser();
  assert.ok(browser,'v4.6.45 browser discovery requires Chrome/Chromium');
  const candidateRaw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(candidateRaw);
  const candidateSha=sha256(candidateRaw);
  assert.equal(candidateSha,expectedCandidateSha);
  const successorRaw=readFileSync(successorPath,'utf8');
  const successorSha=sha256(successorRaw);
  const lifecycleSourceSha=sha256(readFileSync(lifecycleSourcePath,'utf8'));
  const live=loadCanonicalRunStore({root});
  const phase=exactPhase(live);
  const resultingCanonicalSha=phase==='PRE_EXECUTION'
    ?canonicalDigest(applyStrictPatchToCanonicalData(live.data,candidate))
    :expectedCanonicalSha;
  assert.equal(resultingCanonicalSha,expectedCanonicalSha);
  if(phase==='POST_EXECUTION'){
    const persistedRaw=readFileSync(`${root}/data/runs/${runId}.json`,'utf8');
    assert.equal(sha256(persistedRaw),candidateSha);
    assert.deepEqual(JSON.parse(persistedRaw),candidate);
    assert.equal(sha256(readFileSync(lifecycleSourcePath)),successorSha);
  }

  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4645-b104-cc0-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    if(phase==='PRE_EXECUTION'){
      const authRel=`${root}/.v4645-b104-cc0-discovery-authorization.json`;
      const auth={
        schema_version:'engineer-osint-b104-cc0-discovery-simulation-v1',
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
          schema_version:'engineer-osint-b104-cc0-discovery-simulation-v1',
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
    } else {
      const copied=loadCanonicalRunStore({root:join(temp,root)});
      assert.equal(copied.report.current_run_id,runId);
      assert.equal(copied.report.canonical_sha256,expectedCanonicalSha);
      assert.equal(sha256(readFileSync(join(temp,`${root}/data/runs/${runId}.json`))),candidateSha);
      assert.equal(sha256(readFileSync(join(temp,lifecycleSourcePath))),successorSha);
    }

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

    const distPath=join(temp,'docs/engineer-osint-dist/index.html');
    const mediaJs=readFileSync(join(temp,root,'media-source-materialization.js'),'utf8');
    assert.ok(!/<\/script/i.test(mediaJs),'unsafe literal </script in media source module');
    let html=readFileSync(distPath,'utf8');
    const anchor='<script id="engineer-ui-phase7-media-module">';
    if(!html.includes('engineer-media-source-materialization')){
      const script=`<script id="engineer-media-source-materialization">${mediaJs}</script>`;
      html=html.includes(anchor)?html.replace(anchor,script+anchor):html.replace('</body>',script+'</body>');
      writeFileSync(distPath,html);
    }
    const dom=execFileSync(browser,[
      '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=5000','--dump-dom',`file://${distPath}`
    ],{encoding:'utf8',maxBuffer:32*1024*1024});
    assert.ok(dom.includes('<html'));
    assert.ok(dom.includes('ENGINEER OSINT'));
    const browserDigest=sha256(normalizeDom(dom));
    assert.match(browserDigest,/^[a-f0-9]{64}$/);

    console.log('V4645_B104_CC0_REDISCOVERY',JSON.stringify({
      reviewed_main_sha:reviewedMainSha,
      phase,
      candidate_sha256:candidateSha,
      expected_resulting_canonical_sha256:resultingCanonicalSha,
      lifecycle_source_sha256:lifecycleSourceSha,
      lifecycle_successor_sha256:successorSha,
      normalized_dom_sha256:browserDigest,
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
