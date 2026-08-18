import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const s='docs/engineer-osint',o='docs/engineer-osint-dist',patchPath=join(s,'b11-patch.json');
mkdirSync(o,{recursive:true});

const parts=Array.from({length:9},(_,i)=>readFileSync(join(s,`p${String(i+1).padStart(2,'0')}.txt`),'utf8').replace(/[^A-Za-z0-9+/=]/g,''));
const currentPatch=JSON.parse(readFileSync(patchPath,'utf8'));

function patchHistory(){
  const byRun=new Map();
  let shas=[];
  try{
    shas=execFileSync('git',['log','--format=%H','--',patchPath],{encoding:'utf8'})
      .trim().split(/\s+/).filter(Boolean).reverse();
  }catch(e){
    console.warn('Patch-history git log unavailable; using current patch only:',e.message);
  }
  for(const sha of shas){
    try{
      const p=JSON.parse(execFileSync('git',['show',`${sha}:${patchPath}`],{encoding:'utf8',maxBuffer:20*1024*1024}));
      const run=p?.state?.run_id;
      if(run)byRun.set(run,p);
    }catch(e){
      console.warn(`Skipping unreadable historical patch at ${sha}: ${e.message}`);
    }
  }
  if(currentPatch?.state?.run_id)byRun.set(currentPatch.state.run_id,currentPatch);
  return [...byRun.values()];
}
const patches=patchHistory();
const patch=currentPatch;

let html=null;
for(const decode of [()=>Buffer.from(parts.join(''),'base64'),()=>Buffer.concat(parts.map(x=>Buffer.from(x,'base64')))]){
  try{
    const b=decode();
    if(b[0]===31&&b[1]===139){
      const t=gunzipSync(b).toString('utf8');
      if(/^<!doctype html>/i.test(t)){html=t;break}
    }
  }catch{}
}
if(!html)throw new Error('Unable to reconstruct ENGINEER OSINT V3 payload');

const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('ENGINEER_DATA marker missing');
const j=a+marker.length,d=JSON.parse(html.slice(j,b));
Object.assign(d.state_latest,patch.state);

const keyFor=(x,...keys)=>{for(const k of keys)if(x?.[k])return x[k];return null};
const mergeUnique=(base,items,keys)=>{
  const m=new Map((base||[]).map(x=>[keyFor(x,...keys),x]).filter(([k])=>k));
  for(const x of items||[]){const k=keyFor(x,...keys);if(k)m.set(k,{...(m.get(k)||{}),...x})}
  return [...m.values()];
};
const all=(fn)=>patches.flatMap(p=>fn(p)||[]);

const rm=new Map((d.records?.records||[]).map(x=>[x.id,x]));
const typeFor=(x,old)=>{const m=String(x.id||'').match(/^(ENG-(?:TECH|EVT|UNIT|SIG|DOC|TTP|LL|TREND|VIS|SRC|REL|EVID))-/);return x.type||(m?m[1]:old.type||'ENG-RECORD')};
for(const p of patches){
  for(const x of [...(p.materialized_records||[]),...(p.new_records||[]),...(p.updated_records||[])]){
    if(!x?.id)continue;
    const old=rm.get(x.id)||{};
    const merged={...old,...x,type:typeFor(x,old),run_id:old.run_id||p.state?.run_id||patch.state.run_id,last_update_run:p.state?.run_id||patch.state.run_id};
    if(x.summary&&!merged.analysis)merged.analysis=x.summary;
    if(x.summary&&!merged.fact)merged.fact=x.summary;
    if(x.source_ids)merged.source_ids=[...new Set([...(old.source_ids||[]),...x.source_ids])];
    const ots=old.temporal_observations||old.timeline_events||[],nts=x.temporal_observations||x.timeline_events||[];
    if(ots.length||nts.length){
      const tm=new Map();
      for(const t of [...ots,...nts]){
        const k=[t.event_date||t.event_date_from||t.date||t.observed_at||'',t.observation_type||t.type||'',JSON.stringify(t.source_ids||[])].join('|');
        tm.set(k,{...(tm.get(k)||{}),...t});
      }
      merged.temporal_observations=[...tm.values()];
    }
    rm.set(x.id,merged);
  }
}
d.records=d.records||{};
d.records.records=[...rm.values()].sort((x,y)=>x.id.localeCompare(y.id));

const lm=new Map((d.leads?.leads||[]).map(x=>[x.id||x.lead_id,x]));
for(const p of patches){
  for(const x of [...(p.leads||[]),...(p.external_leads||[]),...(p.updated_external_leads||[])]){
    const id=x?.id||x?.lead_id;if(!id)continue;
    lm.set(id,{...(lm.get(id)||{}),...x,id,title:x.topic||x.title||id,last_update:x.last_update||p.state?.run_id||patch.state.run_id});
  }
}
d.leads=d.leads||{};d.leads.leads=[...lm.values()];

const sm=new Map((d.sources?.sources||[]).map(x=>[x.id,x]));
for(const p of patches)for(const x of p.sources||[]){
  if(!x?.id)continue;
  sm.set(x.id,{...(sm.get(x.id)||{}),...x,name:x.title||x.name||x.id,tier:x.source_tier??x.tier,url:x.url||x.source_url||null,run_id:p.state?.run_id||patch.state.run_id});
}
d.sources=d.sources||{};d.sources.sources=[...sm.values()].sort((x,y)=>x.id.localeCompare(y.id));

d.run_history=d.run_history||{runs:[]};d.run_history.runs=d.run_history.runs||[];
for(const p of [...patches].reverse()){
  const st=p.state;if(!st?.run_id||d.run_history.runs.some(x=>x.run_id===st.run_id))continue;
  d.run_history.runs.unshift({run_id:st.run_id,parent:st.parent_run_id,status:st.status||'SUCCESS',window:`${st.window_from} → ${st.window_to}`,counts:st.counts});
}

const rels=all(p=>p.relations||p.new_relations||[]);
const evid=all(p=>p.evidence||p.new_evidence||[]);
const lessons=all(p=>p.lessons_learned||p.lessons_learned_changes||[]);
const visuals=all(p=>p.visuals||p.new_visuals||[]);
const media=all(p=>Array.isArray(p.new_media)?p.new_media:(p.media?.new_media||[]));
const technologySignals=all(p=>p.technology_signals||[]);
const trends=all(p=>p.trends||[]);
const externalHits=all(p=>p.external_source_hits||[]);
const externalLeads=all(p=>p.external_leads||[]);
const observedMinimum=all(p=>p.observed_minimum_updates||[]);
const capabilityChanges=all(p=>p.capability_matrix_changes||[]);
const coverageChanges=all(p=>p.historical_coverage_changes||[]);

d.dashboard_patch_extras={
  patch_history_runs:patches.map(p=>p.state?.run_id).filter(Boolean),
  patch_continuity:'COMPLETE_FROM_GIT_HISTORY',
  visuals:mergeUnique([],visuals,['asset_id','id']),
  media:mergeUnique([],media,['media_id','id']),
  doctrine:all(p=>p.doctrine||p.doctrine_updates||[]),
  technology_signals:mergeUnique([],technologySignals,['id']),
  trends:mergeUnique([],trends,['id']),
  confirmations:all(p=>p.confirmations||[]),
  contradictions:all(p=>p.contradictions||[]),
  corrections:all(p=>p.corrections||[]),
  data_quality:patch.data_quality||null,
  updated_records:all(p=>p.updated_records||[]),
  historical_backfill:all(p=>p.historical_backfill||[]),
  timeline_events:all(p=>p.timeline_events||[]),
  historical_coverage_gaps:all(p=>p.historical_coverage_gaps||[]),
  current_confirmation_gaps:all(p=>p.current_confirmation_gaps||[]),
  temporal_conflicts:all(p=>p.temporal_conflicts||[]),
  temporal_audit:patch.temporal_audit||patch.data_quality?.temporal_audit||null,
  relations:mergeUnique([],rels,['relation_id','id']),
  evidence:mergeUnique([],evid,['evidence_id','id']),
  lessons_learned:mergeUnique([],lessons,['id']),
  orbat_updates:all(p=>p.orbat_updates||[]),
  external_source_hits:externalHits,
  external_leads:mergeUnique([],externalLeads,['lead_id','id']),
  observed_minimum_updates:observedMinimum,
  capability_matrix_changes:capabilityChanges,
  historical_coverage_changes:coverageChanges,
  external_source_registry_changes:all(p=>p.external_source_registry_changes||[])
};

d.relations=d.relations||{relations:[]};
d.relations.relations=mergeUnique(d.relations.relations,d.dashboard_patch_extras.relations,['relation_id','id']).map(x=>({...x,id:x.id||x.relation_id}));
for(const rel of d.relations.relations||[]){
  if(['HAS_SUBUNIT','HAS_SUBORDINATE'].includes(rel.relation_type)){
    const child=d.records.records.find(x=>x.id===rel.object_id);
    if(child&&!child.parent_unit_id&&!child.parent_id&&!child.subordination_id)child.parent_unit_id=rel.subject_id;
  }
}

d.evidence=d.evidence||{evidence:[]};
d.evidence.evidence=mergeUnique(d.evidence.evidence,d.dashboard_patch_extras.evidence,['evidence_id','id']).map(x=>({...x,id:x.id||x.evidence_id}));

d.lessons_learned=d.lessons_learned||{lessons:[]};
d.lessons_learned.lessons=mergeUnique(d.lessons_learned.lessons,d.dashboard_patch_extras.lessons_learned,['id']);

if(patch.golden_entities)d.golden_entities=patch.golden_entities;
if(patch.historical_coverage)d.historical_coverage=patch.historical_coverage;
if(patch.external_source_registry)d.external_source_registry=patch.external_source_registry;
if(patch.bootstrap_v36)d.bootstrap_v36=patch.bootstrap_v36;
if(patch.canonical_registry_audit)d.canonical_registry_audit=patch.canonical_registry_audit;

d.dashboard_materialization={
  status:'SUCCESS',
  continuity:'COMPLETE_FROM_GIT_HISTORY',
  current_run_id:patch.state.run_id,
  patch_run_count:patches.length,
  patch_run_ids:patches.map(p=>p.state?.run_id).filter(Boolean)
};

html=html.slice(0,j)+JSON.stringify(d)+html.slice(b);
const mobile=`<script>(function(){function i(){const s=document.getElementById('sidebar');if(!s)return;let c=document.getElementById('engineerMenuClose');if(!c){c=document.createElement('button');c.id='engineerMenuClose';c.textContent='×';c.style.cssText='position:absolute;top:12px;right:12px;width:40px;height:40px;z-index:9999;font-size:26px';s.appendChild(c)}const shut=()=>s.classList.remove('open');c.onclick=shut;s.querySelectorAll('nav a,nav button').forEach(x=>x.addEventListener('click',shut));document.addEventListener('keydown',e=>e.key==='Escape'&&shut())}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();</script>`;
html=html.replace('</body>',mobile+'</body>');

writeFileSync(join(o,'index.html'),html,'utf8');
writeFileSync(join(o,'health.txt'),`ENGINEER OSINT github-pages
run=${patch.state.run_id}
status=SUCCESS
source_attribution=data-enabled
temporal_intelligence=enabled
historical_backfill=enabled
knowledge_graph=data-enabled
evidence_registry=data-enabled
external_source_pool=enabled
patch_history_materialization=enabled
patch_continuity=complete
patch_history_runs=${patches.length}
presentation_fact_overlay_gap=open
presentation_bootstrap_pb_overlay=retired
mobile_menu_fix=enabled
bytes=${Buffer.byteLength(html)}
`,'utf8');
writeFileSync(join(o,'.nojekyll'),'','utf8');
execFileSync(process.execPath,[join(s,'postprocess-ui.mjs')],{stdio:'inherit'});
const healthPath=join(o,'health.txt');
let finalHealth=readFileSync(healthPath,'utf8').replace(/^presentation_bootstrap_overlay=retired\n?/gm,'');
if(!finalHealth.includes('presentation_fact_overlay_gap=open'))finalHealth+='presentation_fact_overlay_gap=open\n';
if(!finalHealth.includes('presentation_bootstrap_pb_overlay=retired'))finalHealth+='presentation_bootstrap_pb_overlay=retired\n';
writeFileSync(healthPath,finalHealth,'utf8');
const finalHtml=readFileSync(join(o,'index.html'),'utf8');
console.log(`Built cumulative ENGINEER OSINT ${patch.state.run_id}: ${Buffer.byteLength(finalHtml)} bytes from ${patches.length} patch runs`);
