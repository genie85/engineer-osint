import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('PUBLIC_CZ_UI_AUDIT: ENGINEER_DATA marker missing');
const baseline=JSON.parse(html.slice(a+marker.length,b));
const data=JSON.parse(JSON.stringify(baseline));
const context={window:{__ENGINEER_DATA__:data},console};
const modules=['i18n-terminology.js','i18n-content-cs.js','i18n-content-cs-usa-rok.js','i18n-content-cs-japan-australia.js','i18n-content-cs-france-germany-poland.js','i18n-content-cs-israel-turkiye-rich.js','i18n-content-cs-events-backlog.js','i18n-content-cs-public-cz-backlog.js'];
for(const f of modules)vm.runInNewContext(readFileSync(join(src,f),'utf8'),context,{filename:f,timeout:3000});

const arr=x=>Array.isArray(x)?x:[];
const ex=data.dashboard_patch_extras||{};
const groups=[
  ['record',arr(data.records?.records)],['lead',[...arr(data.leads?.leads),...arr(ex.leads),...arr(ex.external_leads)]],
  ['evidence',[...arr(data.evidence?.evidence),...arr(ex.evidence)]],['source',arr(data.sources?.sources)],
  ['visual',arr(ex.visuals)],['media',arr(ex.media)],['technology_signal',arr(ex.technology_signals)],['trend',arr(ex.trends)],
  ['confirmation',arr(ex.confirmations)],['contradiction',arr(ex.contradictions)],['correction',arr(ex.corrections)],
  ['lesson',[...arr(data.lessons_learned?.lessons),...arr(ex.lessons_learned)]],['doctrine',arr(ex.doctrine)],['orbat',arr(ex.orbat_updates)]
];
const scalar=['title','summary','update_summary','description','note','topic','status','signal','assessment','next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','relevance_summary','why_relevant','caption'];
const arrays=['intelligence_gaps'];
const idOf=(x,t,i)=>x.id||x.lead_id||x.evidence_id||x.media_id||x.asset_id||x.source_id||`${t}#${i}`;
const czechish=s=>/[áčďéěíňóřšťúůýž]/i.test(s)||/\b(žádn|aktuáln|zdroj|důkaz|výcvik|ženijn|překáž|odmin|veřejn|zpráv|schopnost|stav|jednotk|systém)\w*/i.test(s);
const officialish=s=>/^(?:ENG-|LEAD-)/.test(s)||(/^[A-Z0-9][A-Za-z0-9+./()\-–— ]+$/.test(s)&&s.split(/\s+/).length<=5&&!/[.!?]/.test(s));
const isPresent=v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const reviewIds=new Set();
for(const v of Object.values(context.window))if(v&&typeof v==='object'&&!Array.isArray(v))for(const id of v.review_needed_entities||[])reviewIds.add(id);

const dedup=new Map();
for(const[g,items]of groups)items.forEach((x,i)=>{if(!x||typeof x!=='object')return;const id=idOf(x,g,i);const k=`${g}:${id}`;dedup.set(k,{group:g,id,x})});
const items=[];let missingFields=0,reviewFields=0,fully=0,partial=0;
for(const{group,id,x}of dedup.values()){
  const missing=[],review=[],translated=[];
  for(const key of scalar){
    const base=x[key+'_en']??x[key];if(!isPresent(base))continue;
    const cs=x[key+'_cs'];if(isPresent(cs)){translated.push(key);continue}
    if(typeof base==='string'&&czechish(base)){translated.push(`${key}:base-cs`);continue}
    if((key==='title'||key==='topic')&&typeof base==='string'&&officialish(base)){review.push(key);continue}
    missing.push(key);
  }
  for(const key of arrays){
    const base=x[key+'_en']??x[key];if(!isPresent(base))continue;const cs=x[key+'_cs'];
    if(isPresent(cs)){translated.push(key);continue}
    if(Array.isArray(base)&&base.every(v=>typeof v!=='string'||czechish(v))){translated.push(`${key}:base-cs`);continue}
    missing.push(key);
  }
  if(Array.isArray(x.claims))x.claims.forEach((c,i)=>{const base=c?.text_en??c?.text;if(!isPresent(base))return;if(isPresent(c?.text_cs)||typeof base==='string'&&czechish(base))translated.push(`claims[${i}].text`);else missing.push(`claims[${i}].text`)});
  if(reviewIds.has(id)&&!review.length)review.push('explicit-review');
  if(!missing.length&&!review.length){if(translated.length)fully++;continue}
  if(translated.length)partial++;
  missingFields+=missing.length;reviewFields+=review.length;
  items.push({group,id,status:missing.length?(translated.length?'PARTIALLY_LOCALIZED':'UNLOCALIZED'):'TRANSLATION_REVIEW_NEEDED',missing_fields:missing,review_fields:review,translated_fields:translated});
}
items.sort((x,y)=>x.group.localeCompare(y.group)||x.id.localeCompare(y.id));

const byId=new Map();for(const{group,id,x}of dedup.values())if(!byId.has(id))byId.set(id,x);
const hasCsText=(x,key)=>Boolean(x&&isPresent(x[key+'_cs']));
const leadCanary=id=>{const x=byId.get(id);if(!x)return {id,status:'MISSING'};const title=hasCsText(x,'title')||hasCsText(x,'topic')||czechish(String(x.title||x.topic||''));const body=['summary','description','note'].some(k=>hasCsText(x,k)||czechish(String(x[k]||'')));return{id,status:title&&body?'PASS':'FAIL',title_cs:title,body_cs:body}};
const evt26=byId.get('ENG-EVT-0026');
const evt111=byId.get('ENG-EVT-0111');
const renderer=readFileSync(join(src,'public-cz-ui-canary.js'),'utf8');
const canaries={
  'ENG-UNIT-0010-detail-labels':{status:['FACT / EVIDENCE','ANALYTICAL INTERPRETATION','LIMIT'].every(k=>renderer.includes(k))?'PASS':'FAIL'},
  'ENG-EVT-0026-current-card':{status:evt26&&(hasCsText(evt26,'title')||czechish(String(evt26.title||'')))&&hasCsText(evt26,'summary')?'PASS':'FAIL',title_cs:Boolean(evt26&&hasCsText(evt26,'title')),summary_cs:Boolean(evt26&&hasCsText(evt26,'summary'))},
  'LEAD-001':leadCanary('LEAD-001'),'LEAD-002':leadCanary('LEAD-002'),'LEAD-003':leadCanary('LEAD-003'),'LEAD-005':leadCanary('LEAD-005'),
  'ENG-EVT-0111-undefined-title':{status:renderer.includes('undefined')&&(!evt111||hasCsText(evt111,'title')||czechish(String(evt111?.title||'')))?'PASS':'FAIL',title_cs:Boolean(evt111&&hasCsText(evt111,'title'))},
  'CZ-EN-switch-preservation':{status:renderer.includes("engineer-language-changed")&&renderer.includes('originals')?'PASS':'FAIL'}
};
const renderingFailures=Object.values(canaries).filter(x=>x.status!=='PASS').length;
const report={generated_at:new Date().toISOString(),current_run_id:data.state_latest?.run_id||null,FULLY_LOCALIZED_PUBLIC_ITEMS:fully,PARTIALLY_LOCALIZED_PUBLIC_ITEMS:partial,TRANSLATION_REVIEW_NEEDED:items.filter(x=>x.status==='TRANSLATION_REVIEW_NEEDED').length,PUBLIC_CZ_UI_BACKLOG_ITEMS:items.filter(x=>x.missing_fields.length).length,PUBLIC_CZ_UI_BACKLOG_FIELDS:missingFields,TRANSLATION_REVIEW_FIELDS:reviewFields,I18N_RENDERING_FAILURE:renderingFailures,canaries,items,status:missingFields===0&&reviewFields===0&&renderingFailures===0?'PUBLIC_CZ_UI_BACKLOG_ZERO':'PUBLIC_CZ_UI_BACKLOG_OPEN'};
writeFileSync(join(dist,'public-cz-ui-audit.json'),JSON.stringify(report,null,2)+'\n');
const md=['# PUBLIC-CZ-UI audit','',`Run: ${report.current_run_id}`,`FULLY_LOCALIZED_PUBLIC_ITEMS: ${fully}`,`PARTIALLY_LOCALIZED_PUBLIC_ITEMS: ${partial}`,`TRANSLATION_REVIEW_NEEDED: ${report.TRANSLATION_REVIEW_NEEDED}`,`PUBLIC_CZ_UI_BACKLOG_ITEMS/FIELDS: ${report.PUBLIC_CZ_UI_BACKLOG_ITEMS}/${missingFields}`,`I18N_RENDERING_FAILURE: ${renderingFailures}`,'','## Canaries',...Object.entries(canaries).map(([k,v])=>`- ${k}: ${v.status}`),'','## Backlog',...(items.length?items.slice(0,250).map(x=>`- ${x.group} ${x.id}: ${x.status}; missing=${x.missing_fields.join(',')||'-'}; review=${x.review_fields.join(',')||'-'}`):['- None'])].join('\n');
writeFileSync(join(dist,'public-cz-ui-audit.md'),md+'\n');
appendFileSync(join(dist,'health.txt'),`public_cz_ui_audit=${report.status}\npublic_cz_ui_backlog_items=${report.PUBLIC_CZ_UI_BACKLOG_ITEMS}\npublic_cz_ui_backlog_fields=${missingFields}\npublic_cz_ui_review_needed=${report.TRANSLATION_REVIEW_NEEDED}\npublic_cz_ui_rendering_failures=${renderingFailures}\n`);
console.log(JSON.stringify({FULLY_LOCALIZED_PUBLIC_ITEMS:fully,PARTIALLY_LOCALIZED_PUBLIC_ITEMS:partial,TRANSLATION_REVIEW_NEEDED:report.TRANSLATION_REVIEW_NEEDED,PUBLIC_CZ_UI_BACKLOG_ITEMS:report.PUBLIC_CZ_UI_BACKLOG_ITEMS,PUBLIC_CZ_UI_BACKLOG_FIELDS:missingFields,I18N_RENDERING_FAILURE:renderingFailures,canaries}));
