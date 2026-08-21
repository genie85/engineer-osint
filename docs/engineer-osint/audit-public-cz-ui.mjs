import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('PUBLIC_CZ_UI_AUDIT: ENGINEER_DATA marker missing');
const baseline=JSON.parse(html.slice(a+marker.length,b));
const data=JSON.parse(JSON.stringify(baseline));
const context={window:{__ENGINEER_DATA__:data},console,setTimeout:fn=>{if(typeof fn==='function')fn();return 0}};
const modules=['i18n-terminology.js','i18n-content-cs.js','i18n-content-cs-usa-rok.js','i18n-content-cs-japan-australia.js','i18n-content-cs-france-germany-poland.js','i18n-content-cs-israel-turkiye-rich.js','i18n-content-cs-events-backlog.js','i18n-content-cs-public-cz-backlog.js','i18n-content-cs-public-cz-2110.js'];
for(const f of modules)vm.runInNewContext(readFileSync(join(src,f),'utf8'),context,{filename:f,timeout:3000});

const arr=x=>Array.isArray(x)?x:[];
const ex=data.dashboard_patch_extras||{};
const groups=[
  ['record',arr(data.records?.records)],['lead',[...arr(data.leads?.leads),...arr(ex.leads),...arr(ex.external_leads)]],
  ['relation',[...arr(data.relations?.relations),...arr(ex.relations)]],['evidence',[...arr(data.evidence?.evidence),...arr(ex.evidence)]],
  ['source',[...arr(data.sources?.sources),...arr(data.external_source_registry?.sources)]],
  ['visual',[...arr(data.visual_registry?.visuals),...arr(data.visuals?.visuals),...arr(ex.visuals)]],
  ['media',[...arr(data.media_registry?.media),...arr(data.media_registry?.items),...arr(data.media?.media),...arr(data.media?.items),...(Array.isArray(data.media)?data.media:[]),...arr(ex.media)]],
  ['technology_signal',[...arr(data.technology_signals),...arr(ex.technology_signals)]],['trend',[...arr(data.trend_watch),...arr(ex.trends)]],
  ['confirmation',arr(ex.confirmations)],['contradiction',arr(ex.contradictions)],['correction',arr(ex.corrections)],
  ['lesson',[...arr(data.lessons_learned?.lessons),...arr(ex.lessons_learned)]],['doctrine',[...arr(data.doctrine?.doctrine),...arr(ex.doctrine)]],['orbat',[...arr(data.orbat?.updates),...arr(ex.orbat_updates)]]
];
const scalar=['title','summary','update_summary','description','note','topic','signal','assessment','next_action','recommended_next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','relevance_summary','why_relevant','caption','caption_says','what_is_visible','observation','scope'];
const arrays=['intelligence_gaps'];
const enumFields=['status','classification','confidence','temporal_status','current_value_status','canonicalization_status','evidence_type','evidence_status','observation_basis','source_class','role','url_validation_status','verification_status','archive_status','document_type','maturity','stage','institutionalization_status','official_ll_status','coverage','relation_type','visual_level','visual_observation_basis','media_type'];
const idOf=(x,t,i)=>x.id||x.lead_id||x.evidence_id||x.media_id||x.asset_id||x.source_id||`${t}#${i}`;
const czechish=s=>/[áčďéěíňóřšťúůýž]/i.test(s)||/\b(žádn|aktuáln|zdroj|důkaz|výcvik|ženijn|překáž|odmin|veřejn|zpráv|schopnost|stav|jednotk|systém|potvrzen|historick|primární|sekundární|operační|vysok|nízk|středn|ověřen|čeká|nahrazen)\w*/i.test(s);
const officialish=s=>/^(?:ENG-|LEAD-)/.test(s)||(/^[A-Z0-9][A-Za-z0-9+./()\-–— ]+$/.test(s)&&s.split(/\s+/).length<=5&&!/[.!?]/.test(s));
const enumToken=s=>/^[A-Z0-9][A-Z0-9_+./()\-]{1,120}$/.test(String(s||''));
const isPresent=v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
const normalize=s=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
const stripRetained=s=>String(s??'').replace(/\([^)]{1,100}\)/g,' ');
const residualEnglishPhrase=/\b(?:source ecosystem|lessons repository|discovery channel|source repository|source registry|current status|current capability|public role|historical snapshot|training snapshot|primary official|secondary official)\b/i;
const csQualityIssue=(cs,base)=>{
  if(typeof cs!=='string'||!cs.trim())return null;
  const c=normalize(cs),e=normalize(base);
  if(e&&c===e&&cs.trim().split(/\s+/).length>=4&&!officialish(cs))return 'cs-equals-en';
  if(residualEnglishPhrase.test(stripRetained(cs)))return 'residual-english-phrase';
  return null;
};
const uiCs=context.window.__ENGINEER_I18N__?.ui?.cs||{};
const mappedCs=v=>{if(v===undefined||v===null)return undefined;const s=String(v);return uiCs[s]??uiCs[s.toUpperCase()];};
const reviewIds=new Set();
for(const v of Object.values(context.window))if(v&&typeof v==='object'&&!Array.isArray(v))for(const id of v.review_needed_entities||[])reviewIds.add(id);

const dedup=new Map();
for(const[g,items]of groups)items.forEach((x,i)=>{if(!x||typeof x!=='object')return;const id=idOf(x,g,i);const k=`${g}:${id}`;dedup.set(k,{group:g,id,x})});
const items=[];let missingFields=0,reviewFields=0,fully=0,partial=0,enumMapped=0,enumReview=0,contentQualityReview=0;
for(const{group,id,x}of dedup.values()){
  const missing=[],review=[],translated=[];
  for(const key of scalar){
    const explicitBase=x[key+'_en']??x.__i18n_public_orig?.[key];const base=explicitBase??x[key];if(!isPresent(base))continue;
    const cs=x[key+'_cs'];const rendered=x[key];
    if(isPresent(cs)){
      const q=csQualityIssue(cs,explicitBase);
      if(q){review.push(`${key}:${q}`);contentQualityReview++;continue}
      translated.push(key);continue
    }
    if(typeof rendered==='string'&&czechish(rendered)){translated.push(`${key}:rendered-cs`);continue}
    if((key==='title'||key==='topic')&&typeof base==='string'&&officialish(base)){review.push(`${key}:official-name-review`);continue}
    missing.push(key);
  }
  for(const key of arrays){
    const explicitBase=x[key+'_en']??x.__i18n_public_orig?.[key];const base=explicitBase??x[key];if(!isPresent(base))continue;const cs=x[key+'_cs'];const rendered=x[key];
    if(isPresent(cs)){
      const bad=Array.isArray(cs)&&cs.some((v,i)=>csQualityIssue(v,Array.isArray(explicitBase)?explicitBase[i]:undefined));
      if(bad){review.push(`${key}:cs-content-quality-review`);contentQualityReview++;continue}
      translated.push(key);continue
    }
    if(Array.isArray(rendered)&&rendered.every(v=>typeof v!=='string'||czechish(v))){translated.push(`${key}:rendered-cs`);continue}
    missing.push(key);
  }
  for(const key of enumFields){
    const base=x[key+'_en']??x.__i18n_public_orig?.[key]??x[key];if(!isPresent(base))continue;const cs=x[key+'_cs'],rendered=x[key],mapped=mappedCs(base);
    if(isPresent(cs)||mapped!==undefined&&String(mapped)!==String(base)||String(rendered)!==String(base)&&czechish(String(rendered))){translated.push(`${key}:enum-cs`);enumMapped++;continue}
    if(enumToken(base)){review.push(`${key}:enum-unmapped-review`);enumReview++;continue}
    missing.push(key);
  }
  if(Array.isArray(x.claims))x.claims.forEach((c,i)=>{
    const explicitBase=c?.text_en??c?.__i18n_public_orig_text;const base=explicitBase??c?.text;if(!isPresent(base))return;const rendered=c?.text;
    if(isPresent(c?.text_cs)){
      const q=csQualityIssue(c.text_cs,explicitBase);
      if(q){review.push(`claims[${i}].text:${q}`);contentQualityReview++;return}
      translated.push(`claims[${i}].text`);return
    }
    if(typeof rendered==='string'&&czechish(rendered))translated.push(`claims[${i}].text`);else missing.push(`claims[${i}].text`)
  });
  if(reviewIds.has(id)&&!review.length)review.push('explicit-review');
  if(!missing.length&&!review.length){if(translated.length)fully++;continue}
  if(translated.length)partial++;
  missingFields+=missing.length;reviewFields+=review.length;
  items.push({group,id,status:missing.length?(translated.length?'PARTIALLY_LOCALIZED':'UNLOCALIZED'):'TRANSLATION_REVIEW_NEEDED',missing_fields:missing,review_fields:review,translated_fields:translated});
}
items.sort((x,y)=>x.group.localeCompare(y.group)||x.id.localeCompare(y.id));

const byId=new Map();for(const{group,id,x}of dedup.values())if(!byId.has(id))byId.set(id,x);
const hasCsText=(x,key)=>Boolean(x&&isPresent(x[key+'_cs']));
const renderedCs=(x,key)=>Boolean(x&&isPresent(x[key])&&czechish(String(x[key])));
const leadCanary=id=>{const x=byId.get(id);if(!x)return {id,status:'MISSING'};const title=hasCsText(x,'title')||hasCsText(x,'topic')||renderedCs(x,'title')||renderedCs(x,'topic');const body=['summary','description','note'].some(k=>hasCsText(x,k)||renderedCs(x,k));return{id,status:title&&body?'PASS':'FAIL',title_cs:title,body_cs:body}};
const evt26=byId.get('ENG-EVT-0026');
const evt111=byId.get('ENG-EVT-0111');
const renderer=readFileSync(join(src,'public-cz-ui-canary.js'),'utf8');
const canaries={
  'ENG-UNIT-0010-detail-labels':{status:['FACT / EVIDENCE','ANALYTICAL INTERPRETATION','LIMIT'].every(k=>renderer.includes(k))?'PASS':'FAIL'},
  'ENG-EVT-0026-current-card':{status:evt26&&(hasCsText(evt26,'title')||renderedCs(evt26,'title'))&&(hasCsText(evt26,'summary')||renderedCs(evt26,'summary'))?'PASS':'FAIL',title_cs:Boolean(evt26&&(hasCsText(evt26,'title')||renderedCs(evt26,'title'))),summary_cs:Boolean(evt26&&(hasCsText(evt26,'summary')||renderedCs(evt26,'summary')))},
  'LEAD-001':leadCanary('LEAD-001'),'LEAD-002':leadCanary('LEAD-002'),'LEAD-003':leadCanary('LEAD-003'),'LEAD-005':leadCanary('LEAD-005'),
  'ENG-EVT-0111-undefined-title':{status:renderer.includes('undefined')&&(!evt111||hasCsText(evt111,'title')||renderedCs(evt111,'title'))?'PASS':'FAIL',title_cs:Boolean(evt111&&(hasCsText(evt111,'title')||renderedCs(evt111,'title')))},
  'CZ-EN-switch-preservation':{status:renderer.includes("engineer-language-changed")&&renderer.includes('originals')?'PASS':'FAIL'},
  'PUBLIC-REGISTRY-ENUM-I18N':{status:enumReview===0?'PASS':'REVIEW',mapped_enum_fields:enumMapped,unmapped_enum_fields:enumReview},
  'PUBLIC-CZ-CONTENT-QUALITY':{status:contentQualityReview===0?'PASS':'REVIEW',review_fields:contentQualityReview}
};
const renderingFailures=Object.entries(canaries).filter(([k,x])=>!['PUBLIC-REGISTRY-ENUM-I18N','PUBLIC-CZ-CONTENT-QUALITY'].includes(k)&&x.status!=='PASS').length;
const backlogItems=items.filter(x=>x.missing_fields.length).length;
const reviewItems=items.filter(x=>x.status==='TRANSLATION_REVIEW_NEEDED').length;
const status=missingFields===0&&renderingFailures===0?(reviewFields?'PUBLIC_CZ_UI_BACKLOG_ZERO_WITH_REVIEWS':'PUBLIC_CZ_UI_BACKLOG_ZERO'):'PUBLIC_CZ_UI_BACKLOG_OPEN';
const report={generated_at:new Date().toISOString(),current_run_id:data.state_latest?.run_id||null,FULLY_LOCALIZED_PUBLIC_ITEMS:fully,PARTIALLY_LOCALIZED_PUBLIC_ITEMS:partial,TRANSLATION_REVIEW_NEEDED:reviewItems,PUBLIC_CZ_UI_BACKLOG_ITEMS:backlogItems,PUBLIC_CZ_UI_BACKLOG_FIELDS:missingFields,TRANSLATION_REVIEW_FIELDS:reviewFields,I18N_RENDERING_FAILURE:renderingFailures,ENUM_MAPPED_PUBLIC_FIELDS:enumMapped,ENUM_TRANSLATION_REVIEW_FIELDS:enumReview,CS_CONTENT_QUALITY_REVIEW_FIELDS:contentQualityReview,canaries,items,status};
writeFileSync(join(dist,'public-cz-ui-audit.json'),JSON.stringify(report,null,2)+'\n');
const md=['# PUBLIC-CZ-UI audit','',`Run: ${report.current_run_id}`,`FULLY_LOCALIZED_PUBLIC_ITEMS: ${fully}`,`PARTIALLY_LOCALIZED_PUBLIC_ITEMS: ${partial}`,`TRANSLATION_REVIEW_NEEDED: ${reviewItems}`,`PUBLIC_CZ_UI_BACKLOG_ITEMS/FIELDS: ${backlogItems}/${missingFields}`,`I18N_RENDERING_FAILURE: ${renderingFailures}`,`ENUM_MAPPED_PUBLIC_FIELDS: ${enumMapped}`,`ENUM_TRANSLATION_REVIEW_FIELDS: ${enumReview}`,`CS_CONTENT_QUALITY_REVIEW_FIELDS: ${contentQualityReview}`,'','## Canaries',...Object.entries(canaries).map(([k,v])=>`- ${k}: ${v.status}`),'','## Backlog / review',...(items.length?items.slice(0,300).map(x=>`- ${x.group} ${x.id}: ${x.status}; missing=${x.missing_fields.join(',')||'-'}; review=${x.review_fields.join(',')||'-'}`):['- None'])].join('\n');
writeFileSync(join(dist,'public-cz-ui-audit.md'),md+'\n');
appendFileSync(join(dist,'health.txt'),`public_cz_ui_audit=${report.status}\npublic_cz_ui_backlog_items=${backlogItems}\npublic_cz_ui_backlog_fields=${missingFields}\npublic_cz_ui_review_needed=${reviewItems}\npublic_cz_ui_review_fields=${reviewFields}\npublic_cz_ui_rendering_failures=${renderingFailures}\npublic_cz_ui_enum_mapped=${enumMapped}\npublic_cz_ui_enum_review=${enumReview}\npublic_cz_ui_content_quality_review=${contentQualityReview}\n`);
console.log(JSON.stringify({FULLY_LOCALIZED_PUBLIC_ITEMS:fully,PARTIALLY_LOCALIZED_PUBLIC_ITEMS:partial,TRANSLATION_REVIEW_NEEDED:reviewItems,PUBLIC_CZ_UI_BACKLOG_ITEMS:backlogItems,PUBLIC_CZ_UI_BACKLOG_FIELDS:missingFields,I18N_RENDERING_FAILURE:renderingFailures,ENUM_MAPPED_PUBLIC_FIELDS:enumMapped,ENUM_TRANSLATION_REVIEW_FIELDS:enumReview,CS_CONTENT_QUALITY_REVIEW_FIELDS:contentQualityReview,canaries}));
