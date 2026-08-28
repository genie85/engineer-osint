import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {safeInlineJson,validatePublicUrls} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';

const source='docs/engineer-osint',output='docs/engineer-osint-dist';
mkdirSync(output,{recursive:true});

const parts=Array.from({length:9},(_,index)=>
  readFileSync(join(source,`p${String(index+1).padStart(2,'0')}.txt`),'utf8').replace(/[^A-Za-z0-9+/=]/g,'')
);
let html=null;
for(const decode of [()=>Buffer.from(parts.join(''),'base64'),()=>Buffer.concat(parts.map(part=>Buffer.from(part,'base64')))]){
  try{
    const bytes=decode();
    if(bytes[0]===31&&bytes[1]===139){
      const candidate=gunzipSync(bytes).toString('utf8');
      if(/^<!doctype html>/i.test(candidate)){html=candidate;break;}
    }
  }catch{}
}
if(!html)throw new Error('Unable to reconstruct ENGINEER OSINT V3 payload');

const marker='window.__ENGINEER_DATA__=',start=html.indexOf(marker),end=html.indexOf(';</script>',start);
if(start<0||end<0)throw new Error('ENGINEER_DATA marker missing');

const {data,report}=loadCanonicalRunStore({root:source});
data.dashboard_patch_extras=data.dashboard_patch_extras||{};
data.dashboard_patch_extras.patch_continuity=report.status;
data.dashboard_patch_extras.patch_integrity=report;
data.dashboard_materialization={
  ...(data.dashboard_materialization||{}),status:'SUCCESS',continuity:report.status,
  current_run_id:report.current_run_id,patch_run_count:report.run_count,
  append_only_run_count:report.append_only_run_count,
  snapshot_run_id:report.snapshot_run_id,
  patch_run_ids:data.dashboard_patch_extras.patch_history_runs||[]
};
validatePublicUrls(data);
html=html.slice(0,start+marker.length)+safeInlineJson(data)+html.slice(end);

const intelligenceStatus=data.intelligence_materialization?.status==='ACTIVE'?'active':'ready-not-materialized';
const assessmentCount=Array.isArray(data.assessments?.assessments)?data.assessments.assessments.length:0;
const gapCount=Array.isArray(data.intelligence_gaps?.gaps)?data.intelligence_gaps.gaps.length:0;
const contradictionCount=Array.isArray(data.contradictions?.contradictions)?data.contradictions.contradictions.length:0;
const mobile=`<script>(function(){function i(){const s=document.getElementById('sidebar');if(!s)return;let c=document.getElementById('engineerMenuClose');if(!c){c=document.createElement('button');c.id='engineerMenuClose';c.textContent='×';c.style.cssText='position:absolute;top:12px;right:12px;width:40px;height:40px;z-index:9999;font-size:26px';s.appendChild(c)}const shut=()=>s.classList.remove('open');c.onclick=shut;s.querySelectorAll('nav a,nav button').forEach(x=>x.addEventListener('click',shut));document.addEventListener('keydown',e=>e.key==='Escape'&&shut())}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();</script>`;
html=html.replace('</body>',mobile+'</body>');
writeFileSync(join(output,'index.html'),html,'utf8');
writeFileSync(join(output,'health.txt'),`ENGINEER OSINT github-pages
run=${report.current_run_id}
status=SUCCESS
source_attribution=data-enabled
temporal_intelligence=enabled
historical_backfill=enabled
knowledge_graph=data-enabled
evidence_registry=data-enabled
external_source_pool=enabled
run_store=append-only-v1
patch_history_materialization=snapshot-chain
patch_continuity=${report.status}
patch_history_runs=${report.run_count}
append_only_runs=${report.append_only_run_count}
snapshot_run=${report.snapshot_run_id}
legacy_history_status=${report.legacy_status}
legacy_malformed_revisions=${report.malformed_patch_shas.length}
legacy_duplicate_runs=${report.duplicate_run_ids.length}
legacy_parent_gaps=${report.parent_discontinuities.length+(report.external_checkpoint_parent?1:0)}
intelligence_v1_contract=ready
intelligence_v1_status=${intelligenceStatus}
canonical_assessments=${assessmentCount}
canonical_intelligence_gaps=${gapCount}
canonical_contradictions=${contradictionCount}
situation_hubs_v42=enabled
situation_hubs_geo_mode=derived-filter
ui_cleanup_v421=enabled
sidebar_subnav_layout=stacked
ui_polish_v422=enabled
legacy_overview_below_v4=hidden
presentation_fact_overlay_gap=open
presentation_bootstrap_pb_overlay=retired
mobile_menu_fix=enabled
bytes=${Buffer.byteLength(html)}
`,'utf8');
cpSync(join(source,'project'),join(output,'project'),{recursive:true});
writeFileSync(join(output,'.nojekyll'),'','utf8');
execFileSync(process.execPath,[join(source,'postprocess-ui.mjs')],{stdio:'inherit'});
const healthPath=join(output,'health.txt');
let finalHealth=readFileSync(healthPath,'utf8').replace(/^presentation_bootstrap_overlay=retired\n?/gm,'');
if(!finalHealth.includes('presentation_fact_overlay_gap=open'))finalHealth+='presentation_fact_overlay_gap=open\n';
if(!finalHealth.includes('presentation_bootstrap_pb_overlay=retired'))finalHealth+='presentation_bootstrap_pb_overlay=retired\n';
const finalHtml=readFileSync(join(output,'index.html'),'utf8');
finalHealth=finalHealth.replace(/^bytes=.*$/m,`bytes=${Buffer.byteLength(finalHtml)}`);
writeFileSync(healthPath,finalHealth,'utf8');
console.log(`Built canonical ENGINEER OSINT ${report.current_run_id}: ${Buffer.byteLength(finalHtml)} bytes from snapshot + ${report.append_only_run_count} append-only runs`);
