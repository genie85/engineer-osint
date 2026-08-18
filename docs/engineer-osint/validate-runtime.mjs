import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const src='docs/engineer-osint';
const dist='docs/engineer-osint-dist';
const indexPath=join(dist,'index.html');
const patchPath=join(src,'b11-patch.json');
const html=readFileSync(indexPath,'utf8');
const marker='window.__ENGINEER_DATA__=';
const a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('RUNTIME_AUDIT: ENGINEER_DATA marker missing');
const data=JSON.parse(html.slice(a+marker.length,b));
const baseline=JSON.parse(JSON.stringify(data));
const malformedHistoricalPatches=[];

function patchHistory(){
  const byRun=new Map();
  const current=JSON.parse(readFileSync(patchPath,'utf8'));
  let shas=[];
  try{
    shas=execFileSync('git',['log','--format=%H','--',patchPath],{encoding:'utf8'}).trim().split(/\s+/).filter(Boolean).reverse();
  }catch(e){
    throw new Error(`RUNTIME_AUDIT: full Git patch history unavailable: ${e.message}`);
  }
  for(const sha of shas){
    try{
      const p=JSON.parse(execFileSync('git',['show',`${sha}:${patchPath}`],{encoding:'utf8',maxBuffer:20*1024*1024}));
      const run=p?.state?.run_id;if(run)byRun.set(run,p);
    }catch(e){
      malformedHistoricalPatches.push({sha,error:e.message});
      console.warn(`RUNTIME_AUDIT: skipping malformed historical patch ${sha}: ${e.message}`);
    }
  }
  if(current?.state?.run_id)byRun.set(current.state.run_id,current);
  return [...byRun.values()];
}
const patches=patchHistory();

const records=baseline.records?.records||[];
const ids=records.map(x=>x.id).filter(Boolean);
const idSet=new Set(ids);
const duplicateIds=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
if(duplicateIds.length)throw new Error(`RUNTIME_AUDIT: duplicate record IDs: ${duplicateIds.join(', ')}`);
if(records.length<94)throw new Error(`RUNTIME_AUDIT: cumulative record count regressed below baseline: ${records.length}`);

const relations=baseline.relations?.relations||[];
const orphanRelations=relations.filter(r=>(r.subject_id&&!idSet.has(r.subject_id))||(r.object_id&&!idSet.has(r.object_id))).map(r=>r.id||r.relation_id||'UNKNOWN');
if(orphanRelations.length)throw new Error(`RUNTIME_AUDIT: orphan relations: ${orphanRelations.join(', ')}`);

const sourceIds=new Set((baseline.sources?.sources||[]).map(x=>x.id).filter(Boolean));
const evidence=baseline.evidence?.evidence||[];
const orphanEvidenceRecords=[];
for(const e of evidence){for(const id of e.related_ids||[])if(/^ENG-(?:UNIT|TECH|SIG|DOC|TTP|EVT|LL|TREND)-/.test(id)&&!idSet.has(id))orphanEvidenceRecords.push(`${e.id||e.evidence_id}:${id}`)}
if(orphanEvidenceRecords.length)throw new Error(`RUNTIME_AUDIT: evidence references missing records: ${orphanEvidenceRecords.join(', ')}`);

const dataModules=[
  'rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-eod-lead.js','rich-backfill-usa-rok.js',
  'i18n-terminology.js','i18n-content-cs.js','i18n-content-cs-usa-rok.js','i18n-content-cs-japan-australia.js',
  'i18n-content-cs-france-germany-poland.js','i18n-content-cs-israel-turkiye-rich.js'
];
const localized=JSON.parse(JSON.stringify(baseline));
const context={window:{__ENGINEER_DATA__:localized},console};
for(const file of dataModules){
  const code=readFileSync(join(src,file),'utf8');
  vm.runInNewContext(code,context,{filename:file,timeout:2000});
}

const beforeById=new Map((baseline.records?.records||[]).map(x=>[x.id,x]));
const afterById=new Map((localized.records?.records||[]).map(x=>[x.id,x]));
const baseFieldMutations=[];
for(const [id,before] of beforeById){
  const after=afterById.get(id);if(!after)continue;
  for(const key of ['title','summary'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))baseFieldMutations.push(`${id}.${key}`);
}
if(baseFieldMutations.length)throw new Error(`RUNTIME_AUDIT: presentation/i18n modules overwrite canonical EN/base title or summary: ${baseFieldMutations.join(', ')}`);

const canonicalTitles=new Map();
for(const p of patches){
  for(const x of p.updated_records||[]){
    if(x&&typeof x==='object'&&x.record_nature==='TRANSLATION_CANONICALIZATION'&&x.id&&x.title_cs)canonicalTitles.set(x.id,x.title_cs);
  }
}
const canonicalizationMismatches=[];
for(const [id,expected] of canonicalTitles){const actual=afterById.get(id)?.title_cs;if(actual&&actual!==expected)canonicalizationMismatches.push({id,expected,actual})}
if(canonicalizationMismatches.length)throw new Error(`RUNTIME_AUDIT: translation canonicalization overwritten: ${canonicalizationMismatches.map(x=>x.id).join(', ')}`);

const requiredInjectedModules=['engineer-i18n-content-cs-israel-turkiye-rich-module','engineer-i18n-content-cs-japan-australia-module','engineer-ui-phase6-i18n-module'];
const missingInjectedModules=requiredInjectedModules.filter(id=>!html.includes(id));
if(missingInjectedModules.length)throw new Error(`RUNTIME_AUDIT: required public modules missing from built HTML: ${missingInjectedModules.join(', ')}`);

const canaryId='ENG-SIG-0006';
const canaryBefore=beforeById.get(canaryId),canaryAfter=afterById.get(canaryId);
if(!canaryBefore||!canaryAfter)throw new Error(`RUNTIME_AUDIT: canary ${canaryId} missing`);
const canary={
  id:canaryId,
  cs_title:Boolean(canaryAfter.title_cs),
  cs_summary:Boolean(canaryAfter.summary_cs),
  english_base_preserved:canaryAfter.title===canaryBefore.title&&canaryAfter.summary===canaryBefore.summary,
  en_title_available:Boolean(canaryAfter.title_en||canaryAfter.title),
  en_summary_available:Boolean(canaryAfter.summary_en||canaryAfter.summary)
};
if(!canary.cs_title||!canary.cs_summary||!canary.english_base_preserved||!canary.en_title_available||!canary.en_summary_available)throw new Error(`RUNTIME_AUDIT: translation canary failed: ${JSON.stringify(canary)}`);

const unresolved=new Set();
const resolved=new Set();
for(const p of patches){
  for(const id of p?.data_quality?.registry_audit?.id_mapping_unresolved||[])unresolved.add(id);
  for(const id of p?.presentation_backfill_canonicalization?.remaining_overlay_entities||[])unresolved.add(id);
  for(const id of p?.presentation_backfill_canonicalization?.canonicalized_this_run||[])resolved.add(id);
  for(const x of p.updated_records||[])if(x&&typeof x==='object'&&x.record_nature==='TRANSLATION_CANONICALIZATION'&&x.id)resolved.add(x.id);
}
for(const id of resolved)unresolved.delete(id);

// i18n modules may explicitly quarantine records even when patch-history metadata does not.
// Merge those explicit review markers into the audit instead of under-reporting review backlog.
const explicitReviewNeeded=new Set();
const explicitResolvedMappings=new Set();
for(const value of Object.values(context.window)){
  if(!value||typeof value!=='object'||Array.isArray(value))continue;
  for(const id of value.review_needed_entities||[])if(typeof id==='string'&&id)explicitReviewNeeded.add(id);
  for(const id of value.resolved_mapping_entities||[])if(typeof id==='string'&&id)explicitResolvedMappings.add(id);
}
for(const id of explicitResolvedMappings){unresolved.delete(id);explicitReviewNeeded.delete(id);}
const translationReviewNeeded=new Set([...unresolved,...explicitReviewNeeded]);

const coreFields=['title','summary','description','why_it_matters','staff_relevance','training_relevance','intelligence_gaps'];
const extendedFields=['mission','organization_profile','technical_profile','testing_evidence','operational_evidence','engineering_equipment','equipment','capability_demonstrated','what_it_does_not_prove','training','note','scope'];
const czechCountries=new Set(['CZE','Czech Republic','Czechia','Česko','CZ']);
const backlog=[];
for(const r of localized.records?.records||[]){
  if(czechCountries.has(r.country))continue;
  if(!/^ENG-(?:UNIT|TECH|SIG|DOC|TTP|EVT|LL|TREND)-/.test(r.id||''))continue;
  const missing=[];const translated=[];
  for(const key of [...coreFields,...extendedFields]){
    const english=r[`${key}_en`]??r[key];
    if(english===undefined||english===null||english===''||(Array.isArray(english)&&!english.length))continue;
    const cs=r[`${key}_cs`];
    if(cs===undefined||cs===null||cs===''||(Array.isArray(cs)&&!cs.length))missing.push(key);else translated.push(key);
  }
  if(Array.isArray(r.claims))for(let i=0;i<r.claims.length;i++){
    const c=r.claims[i],english=c?.text_en??c?.text;
    if(english&&!c?.text_cs)missing.push(`claims[${i}].text`);else if(c?.text_cs)translated.push(`claims[${i}].text`);
  }
  if(missing.length)backlog.push({id:r.id,type:r.type,country:r.country||null,status:translated.length?'PARTIAL':'UNTRANSLATED',missing_fields:missing,translated_fields:translated,translation_review_needed:translationReviewNeeded.has(r.id)});
}
const priority=['ENG-UNIT','ENG-TECH','ENG-SIG','ENG-DOC','ENG-TTP','ENG-EVT','ENG-LL','ENG-TREND'];
backlog.sort((x,y)=>priority.indexOf(x.type)-priority.indexOf(y.type)||x.id.localeCompare(y.id));
const byType={};for(const x of backlog)byType[x.type]=(byType[x.type]||0)+1;
const missingFieldCount=backlog.reduce((n,x)=>n+x.missing_fields.length,0);

for(const r of localized.records?.records||[])for(const sid of r.source_ids||[])if(/^ENG-SRC-/.test(sid)&&!sourceIds.has(sid)){
  const present=(localized.sources?.sources||[]).some(s=>s.id===sid);if(!present)throw new Error(`RUNTIME_AUDIT: record ${r.id} references missing source ${sid}`);
}

const reviewNeededSorted=[...translationReviewNeeded].sort();
const audit={
  generated_at:new Date().toISOString(),
  current_run_id:baseline.state_latest?.run_id||null,
  patch_run_count:patches.length,
  malformed_historical_patch_versions:malformedHistoricalPatches,
  record_count:records.length,
  record_types:Object.fromEntries([...new Set(records.map(r=>r.type))].sort().map(t=>[t,records.filter(r=>r.type===t).length])),
  duplicate_ids:duplicateIds,
  orphan_relations:orphanRelations,
  orphan_evidence_record_refs:orphanEvidenceRecords,
  translation_canary:canary,
  translation_review_needed:reviewNeededSorted,
  translation_review_sources:{
    patch_history:[...unresolved].sort(),
    explicit_i18n:[...explicitReviewNeeded].sort(),
    explicit_resolved_i18n:[...explicitResolvedMappings].sort()
  },
  translation_backlog:{entity_count:backlog.length,missing_field_count:missingFieldCount,by_type:byType,items:backlog},
  status:'PASS_WITH_TRANSLATION_BACKLOG'
};
writeFileSync(join(dist,'runtime-audit.json'),JSON.stringify(audit,null,2)+'\n','utf8');
writeFileSync(join(dist,'translation-backlog.json'),JSON.stringify(audit.translation_backlog,null,2)+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`runtime_audit=pass\nruntime_record_count=${records.length}\ntranslation_canary=pass\ntranslation_backlog_entities=${backlog.length}\ntranslation_backlog_fields=${missingFieldCount}\ntranslation_review_needed=${reviewNeededSorted.join(',')||'none'}\nmalformed_historical_patch_versions=${malformedHistoricalPatches.length}\n`,'utf8');
console.log(`Runtime audit PASS: ${records.length} records, ${patches.length} patch runs, ${malformedHistoricalPatches.length} malformed historical patch versions skipped, translation backlog ${backlog.length} entities / ${missingFieldCount} fields, review ${reviewNeededSorted.join(',')||'none'}`);
