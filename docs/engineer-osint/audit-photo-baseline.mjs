import {existsSync,lstatSync,readFileSync} from 'node:fs';
import {join,normalize,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCanonicalRunStore} from './lib/run-store.mjs';

const ROOT='docs/engineer-osint';
const STATUS_PATH=join(ROOT,'photo-review-status.json');
const IMAGE_EXT=/\.(?:avif|webp|png|jpe?g)$/i;
const SHA256_RE=/^[a-f0-9]{64}$/;
const REVIEW_STATUSES=new Set(['SOURCE_FOUND','LICENSE_VERIFIED','IDENTITY_VERIFIED','READY_FOR_IMPORT','LICENSE_BLOCKED','NOT_FOUND','LOCAL_IMAGE']);
const TERMINAL_NEGATIVE_STATUSES=new Set(['LICENSE_BLOCKED','NOT_FOUND']);
const asArray=v=>Array.isArray(v)?v:(v?[v]:[]);

function related(visual,id){
  return asArray(visual.related_ids||visual.related_id||visual.entity_ids||visual.record_ids).includes(id)||asArray(visual.related).includes(id);
}
function visualUrl(visual){
  return visual.local_image_path||visual.thumbnail_url||visual.direct_image_url||visual.image_url||visual.media_url||visual.preview_url||'';
}
export function resolveLocalImagePath(value,{root=ROOT}={}){
  let raw=String(value||'').trim();
  if(!raw||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw))return null;
  raw=raw.split(/[?#]/,1)[0].replace(/\\/g,'/');
  if(raw.startsWith('/engineer-osint/'))raw=raw.slice('/engineer-osint/'.length);
  else if(raw.startsWith('/'))raw=raw.slice(1);
  if(raw.startsWith('docs/engineer-osint/'))raw=raw.slice('docs/engineer-osint/'.length);
  if(!IMAGE_EXT.test(raw))return null;
  const base=normalize(root),candidate=normalize(join(base,raw));
  const rel=relative(base,candidate);
  if(!rel||rel==='..'||rel.startsWith(`..${sep}`))return null;
  if(!existsSync(candidate))return null;
  const stat=lstatSync(candidate);
  if(!stat.isFile()||stat.isSymbolicLink())return null;
  return candidate;
}
function visualsFor(record,visuals){
  const ids=new Set([...asArray(record.visual_ids),...asArray(record.gallery_visual_ids),record.hero_visual_id].filter(Boolean));
  return visuals.filter(v=>ids.has(v.id||v.asset_id)||related(v,record.id));
}
export function validatePhotoReviewRegistry(registry){
  if(!registry||![1,2].includes(registry.schema_version)||!Array.isArray(registry.entries))throw new Error('PHOTO_BASELINE: invalid photo-review-status registry');
  const seen=new Set();
  for(const entry of registry.entries){
    if(!entry||!/^ENG-TECH-\d+$/.test(entry.card_id||''))throw new Error('PHOTO_BASELINE: invalid card_id in photo-review-status registry');
    if(!REVIEW_STATUSES.has(entry.status))throw new Error(`PHOTO_BASELINE: unsupported review status ${entry.status}`);
    if(seen.has(entry.card_id))throw new Error(`PHOTO_BASELINE: duplicate photo-review status for ${entry.card_id}`);
    if(entry.status==='READY_FOR_IMPORT'){
      for(const field of ['origin_url','source_title','author_rightsholder','license','license_url','identity_evidence','license_evidence','reviewed_at']){
        if(!String(entry[field]||'').trim())throw new Error(`PHOTO_BASELINE: READY_FOR_IMPORT ${entry.card_id} missing ${field}`);
      }
      if(!/^https:\/\//i.test(entry.origin_url)||!/^https:\/\//i.test(entry.license_url))throw new Error(`PHOTO_BASELINE: READY_FOR_IMPORT ${entry.card_id} requires HTTPS origin/license URLs`);
    }
    if(entry.status==='LOCAL_IMAGE'){
      for(const field of ['origin_url','source_title','author_rightsholder','license','license_url','identity_evidence','license_evidence','reviewed_at','acquired_at','local_image_path','sha256']){
        if(!String(entry[field]||'').trim())throw new Error(`PHOTO_BASELINE: LOCAL_IMAGE ${entry.card_id} missing ${field}`);
      }
      if(!/^https:\/\//i.test(entry.origin_url)||!/^https:\/\//i.test(entry.license_url))throw new Error(`PHOTO_BASELINE: LOCAL_IMAGE ${entry.card_id} requires HTTPS origin/license URLs`);
      if(!SHA256_RE.test(String(entry.sha256||'')))throw new Error(`PHOTO_BASELINE: LOCAL_IMAGE ${entry.card_id} requires lowercase SHA-256`);
      if(!IMAGE_EXT.test(String(entry.local_image_path||'').split(/[?#]/,1)[0]))throw new Error(`PHOTO_BASELINE: LOCAL_IMAGE ${entry.card_id} requires a supported local image path`);
    }
    if(TERMINAL_NEGATIVE_STATUSES.has(entry.status)&&!String(entry.disposition_evidence||'').trim()){
      throw new Error(`PHOTO_BASELINE: ${entry.status} ${entry.card_id} requires disposition_evidence`);
    }
    seen.add(entry.card_id);
  }
  return registry;
}
function loadStatuses(path=STATUS_PATH){
  return validatePhotoReviewRegistry(JSON.parse(readFileSync(path,'utf8')));
}
export function buildPhotoBaseline({data,statusRegistry,root=ROOT}={}){
  const records=asArray(data?.records?.records).filter(r=>/^ENG-TECH-\d+$/.test(r.id||''));
  const visuals=asArray(data?.visual_registry?.visuals||data?.visuals?.visuals||data?.visuals);
  const statusEntries=new Map(asArray(statusRegistry?.entries).map(x=>[x.card_id,x]));
  const items=records.map(record=>{
    const linked=visualsFor(record,visuals);
    const local=linked.map(v=>({visual_id:v.id||v.asset_id||null,path:resolveLocalImagePath(visualUrl(v),{root})})).filter(x=>x.path);
    const remote=linked.filter(v=>/^https?:\/\//i.test(String(visualUrl(v))));
    const review=statusEntries.get(record.id)||null;
    const review_status=review?.status||null;
    if(local.length&&review_status&&review_status!=='LOCAL_IMAGE')throw new Error(`PHOTO_BASELINE: ${record.id} has a local image but remains ${review_status}`);
    if(!local.length&&review_status==='LOCAL_IMAGE')throw new Error(`PHOTO_BASELINE: ${record.id} claims LOCAL_IMAGE without a linked local image`);
    if(local.length&&review_status==='LOCAL_IMAGE'){
      const declared=resolveLocalImagePath(review.local_image_path,{root});
      if(!declared||!local.some(image=>normalize(image.path)===normalize(declared)))throw new Error(`PHOTO_BASELINE: ${record.id} LOCAL_IMAGE metadata does not match a linked local image`);
    }
    return {card_id:record.id,title:record.title_cs||record.title||record.title_en||record.id,local_images:local,remote_visual_count:remote.length,review_status,review_batch:review?.review_batch||null};
  });
  const withLocal=items.filter(x=>x.local_images.length>0).length;
  const without=items.length-withLocal;
  const countStatus=status=>items.filter(x=>x.review_status===status).length;
  const licenseBlocked=countStatus('LICENSE_BLOCKED');
  const notFound=countStatus('NOT_FOUND');
  const sourceFound=countStatus('SOURCE_FOUND');
  const licenseVerified=countStatus('LICENSE_VERIFIED');
  const identityVerified=countStatus('IDENTITY_VERIFIED');
  const readyForImport=countStatus('READY_FOR_IMPORT');
  const reviewedWithoutLocal=items.filter(x=>!x.local_images.length&&x.review_status).length;
  const unassessed=items.filter(x=>!x.local_images.length&&!x.review_status).length;
  return {
    schema_version:2,
    scope:'ENG-TECH technical cards; local image means an existing regular non-symlink AVIF/WebP/PNG/JPEG file inside docs/engineer-osint referenced by a linked canonical visual. Research lifecycle states do not count as local coverage.',
    total_cards:items.length,
    cards_with_local_image:withLocal,
    cards_without_image:without,
    source_found:sourceFound,
    license_verified:licenseVerified,
    identity_verified:identityVerified,
    ready_for_import:readyForImport,
    license_blocked:licenseBlocked,
    not_found:notFound,
    reviewed_without_local_image:reviewedWithoutLocal,
    unassessed,
    remaining_unassessed:unassessed,
    cards_with_remote_visual_but_no_local_image:items.filter(x=>!x.local_images.length&&x.remote_visual_count>0).length,
    photo_coverage_percent:items.length?Number((withLocal*100/items.length).toFixed(2)):0,
    items
  };
}
export function auditPhotoBaseline({root=ROOT,statusPath=STATUS_PATH}={}){
  const {data,report}=loadCanonicalRunStore({root});
  const result=buildPhotoBaseline({data,statusRegistry:loadStatuses(statusPath),root});
  return {...result,current_run_id:report.current_run_id,canonical_sha256:report.canonical_sha256};
}

const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(invoked){
  const report=auditPhotoBaseline();
  console.log(JSON.stringify(report,null,2));
}
