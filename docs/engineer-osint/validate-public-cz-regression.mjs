import { existsSync, readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function fieldKey(entry){
  return `${entry.group}\u0000${entry.id}\u0000${entry.field}`;
}

export function parseFieldKey(key){
  const [group,id,field]=key.split('\u0000');
  return {group,id,field};
}

export function baselineFieldSet(baseline){
  return new Set((baseline?.known_missing_fields||[]).map(fieldKey));
}

export function actualMissingFieldSet(report){
  const out=new Set();
  for(const item of report?.items||[]){
    for(const field of item?.missing_fields||[]){
      out.add(fieldKey({group:item.group,id:item.id,field}));
    }
  }
  return out;
}

export function evaluatePublicCzRatchet({report,baseline,parentBaseline=null}){
  const allowed=baselineFieldSet(baseline);
  const actual=actualMissingFieldSet(report);
  const parent=parentBaseline?baselineFieldSet(parentBaseline):null;

  const newMissing=[...actual].filter(k=>!allowed.has(k)).sort();
  const resolved=[...allowed].filter(k=>!actual.has(k)).sort();
  const baselineAdditions=parent?[...allowed].filter(k=>!parent.has(k)).sort():[];

  const recomputedFields=actual.size;
  const recomputedItems=new Set([...actual].map(k=>{
    const {group,id}=parseFieldKey(k);return `${group}\u0000${id}`;
  })).size;
  const reportedFields=Number(report?.PUBLIC_CZ_UI_BACKLOG_FIELDS??NaN);
  const reportedItems=Number(report?.PUBLIC_CZ_UI_BACKLOG_ITEMS??NaN);
  const countMismatch=reportedFields!==recomputedFields||reportedItems!==recomputedItems;

  const maxRendering=Number(baseline?.max_i18n_rendering_failures??0);
  const maxQuality=Number(baseline?.max_cs_content_quality_review_fields??0);
  const rendering=Number(report?.I18N_RENDERING_FAILURE??0);
  const quality=Number(report?.CS_CONTENT_QUALITY_REVIEW_FIELDS??0);

  const failures=[];
  if(newMissing.length)failures.push('NEW_ORDINARY_PUBLIC_CZ_MISSING_FIELDS');
  if(baselineAdditions.length)failures.push('BASELINE_EXPANSION_FORBIDDEN');
  if(rendering>maxRendering)failures.push('I18N_RENDERING_FAILURE_REGRESSION');
  if(quality>maxQuality)failures.push('CS_CONTENT_QUALITY_REGRESSION');
  if(countMismatch)failures.push('PUBLIC_CZ_AUDIT_COUNT_MISMATCH');

  return {
    pass:failures.length===0,
    status:failures.length?'PUBLIC_CZ_REGRESSION':'PUBLIC_CZ_RATCHET_PASS',
    failures,
    baseline_fields:allowed.size,
    actual_missing_fields:actual.size,
    actual_missing_items:recomputedItems,
    new_missing_fields:newMissing.map(parseFieldKey),
    resolved_baseline_fields:resolved.map(parseFieldKey),
    baseline_additions:baselineAdditions.map(parseFieldKey),
    i18n_rendering_failure:rendering,
    cs_content_quality_review_fields:quality,
    reported_backlog_fields:reportedFields,
    reported_backlog_items:reportedItems
  };
}

function hasNonEmptyFile(path){
  try{return Boolean(path)&&existsSync(path)&&statSync(path).size>0;}catch{return false;}
}

function loadJson(path,label){
  if(!hasNonEmptyFile(path))throw new Error(`${label} missing or empty: ${path}`);
  return JSON.parse(readFileSync(path,'utf8'));
}

export function runCli(){
  const reportPath=process.env.PUBLIC_CZ_AUDIT||'docs/engineer-osint-dist/public-cz-ui-audit.json';
  const baselinePath=process.env.PUBLIC_CZ_BASELINE||'docs/engineer-osint/public-cz-backlog-baseline.json';
  const parentPath=process.env.PUBLIC_CZ_PARENT_BASELINE||'';
  const report=loadJson(reportPath,'PUBLIC-CZ audit');
  const baseline=loadJson(baselinePath,'PUBLIC-CZ baseline');
  const parentBaseline=hasNonEmptyFile(parentPath)?loadJson(parentPath,'parent PUBLIC-CZ baseline'):null;
  const result=evaluatePublicCzRatchet({report,baseline,parentBaseline});
  console.log(JSON.stringify({PUBLIC_CZ_RATCHET_STATUS:result.status,...result},null,2));
  if(!result.pass)process.exitCode=1;
  return result;
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href)runCli();
