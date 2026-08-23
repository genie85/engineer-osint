import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadCanonicalRunStore} from './lib/run-store.mjs';

const source='docs/engineer-osint',outDir='docs/engineer-osint-dist';
mkdirSync(outDir,{recursive:true});
const {data,patches,report:store}=loadCanonicalRunStore({root:source});
const mediaUrlRe=/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|spotify\.com|podcasts\.apple\.com|soundcloud\.com|podbean\.com|buzzsprout\.com|dvidshub\.net\/video|defense\.gov\/Multimedia\/Videos|army\.mil\/video)/i;
const asArray=value=>Array.isArray(value)?value:[];
const walk=(value,path=[],out=[])=>{
  if(value===null||value===undefined)return out;
  if(typeof value==='string'){if(mediaUrlRe.test(value))out.push({path:path.join('.'),value});return out;}
  if(Array.isArray(value)){value.forEach((item,index)=>walk(item,[...path,String(index)],out));return out;}
  if(typeof value==='object')for(const [key,item] of Object.entries(value))walk(item,[...path,key],out);
  return out;
};
const parseRuntime=()=>{
  const html=readFileSync(join(outDir,'index.html'),'utf8'),marker='window.__ENGINEER_DATA__=';
  const start=html.indexOf(marker),end=html.indexOf(';</script>',start);
  if(start<0||end<0)throw new Error('ENGINEER_DATA marker not found');
  const runtime=JSON.parse(html.slice(start+marker.length,end));
  const media=runtime.media_registry?.media||runtime.dashboard_patch_extras?.media||[];
  const sources=runtime.sources?.sources||[],records=runtime.records?.records||[];
  const sourceMedia=sources.filter(item=>mediaUrlRe.test(item.url||item.source_url||'')).map(item=>({...item,related_ids:records.filter(record=>asArray(record.source_ids).includes(item.id)).map(record=>record.id)}));
  return {media_records:media,source_media:sourceMedia,media_url_mentions:walk(runtime)};
};

const canonicalMedia=data.media_registry?.media||data.dashboard_patch_extras?.media||[];
const currentPatch=patches.at(-1)||JSON.parse(readFileSync(join(source,'b11-patch.json'),'utf8'));
const runs=patches.map(patch=>({
  run:patch.state.run_id,declared_new_media:patch.state.counts.NEW_MEDIA,
  materialized_media_items:patch.media.length,worth_watching:asArray(patch.qa?.worth_watching).length,
  worth_listening:asArray(patch.qa?.worth_listening).length,
  multimedia_status:patch.qa?.multimedia_status||patch.qa?.multimedia?.status||null
}));
if(!patches.length)runs.push({
  run:store.snapshot_run_id,declared_new_media:currentPatch.state?.counts?.NEW_MEDIA||0,
  materialized_media_items:canonicalMedia.length,worth_watching:asArray(currentPatch.multimedia?.worth_watching).length,
  worth_listening:asArray(currentPatch.multimedia?.worth_listening).length,
  multimedia_status:currentPatch.multimedia?.status||null,snapshot_baseline:true
});
const anomalies=[];
for(const run of runs){
  if(!run.snapshot_baseline&&run.declared_new_media>0&&run.materialized_media_items===0)anomalies.push({...run,type:'DECLARED_NEW_MEDIA_WITHOUT_MEDIA_ARRAY'});
  if(!run.snapshot_baseline&&run.materialized_media_items>0&&run.declared_new_media===0)anomalies.push({...run,type:'MEDIA_ARRAY_PRESENT_WITH_ZERO_DECLARED_COUNT'});
}
const runtime=parseRuntime(),runtimeMedia=runtime.media_records,runtimeSources=runtime.source_media;
const report={
  generated_at:new Date().toISOString(),storage_mode:'CANONICAL_SNAPSHOT_PLUS_APPEND_ONLY_RUNS',
  snapshot_run_id:store.snapshot_run_id,append_only_runs_scanned:store.append_only_run_count,
  unique_runs_scanned:store.run_count,legacy_history_status:store.legacy_status,parse_errors:[],
  summary:{
    runs_declaring_new_media:runs.filter(run=>run.declared_new_media>0).length,
    declared_new_media_total:runs.reduce((sum,run)=>sum+run.declared_new_media,0),
    runs_with_materialized_media:runs.filter(run=>run.materialized_media_items>0).length,
    canonical_media_records:canonicalMedia.length,worth_watching_items:runs.reduce((sum,run)=>sum+run.worth_watching,0),
    worth_listening_items:runs.reduce((sum,run)=>sum+run.worth_listening,0),
    unique_media_url_mentions:new Set(walk(data).map(item=>item.value)).size,
    runtime_media_records:runtimeMedia.length,runtime_source_media_urls:runtimeSources.length,
    runtime_source_media_linked:runtimeSources.filter(item=>asArray(item.related_ids).length>0).length,
    runtime_unique_media_url_mentions:new Set(runtime.media_url_mentions.map(item=>item.value)).size,anomalies:anomalies.length
  },
  runtime,runs,canonical_media:canonicalMedia,worth_watching:[],worth_listening:[],media_url_mentions:walk(data),anomalies
};
writeFileSync(join(outDir,'media-history-audit.json'),JSON.stringify(report,null,2)+'\n');
const summary=report.summary;
const markdown=['# ENGINEER OSINT canonical media audit','',`Generated: ${report.generated_at}`,`Storage: ${report.storage_mode}`,`Snapshot: ${report.snapshot_run_id}`,`Canonical runs: ${report.unique_runs_scanned} (${report.append_only_runs_scanned} append-only)`,'',`- Canonical media records: **${summary.canonical_media_records}**`,`- Runtime media records: **${summary.runtime_media_records}**`,`- Runtime source media URLs: **${summary.runtime_source_media_urls}**`,`- Runtime source media linked: **${summary.runtime_source_media_linked}**`,`- Structural anomalies after snapshot: **${summary.anomalies}**`,'','## Canonical media','',...(canonicalMedia.length?canonicalMedia.map(item=>`- ${item.media_id||item.id||item.title||item.url||'media item'}`):['- None']),'','## Post-snapshot anomalies','',...(anomalies.length?anomalies.map(item=>`- ${item.run}: ${item.type}`):['- None'])].join('\n');
writeFileSync(join(outDir,'media-history-audit.md'),markdown+'\n');
console.log(JSON.stringify(report.summary));
