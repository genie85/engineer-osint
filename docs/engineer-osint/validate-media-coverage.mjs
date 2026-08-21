import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const outDir='docs/engineer-osint-dist';
const auditPath=join(outDir,'media-history-audit.json');
const outPath=join(outDir,'media-coverage-qa.json');
const mdPath=join(outDir,'media-coverage-qa.md');
const audit=JSON.parse(readFileSync(auditPath,'utf8'));
const runs=Array.isArray(audit.runs)?audit.runs:[];
const canonical=Array.isArray(audit.canonical_media)?audit.canonical_media:[];
const runtimeSources=Array.isArray(audit.runtime?.source_media)?audit.runtime.source_media:[];

const canonicalUrls=new Set(canonical.flatMap(x=>[x?.url,x?.exact_url,x?.source_url]).filter(Boolean).map(String));
const sourceOnly=runtimeSources.filter(s=>{
  const u=String(s?.url||s?.source_url||'');
  return u&&!canonicalUrls.has(u);
});

const missingSweepStatus=runs.filter(r=>!r.multimedia_status && (r.declared_new_media||r.materialized_media_items||r.worth_watching||r.worth_listening||r.media_url_mentions));
const declaredWithoutArray=(audit.anomalies||[]).filter(x=>x.type==='DECLARED_NEW_MEDIA_WITHOUT_MEDIA_ARRAY');
const canonicalWithZeroDeclared=(audit.anomalies||[]).filter(x=>x.type==='MEDIA_ARRAY_PRESENT_WITH_ZERO_DECLARED_COUNT');

const qaIssues=[];
for(const x of missingSweepStatus)qaIssues.push({severity:'WARN',type:'MEDIA_SWEEP_STATUS_MISSING',run_id:x.run,message:'Run has media-related evidence but no explicit multimedia.status.'});
for(const x of declaredWithoutArray)qaIssues.push({severity:'ERROR',type:x.type,run_id:x.run,message:'Run declares NEW_MEDIA > 0 but no materialized media item is present in the patch.'});
for(const x of canonicalWithZeroDeclared)qaIssues.push({severity:'WARN',type:x.type,run_id:x.run,message:'Patch contains materialized media while declared NEW_MEDIA is zero; verify update/backfill semantics.'});
for(const s of sourceOnly)qaIssues.push({severity:'INFO',type:'SOURCE_MEDIA_NOT_CANONICALIZED',source_id:s.id||null,url:s.url||s.source_url||null,message:'Media-capable canonical source URL exists in built runtime but is absent from historical canonical media records. Public presentation may derive it, but persistent media_registry canonicalization remains backlog.'});

const errorCount=qaIssues.filter(x=>x.severity==='ERROR').length;
const status=errorCount?'FAIL_STRUCTURAL':'PASS_WITH_BACKLOG';
const report={
  generated_at:new Date().toISOString(),
  status,
  interpretation:'A zero media count is not treated as a failure by itself. This gate distinguishes a legitimate no-addition result from missing sweep evidence, structural NEW_MEDIA inconsistencies, and media URLs that exist only as source-linked presentation derivatives.',
  summary:{
    runs_scanned:audit.unique_runs_scanned||0,
    canonical_media_records:audit.summary?.canonical_media_records||0,
    runtime_source_media_urls:audit.summary?.runtime_source_media_urls||0,
    source_media_not_canonicalized:sourceOnly.length,
    media_sweep_status_missing:missingSweepStatus.length,
    declared_new_media_without_array:declaredWithoutArray.length,
    media_array_with_zero_declared:canonicalWithZeroDeclared.length,
    error_count:errorCount,
    warning_count:qaIssues.filter(x=>x.severity==='WARN').length,
    info_count:qaIssues.filter(x=>x.severity==='INFO').length
  },
  issues:qaIssues
};
writeFileSync(outPath,JSON.stringify(report,null,2));
const md=[
  '# ENGINEER OSINT media coverage QA','',
  `Status: **${status}**`,'',
  report.interpretation,'',
  `- Runs scanned: **${report.summary.runs_scanned}**`,
  `- Canonical media records: **${report.summary.canonical_media_records}**`,
  `- Media-capable source URLs in built runtime: **${report.summary.runtime_source_media_urls}**`,
  `- Source media URLs not persisted in canonical media history: **${report.summary.source_media_not_canonicalized}**`,
  `- Runs with media-related evidence but missing multimedia.status: **${report.summary.media_sweep_status_missing}**`,
  `- Declared NEW_MEDIA without media array: **${report.summary.declared_new_media_without_array}**`,
  `- Media array present with NEW_MEDIA=0: **${report.summary.media_array_with_zero_declared}**`,'',
  '## Issues','',
  ...(qaIssues.length?qaIssues.map(x=>`- ${x.severity} · ${x.type}${x.run_id?' · '+x.run_id:''}${x.source_id?' · '+x.source_id:''}${x.url?' · '+x.url:''}: ${x.message}`):['- None'])
].join('\n');
writeFileSync(mdPath,md);
console.log(JSON.stringify(report.summary));
if(errorCount)process.exitCode=2;
