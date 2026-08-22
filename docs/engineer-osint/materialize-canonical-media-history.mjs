import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';

const patchPath='docs/engineer-osint/b11-patch.json';
const htmlPath='docs/engineer-osint-dist/index.html';
const marker='window.__ENGINEER_DATA__=';

function asArray(v){return Array.isArray(v)?v:[]}
function mediaFromPatch(p){
  const out=[];
  out.push(...asArray(p?.new_media));
  if(Array.isArray(p?.media)) out.push(...p.media);
  else if(p?.media&&typeof p.media==='object') out.push(...asArray(p.media.new_media),...asArray(p.media.items),...asArray(p.media.media));
  if(p?.multimedia&&typeof p.multimedia==='object') out.push(...asArray(p.multimedia.new_media),...asArray(p.multimedia.items),...asArray(p.multimedia.media));
  return out;
}
function key(x){return x?.media_id||x?.id||x?.exact_url||x?.url||x?.source_url||null}
function merge(base,items){
  const m=new Map();
  for(const x of [...base,...items]){
    const k=key(x);if(!k)continue;
    m.set(k,{...(m.get(k)||{}),...x});
  }
  return [...m.values()];
}

const currentPatch=JSON.parse(readFileSync(patchPath,'utf8'));
let shas=[];
try{
  shas=execFileSync('git',['log','--format=%H','--',patchPath],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean).reverse();
}catch(e){
  throw new Error(`Unable to enumerate full patch history: ${e.message}`);
}
const byRun=new Map();
const skippedHistoricalPatches=[];
for(const sha of shas){
  try{
    const p=JSON.parse(execFileSync('git',['show',`${sha}:${patchPath}`],{encoding:'utf8',maxBuffer:50*1024*1024}));
    const run=p?.state?.run_id||sha;
    byRun.set(run,p);
  }catch(e){
    skippedHistoricalPatches.push({sha,error:e.message});
    console.warn(`Skipping unreadable historical patch at ${sha}: ${e.message}`);
  }
}
if(currentPatch?.state?.run_id)byRun.set(currentPatch.state.run_id,currentPatch);

const historicalMap=new Map();
let historicalOccurrences=0;
for(const [run,p] of byRun){
  for(const x of mediaFromPatch(p)){
    const k=key(x);if(!k)continue;
    historicalOccurrences++;
    const old=historicalMap.get(k)||{};
    historicalMap.set(k,{...old,...x,first_seen_run:old.first_seen_run||x?.first_seen_run||run,last_update_run:run});
  }
}
const historical=[...historicalMap.values()];

let html=readFileSync(htmlPath,'utf8');
const a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('ENGINEER_DATA marker not found in built HTML');
const D=JSON.parse(html.slice(a+marker.length,b));
const existing=[
  ...asArray(D.media_registry?.media),
  ...asArray(D.media_registry?.items),
  ...asArray(D.media?.media),
  ...asArray(D.media?.items),
  ...(Array.isArray(D.media)?D.media:[]),
  ...asArray(D.dashboard_patch_extras?.media)
];
const merged=merge(existing,historical);
D.media_registry=D.media_registry||{};
D.media_registry.media=merged;
D.dashboard_patch_extras=D.dashboard_patch_extras||{};
D.dashboard_patch_extras.media=merged;
D.media_materialization={
  status:'SUCCESS',
  mode:'FULL_GIT_HISTORY_CANONICAL_MEDIA',
  current_run_id:currentPatch?.state?.run_id||null,
  patch_runs_scanned:byRun.size,
  skipped_historical_patches:skippedHistoricalPatches.length,
  skipped_historical_patch_shas:skippedHistoricalPatches.map(x=>x.sha),
  historical_media_occurrences:historicalOccurrences,
  historical_unique_media_records:historical.length,
  canonical_media_records:merged.length
};
html=html.slice(0,a+marker.length)+JSON.stringify(D)+html.slice(b);
writeFileSync(htmlPath,html,'utf8');
console.log(JSON.stringify(D.media_materialization));
