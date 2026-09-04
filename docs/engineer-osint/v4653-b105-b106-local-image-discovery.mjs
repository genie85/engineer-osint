import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';
import {canonicalDigest} from './lib/integrity.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(here,'../..');
const root='docs/engineer-osint';
const sourceMainSha='58a2cb5547d9b8292056cddf1fb1cde0d245e8e4';
const parentRun='engineer-osint-20260903-B104';
const parentCanonical='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const acquisitionPath=`${root}/photo-local-acquisitions/v4652-wave3-ready-for-import.json`;
const acquisitionGitBlob='91afbe68fa1247aeab914f062368572987feeb7a';
const b105SourcePath=`${root}/photo-review-batches/v4584.json`;
const b106SourcePath=`${root}/photo-review-batches/v4588.json`;
const b105SourceGitBlob='391b4c21493000576f4136f4dd78b8eb80a6265c';
const b106SourceGitBlob='9bc5162a34a4d43292732c3e603669b28fab4338';
const b105Run='engineer-osint-20260904-B105';
const b106Run='engineer-osint-20260904-B106';
const b105Cards=['ENG-TECH-0014','ENG-TECH-0015','ENG-TECH-0018','ENG-TECH-0019','ENG-TECH-0020'];
const b106Cards=['ENG-TECH-0038','ENG-TECH-0041'];
const allCards=[...b105Cards,...b106Cards];
const visualId=cardId=>`ENG-VIS-LOCAL-${cardId.slice('ENG-TECH-'.length)}`;
const asArray=v=>Array.isArray(v)?v:[];
const sha256=v=>createHash('sha256').update(v).digest('hex');
const gitBlob=v=>createHash('sha1').update(`blob ${Buffer.byteLength(v)}\0`).update(v).digest('hex');
const jsonRaw=value=>JSON.stringify(value,null,2)+'\n';
const read=(path,cwd=repoRoot)=>readFileSync(resolve(cwd,path));
const readJson=(path,cwd=repoRoot)=>JSON.parse(read(path,cwd).toString('utf8'));
const runNode=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024});
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
    const groups=args.at(-1),text=decode(groups.text).trim(),cs=decode(groups.cs).trim(),en=decode(groups.en).trim();
    return [cs.toLocaleLowerCase(),en.toLocaleLowerCase()].includes(text.toLocaleLowerCase())?groups.open+groups.cs+groups.close:whole;
  });
  return s.replace(/\s+/g,' ').trim();
};
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

function recordMap(data){
  return new Map(asArray(data?.records?.records).map(item=>[item.id,item]));
}
function canonicalVisuals(data){
  return asArray(data?.visual_registry?.visuals||data?.dashboard_patch_extras?.visuals);
}
function makeSuccessor(source,cards,acquisitionByCard,acquiredAt){
  const targets=new Set(cards);
  return {
    ...source,
    entries:asArray(source.entries).map(entry=>{
      if(!targets.has(entry.card_id))return structuredClone(entry);
      assert(entry.status==='READY_FOR_IMPORT',`${entry.card_id} source lifecycle is not READY_FOR_IMPORT`);
      const archived=acquisitionByCard.get(entry.card_id);
      assert(archived,`missing acquisition for ${entry.card_id}`);
      const next={
        ...structuredClone(entry),
        status:'LOCAL_IMAGE',
        attribution_requirement:archived.attribution_requirement,
        acquired_at:acquiredAt,
        local_image_path:archived.local_image_path,
        sha256:archived.local_sha256,
        local_acquisition_batch:'v4.6.52'
      };
      delete next.import_blocker;
      return next;
    })
  };
}
function makeCandidate({data,runId,parentRunId,parentCanonicalSha,cards,lifecycleSource,lifecycleSuccessor,windowFrom,windowTo,acquisitionByCard}){
  const records=recordMap(data),visuals=canonicalVisuals(data),usedVisuals=new Set(visuals.map(v=>v.id||v.asset_id));
  const updatedRecords=[],newVisuals=[];
  for(const cardId of cards){
    const record=records.get(cardId),archived=acquisitionByCard.get(cardId),vid=visualId(cardId);
    assert(record,`canonical record missing ${cardId}`);
    assert(archived,`acquisition entry missing ${cardId}`);
    assert(!usedVisuals.has(vid),`visual id already exists: ${vid}`);
    const existingIds=asArray(record.visual_ids);
    assert(!existingIds.includes(vid),`${cardId} already links ${vid}`);
    updatedRecords.push({id:cardId,visual_ids:[...new Set([...existingIds,vid])]});
    const titleEn=record.title_en||record.title||archived.system_name||cardId;
    const titleCs=record.title_cs||record.title||archived.system_name||cardId;
    const visual={
      asset_id:vid,
      id:vid,
      asset_type:'LOCAL_IMAGE',
      title:`${titleEn} — repository-local licensed image`,
      title_cs:`${titleCs} — licencovaný obrázek uložený v repozitáři`,
      related_ids:[cardId],
      local_image_path:archived.local_image_path,
      sha256:archived.local_sha256,
      source_sha256:archived.source_sha256,
      origin_url:archived.origin_url,
      source_title:archived.source_title,
      source_type:archived.source_type,
      author_rightsholder:archived.author_rightsholder,
      license:archived.license,
      license_url:archived.license_url,
      attribution_requirement:archived.attribution_requirement,
      identity_evidence:archived.identity_evidence,
      license_evidence:archived.license_evidence,
      reviewed_at:archived.reviewed_at,
      acquired_at:'2026-09-04',
      modifications:archived.modifications,
      verification_status:'LICENSE_AND_IDENTITY_VERIFIED_LOCAL_BINARY_SHA256_PINNED'
    };
    if(archived.quality_limitation)visual.quality_limitation=archived.quality_limitation;
    newVisuals.push(visual);
  }
  const count=cards.length;
  const candidate={
    schema_version:'engineer-osint-patch-v1',
    state:{
      run_id:runId,parent_run_id:parentRunId,status:'SUCCESS',window_from:windowFrom,window_to:windowTo,
      counts:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:count,NEW:0,UPDATE:count,CONFIRMATION:count,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:count,NEW_MEDIA:0}
    },
    continuity:{
      status:'LOCAL_IMAGE_CANONICAL_LINKAGE_CANDIDATE',
      reviewed_main_sha:sourceMainSha,
      reviewed_parent_canonical_sha256:parentCanonicalSha,
      source_acquisition_batch:'v4.6.52',
      source_acquisition_path:acquisitionPath,
      lifecycle_source_path:lifecycleSource,
      lifecycle_successor_path:lifecycleSuccessor,
      canonical_write_authorized:false,
      canonical_write_performed:false,
      photo_review_status_successor_applied:false,
      scope:`EXACT_${count}_REPOSITORY_LOCAL_LICENSED_IMAGES_ONLY`
    },
    true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:count},
    new_records:[],updated_records:updatedRecords,sources:[],relations:[],evidence:[],visuals:newVisuals,media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
    qa:{status:'PASS',mode:'LOCAL_IMAGE_CANONICAL_LINKAGE_CANDIDATE_DRY_RUN_ONLY',multimedia_status:'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION',local_image_count:count,canonical_write_performed:false,photo_review_status_successor_applied:false,requires_separate_authorization_and_execution:true}
  };
  validatePatchOperations(candidate);
  return candidate;
}
function writeTempJson(temp,path,value){
  const full=resolve(temp,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,jsonRaw(value));return full;
}
function syntheticAuth({temp,candidatePath,candidateRaw,runId,parentRunId,parentCanonicalSha,resultCanonicalSha}){
  const authPath=`${root}/.v4653-${runId.endsWith('B105')?'b105':'b106'}-discovery-authorization.json`;
  const schema=`engineer-osint-v4653-${runId.endsWith('B105')?'b105':'b106'}-discovery-v1`;
  const auth={
    schema_version:schema,status:'READY_FOR_APPEND',candidate_path:candidatePath,candidate_run_id:runId,
    expected_parent_run_id:parentRunId,expected_parent_canonical_sha256:parentCanonicalSha,
    exact_candidate_file_sha256:sha256(candidateRaw),expected_resulting_canonical_sha256:resultCanonicalSha,
    authorized_guard_successor_contract:{guarded_run_id:runId,authorization_path:authPath,schema_version:schema,required_status:'READY_FOR_APPEND',require_exact_candidate_hashes:true,allow_wildcard_or_current_state_acceptance:false},
    authorization:{append_exact_candidate_only:true,standard_append_run_write_required:true,one_run_only:true,isolated_review_branch_required:true,execution_requires_separate_slice:true,allow_manual_manifest_or_hash_edit:false,allow_future_run_same_slice:false,allow_canonical_history_rewrite:false}
  };
  writeTempJson(temp,authPath,auth);return authPath;
}
function runPublicAndBrowser(temp,browser){
  runNode(temp,`${root}/build-pages.mjs`);
  runNode(temp,`${root}/materialize-canonical-media-history.mjs`);
  runNode(temp,`${root}/audit-public-cz-ui-latest.mjs`);
  const ratchet=JSON.parse(runNode(temp,`${root}/validate-public-cz-regression.mjs`));
  assert(ratchet.pass===true,'PUBLIC-CZ regression ratchet failed');
  assert(asArray(ratchet.new_missing_fields).length===0,'PUBLIC-CZ introduced missing fields');
  const distPath=resolve(temp,'docs/engineer-osint-dist/index.html');
  const mediaJs=readFileSync(resolve(temp,root,'media-source-materialization.js'),'utf8');
  assert(!/<\/script/i.test(mediaJs),'unsafe literal </script in media source module');
  let html=readFileSync(distPath,'utf8');
  const anchor='<script id="engineer-ui-phase7-media-module">';
  if(!html.includes('engineer-media-source-materialization')){
    const script=`<script id="engineer-media-source-materialization">${mediaJs}</script>`;
    html=html.includes(anchor)?html.replace(anchor,script+anchor):html.replace('</body>',script+'</body>');
    writeFileSync(distPath,html);
  }
  const dom=execFileSync(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=5000','--dump-dom',`file://${distPath}`],{encoding:'utf8',maxBuffer:64*1024*1024});
  assert(dom.includes('<html'),'headless DOM missing html');
  assert(dom.includes('ENGINEER OSINT'),'headless DOM missing ENGINEER OSINT');
  return {ratchet_status:ratchet.status,new_missing_fields:asArray(ratchet.new_missing_fields).length,normalized_dom_sha256:sha256(normalizeDom(dom))};
}
function localFileEvidence(acquisitionByCard){
  return allCards.map(cardId=>{
    const item=acquisitionByCard.get(cardId);const path=`${root}/${item.local_image_path}`;const raw=read(path);
    assert(sha256(raw)===item.local_sha256,`${cardId} local file SHA mismatch`);
    return {card_id:cardId,path,sha256:item.local_sha256,git_blob_sha:gitBlob(raw),bytes:raw.length,dimensions:item.local_dimensions};
  });
}

if(process.env.GITHUB_SHA)assert(process.env.GITHUB_SHA===sourceMainSha,`discovery branch head must start from exact main ${sourceMainSha}`);
const live=loadCanonicalRunStore({root:resolve(repoRoot,root)});
assert(live.report.current_run_id===parentRun,`unexpected canonical head ${live.report.current_run_id}`);
assert(live.report.canonical_sha256===parentCanonical,`unexpected canonical SHA ${live.report.canonical_sha256}`);
const baseline=JSON.parse(runNode(repoRoot,`${root}/audit-photo-baseline.mjs`));
assert(baseline.cards_with_local_image===12,`pre-discovery local-image baseline ${baseline.cards_with_local_image}`);
assert(baseline.ready_for_import===7,`pre-discovery READY_FOR_IMPORT ${baseline.ready_for_import}`);
assert(baseline.photo_coverage_percent===24,`pre-discovery coverage ${baseline.photo_coverage_percent}`);

const acquisitionRaw=read(acquisitionPath),acquisition=JSON.parse(acquisitionRaw.toString('utf8'));
assert(gitBlob(acquisitionRaw)===acquisitionGitBlob,'v4.6.52 acquisition manifest Git blob drift');
assert(acquisition.batch==='v4.6.52','unexpected acquisition batch');
const acquisitionByCard=new Map(asArray(acquisition.entries).map(item=>[item.card_id,item]));
assert(allCards.every(id=>acquisitionByCard.has(id)),'wave-3 acquisition set incomplete');
for(const id of allCards){
  const item=acquisitionByCard.get(id);assert(item.attribution_requirement,`${id} acquisition attribution missing`);
}
const b105SourceRaw=read(b105SourcePath),b106SourceRaw=read(b106SourcePath);
assert(gitBlob(b105SourceRaw)===b105SourceGitBlob,'v4584 lifecycle source blob drift');
assert(gitBlob(b106SourceRaw)===b106SourceGitBlob,'v4588 lifecycle source blob drift');
const b105Source=JSON.parse(b105SourceRaw.toString('utf8')),b106Source=JSON.parse(b106SourceRaw.toString('utf8'));
assert(JSON.stringify(asArray(b105Source.entries).map(x=>x.card_id))===JSON.stringify(b105Cards),'v4584 card set/order drift');
assert(b105Source.entries.every(x=>x.status==='READY_FOR_IMPORT'),'v4584 not entirely READY_FOR_IMPORT');
const b106Ready=b106Source.entries.filter(x=>x.status==='READY_FOR_IMPORT').map(x=>x.card_id);
assert(JSON.stringify(b106Ready)===JSON.stringify(b106Cards),'v4588 READY_FOR_IMPORT set/order drift');
const mkr=b106Source.entries.find(x=>x.card_id==='ENG-TECH-0042');
assert(mkr?.status==='NOT_FOUND','v4588 MKR-2 terminal state drift');
for(const vid of allCards.map(visualId))assert(!canonicalVisuals(live.data).some(v=>(v.id||v.asset_id)===vid),`prospective visual id already canonical: ${vid}`);

const browser=findBrowser();assert(browser,'v4.6.53 discovery requires Chrome/Chromium');
const b105CandidatePath=`${root}/osint-publication-candidates/v4653-b105-wave3-v4584-local-images-public-cz.json`;
const b105SuccessorPath=`${root}/photo-review-candidates/v4653-b105-v4584-local-image-status.json`;
const b106CandidatePath=`${root}/osint-publication-candidates/v4653-b106-wave3-v4588-local-images-public-cz.json`;
const b106SuccessorPath=`${root}/photo-review-candidates/v4653-b106-v4588-local-image-status.json`;
const b105Successor=makeSuccessor(b105Source,b105Cards,acquisitionByCard,acquisition.acquired_at);
const b106Successor=makeSuccessor(b106Source,b106Cards,acquisitionByCard,acquisition.acquired_at);
assert(JSON.stringify(b106Successor.entries.find(x=>x.card_id==='ENG-TECH-0042'))===JSON.stringify(mkr),'B106 successor altered MKR-2 NOT_FOUND entry');

const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4653-'));
let summary;
try{
  cpSync(resolve(repoRoot,root),resolve(temp,root),{recursive:true});
  const tempStoreB104=loadCanonicalRunStore({root:resolve(temp,root)});
  const b105Candidate=makeCandidate({data:tempStoreB104.data,runId:b105Run,parentRunId:parentRun,parentCanonicalSha:parentCanonical,cards:b105Cards,lifecycleSource:b105SourcePath,lifecycleSuccessor:b105SuccessorPath,windowFrom:'2026-09-04T18:45:01+02:00',windowTo:'2026-09-04T18:45:02+02:00',acquisitionByCard});
  const b105Raw=jsonRaw(b105Candidate);writeTempJson(temp,b105CandidatePath,b105Candidate);writeTempJson(temp,b105SuccessorPath,b105Successor);
  const b105Canonical=canonicalDigest(applyStrictPatchToCanonicalData(tempStoreB104.data,b105Candidate));
  const b105Auth=syntheticAuth({temp,candidatePath:b105CandidatePath,candidateRaw:b105Raw,runId:b105Run,parentRunId:parentRun,parentCanonicalSha:parentCanonical,resultCanonicalSha:b105Canonical});
  const b105Append=JSON.parse(runNode(temp,`${root}/append-run.mjs`,b105CandidatePath,'--write','--authorization',b105Auth));
  assert(b105Append.status==='APPENDED','B105 simulation append failed');
  cpSync(resolve(temp,b105SuccessorPath),resolve(temp,b105SourcePath));
  const photo105=JSON.parse(runNode(temp,`${root}/audit-photo-baseline.mjs`));
  assert(photo105.current_run_id===b105Run&&photo105.canonical_sha256===b105Canonical,'B105 simulated canonical mismatch');
  assert(photo105.cards_with_local_image===17&&photo105.ready_for_import===2&&photo105.photo_coverage_percent===34,'B105 photo baseline mismatch');
  const browser105=runPublicAndBrowser(temp,browser);

  const tempStoreB105=loadCanonicalRunStore({root:resolve(temp,root)});
  const b106Candidate=makeCandidate({data:tempStoreB105.data,runId:b106Run,parentRunId:b105Run,parentCanonicalSha:b105Canonical,cards:b106Cards,lifecycleSource:b106SourcePath,lifecycleSuccessor:b106SuccessorPath,windowFrom:'2026-09-04T18:45:03+02:00',windowTo:'2026-09-04T18:45:04+02:00',acquisitionByCard});
  const b106Raw=jsonRaw(b106Candidate);writeTempJson(temp,b106CandidatePath,b106Candidate);writeTempJson(temp,b106SuccessorPath,b106Successor);
  const b106Canonical=canonicalDigest(applyStrictPatchToCanonicalData(tempStoreB105.data,b106Candidate));
  const b106Auth=syntheticAuth({temp,candidatePath:b106CandidatePath,candidateRaw:b106Raw,runId:b106Run,parentRunId:b105Run,parentCanonicalSha:b105Canonical,resultCanonicalSha:b106Canonical});
  const b106Append=JSON.parse(runNode(temp,`${root}/append-run.mjs`,b106CandidatePath,'--write','--authorization',b106Auth));
  assert(b106Append.status==='APPENDED','B106 simulation append failed');
  cpSync(resolve(temp,b106SuccessorPath),resolve(temp,b106SourcePath));
  const photo106=JSON.parse(runNode(temp,`${root}/audit-photo-baseline.mjs`));
  assert(photo106.current_run_id===b106Run&&photo106.canonical_sha256===b106Canonical,'B106 simulated canonical mismatch');
  assert(photo106.cards_with_local_image===19&&photo106.ready_for_import===0&&photo106.photo_coverage_percent===38,'B106 photo baseline mismatch');
  const browser106=runPublicAndBrowser(temp,browser);

  summary={
    schema_version:'engineer-osint-v4653-b105-b106-local-image-discovery-v1',status:'PASS',discovered_at:'2026-09-04',source_main_sha:sourceMainSha,
    starting_canonical:{run_id:parentRun,canonical_sha256:parentCanonical,photo_baseline:{cards_with_local_image:baseline.cards_with_local_image,ready_for_import:baseline.ready_for_import,photo_coverage_percent:baseline.photo_coverage_percent}},
    acquisition_manifest:{path:acquisitionPath,git_blob_sha:acquisitionGitBlob,sha256:sha256(acquisitionRaw),batch:acquisition.batch},
    local_files:localFileEvidence(acquisitionByCard),
    b105:{run_id:b105Run,parent_run_id:parentRun,parent_canonical_sha256:parentCanonical,candidate_path:b105CandidatePath,candidate_sha256:sha256(b105Raw),candidate_git_blob_sha:gitBlob(Buffer.from(b105Raw)),resulting_canonical_sha256:b105Canonical,card_ids:b105Cards,visual_ids:b105Cards.map(visualId),lifecycle_source_path:b105SourcePath,lifecycle_source_git_blob_sha:b105SourceGitBlob,lifecycle_source_sha256:sha256(b105SourceRaw),lifecycle_successor_path:b105SuccessorPath,lifecycle_successor_sha256:sha256(Buffer.from(jsonRaw(b105Successor))),lifecycle_successor_git_blob_sha:gitBlob(Buffer.from(jsonRaw(b105Successor))),photo_baseline:{cards_with_local_image:17,ready_for_import:2,photo_coverage_percent:34},...browser105},
    b106:{run_id:b106Run,parent_run_id:b105Run,parent_canonical_sha256:b105Canonical,candidate_path:b106CandidatePath,candidate_sha256:sha256(b106Raw),candidate_git_blob_sha:gitBlob(Buffer.from(b106Raw)),resulting_canonical_sha256:b106Canonical,card_ids:b106Cards,visual_ids:b106Cards.map(visualId),lifecycle_source_path:b106SourcePath,lifecycle_source_git_blob_sha:b106SourceGitBlob,lifecycle_source_sha256:sha256(b106SourceRaw),lifecycle_successor_path:b106SuccessorPath,lifecycle_successor_sha256:sha256(Buffer.from(jsonRaw(b106Successor))),lifecycle_successor_git_blob_sha:gitBlob(Buffer.from(jsonRaw(b106Successor))),preserved_terminal_card:{card_id:'ENG-TECH-0042',status:'NOT_FOUND',unchanged:true},photo_baseline:{cards_with_local_image:19,ready_for_import:0,photo_coverage_percent:38},...browser106},
    architecture:{canonical_executor_lifecycle_successor_cardinality:1,recommended_execution_order:['B105','B106'],executor_change_required:false,authoritative_write_performed:false}
  };

  const out=process.env.DISCOVERY_OUT||resolve(repoRoot,'v4653-discovery-out');mkdirSync(out,{recursive:true});
  writeFileSync(resolve(out,'v4653-b105-b106-discovery.json'),jsonRaw(summary));
  writeFileSync(resolve(out,'v4653-b105-candidate.json'),b105Raw);
  writeFileSync(resolve(out,'v4653-b105-lifecycle-successor.json'),jsonRaw(b105Successor));
  writeFileSync(resolve(out,'v4653-b106-candidate.json'),b106Raw);
  writeFileSync(resolve(out,'v4653-b106-lifecycle-successor.json'),jsonRaw(b106Successor));
  process.stdout.write(`V4653_B105_B106_DISCOVERY ${JSON.stringify(summary)}\n`);
} finally {
  rmSync(temp,{recursive:true,force:true});
}
