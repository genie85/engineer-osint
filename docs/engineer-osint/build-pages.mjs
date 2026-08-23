import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {itemKey,loadValidatedPatchHistory,mergeIdentified,safeInlineJson,validatePublicUrls,validateStrictMaterialization} from './lib/integrity.mjs';

const s='docs/engineer-osint',o='docs/engineer-osint-dist',patchPath=join(s,'b11-patch.json');
mkdirSync(o,{recursive:true});

const parts=Array.from({length:9},(_,i)=>readFileSync(join(s,`p${String(i+1).padStart(2,'0')}.txt`),'utf8').replace(/[^A-Za-z0-9+/=]/g,''));
const history=loadValidatedPatchHistory({patchPath,manifestPath:join(s,'history-integrity-baseline.json')});
const patches=history.patches;
const patch=patches.at(-1);

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
const baseRelations=structuredClone(d.relations?.relations||[]);
const baseEvidence=structuredClone(d.evidence?.evidence||[]);
const baseVisuals=structuredClone(d.dashboard_patch_extras?.visuals||[]);
const baseMedia=structuredClone(d.dashboard_patch_extras?.media||[]);
Object.assign(d.state_latest,patch.state);

const mergeUnique=(base,items,keys,kind,legacyIdPrefix=null)=>mergeIdentified(base,items,{keys,kind,legacyIdPrefix});
const all=(fn)=>patches.flatMap(p=>fn(p)||[]);

const rm=new Map((d.records?.records||[]).map(x=>[x.id,x]));
let recordIdsBeforeCurrent=[];
const typeFor=(x,old)=>{const m=String(x.id||'').match(/^(ENG-(?:TECH|EVT|UNIT|SIG|DOC|TTP|LL|TREND|VIS|SRC|REL|EVID))-/);return x.type||(m?m[1]:old.type||'ENG-RECORD')};
for(const p of patches){
  if(p===patches.at(-1))recordIdsBeforeCurrent=[...rm.keys()];
  for(const x of [...(p.materialized_records||[]),...(p.new_records||[]),...(p.updated_records||[])]){
    if(!x?.id)continue;
    const old=rm.get(x.id)||{};
    const merged={...old,...x,type:typeFor(x,old),run_id:old.run_id||p.state?.run_id||patch.state.run_id,last_update_run:p.state?.run_id||patch.state.run_id};
    if(!merged.title&&merged.title_en)merged.title=merged.title_en;
    if(!merged.summary&&merged.summary_en)merged.summary=merged.summary_en;
    if(merged.summary&&!merged.analysis)merged.analysis=merged.summary;
    if(merged.summary&&!merged.fact)merged.fact=merged.summary;
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
  const normalizedLeads=mergeIdentified([], [...(p.leads||[]),...(p.external_leads||[]),...(p.updated_external_leads||[]),...(p.lead_updates||[])],{
    keys:['id','lead_id','external_id'],kind:'leads',legacyIdPrefix:'ENG-LEAD-LEGACY'
  });
  for(const x of normalizedLeads){
    const id=x?.id||x?.lead_id;if(!id)continue;
    lm.set(id,{...(lm.get(id)||{}),...x,id,title:x.topic||x.title||id,last_update:x.last_update||p.state?.run_id||patch.state.run_id});
  }
}
d.leads=d.leads||{};d.leads.leads=[...lm.values()];

const sm=new Map((d.sources?.sources||[]).map(x=>[x.id,x]));
let sourceIdsBeforeCurrent=[];
for(const p of patches){
  if(p===patches.at(-1))sourceIdsBeforeCurrent=[...sm.keys()];
  for(const x of p.sources||[]){
    if(!x?.id)continue;
    sm.set(x.id,{...(sm.get(x.id)||{}),...x,name:x.title||x.name||x.id,tier:x.source_tier??x.tier,url:x.url||x.source_url||null,run_id:p.state?.run_id||patch.state.run_id});
  }
}
d.sources=d.sources||{};d.sources.sources=[...sm.values()].sort((x,y)=>x.id.localeCompare(y.id));

d.run_history=d.run_history||{runs:[]};d.run_history.runs=d.run_history.runs||[];
for(const p of [...patches].reverse()){
  const st=p.state;if(!st?.run_id||d.run_history.runs.some(x=>x.run_id===st.run_id))continue;
  d.run_history.runs.unshift({run_id:st.run_id,parent:st.parent_run_id,status:st.status||'SUCCESS',window:`${st.window_from} → ${st.window_to}`,counts:st.counts});
}

/* Historical patch aliases are concatenated, not selected with ||. Empty arrays are
   valid values and must not hide a populated legacy/new_* alias from the same run. */
const rels=all(p=>[...(p.relations||[]),...(p.new_relations||[]),...(p.updated_relations||[])]);
const evid=all(p=>[...(p.evidence||[]),...(p.new_evidence||[]),...(p.updated_evidence||[])]);
const lessons=all(p=>[...(p.lessons_learned||[]),...(p.lessons_learned_changes||[])]);
const visuals=all(p=>[...(p.visuals||[]),...(p.new_visuals||[])]);
const media=all(p=>[
  ...(Array.isArray(p.new_media)?p.new_media:[]),
  ...(Array.isArray(p.media)?p.media:[]),
  ...(p.media?.new_media||[]),...(p.media?.items||[]),...(p.media?.media||[]),
  ...(p.multimedia?.media||[])
]);
const technologySignals=all(p=>p.technology_signals||[]);
const trends=all(p=>[...(p.trends||[]),...(p.trend_watch||[])]);
const doctrineItems=all(p=>[...(p.doctrine||[]),...(p.doctrine_updates||[])]);
const externalHits=all(p=>p.external_source_hits||[]);
const externalLeads=all(p=>[...(p.external_leads||[]),...(p.updated_external_leads||[]),...(p.lead_updates||[])]);
const observedMinimum=all(p=>p.observed_minimum_updates||p.observed_minimum||[]);
const capabilityChanges=all(p=>p.capability_matrix_changes||[]);
const coverageChanges=all(p=>p.historical_coverage_changes||[]);
const priorPatches=patches.slice(0,-1),priorAll=fn=>priorPatches.flatMap(p=>fn(p)||[]);
const idsOf=(items,keys)=>new Set((items||[]).map(item=>itemKey(item,keys)).filter(Boolean));
const relationIdsBeforeCurrent=idsOf(mergeUnique(baseRelations,priorAll(p=>[...(p.relations||[]),...(p.new_relations||[]),...(p.updated_relations||[])]),['relation_id','id'],'relations','ENG-REL-LEGACY'),['relation_id','id']);
const evidenceIdsBeforeCurrent=idsOf(mergeUnique(baseEvidence,priorAll(p=>[...(p.evidence||[]),...(p.new_evidence||[]),...(p.updated_evidence||[])]),['evidence_id','id'],'evidence','ENG-EVID-LEGACY'),['evidence_id','id']);
const visualIdsBeforeCurrent=idsOf(mergeUnique(baseVisuals,priorAll(p=>[...(p.visuals||[]),...(p.new_visuals||[])]),['asset_id','id'],'visuals','ENG-VIS-LEGACY'),['asset_id','id']);
const mediaIdsBeforeCurrent=idsOf(mergeUnique(baseMedia,priorAll(p=>[
  ...(Array.isArray(p.new_media)?p.new_media:[]),...(Array.isArray(p.media)?p.media:[]),
  ...(p.media?.new_media||[]),...(p.media?.items||[]),...(p.media?.media||[]),...(p.multimedia?.media||[])
]),['media_id','id'],'media','ENG-MEDIA-LEGACY'),['media_id','id']);

d.dashboard_patch_extras={
  patch_history_runs:patches.map(p=>p.state?.run_id).filter(Boolean),
  patch_continuity:history.report.status,
  patch_integrity:history.report,
  visuals:mergeUnique([],visuals,['asset_id','id'],'visuals','ENG-VIS-LEGACY'),
  media:mergeUnique([],media,['media_id','id'],'media','ENG-MEDIA-LEGACY'),
  doctrine:mergeUnique([],doctrineItems,['id','document_id'],'doctrine','ENG-DOC-LEGACY'),
  technology_signals:mergeUnique([],technologySignals,['id'],'technology_signals','ENG-SIG-LEGACY'),
  trends:mergeUnique([],trends,['id'],'trends','ENG-TREND-LEGACY'),
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
  relations:mergeUnique([],rels,['relation_id','id'],'relations','ENG-REL-LEGACY'),
  evidence:mergeUnique([],evid,['evidence_id','id'],'evidence','ENG-EVID-LEGACY'),
  lessons_learned:mergeUnique([],lessons,['id','lesson_id'],'lessons_learned','ENG-LL-LEGACY'),
  orbat_updates:all(p=>p.orbat_updates||[]),
  external_source_hits:externalHits,
  external_leads:mergeUnique([],externalLeads,['lead_id','id','external_id'],'external_leads','ENG-LEAD-LEGACY'),
  observed_minimum_updates:observedMinimum,
  capability_matrix_changes:capabilityChanges,
  historical_coverage_changes:coverageChanges,
  external_source_registry_changes:all(p=>p.external_source_registry_changes||[])
};

d.relations=d.relations||{relations:[]};
d.relations.relations=mergeUnique(d.relations.relations,d.dashboard_patch_extras.relations,['relation_id','id'],'relations','ENG-REL-LEGACY').map(x=>({...x,id:x.id||x.relation_id}));
for(const rel of d.relations.relations||[]){
  if(['HAS_SUBUNIT','HAS_SUBORDINATE'].includes(rel.relation_type)){
    const child=d.records.records.find(x=>x.id===rel.object_id);
    if(child&&!child.parent_unit_id&&!child.parent_id&&!child.subordination_id)child.parent_unit_id=rel.subject_id;
  }
}

d.evidence=d.evidence||{evidence:[]};
d.evidence.evidence=mergeUnique(d.evidence.evidence,d.dashboard_patch_extras.evidence,['evidence_id','id'],'evidence','ENG-EVID-LEGACY').map(x=>({...x,id:x.id||x.evidence_id}));

validateStrictMaterialization(patch,{
  recordIdsBefore:recordIdsBeforeCurrent,sourceIdsBefore:sourceIdsBeforeCurrent,
  relationIdsBefore:[...relationIdsBeforeCurrent],evidenceIdsBefore:[...evidenceIdsBeforeCurrent],
  visualIdsBefore:[...visualIdsBeforeCurrent],mediaIdsBefore:[...mediaIdsBeforeCurrent],
  records:d.records.records,sources:d.sources.sources,
  relations:d.relations.relations,evidence:d.evidence.evidence,
  visuals:d.dashboard_patch_extras.visuals,media:d.dashboard_patch_extras.media,
  knownEntityIds:[
    ...d.dashboard_patch_extras.technology_signals,...d.dashboard_patch_extras.trends,
    ...d.dashboard_patch_extras.doctrine,...d.dashboard_patch_extras.lessons_learned,
    ...d.dashboard_patch_extras.external_leads,...d.dashboard_patch_extras.observed_minimum_updates,
    ...d.dashboard_patch_extras.orbat_updates
  ].map(item=>item?.id||item?.lead_id||item?.lesson_id).filter(Boolean)
});

d.lessons_learned=d.lessons_learned||{lessons:[]};
d.lessons_learned.lessons=mergeUnique(d.lessons_learned.lessons,d.dashboard_patch_extras.lessons_learned,['id','lesson_id'],'lessons_learned','ENG-LL-LEGACY');

if(patch.golden_entities)d.golden_entities=patch.golden_entities;
if(patch.historical_coverage)d.historical_coverage=patch.historical_coverage;
if(patch.external_source_registry)d.external_source_registry=patch.external_source_registry;
if(patch.bootstrap_v36)d.bootstrap_v36=patch.bootstrap_v36;
if(patch.canonical_registry_audit)d.canonical_registry_audit=patch.canonical_registry_audit;

d.dashboard_materialization={
  status:'SUCCESS',
  continuity:history.report.status,
  current_run_id:patch.state.run_id,
  patch_run_count:patches.length,
  patch_run_ids:patches.map(p=>p.state?.run_id).filter(Boolean)
};

validatePublicUrls(d);
html=html.slice(0,j)+safeInlineJson(d)+html.slice(b);
const mobile=`<script>(function(){function i(){const s=document.getElementById('sidebar');if(!s)return;let c=document.getElementById('engineerMenuClose');if(!c){c=document.createElement('button');c.id='engineerMenuClose';c.textContent='×';c.style.cssText='position:absolute;top:12px;right:12px;width:40px;height:40px;z-index:9999;font-size:26px';s.appendChild(c)}const shut=()=>s.classList.remove('open');c.onclick=shut;s.querySelectorAll('nav a,nav button').forEach(x=>x.addEventListener('click',shut));document.addEventListener('keydown',e=>e.key==='Escape'&&shut())}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',i):i()})();</script>`;
html=html.replace('</body>',mobile+'</body>');

writeFileSync(join(o,'index.html'),html,'utf8');
writeFileSync(join(o,'health.txt'),`ENGINEER OSINT github-pages\nrun=${patch.state.run_id}\nstatus=SUCCESS\nsource_attribution=data-enabled\ntemporal_intelligence=enabled\nhistorical_backfill=enabled\nknowledge_graph=data-enabled\nevidence_registry=data-enabled\nexternal_source_pool=enabled\npatch_history_materialization=enabled\npatch_continuity=${history.report.status}\npatch_history_runs=${patches.length}\nlegacy_malformed_revisions=${history.report.malformed_patch_shas.length}\nlegacy_duplicate_runs=${history.report.duplicate_run_ids.length}\nlegacy_parent_gaps=${history.report.parent_discontinuities.length+1}\npresentation_fact_overlay_gap=open\npresentation_bootstrap_pb_overlay=retired\nmobile_menu_fix=enabled\nbytes=${Buffer.byteLength(html)}\n`,'utf8');
writeFileSync(join(o,'.nojekyll'),'','utf8');
execFileSync(process.execPath,[join(s,'postprocess-ui.mjs')],{stdio:'inherit'});
const healthPath=join(o,'health.txt');
let finalHealth=readFileSync(healthPath,'utf8').replace(/^presentation_bootstrap_overlay=retired\n?/gm,'');
if(!finalHealth.includes('presentation_fact_overlay_gap=open'))finalHealth+='presentation_fact_overlay_gap=open\n';
if(!finalHealth.includes('presentation_bootstrap_pb_overlay=retired'))finalHealth+='presentation_bootstrap_pb_overlay=retired\n';
writeFileSync(healthPath,finalHealth,'utf8');
const finalHtml=readFileSync(join(o,'index.html'),'utf8');
finalHealth=readFileSync(healthPath,'utf8').replace(/^bytes=.*$/m,`bytes=${Buffer.byteLength(finalHtml)}`);
writeFileSync(healthPath,finalHealth,'utf8');
console.log(`Built cumulative ENGINEER OSINT ${patch.state.run_id}: ${Buffer.byteLength(finalHtml)} bytes from ${patches.length} patch runs`);
