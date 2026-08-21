import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const outDir='docs/engineer-osint-dist';
const audit=JSON.parse(readFileSync(join(outDir,'media-history-audit.json'),'utf8'));
const currentPatch=JSON.parse(readFileSync('docs/engineer-osint/b11-patch.json','utf8'));
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
function classifyAsset(url=''){
  const u=String(url);
  if(/(?:youtu\.be\/[\w-]{6,}|youtube\.com\/(?:watch\?[^#]*v=[\w-]{6,}|shorts\/[\w-]{6,}|live\/[\w-]{6,}))/i.test(u)) return {kind:'YOUTUBE',asset_level:true};
  if(/youtube\.com/i.test(u)) return {kind:'YOUTUBE',asset_level:false};
  if(/spotify\.com\/episode\//i.test(u)||/podcasts\.apple\.com\/[^/]+\/podcast\/[^/]+\/id\d+\?i=\d+/i.test(u)||/soundcloud\.com\/[^/]+\/[^/?#]+/i.test(u)) return {kind:'PODCAST',asset_level:true};
  if(/podcast|spotify\.com|podcasts\.apple\.com|soundcloud/i.test(u)) return {kind:'PODCAST',asset_level:false};
  return null;
}

const canonicalUrls=new Set(canonical.flatMap(x=>[x?.url,x?.exact_url,x?.source_url]).filter(Boolean).map(String));
const sourceOnly=runtimeSources.filter(s=>{const u=String(s?.url||s?.source_url||'');return u&&!canonicalUrls.has(u)});
const sourceCandidates=runtimeSources.map(s=>{
  const url=String(s?.url||s?.source_url||'');const c=classifyAsset(url)||{kind:'UNKNOWN',asset_level:false};
  const metadata={title:Boolean(s.title||s.name),publisher:Boolean(s.publisher||s.organization),date:Boolean(s.publication_date)};
  let disposition='PRESENTATION_ONLY_CONTAINER_URL';
  if(c.asset_level&&canonicalUrls.has(url)) disposition='ALREADY_CANONICAL';
  else if(c.asset_level&&metadata.title) disposition='CANONICALIZATION_REVIEW_READY';
  else if(c.asset_level) disposition='ASSET_URL_METADATA_INCOMPLETE';
  return {source_id:s.id||null,kind:c.kind,url,asset_level:c.asset_level,already_canonical:canonicalUrls.has(url),metadata,disposition};
});

const missingSweepStatus=runs.filter(r=>!r.multimedia_status&&(r.declared_new_media||r.materialized_media_items||r.worth_watching||r.worth_listening||r.media_url_mentions));
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
for(const x of missingSweepStatus)qaIssues.push({scope:'HISTORICAL',severity:'WARN',type:'MEDIA_SWEEP_STATUS_MISSING',run_id:x.run,message:'Historical run has media-related evidence but no explicit multimedia.status.'});
for(const x of declaredWithoutArray)qaIssues.push({scope:'HISTORICAL',severity:'ERROR',type:x.type,run_id:x.run,message:'Historical run declares NEW_MEDIA > 0 but no materialized media item is present in the patch.'});
for(const x of canonicalWithZeroDeclared)qaIssues.push({scope:'HISTORICAL',severity:'WARN',type:x.type,run_id:x.run,message:'Historical patch contains materialized media while declared NEW_MEDIA is zero; verify update/backfill semantics.'});
for(const s of sourceOnly)qaIssues.push({scope:'PERSISTENCE',severity:'INFO',type:'SOURCE_MEDIA_NOT_CANONICALIZED',source_id:s.id||null,url:s.url||s.source_url||null,message:'Media-capable source URL exists in built runtime but is absent from historical canonical media records.'});
if(!currentRunId)qaIssues.push({scope:'CURRENT',severity:'ERROR',type:'CURRENT_RUN_ID_MISSING',message:'Current b11 patch has no state.run_id.'});
if(!currentMultimediaStatus)qaIssues.push({scope:'CURRENT',severity:'ERROR',type:'CURRENT_MEDIA_SWEEP_STATUS_MISSING',run_id:currentRunId,message:'Current run does not explicitly record multimedia.status.'});
if(currentDeclared>0&&currentMediaItems===0)qaIssues.push({scope:'CURRENT',severity:'ERROR',type:'CURRENT_DECLARED_NEW_MEDIA_WITHOUT_MEDIA_ARRAY',run_id:currentRunId,message:'Current run declares NEW_MEDIA > 0 but has no materialized media item.'});
if(currentMediaItems>0&&currentDeclared===0)qaIssues.push({scope:'CURRENT',severity:'WARN',type:'CURRENT_MEDIA_ARRAY_WITH_ZERO_DECLARED_COUNT',run_id:currentRunId,message:'Current run contains media items while NEW_MEDIA=0; verify update/backfill semantics.'});

const currentErrors=qaIssues.filter(x=>x.scope==='CURRENT'&&x.severity==='ERROR');
const historicalErrors=qaIssues.filter(x=>x.scope==='HISTORICAL'&&x.severity==='ERROR');
const sourceSummary={total:sourceCandidates.length,asset_level:sourceCandidates.filter(x=>x.asset_level).length,container_level:sourceCandidates.filter(x=>!x.asset_level).length,already_canonical:sourceCandidates.filter(x=>x.disposition==='ALREADY_CANONICAL').length,review_ready:sourceCandidates.filter(x=>x.disposition==='CANONICALIZATION_REVIEW_READY').length,metadata_incomplete:sourceCandidates.filter(x=>x.disposition==='ASSET_URL_METADATA_INCOMPLETE').length};
const report={
  generated_at:new Date().toISOString(),
  status:currentErrors.length?'FAIL_CURRENT_RUN':historicalErrors.length?'PASS_WITH_HISTORICAL_STRUCTURAL_BACKLOG':qaIssues.length?'PASS_WITH_BACKLOG':'PASS',
  publish_gate:{mode:'CURRENT_RUN_ONLY',pass:currentErrors.length===0,blocking_error_count:currentErrors.length,historical_structural_errors_block_deploy:false},
  interpretation:'Deployment is blocked only by current-run multimedia structural failures. Historical inconsistencies and source-only media remain backlog. Only asset-level YouTube/podcast URLs are eligible for source-derived presentation materialization; channel/show/container URLs are not rendered as individual media items.',
  current_run:{run_id:currentRunId,multimedia_status:currentMultimediaStatus,declared_new_media:currentDeclared,materialized_media_items:currentMediaItems,worth_watching_items:currentWorthWatching,worth_listening_items:currentWorthListening,explicit_completed_zero_addition_sweep:currentExplicitZeroSweep},
  source_media_candidates:{...sourceSummary,items:sourceCandidates},
  summary:{runs_scanned:audit.unique_runs_scanned||0,canonical_media_records:audit.summary?.canonical_media_records||0,runtime_source_media_urls:audit.summary?.runtime_source_media_urls||0,source_media_not_canonicalized:sourceOnly.length,media_sweep_status_missing:missingSweepStatus.length,declared_new_media_without_array:declaredWithoutArray.length,media_array_with_zero_declared:canonicalWithZeroDeclared.length,current_run_media_status_present:Boolean(currentMultimediaStatus),current_run_explicit_zero_sweep:currentExplicitZeroSweep,current_blocking_error_count:currentErrors.length,historical_structural_error_count:historicalErrors.length,warning_count:qaIssues.filter(x=>x.severity==='WARN').length,info_count:qaIssues.filter(x=>x.severity==='INFO').length},
  issues:qaIssues
};
writeFileSync(join(outDir,'media-coverage-qa.json'),JSON.stringify(report,null,2));
writeFileSync(join(outDir,'source-media-candidates.json'),JSON.stringify({generated_at:report.generated_at,summary:sourceSummary,items:sourceCandidates},null,2));
writeFileSync(join(outDir,'source-media-candidates.md'),['# ENGINEER OSINT source media canonicalization candidates','',`Generated: ${report.generated_at}`,'',`- Candidate URLs: **${sourceSummary.total}**`,`- Asset-level URLs: **${sourceSummary.asset_level}**`,`- Container/channel URLs: **${sourceSummary.container_level}**`,`- Already canonical: **${sourceSummary.already_canonical}**`,`- Canonicalization review ready: **${sourceSummary.review_ready}**`,`- Asset URLs with incomplete metadata: **${sourceSummary.metadata_incomplete}**`,'','## Candidates','',...(sourceCandidates.length?sourceCandidates.map(x=>`- ${x.disposition} · ${x.kind} · ${x.source_id||'NO_ID'} · ${x.url}`):['- None'])].join('\n'));
writeFileSync(join(outDir,'media-coverage-qa.md'),['# ENGINEER OSINT media coverage QA','',`Status: **${report.status}**`,`Current-run publish gate: **${report.publish_gate.pass?'PASS':'FAIL'}**`,'',report.interpretation,'','## Current run','',`- RUN_ID: **${currentRunId||'MISSING'}**`,`- multimedia.status: **${currentMultimediaStatus||'MISSING'}**`,`- NEW_MEDIA: **${currentDeclared}**`,`- Materialized media items: **${currentMediaItems}**`,`- worth_watching: **${currentWorthWatching}**`,`- worth_listening: **${currentWorthListening}**`,`- Explicit completed zero-addition sweep: **${currentExplicitZeroSweep?'YES':'NO'}**`,'','## Source media candidates','',`- Asset-level: **${sourceSummary.asset_level}**`,`- Container/channel: **${sourceSummary.container_level}**`,`- Review ready: **${sourceSummary.review_ready}**`,'','## Historical / persistence coverage','',`- Runs scanned: **${report.summary.runs_scanned}**`,`- Canonical media records: **${report.summary.canonical_media_records}**`,`- Source media URLs not persisted: **${report.summary.source_media_not_canonicalized}**`,`- Historical structural errors (non-blocking): **${historicalErrors.length}**`,'','## Issues','',...(qaIssues.length?qaIssues.map(x=>`- ${x.scope} · ${x.severity} · ${x.type}${x.run_id?' · '+x.run_id:''}${x.source_id?' · '+x.source_id:''}${x.url?' · '+x.url:''}: ${x.message}`):['- None'])].join('\n'));
console.log(JSON.stringify({status:report.status,publish_gate:report.publish_gate,current_run:report.current_run,source_media_candidates:sourceSummary,summary:report.summary}));
if(currentErrors.length)process.exitCode=2;
