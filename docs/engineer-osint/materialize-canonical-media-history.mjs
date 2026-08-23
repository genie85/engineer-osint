import {readFileSync,writeFileSync} from 'node:fs';
import {parseJsonStrict,safeInlineJson,validatePublicUrls} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';

const source='docs/engineer-osint',htmlPath='docs/engineer-osint-dist/index.html';
const {data:canonical,report}=loadCanonicalRunStore({root:source});
let html=readFileSync(htmlPath,'utf8');
const marker='window.__ENGINEER_DATA__=',start=html.indexOf(marker),end=html.indexOf(';</script>',start);
if(start<0||end<0)throw new Error('ENGINEER_DATA marker not found in built HTML');
const data=parseJsonStrict(html.slice(start+marker.length,end),{source:'built ENGINEER_DATA for media materialization'});
const media=canonical.media_registry?.media||canonical.dashboard_patch_extras?.media||[];
data.media_registry=data.media_registry||{};
data.media_registry.media=structuredClone(media);
data.dashboard_patch_extras=data.dashboard_patch_extras||{};
data.dashboard_patch_extras.media=structuredClone(media);
data.media_materialization={
  status:'SUCCESS',mode:'CANONICAL_SNAPSHOT_PLUS_APPEND_ONLY_RUNS',
  current_run_id:report.current_run_id,snapshot_run_id:report.snapshot_run_id,
  append_only_runs_scanned:report.append_only_run_count,
  legacy_history_status:report.legacy_status,canonical_media_records:media.length
};
validatePublicUrls(data);
html=html.slice(0,start+marker.length)+safeInlineJson(data)+html.slice(end);
writeFileSync(htmlPath,html,'utf8');
console.log(JSON.stringify(data.media_materialization));
