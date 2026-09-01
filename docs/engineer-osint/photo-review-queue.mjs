import {fileURLToPath} from 'node:url';
import {auditPhotoBaseline} from './audit-photo-baseline.mjs';

export function buildPhotoReviewQueue(report){
  if(!report||!Array.isArray(report.items))throw new Error('PHOTO_REVIEW_QUEUE: invalid photo baseline report');
  const items=report.items
    .filter(item=>Array.isArray(item.local_images)&&item.local_images.length===0&&!item.review_status)
    .map(item=>({
      card_id:item.card_id,
      title:item.title,
      remote_visual_count:Number(item.remote_visual_count||0),
      review_priority:Number(item.remote_visual_count||0)>0?'REMOTE_VISUAL_PRESENT':'NO_VISUAL'
    }))
    .sort((a,b)=>{
      const remoteDelta=b.remote_visual_count-a.remote_visual_count;
      if(remoteDelta)return remoteDelta;
      return String(a.card_id).localeCompare(String(b.card_id));
    });
  const withRemote=items.filter(item=>item.remote_visual_count>0).length;
  return {
    schema_version:1,
    scope:'Unassessed ENG-TECH cards without a repository-local image. Cards with existing remote canonical visuals are listed first because their depicted-system identity may be cheaper to verify; remote presence never implies redistribution permission.',
    source_current_run_id:report.current_run_id||null,
    source_canonical_sha256:report.canonical_sha256||null,
    queued_cards:items.length,
    queued_with_remote_visual:withRemote,
    queued_without_visual:items.length-withRemote,
    items
  };
}

export function auditPhotoReviewQueue(options={}){
  return buildPhotoReviewQueue(auditPhotoBaseline(options));
}

const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(invoked)console.log(JSON.stringify(auditPhotoReviewQueue(),null,2));
