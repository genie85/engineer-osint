import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {canonicalDigest,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';
import {buildPhotoBaseline,validatePhotoReviewRegistry} from './audit-photo-baseline.mjs';

const ROOT='docs/engineer-osint';
const REVIEWED_MAIN='b0477596edef24a0c20ce7b07438a10c7dc436de';
const RUN_ID='engineer-osint-20260902-B103';
const CANDIDATE_PATH=join(ROOT,'osint-publication-candidates/v4603-b103-local-images.json');
const STATUS_SUCCESSOR_PATH=join(ROOT,'photo-review-candidates/v4603-b103-local-image-status.json');
const REPORT_PATH=join(ROOT,'V4603_B103_LOCAL_IMAGE_CANDIDATE_READINESS.json');
const ACQUISITION_PATH=join(ROOT,'photo-local-acquisitions/v4601-ready-for-import.json');
const STATUS_PATH=join(ROOT,'photo-review-status.json');
const EXPECTED_IDS=['ENG-TECH-0003','ENG-TECH-0004','ENG-TECH-0005','ENG-TECH-0006','ENG-TECH-0016','ENG-TECH-0017','ENG-TECH-0022','ENG-TECH-0028','ENG-TECH-0029'];
const sha256Buffer=value=>createHash('sha256').update(value).digest('hex');
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const writeJson=(path,value)=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(value,null,2)+'\n')};
const asArray=value=>Array.isArray(value)?value:[];

const store=loadCanonicalRunStore({root:ROOT});
if(store.report.current_run_id!=='engineer-osint-20260902-B102')throw new Error(`B103 requires B102 parent, got ${store.report.current_run_id}`);
if(store.report.canonical_sha256!=='5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91')throw new Error(`B103 parent canonical drift: ${store.report.canonical_sha256}`);
const acquisitions=readJson(ACQUISITION_PATH);
const selected=asArray(acquisitions.entries).filter(item=>EXPECTED_IDS.includes(item.card_id)).sort((a,b)=>a.card_id.localeCompare(b.card_id));
if(JSON.stringify(selected.map(item=>item.card_id))!==JSON.stringify(EXPECTED_IDS))throw new Error('Acquisition manifest does not contain the exact nine-card B103 scope');
const currentStatus=validatePhotoReviewRegistry(readJson(STATUS_PATH));
const records=asArray(store.data.records?.records);
const visuals=asArray(store.data.visual_registry?.visuals);
const visualIds=new Set(visuals.map(item=>item.asset_id||item.id).filter(Boolean));
const statusById=new Map(currentStatus.entries.map(item=>[item.card_id,item]));
const updatedRecords=[];
const newVisuals=[];
const successorEntries=currentStatus.entries.map(item=>structuredClone(item));
const successorById=new Map(successorEntries.map(item=>[item.card_id,item]));
const localFiles=[];
for(const acquisition of selected){
  const review=statusById.get(acquisition.card_id);
  if(!review||review.status!=='READY_FOR_IMPORT')throw new Error(`${acquisition.card_id} must remain READY_FOR_IMPORT before B103`);
  for(const field of ['origin_url','author_rightsholder','license','license_url','identity_evidence','license_evidence']){
    if(String(review[field]||'')!==String(acquisition[field]||''))throw new Error(`${acquisition.card_id} provenance drift in ${field}`);
  }
  const filePath=join(ROOT,acquisition.local_image_path);
  if(!existsSync(filePath))throw new Error(`${acquisition.card_id} local file missing: ${acquisition.local_image_path}`);
  const bytes=readFileSync(filePath),actualSha=sha256Buffer(bytes);
  if(actualSha!==acquisition.sha256)throw new Error(`${acquisition.card_id} local SHA-256 mismatch`);
  const record=records.find(item=>item.id===acquisition.card_id);
  if(!record)throw new Error(`${acquisition.card_id} canonical record missing`);
  const visualId=`ENG-VIS-LOCAL-${acquisition.card_id.slice('ENG-TECH-'.length)}`;
  if(visualIds.has(visualId))throw new Error(`${visualId} already exists before B103`);
  const priorVisualIds=asArray(record.visual_ids);
  if(priorVisualIds.includes(visualId))throw new Error(`${acquisition.card_id} already links ${visualId}`);
  updatedRecords.push({id:acquisition.card_id,visual_ids:[...priorVisualIds,visualId]});
  newVisuals.push({
    asset_id:visualId,
    id:visualId,
    asset_type:'LOCAL_IMAGE',
    title:`${acquisition.system_name} — repository-local licensed image`,
    related_ids:[acquisition.card_id],
    local_image_path:acquisition.local_image_path,
    sha256:acquisition.sha256,
    origin_url:acquisition.origin_url,
    source_title:acquisition.source_title,
    source_type:acquisition.source_type,
    author_rightsholder:acquisition.author_rightsholder,
    license:acquisition.license,
    license_url:acquisition.license_url,
    attribution_requirement:acquisition.attribution_requirement||null,
    identity_evidence:acquisition.identity_evidence,
    license_evidence:acquisition.license_evidence,
    reviewed_at:review.reviewed_at,
    acquired_at:acquisition.acquired_at,
    verification_status:'LICENSE_AND_IDENTITY_VERIFIED_LOCAL_BINARY_SHA256_PINNED'
  });
  const successor=successorById.get(acquisition.card_id);
  successor.status='LOCAL_IMAGE';
  successor.acquired_at=acquisition.acquired_at;
  successor.local_image_path=acquisition.local_image_path;
  successor.sha256=acquisition.sha256;
  successor.local_acquisition_batch=acquisitions.batch;
  delete successor.import_blocker;
  localFiles.push({
    card_id:acquisition.card_id,
    local_image_path:acquisition.local_image_path,
    sha256:acquisition.sha256,
    git_blob_sha:execFileSync('git',['hash-object',filePath],{encoding:'utf8'}).trim()
  });
}
const patch={
  schema_version:'engineer-osint-patch-v1',
  state:{
    run_id:RUN_ID,parent_run_id:store.report.current_run_id,status:'SUCCESS',
    window_from:'2026-09-02T16:00:01+02:00',window_to:'2026-09-02T16:00:02+02:00',
    counts:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:9,NEW:0,UPDATE:9,CONFIRMATION:9,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:9,NEW_MEDIA:0}
  },
  continuity:{
    status:'LOCAL_IMAGE_CANONICAL_LINKAGE_CANDIDATE',
    reviewed_main_sha:REVIEWED_MAIN,
    reviewed_parent_canonical_sha256:store.report.canonical_sha256,
    source_acquisition_batch:acquisitions.batch,
    source_acquisition_path:'docs/engineer-osint/photo-local-acquisitions/v4601-ready-for-import.json',
    canonical_write_authorized:false,
    canonical_write_performed:false,
    photo_review_status_successor_applied:false,
    scope:'EXACT_NINE_REPOSITORY_LOCAL_LICENSED_IMAGES_ONLY'
  },
  true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:9},
  new_records:[],updated_records:updatedRecords,sources:[],relations:[],evidence:[],visuals:newVisuals,media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{
    status:'PASS',
    mode:'LOCAL_IMAGE_CANONICAL_LINKAGE_CANDIDATE_DRY_RUN_ONLY',
    multimedia_status:'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION',
    local_image_count:9,
    canonical_write_performed:false,
    photo_review_status_successor_applied:false,
    requires_separate_authorization_and_execution:true
  }
};
writeJson(CANDIDATE_PATH,patch);
const statusSuccessor={...currentStatus,interpretation:`${currentStatus.interpretation} B103 successor records repository-local binary acquisition only after exact canonical visual linkage is separately authorized and executed.`,entries:successorEntries};
validatePhotoReviewRegistry(statusSuccessor);
writeJson(STATUS_SUCCESSOR_PATH,statusSuccessor);
const materialized=applyStrictPatchToCanonicalData(store.data,patch);
const expectedCanonical=canonicalDigest(materialized);
const baseline=buildPhotoBaseline({data:materialized,statusRegistry:statusSuccessor,root:ROOT});
if(baseline.cards_with_local_image!==9||baseline.ready_for_import!==0)throw new Error(`Unexpected B103 photo baseline ${JSON.stringify({cards_with_local_image:baseline.cards_with_local_image,ready_for_import:baseline.ready_for_import})}`);
const dryRun=JSON.parse(execFileSync(process.execPath,[join(ROOT,'append-run.mjs'),CANDIDATE_PATH],{encoding:'utf8'}));
if(dryRun.status!=='VALIDATED_DRY_RUN'||dryRun.entry.run_id!==RUN_ID||dryRun.entry.canonical_sha256!==expectedCanonical)throw new Error('Standard append-run dry-run does not match deterministic B103 result');
const candidateRaw=readFileSync(CANDIDATE_PATH,'utf8'),successorRaw=readFileSync(STATUS_SUCCESSOR_PATH,'utf8');
const report={
  schema_version:'engineer-osint-b103-local-image-candidate-readiness-v1',
  status:'READY_FOR_EXACT_REVIEW',
  reviewed_main_sha:REVIEWED_MAIN,
  parent_run_id:store.report.current_run_id,
  parent_canonical_sha256:store.report.canonical_sha256,
  candidate_run_id:RUN_ID,
  candidate_path:'docs/engineer-osint/osint-publication-candidates/v4603-b103-local-images.json',
  candidate_file_sha256:sha256Text(candidateRaw),
  expected_resulting_canonical_sha256:expectedCanonical,
  status_successor_path:'docs/engineer-osint/photo-review-candidates/v4603-b103-local-image-status.json',
  status_successor_sha256:sha256Text(successorRaw),
  source_photo_review_status_sha256:sha256Text(readFileSync(STATUS_PATH,'utf8')),
  source_acquisition_manifest_sha256:sha256Text(readFileSync(ACQUISITION_PATH,'utf8')),
  expected_card_ids:EXPECTED_IDS,
  expected_visual_ids:newVisuals.map(item=>item.asset_id),
  expected_updated_record_count:updatedRecords.length,
  expected_new_visual_count:newVisuals.length,
  expected_new_media_count:0,
  resulting_photo_baseline:{cards_with_local_image:baseline.cards_with_local_image,ready_for_import:baseline.ready_for_import,photo_coverage_percent:baseline.photo_coverage_percent},
  local_files:localFiles,
  execution_state:{canonical_write_performed:false,run_file_created:false,manifest_updated:false,photo_review_status_successor_applied:false},
  authorization_required:true
};
writeJson(REPORT_PATH,report);
console.log(JSON.stringify(report,null,2));
