import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {
  deepDiff,loadValidatedPatchHistory,mutationFingerprint,parseJsonStrict,
  translationMutationViolations,validatePublicUrls
} from './lib/integrity.mjs';
import {
  isIntrinsicTranslationPath,LEGACY_FACTUAL_OVERLAY_MODULES,
  LOCALIZATION_DATA_MODULES,PUBLIC_RUNTIME_MODULES
} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const patchPath=join(src,'b11-patch.json'),html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('RUNTIME_AUDIT: ENGINEER_DATA marker missing');
const baseline=parseJsonStrict(html.slice(a+marker.length,b),{source:'built ENGINEER_DATA'});
validatePublicUrls(baseline);
const history=loadValidatedPatchHistory({patchPath,manifestPath:join(src,'history-integrity-baseline.json')});
const patches=history.patches;

const records=baseline.records?.records||[],ids=records.map(x=>x.id).filter(Boolean),idSet=new Set(ids);
const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
if(duplicateIds.length)throw new Error(`RUNTIME_AUDIT: duplicate record IDs: ${duplicateIds.join(', ')}`);
if(records.length<94)throw new Error(`RUNTIME_AUDIT: cumulative record count regressed below baseline: ${records.length}`);

const ex=baseline.dashboard_patch_extras||{};
const evidenceTargetIds=new Set([
  ...ids,...(baseline.technology_signals||[]).map(x=>x?.id).filter(Boolean),
  ...(ex.technology_signals||[]).map(x=>x?.id).filter(Boolean),...(baseline.trend_watch||[]).map(x=>x?.id).filter(Boolean),
  ...(ex.trends||[]).map(x=>x?.id).filter(Boolean),...(baseline.doctrine?.doctrine||[]).map(x=>x?.id).filter(Boolean),
  ...(ex.doctrine||[]).map(x=>x?.id).filter(Boolean),...(baseline.orbat?.updates||[]).map(x=>x?.id).filter(Boolean),
  ...(ex.orbat_updates||[]).map(x=>x?.id).filter(Boolean)
]);
const relations=baseline.relations?.relations||[];
const orphanRelations=relations.filter(r=>(r.subject_id&&!idSet.has(r.subject_id))||(r.object_id&&!idSet.has(r.object_id))).map(r=>r.id||r.relation_id||'UNKNOWN');
if(orphanRelations.length)throw new Error(`RUNTIME_AUDIT: orphan relations: ${orphanRelations.join(', ')}`);
const sourceIds=new Set((baseline.sources?.sources||[]).map(x=>x.id).filter(Boolean));
const evidence=baseline.evidence?.evidence||[],orphanEvidenceRecords=[];
for(const item of evidence)for(const id of item.related_ids||[])if(/^ENG-(?:UNIT|TECH|SIG|DOC|TTP|EVT|LL|TREND)-/.test(id)&&!evidenceTargetIds.has(id))orphanEvidenceRecords.push(`${item.id||item.evidence_id}:${id}`);
if(orphanEvidenceRecords.length)throw new Error(`RUNTIME_AUDIT: evidence references missing records: ${orphanEvidenceRecords.join(', ')}`);

const overlayBaseline=parseJsonStrict(readFileSync(join(src,'legacy-runtime-overlay-baseline.json'),'utf8'),{source:'legacy overlay baseline'});
const resolved=structuredClone(baseline),context={window:{__ENGINEER_DATA__:resolved},console};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const overlayAudit=[];
for(const [,file] of LEGACY_FACTUAL_OVERLAY_MODULES){
  const expected=overlayBaseline.modules[file];
  if(!expected)throw new Error(`RUNTIME_AUDIT: legacy overlay ${file} has no baseline`);
  const code=readFileSync(join(src,file),'utf8'),fileHash=createHash('sha256').update(code).digest('hex');
  if(fileHash!==expected.file_sha256)throw new Error(`RUNTIME_AUDIT: legacy factual overlay ${file} changed without migration review`);
  const before=structuredClone(resolved);
  vm.runInNewContext(code,context,{filename:file,timeout:3000});
  const changes=deepDiff(before,resolved),changedIds=new Set(),unscoped=[];
  for(const change of changes){
    const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\]/);
    if(!match){if(change.path!=='rich_backfill_meta'&&!change.path.startsWith('rich_backfill_meta.'))unscoped.push(change.path);continue;}
    const item=objectAt(resolved,match[1],match[2],Number(match[3]))||objectAt(before,match[1],match[2],Number(match[3]));
    const id=item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.evidence_id||item?.relation_id;
    if(id)changedIds.add(id);else unscoped.push(change.path);
  }
  const unexpected=[...changedIds].filter(id=>!expected.allowed_target_ids.includes(id));
  if(unexpected.length||unscoped.length)throw new Error(`RUNTIME_AUDIT: legacy overlay ${file} escaped its pinned targets: ${[...unexpected,...unscoped.slice(0,10)].join(', ')}`);
  const exactBaseline=baseline.state_latest?.run_id===overlayBaseline.baseline_run_id;
  if(exactBaseline&&(changes.length!==expected.mutation_count||mutationFingerprint(changes)!==expected.mutation_fingerprint))throw new Error(`RUNTIME_AUDIT: legacy overlay ${file} no longer matches its B61 mutation baseline`);
  overlayAudit.push({file,file_sha256:fileHash,mutation_count:changes.length,changed_ids:[...changedIds].sort(),status:'PINNED_MIGRATION_DEBT'});
}
validatePublicUrls(resolved);

const beforeLocalization=structuredClone(resolved);
for(const [,file] of LOCALIZATION_DATA_MODULES){
  const code=readFileSync(join(src,file),'utf8');
  vm.runInNewContext(code,context,{filename:file,timeout:3000});
}
validatePublicUrls(resolved);
const localizationViolations=translationMutationViolations(beforeLocalization,resolved,{intrinsicPath:isIntrinsicTranslationPath});
if(localizationViolations.length)throw new Error(`RUNTIME_AUDIT: localization escaped translation provenance: ${localizationViolations.slice(0,20).map(x=>x.path).join(', ')}`);

const requiredInjectedModules=PUBLIC_RUNTIME_MODULES.map(([id])=>id);
const missingInjectedModules=requiredInjectedModules.filter(id=>!html.includes(`id="${id}"`));
if(missingInjectedModules.length)throw new Error(`RUNTIME_AUDIT: required public modules missing: ${missingInjectedModules.join(', ')}`);

const beforeById=new Map((beforeLocalization.records?.records||[]).map(x=>[x.id,x]));
const afterById=new Map((resolved.records?.records||[]).map(x=>[x.id,x]));
const canonicalTitles=new Map();
for(const patch of patches)for(const item of patch.updated_records||[])if(item&&typeof item==='object'&&item.record_nature==='TRANSLATION_CANONICALIZATION'&&item.id&&item.title_cs)canonicalTitles.set(item.id,item.title_cs);
const canonicalizationMismatches=[];
for(const [id,expected] of canonicalTitles){const actual=afterById.get(id)?.title_cs;if(actual&&actual!==expected)canonicalizationMismatches.push(id);}
if(canonicalizationMismatches.length)throw new Error(`RUNTIME_AUDIT: translation canonicalization overwritten: ${canonicalizationMismatches.join(', ')}`);

const canaryId='ENG-SIG-0006',canaryBefore=beforeById.get(canaryId),canaryAfter=afterById.get(canaryId);
if(!canaryBefore||!canaryAfter)throw new Error(`RUNTIME_AUDIT: canary ${canaryId} missing`);
const canary={
  id:canaryId,cs_title:Boolean(canaryAfter.title_cs),cs_summary:Boolean(canaryAfter.summary_cs),
  english_title_available:Boolean(canaryAfter.title_en||canaryBefore.title_en||canaryBefore.title),
  english_summary_available:Boolean(canaryAfter.summary_en||canaryBefore.summary_en||canaryBefore.summary),
  translation_provenance_guard:localizationViolations.length===0
};
if(Object.values(canary).some(value=>value===false))throw new Error(`RUNTIME_AUDIT: translation canary failed: ${JSON.stringify(canary)}`);

const unresolved=new Set(),resolvedMappings=new Set();
for(const patch of patches){
  for(const id of patch?.data_quality?.registry_audit?.id_mapping_unresolved||[])unresolved.add(id);
  for(const id of patch?.presentation_backfill_canonicalization?.remaining_overlay_entities||[])unresolved.add(id);
  for(const id of patch?.presentation_backfill_canonicalization?.canonicalized_this_run||[])resolvedMappings.add(id);
  for(const item of patch.updated_records||[])if(item&&typeof item==='object'&&item.record_nature==='TRANSLATION_CANONICALIZATION'&&item.id)resolvedMappings.add(item.id);
}
const explicitReviewNeeded=new Set(),explicitResolvedMappings=new Set();
for(const value of Object.values(context.window)){
  if(!value||typeof value!=='object'||Array.isArray(value))continue;
  for(const id of value.review_needed_entities||[])if(typeof id==='string'&&id)explicitReviewNeeded.add(id);
  for(const id of value.resolved_mapping_entities||[])if(typeof id==='string'&&id)explicitResolvedMappings.add(id);
}
for(const id of new Set([...resolvedMappings,...explicitResolvedMappings])){unresolved.delete(id);explicitReviewNeeded.delete(id);}
const translationReviewNeeded=new Set([...unresolved,...explicitReviewNeeded]);

const coreFields=['title','summary','description','why_it_matters','staff_relevance','training_relevance','intelligence_gaps'];
const extendedFields=['mission','organization_profile','technical_profile','testing_evidence','operational_evidence','engineering_equipment','equipment','capability_demonstrated','what_it_does_not_prove','training','note','scope'];
const czechCountries=new Set(['CZE','Czech Republic','Czechia','Česko','CZ']),backlog=[];
for(const record of resolved.records?.records||[]){
  if(czechCountries.has(record.country)||!/^ENG-(?:UNIT|TECH|SIG|DOC|TTP|EVT|LL|TREND)-/.test(record.id||''))continue;
  const missing=[],translated=[];
  for(const key of [...coreFields,...extendedFields]){
    const english=record[`${key}_en`]??record[key];if(english===undefined||english===null||english===''||(Array.isArray(english)&&!english.length))continue;
    const cs=record[`${key}_cs`];if(cs===undefined||cs===null||cs===''||(Array.isArray(cs)&&!cs.length))missing.push(key);else translated.push(key);
  }
  if(Array.isArray(record.claims))for(let index=0;index<record.claims.length;index++){
    const claim=record.claims[index],english=claim?.text_en??claim?.text;
    if(english&&!claim?.text_cs)missing.push(`claims[${index}].text`);else if(claim?.text_cs)translated.push(`claims[${index}].text`);
  }
  if(missing.length)backlog.push({id:record.id,type:record.type,country:record.country||null,status:translated.length?'PARTIAL':'UNTRANSLATED',missing_fields:missing,translated_fields:translated,translation_review_needed:translationReviewNeeded.has(record.id)});
}
const priority=['ENG-UNIT','ENG-TECH','ENG-SIG','ENG-DOC','ENG-TTP','ENG-EVT','ENG-LL','ENG-TREND'];
backlog.sort((x,y)=>priority.indexOf(x.type)-priority.indexOf(y.type)||x.id.localeCompare(y.id));
const byType={};for(const item of backlog)byType[item.type]=(byType[item.type]||0)+1;
const missingFieldCount=backlog.reduce((count,item)=>count+item.missing_fields.length,0);
for(const record of resolved.records?.records||[])for(const sourceId of record.source_ids||[])if(/^ENG-SRC-/.test(sourceId)&&!sourceIds.has(sourceId)&&!(resolved.sources?.sources||[]).some(source=>source.id===sourceId))throw new Error(`RUNTIME_AUDIT: record ${record.id} references missing source ${sourceId}`);

const reviewNeededSorted=[...translationReviewNeeded].sort();
const audit={
  generated_at:new Date().toISOString(),current_run_id:baseline.state_latest?.run_id||null,patch_run_count:patches.length,
  patch_integrity:history.report,legacy_factual_overlays:overlayAudit,
  legacy_factual_overlay_mutation_count:overlayAudit.reduce((count,item)=>count+item.mutation_count,0),
  localization_mutation_violations:[],record_count:records.length,
  record_types:Object.fromEntries([...new Set(records.map(record=>record.type))].sort().map(type=>[type,records.filter(record=>record.type===type).length])),
  duplicate_ids:duplicateIds,orphan_relations:orphanRelations,orphan_evidence_record_refs:orphanEvidenceRecords,
  translation_canary:canary,translation_review_needed:reviewNeededSorted,
  translation_review_sources:{patch_history:[...unresolved].sort(),explicit_i18n:[...explicitReviewNeeded].sort(),explicit_resolved_i18n:[...explicitResolvedMappings].sort()},
  translation_backlog:{entity_count:backlog.length,missing_field_count:missingFieldCount,by_type:byType,items:backlog},
  status:'PASS_WITH_PINNED_LEGACY_OVERLAYS'
};
writeFileSync(join(dist,'runtime-audit.json'),JSON.stringify(audit,null,2)+'\n','utf8');
writeFileSync(join(dist,'translation-backlog.json'),JSON.stringify(audit.translation_backlog,null,2)+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`runtime_audit=pass\nruntime_record_count=${records.length}\nlegacy_factual_overlays=pinned-migration-debt\nlegacy_factual_overlay_modules=${overlayAudit.length}\nlocalization_mutation_violations=0\ncanonical_export_snapshot=legacy-overlay-resolved\ntranslation_canary=pass\ntranslation_backlog_entities=${backlog.length}\ntranslation_backlog_fields=${missingFieldCount}\ntranslation_review_needed=${reviewNeededSorted.join(',')||'none'}\nmalformed_historical_patch_versions=${history.report.malformed_patch_shas.length}\n`,'utf8');
console.log(`Runtime audit PASS: ${records.length} records, ${patches.length} runs, ${overlayAudit.length} pinned legacy factual overlays, 0 localization provenance violations, backlog ${backlog.length}/${missingFieldCount}`);
