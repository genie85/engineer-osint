import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const outDir='docs/engineer-osint-dist';
const auditPath=join(outDir,'media-history-audit.json');
const outPath=join(outDir,'media-coverage-qa.json');
const mdPath=join(outDir,'media-coverage-qa.md');
const patchPath='docs/engineer-osint/b11-patch.json';
const audit=JSON.parse(readFileSync(auditPath,'utf8'));
const currentPatch=JSON.parse(readFileSync(patchPath,'utf8'));
const runs=Array.isArray(audit.runs)?audit.runs:[];
const canonical=Array.isArray(audit.canonical_media)?audit.canonical_media:[];
const runtimeSources=Array.isArray(audit.runtime?.source_media)?audit.runtime.source_media:[];

function asArray(v){return Array.isArray(v)?v:[]}
function mediaArrays(p){
  const direct=[];
  direct.push(...asArray(p.new_media));
  if(Array.isArray(p.media)) direct.push(...p.media);
  else if(p.media&&typeof p.media==='object') direct.push(...asArray(p.media.new_media),...asArray(p.media.items));
  if(p.multimedia&&typeof p.multimedia==='object') direct.push(...asArray(p.multimedia.new_media),...asArray(p.multimedia.items));
  return direct;
}

const canonicalUrls=new Set(canonical.flatMap(x=>[x?.url,x?.exact_url,x?.source_url]).filter(Boolean).map(String));
const sourceOnly=runtimeSources.filter(s=>{
  const u=String(s?.url||s?.source_url||'');
  return u&&!canonicalUrls.has(u);
});

const missingSweepStatus=runs.filter(r=>!r.multimedia_status && (r.declared_new_media||r.materialized_media_items||r.worth_watching||r.worth_listening||r.media_url_mentions));
const declaredWithoutArray=(audit.anomalies||[]).filter(x=>x.type==='DECLARED_NEW_MEDIA_WITHOUT_MEDIA_ARRAY');
const canonicalWithZeroDeclared=(audit.anomalies||[]).filter(x=>x.type==='MEDIA_ARRAY_PRESENT_WITH_ZERO_DECLARED_COUNT');

const currentRunId=currentPatch?.state?.run_id||null;
const currentMultimediaStatus=currentPatch?.multimedia?.status||null;
const currentDeclared=Number(currentPatch?.state?.counts?.NEW_MEDIA??currentPatch?.counts?.NEW_MEDIA??0)||0;
const currentMediaItems=mediaArrays(currentPatch).length;
const currentWorthWatching=asArray(currentPatch?.multimedia?.worth_watching).length;
const currentWorthListening=asArray(currentPatch?.multimedia?.worth_listening).length;
const currentExplicitZeroSweep=Boolean(currentRunId&&currentMultimediaStatus&&currentDeclared===0&&currentMediaItems===0);

const qaIssues=[];
for(const x of missingSweepStatus)qaIssues.push({severity:'WARN',type:'MEDIA_SWEEP_STATUS_MISSING',run_id:x.run,message:'Historical run has media-related evidence but no explicit multimedia.status.'});
for(const x of declaredWithoutArray)qaIssues.push({severity:'ERROR',type:x.type,run_id:x.run,message:'Historical run declares NEW_MEDIA > 0 but no materialized media item is present in the patch.'});
for(const x of canonicalWithZeroDeclared)qaIssues.push({severity:'WARN',type:x.type,run_id:x.run,message:'Historical patch contains materialized media while declared NEW_MEDIA is zero; verify update/backfill semantics.'});
for(const s of sourceOnly)qaIssues.push({severity:'INFO',type:'SOURCE_MEDIA_NOT_CANONICALIZED',source_id:s.id||null,url:s.url||s.source_url||null,message:'Media-capable canonical source URL exists in built runtime but is absent from historical canonical media records. Public presentation may derive it, but persistent media_registry canonicalization remains backlog.'});

if(!currentRunId)qaIssues.push({severity:'ERROR',type:'CURRENT_RUN_ID_MISSING',message:'Current b11 patch has no state.run_id.'});
if(!currentMultimediaStatus)qaIssues.push({severity:'ERROR',type:'CURRENT_MEDIA_SWEEP_STATUS_MISSING',run_id:currentRunId,message:'Current run does not explicitly record multimedia.status, so NEW_MEDIA=0 cannot be distinguished from a skipped sweep.'});
if(currentDeclared>0&&currentMediaItems===0)qaIssues.push({severity:'ERROR',type:'CURRENT_DECLARED_NEW_MEDIA_WITHOUT_MEDIA_ARRAY',run_id:currentRunId,message:'Current run declares NEW_MEDIA > 0 but has no materialized media item.'});
if(currentMediaItems>0&&currentDeclared===0)qaIssues.push({severity:'WARN',type:'CURRENT_MEDIA_ARRAY_WITH_ZERO_DECLARED_COUNT',run_id:currentRunId,message:'Current run contains media items while NEW_MEDIA=0; verify whether these are updates/backfill rather than new media.'});

const errorCount=qaIssues.filter(x=>x.severity==='ERROR').length;
const warningCount=qaIssues.filter(x=>x.severity==='WARN').length;
const status=errorCount?'FAIL_STRUCTURAL':(qaIssues.length?'PASS_WITH_BACKLOG':'PASS');
const report={
  generated_at:new Date().toISOString(),
  status,
  interpretation:'A zero media count is not treated as a failure by itself. The current run is checked directly so an explicit completed multimedia sweep with zero canonical additions is distinguishable from a skipped sweep. Historical issues and source-only media remain visible as backlog.',
  current_run:{
    run_id:currentRunId,
    multimedia_status:currentMultimediaStatus,
    declared_new_media:currentDeclared,
    materialized_media_items:currentMediaItems,
    worth_watching_items:currentWorthWatching,
    worth_listening_items:currentWorthListening,
    explicit_completed_zero_addition_sweep:currentExplicitZeroSweep
  },
  summary:{
    runs_scanned:audit.unique_runs_scanned||0,
    canonical_media_records:audit.summary?.canonical_media_records||0,
    runtime_source_media_urls:audit.summary?.runtime_source_media_urls||0,
    source_media_not_canonicalized:sourceOnly.length,
    media_sweep_status_missing:missingSweepStatus.length,
    declared_new_media_without_array:declaredWithoutArray.length,
    media_array_with_zero_declared:canonicalWithZeroDeclared.length,
    current_run_media_status_present:Boolean(currentMultimediaStatus),
    current_run_explicit_zero_sweep:currentExplicitZeroSweep,
    error_count:errorCount,
    warning_count:warningCount,
    info_count:qaIssues.filter(x=>x.severity==='INFO').length
  },
  issues:qaIssues
};
writeFileSync(outPath,JSON.stringify(report,null,2));
const md=[
  '# ENGINEER OSINT media coverage QA','',
  `Status: **${status}**`,'',
  report.interpretation,'',
  '## Current run','',
  `- RUN_ID: **${currentRunId||'MISSING'}**`,
  `- multimedia.status: **${currentMultimediaStatus||'MISSING'}**`,
  `- NEW_MEDIA: **${currentDeclared}**`,
  `- Materialized media items: **${currentMediaItems}**`,
  `- Explicit completed zero-addition sweep: **${currentExplicitZeroSweep?'YES':'NO'}**`,'',
  '## Historical / persistence coverage','',
  `- Runs scanned: **${report.summary.runs_scanned}**`,
  `- Canonical media records: **${report.summary.canonical_media_records}**`,
  `- Media-capable source URLs in built runtime: **${report.summary.runtime_source_media_urls}**`,
  `- Source media URLs not persisted in canonical media history: **${report.summary.source_media_not_canonicalized}**`,
  `- Historical media-related runs missing multimedia.status: **${report.summary.media_sweep_status_missing}**`,
  `- Historical declared NEW_MEDIA without media array: **${report.summary.declared_new_media_without_array}**`,
  `- Historical media array present with NEW_MEDIA=0: **${report.summary.media_array_with_zero_declared}**`,'',
  '## Issues','',
  ...(qaIssues.length?qaIssues.map(x=>`- ${x.severity} · ${x.type}${x.run_id?' · '+x.run_id:''}${x.source_id?' · '+x.source_id:''}${x.url?' · '+x.url:''}: ${x.message}`):['- None'])
].join('\n');
writeFileSync(mdPath,md);
console.log(JSON.stringify({status,current_run:report.current_run,summary:report.summary}));
if(errorCount)process.exitCode=2;
