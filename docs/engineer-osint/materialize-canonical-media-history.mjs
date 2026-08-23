import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadValidatedPatchHistory,mergeIdentified,parseJsonStrict,safeInlineJson,validatePublicUrls} from './lib/integrity.mjs';

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
function merge(base,items){
  return mergeIdentified(base,items,{keys:['media_id','id','exact_url','url','source_url'],kind:'media history',legacyIdPrefix:'ENG-MEDIA-LEGACY'});
}

const history=loadValidatedPatchHistory({patchPath,manifestPath:join('docs/engineer-osint','history-integrity-baseline.json')});
const patches=history.patches,currentPatch=patches.at(-1);

const historicalMap=new Map();
let historicalOccurrences=0;
for(const p of patches){
  const run=p.state.run_id;
  for(const x of mediaFromPatch(p)){
    const k=x?.media_id||x?.id||x?.exact_url||x?.url||x?.source_url;if(!k)continue;
    historicalOccurrences++;
    const old=historicalMap.get(k)||{};
    historicalMap.set(k,{...old,...x,first_seen_run:old.first_seen_run||x?.first_seen_run||run,last_update_run:run});
  }
}
const historical=[...historicalMap.values()];

let html=readFileSync(htmlPath,'utf8');
const a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('ENGINEER_DATA marker not found in built HTML');
const D=parseJsonStrict(html.slice(a+marker.length,b),{source:'built ENGINEER_DATA for media materialization'});
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
  patch_runs_scanned:patches.length,
  history_integrity_status:history.report.status,
  skipped_historical_patches:history.report.malformed_patch_shas.length,
  skipped_historical_patch_shas:history.report.malformed_patch_shas,
  historical_media_occurrences:historicalOccurrences,
  historical_unique_media_records:historical.length,
  canonical_media_records:merged.length
};
validatePublicUrls(D);
html=html.slice(0,a+marker.length)+safeInlineJson(D)+html.slice(b);
writeFileSync(htmlPath,html,'utf8');
console.log(JSON.stringify(D.media_materialization));
