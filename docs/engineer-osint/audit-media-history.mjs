import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const repoPath='docs/engineer-osint/b11-patch.json';
const outDir='docs/engineer-osint-dist';
mkdirSync(outDir,{recursive:true});

const mediaUrlRe=/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|spotify\.com|podcasts\.apple\.com|soundcloud\.com|podbean\.com|buzzsprout\.com|dvidshub\.net\/video|defense\.gov\/Multimedia\/Videos|army\.mil\/video)/i;
const mediaHintRe=/(youtube|podcast|audio|video|webinar|webcast|interview|livestream|media)/i;

function asArray(v){return Array.isArray(v)?v:[]}
function mediaArrays(p){
  const direct=[];
  direct.push(...asArray(p.new_media));
  if(Array.isArray(p.media)) direct.push(...p.media);
  else if(p.media&&typeof p.media==='object') direct.push(...asArray(p.media.new_media),...asArray(p.media.items));
  if(p.multimedia&&typeof p.multimedia==='object') direct.push(...asArray(p.multimedia.new_media),...asArray(p.multimedia.items));
  return direct;
}
function walk(v,path=[],out=[]){
  if(v===null||v===undefined)return out;
  if(typeof v==='string'){
    if(mediaUrlRe.test(v)||mediaHintRe.test(v)&&/^https?:\/\//i.test(v))out.push({path:path.join('.'),value:v});
    return out;
  }
  if(Array.isArray(v)){v.forEach((x,i)=>walk(x,[...path,String(i)],out));return out}
  if(typeof v==='object')for(const [k,x] of Object.entries(v))walk(x,[...path,k],out);
  return out;
}
function keyMedia(x){return x?.media_id||x?.id||x?.url||x?.source_url||JSON.stringify(x)}

let shas=[];
try{
  shas=execFileSync('git',['log','--format=%H','--all','--',repoPath],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean).reverse();
}catch(e){
  console.error('Unable to enumerate b11-patch history:',e.message);process.exit(2);
}

const byRun=new Map();
const parseErrors=[];
for(const sha of shas){
  try{
    const raw=execFileSync('git',['show',`${sha}:${repoPath}`],{encoding:'utf8',maxBuffer:50*1024*1024});
    const p=JSON.parse(raw);const run=p?.state?.run_id||`UNKNOWN@${sha.slice(0,8)}`;
    byRun.set(run,{sha,patch:p});
  }catch(e){parseErrors.push({sha,error:e.message})}
}

const canonicalMedia=new Map();
const worthWatching=[];const worthListening=[];const mediaMentions=[];const runs=[];const anomalies=[];
for(const [run,{sha,patch:p}] of byRun){
  const arr=mediaArrays(p);
  for(const m of arr)canonicalMedia.set(keyMedia(m),{run,sha,...m});
  const ww=asArray(p.multimedia?.worth_watching);const wl=asArray(p.multimedia?.worth_listening);
  ww.forEach(x=>worthWatching.push({run,sha,item:x}));wl.forEach(x=>worthListening.push({run,sha,item:x}));
  const mentions=walk(p).map(x=>({run,sha,...x}));mediaMentions.push(...mentions);
  const declared=Number(p?.state?.counts?.NEW_MEDIA??p?.counts?.NEW_MEDIA??0)||0;
  if(declared>0&&arr.length===0)anomalies.push({run,sha,type:'DECLARED_NEW_MEDIA_WITHOUT_MEDIA_ARRAY',declared});
  if(arr.length>0&&declared===0)anomalies.push({run,sha,type:'MEDIA_ARRAY_PRESENT_WITH_ZERO_DECLARED_COUNT',array_count:arr.length});
  runs.push({run,sha,declared_new_media:declared,materialized_media_items:arr.length,worth_watching:ww.length,worth_listening:wl.length,media_url_mentions:mentions.length,multimedia_status:p.multimedia?.status||null});
}
const uniqueMentions=[];const seenMentions=new Set();
for(const m of mediaMentions){const k=m.value;if(seenMentions.has(k))continue;seenMentions.add(k);uniqueMentions.push(m)}

const report={
  generated_at:new Date().toISOString(),
  patch_history_path:repoPath,
  commits_scanned:shas.length,
  unique_runs_scanned:byRun.size,
  parse_errors:parseErrors,
  summary:{
    runs_declaring_new_media:runs.filter(x=>x.declared_new_media>0).length,
    declared_new_media_total:runs.reduce((a,x)=>a+x.declared_new_media,0),
    runs_with_materialized_media:runs.filter(x=>x.materialized_media_items>0).length,
    canonical_media_records:canonicalMedia.size,
    worth_watching_items:worthWatching.length,
    worth_listening_items:worthListening.length,
    unique_media_url_mentions:uniqueMentions.length,
    anomalies:anomalies.length
  },
  runs:runs.filter(x=>x.declared_new_media||x.materialized_media_items||x.worth_watching||x.worth_listening||x.media_url_mentions),
  canonical_media:[...canonicalMedia.values()],
  worth_watching:worthWatching,
  worth_listening:worthListening,
  media_url_mentions:uniqueMentions,
  anomalies
};
writeFileSync(join(outDir,'media-history-audit.json'),JSON.stringify(report,null,2));
const s=report.summary;
const md=[
  '# ENGINEER OSINT media history audit','',
  `Generated: ${report.generated_at}`,
  `Commits scanned: ${report.commits_scanned}`,
  `Unique patch runs scanned: ${report.unique_runs_scanned}`,'',
  `- Runs declaring NEW_MEDIA > 0: **${s.runs_declaring_new_media}**`,
  `- Declared NEW_MEDIA total: **${s.declared_new_media_total}**`,
  `- Runs with materialized media arrays: **${s.runs_with_materialized_media}**`,
  `- Unique materialized media records: **${s.canonical_media_records}**`,
  `- worth_watching items: **${s.worth_watching_items}**`,
  `- worth_listening items: **${s.worth_listening_items}**`,
  `- Unique media URL mentions anywhere in patches: **${s.unique_media_url_mentions}**`,
  `- Structural anomalies: **${s.anomalies}**`,'',
  '## Runs with media-related content','',
  ...report.runs.map(x=>`- ${x.run}: NEW_MEDIA=${x.declared_new_media}, materialized=${x.materialized_media_items}, watch=${x.worth_watching}, listen=${x.worth_listening}, URL mentions=${x.media_url_mentions}`),
  '', '## Materialized media', '',
  ...(report.canonical_media.length?report.canonical_media.map(x=>`- ${x.run}: ${x.media_id||x.id||x.title||x.url||'media item'}`):['- None']),
  '', '## worth_watching', '',
  ...(worthWatching.length?worthWatching.map(x=>`- ${x.run}: ${typeof x.item==='string'?x.item:JSON.stringify(x.item)}`):['- None']),
  '', '## worth_listening', '',
  ...(worthListening.length?worthListening.map(x=>`- ${x.run}: ${typeof x.item==='string'?x.item:JSON.stringify(x.item)}`):['- None']),
  '', '## Unique media URL mentions', '',
  ...(uniqueMentions.length?uniqueMentions.map(x=>`- ${x.run} · ${x.path}: ${x.value}`):['- None']),
  '', '## Anomalies', '',
  ...(anomalies.length?anomalies.map(x=>`- ${x.run}: ${x.type}`):['- None'])
].join('\n');
writeFileSync(join(outDir,'media-history-audit.md'),md);
console.log(JSON.stringify(report.summary));
