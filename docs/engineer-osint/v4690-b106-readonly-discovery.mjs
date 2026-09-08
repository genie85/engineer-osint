import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';
import {canonicalDigest} from './lib/integrity.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(here,'../..');
const root='docs/engineer-osint';
const sourceMainSha='4b34bde2e3f19005c3d3394534c9b46054a547f4';
const parentRun='engineer-osint-20260904-B105';
const parentCanonical='a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9';
const runId='engineer-osint-20260904-B106';
const acquisitionPath=`${root}/photo-local-acquisitions/v4652-wave3-ready-for-import.json`;
const acquisitionGitBlob='91afbe68fa1247aeab914f062368572987feeb7a';
const lifecycleSourcePath=`${root}/photo-review-batches/v4588.json`;
const lifecycleSourceGitBlob='9bc5162a34a4d43292732c3e603669b28fab4338';
const candidatePath=`${root}/osint-publication-candidates/v4690-b106-wave3-v4588-local-images-public-cz.json`;
const lifecycleSuccessorPath=`${root}/photo-review-candidates/v4690-b106-v4588-local-image-status.json`;
const cards=['ENG-TECH-0038','ENG-TECH-0041'];
const visualId=cardId=>`ENG-VIS-LOCAL-${cardId.slice('ENG-TECH-'.length)}`;
const asArray=v=>Array.isArray(v)?v:[];
const sha256=v=>createHash('sha256').update(v).digest('hex');
const gitBlob=v=>createHash('sha1').update(`blob ${Buffer.byteLength(v)}\0`).update(v).digest('hex');
const jsonRaw=value=>JSON.stringify(value,null,2)+'\n';
const read=(path,cwd=repoRoot)=>readFileSync(resolve(cwd,path));
const runNode=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
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
function recordMap(data){return new Map(asArray(data?.records?.records).map(item=>[item.id,item]));}
function canonicalVisuals(data){return asArray(data?.visual_registry?.visuals||data?.dashboard_patch_extras?.visuals);}
function makeSuccessor(source,acquisitionByCard,acquiredAt){
  const targets=new Set(cards);
  return {...source,entries:asArray(source.entries).map(entry=>{
    if(!targets.has(entry.card_id))return structuredClone(entry);
    assert(entry.status==='READY_FOR_IMPORT',`${entry.card_id} source lifecycle is not READY_FOR_IMPORT`);
    const archived=acquisitionByCard.get(entry.card_id);assert(archived,`missing acquisition for ${entry.card_id}`);
    const next={...structuredClone(entry),status:'LOCAL_IMAGE',attribution_requirement:archived.attribution_requirement,acquired_at:acquiredAt,local_image_path:archived.local_image_path,sha256:archived.local_sha256,local_acquisition_batch:'v4.6.52'};
    delete next.import_blocker;return next;
  })};
}
function makeCandidate(data,acquisitionByCard){
  const records=recordMap(data),visuals=canonicalVisuals(data),usedVisuals=new Set(visuals.map(v=>v.id||v.asset_id));
  const updatedRecords=[],newVisuals=[];
  for(const cardId of cards){
    const record=records.get(cardId),archived=acquisitionByCard.get(cardId),vid=visualId(cardId);
    assert(record,`canonical record missing ${cardId}`);assert(archived,`acquisition entry missing ${cardId}`);assert(!usedVisuals.has(vid),`visual id already exists ${vid}`);
    const existingIds=asArray(record.visual_ids);assert(!existingIds.includes(vid),`${cardId} already links ${vid}`);
    updatedRecords.push({id:cardId,visual_ids:[...new Set([...existingIds,vid])]});
    const titleEn=record.title_en||record.title||archived.system_name||cardId;
    const titleCs=record.title_cs||record.title||archived.system_name||cardId;
    const visual={asset_id:vid,id:vid,asset_type:'LOCAL_IMAGE',title:`${titleEn} — repository-local licensed image`,title_cs:`${titleCs} — licencovaný obrázek uložený v repozitáři`,related_ids:[cardId],local_image_path:archived.local_image_path,sha256:archived.local_sha256,source_sha256:archived.source_sha256,origin_url:archived.origin_url,source_title:archived.source_title,source_type:archived.source_type,author_rightsholder:archived.author_rightsholder,license:archived.license,license_url:archived.license_url,attribution_requirement:archived.attribution_requirement,identity_evidence:archived.identity_evidence,license_evidence:archived.license_evidence,reviewed_at:archived.reviewed_at,acquired_at:'2026-09-04',modifications:archived.modifications,verification_status:'LICENSE_AND_IDENTITY_VERIFIED_LOCAL_BINARY_SHA256_PINNED'};
    if(archived.quality_limitation)visual.quality_limitation=archived.quality_limitation;newVisuals.push(visual);
  }
  const count=cards.length;
  const candidate={schema_version:'engineer-osint-patch-v1',state:{run_id:runId,parent_run_id:parentRun,status:'SUCCESS',window_from:'2026-09-04T18:45:03+02:00',window_to:'2026-09-04T18:45:04+02:00',counts:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:count,NEW:0,UPDATE:count,CONFIRMATION:count,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:count,NEW_MEDIA:0}},continuity:{status:'LOCAL_IMAGE_CANONICAL_LINKAGE_CANDIDATE',reviewed_main_sha:sourceMainSha,reviewed_parent_canonical_sha256:parentCanonical,source_acquisition_batch:'v4.6.52',source_acquisition_path:acquisitionPath,lifecycle_source_path:lifecycleSourcePath,lifecycle_successor_path:lifecycleSuccessorPath,canonical_write_authorized:false,canonical_write_performed:false,photo_review_status_successor_applied:false,scope:'EXACT_2_REPOSITORY_LOCAL_LICENSED_IMAGES_ONLY'},true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:count},new_records:[],updated_records:updatedRecords,sources:[],relations:[],evidence:[],visuals:newVisuals,media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],qa:{status:'PASS',mode:'LOCAL_IMAGE_CANONICAL_LINKAGE_CANDIDATE_DRY_RUN_ONLY',multimedia_status:'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION',local_image_count:count,canonical_write_performed:false,photo_review_status_successor_applied:false,requires_separate_authorization_and_execution:true}};
  validatePatchOperations(candidate);return candidate;
}
function syntheticAuth(temp,candidateRaw,resultCanonicalSha){
  const authPath=`${root}/.v4690-b106-discovery-authorization.json`;
  const schema='engineer-osint-v4690-b106-discovery-v1';
  const auth={schema_version:schema,status:'READY_FOR_APPEND',candidate_path:candidatePath,candidate_run_id:runId,expected_parent_run_id:parentRun,expected_parent_canonical_sha256:parentCanonical,exact_candidate_file_sha256:sha256(candidateRaw),expected_resulting_canonical_sha256:resultCanonicalSha,authorized_guard_successor_contract:{guarded_run_id:runId,authorization_path:authPath,schema_version:schema,required_status:'READY_FOR_APPEND',require_exact_candidate_hashes:true,allow_wildcard_or_current_state_acceptance:false},authorization:{append_exact_candidate_only:true,standard_append_run_write_required:true,one_run_only:true,isolated_review_branch_required:true,execution_requires_separate_slice:true,allow_manual_manifest_or_hash_edit:false,allow_future_run_same_slice:false,allow_canonical_history_rewrite:false}};
  const full=resolve(temp,authPath);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,jsonRaw(auth));return authPath;
}
function runPublicAndBrowser(temp,browser){
  runNode(temp,`${root}/build-pages.mjs`);runNode(temp,`${root}/materialize-canonical-media-history.mjs`);runNode(temp,`${root}/audit-public-cz-ui-latest.mjs`);
  const ratchet=JSON.parse(runNode(temp,`${root}/validate-public-cz-regression.mjs`));assert(ratchet.pass===true,'PUBLIC-CZ regression ratchet failed');assert(asArray(ratchet.new_missing_fields).length===0,'PUBLIC-CZ introduced missing fields');
  const distPath=resolve(temp,'docs/engineer-osint-dist/index.html');const mediaJs=readFileSync(resolve(temp,root,'media-source-materialization.js'),'utf8');assert(!/<\/script/i.test(mediaJs),'unsafe literal </script in media source module');let html=readFileSync(distPath,'utf8');const anchor='<script id="engineer-ui-phase7-media-module">';
  if(!html.includes('engineer-media-source-materialization')){const script=`<script id="engineer-media-source-materialization">${mediaJs}</script>`;html=html.includes(anchor)?html.replace(anchor,script+anchor):html.replace('</body>',script+'</body>');writeFileSync(distPath,html);}
  const dom=execFileSync(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=5000','--dump-dom',`file://${distPath}`],{encoding:'utf8',maxBuffer:64*1024*1024});assert(dom.includes('<html'),'headless DOM missing html');assert(dom.includes('ENGINEER OSINT'),'headless DOM missing ENGINEER OSINT');
  return {ratchet_status:ratchet.status,new_missing_fields:asArray(ratchet.new_missing_fields).length,normalized_dom_sha256:sha256(normalizeDom(dom))};
}

const live=loadCanonicalRunStore({root:resolve(repoRoot,root)});assert(live.report.current_run_id===parentRun,`unexpected canonical head ${live.report.current_run_id}`);assert(live.report.canonical_sha256===parentCanonical,`unexpected canonical SHA ${live.report.canonical_sha256}`);
const baseline=JSON.parse(runNode(repoRoot,`${root}/audit-photo-baseline.mjs`));assert(baseline.cards_with_local_image===17,`unexpected LOCAL_IMAGE baseline ${baseline.cards_with_local_image}`);assert(baseline.ready_for_import===2,`unexpected READY_FOR_IMPORT baseline ${baseline.ready_for_import}`);assert(baseline.photo_coverage_percent===34,`unexpected coverage ${baseline.photo_coverage_percent}`);
const acquisitionRaw=read(acquisitionPath),acquisition=JSON.parse(acquisitionRaw.toString('utf8'));assert(gitBlob(acquisitionRaw)===acquisitionGitBlob,'acquisition Git blob drift');const acquisitionByCard=new Map(asArray(acquisition.entries).map(item=>[item.card_id,item]));for(const id of cards){const item=acquisitionByCard.get(id);assert(item?.attribution_requirement,`${id} acquisition incomplete`);const local=read(`${root}/${item.local_image_path}`);assert(sha256(local)===item.local_sha256,`${id} local SHA mismatch`);}
const sourceRaw=read(lifecycleSourcePath),source=JSON.parse(sourceRaw.toString('utf8'));assert(gitBlob(sourceRaw)===lifecycleSourceGitBlob,'v4588 source blob drift');const ready=source.entries.filter(x=>x.status==='READY_FOR_IMPORT').map(x=>x.card_id);assert(JSON.stringify(ready)===JSON.stringify(cards),'v4588 READY_FOR_IMPORT set/order drift');const terminal=source.entries.find(x=>x.card_id==='ENG-TECH-0042');assert(terminal?.status==='NOT_FOUND','MKR-2 terminal state drift');
const successor=makeSuccessor(source,acquisitionByCard,acquisition.acquired_at);assert(JSON.stringify(successor.entries.find(x=>x.card_id==='ENG-TECH-0042'))===JSON.stringify(terminal),'successor altered MKR-2');const successorRaw=jsonRaw(successor);
const candidate=makeCandidate(live.data,acquisitionByCard),candidateRaw=jsonRaw(candidate),resultCanonical=canonicalDigest(applyStrictPatchToCanonicalData(live.data,candidate));
const browser=findBrowser();assert(browser,'B106 discovery requires Chrome/Chromium');const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4690-'));
try{
  cpSync(resolve(repoRoot,root),resolve(temp,root),{recursive:true});
  const candidateFull=resolve(temp,candidatePath),successorFull=resolve(temp,lifecycleSuccessorPath);mkdirSync(dirname(candidateFull),{recursive:true});mkdirSync(dirname(successorFull),{recursive:true});writeFileSync(candidateFull,candidateRaw);writeFileSync(successorFull,successorRaw);
  const authPath=syntheticAuth(temp,candidateRaw,resultCanonical);const appended=JSON.parse(runNode(temp,`${root}/append-run.mjs`,candidatePath,'--write','--authorization',authPath));assert(appended.status==='APPENDED','B106 simulation append failed');cpSync(successorFull,resolve(temp,lifecycleSourcePath));
  const photo=JSON.parse(runNode(temp,`${root}/audit-photo-baseline.mjs`));assert(photo.current_run_id===runId&&photo.canonical_sha256===resultCanonical,'B106 simulated canonical mismatch');assert(photo.cards_with_local_image===19&&photo.ready_for_import===0&&photo.photo_coverage_percent===38,'B106 resulting photo baseline mismatch');const browserResult=runPublicAndBrowser(temp,browser);
  const summary={schema_version:'engineer-osint-v4690-b106-readonly-discovery-v1',status:'PASS',source_main_sha:sourceMainSha,parent_run_id:parentRun,parent_canonical_sha256:parentCanonical,candidate_path:candidatePath,candidate_sha256:sha256(candidateRaw),candidate_git_blob_sha:gitBlob(Buffer.from(candidateRaw)),resulting_canonical_sha256:resultCanonical,lifecycle_source_path:lifecycleSourcePath,lifecycle_source_git_blob_sha:lifecycleSourceGitBlob,lifecycle_successor_path:lifecycleSuccessorPath,lifecycle_successor_sha256:sha256(Buffer.from(successorRaw)),lifecycle_successor_git_blob_sha:gitBlob(Buffer.from(successorRaw)),preserved_terminal_card:{card_id:'ENG-TECH-0042',status:'NOT_FOUND',unchanged:true},photo_baseline:{cards_with_local_image:19,ready_for_import:0,photo_coverage_percent:38},...browserResult,repository_write_performed:false};
  process.stdout.write(`V4690_B106_DISCOVERY ${JSON.stringify(summary)}\n`);process.stdout.write(`V4690_B106_CANDIDATE_BASE64 ${Buffer.from(candidateRaw).toString('base64')}\n`);process.stdout.write(`V4690_B106_SUCCESSOR_BASE64 ${Buffer.from(successorRaw).toString('base64')}\n`);
} finally {rmSync(temp,{recursive:true,force:true});}
