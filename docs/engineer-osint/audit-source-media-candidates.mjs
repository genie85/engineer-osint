import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const outDir='docs/engineer-osint-dist';
const html=readFileSync(join(outDir,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0) throw new Error('ENGINEER_DATA marker not found');
const D=JSON.parse(html.slice(a+marker.length,b));
const sources=Array.isArray(D.sources?.sources)?D.sources.sources:[];
const records=Array.isArray(D.records?.records)?D.records.records:[];
const canonical=[...(D.media_registry?.media||[]),...(D.media_registry?.items||[]),...(D.media?.media||[]),...(D.media?.items||[]),...(Array.isArray(D.media)?D.media:[])];

function classify(url=''){
  const u=String(url);
  if(/(?:youtu\.be\/[\w-]{6,}|youtube\.com\/(?:watch\?[^#]*v=[\w-]{6,}|shorts\/[\w-]{6,}|live\/[\w-]{6,}))/i.test(u)) return {kind:'YOUTUBE',asset_level:true};
  if(/youtube\.com/i.test(u)) return {kind:'YOUTUBE',asset_level:false};
  if(/spotify\.com\/episode\//i.test(u)||/podcasts\.apple\.com\/[^/]+\/podcast\/[^/]+\/id\d+\?i=\d+/i.test(u)||/soundcloud\.com\/[^/]+\/[^/?#]+/i.test(u)) return {kind:'PODCAST',asset_level:true};
  if(/podcast|spotify\.com|podcasts\.apple\.com|soundcloud/i.test(u)) return {kind:'PODCAST',asset_level:false};
  return null;
}
const canonicalUrls=new Set(canonical.flatMap(x=>[x?.url,x?.exact_url,x?.source_url]).filter(Boolean).map(String));
const candidates=[];
for(const s of sources){
  const url=s?.url||s?.source_url||'';const c=classify(url);if(!c)continue;
  const related=records.filter(r=>(r.source_ids||[]).includes(s.id)).map(r=>r.id);
  const alreadyCanonical=canonicalUrls.has(String(url));
  const metadata={title:Boolean(s.title||s.name),publisher:Boolean(s.publisher||s.organization),date:Boolean(s.publication_date),related:related.length>0};
  let disposition='PRESENTATION_ONLY_CONTAINER_URL';
  if(c.asset_level&&alreadyCanonical) disposition='ALREADY_CANONICAL';
  else if(c.asset_level&&metadata.title&&metadata.related) disposition='CANONICALIZATION_REVIEW_READY';
  else if(c.asset_level) disposition='ASSET_URL_METADATA_INCOMPLETE';
  candidates.push({source_id:s.id||null,kind:c.kind,url,asset_level:c.asset_level,already_canonical:alreadyCanonical,related_ids:related,metadata,disposition});
}
const report={generated_at:new Date().toISOString(),summary:{candidate_urls:candidates.length,asset_level:candidates.filter(x=>x.asset_level).length,container_level:candidates.filter(x=>!x.asset_level).length,already_canonical:candidates.filter(x=>x.disposition==='ALREADY_CANONICAL').length,review_ready:candidates.filter(x=>x.disposition==='CANONICALIZATION_REVIEW_READY').length,metadata_incomplete:candidates.filter(x=>x.disposition==='ASSET_URL_METADATA_INCOMPLETE').length},candidates};
writeFileSync(join(outDir,'source-media-candidates.json'),JSON.stringify(report,null,2));
const md=['# ENGINEER OSINT source media canonicalization candidates','',`Generated: ${report.generated_at}`,'',`- Candidate URLs: **${report.summary.candidate_urls}**`,`- Asset-level URLs: **${report.summary.asset_level}**`,`- Container/channel URLs: **${report.summary.container_level}**`,`- Already canonical: **${report.summary.already_canonical}**`,`- Canonicalization review ready: **${report.summary.review_ready}**`,`- Asset URLs with incomplete metadata: **${report.summary.metadata_incomplete}**`,'','## Candidates','',...(candidates.length?candidates.map(x=>`- ${x.disposition} · ${x.kind} · ${x.source_id||'NO_ID'} · ${x.url} · related=${x.related_ids.join(',')||'none'}`):['- None'])].join('\n');
writeFileSync(join(outDir,'source-media-candidates.md'),md);
console.log(JSON.stringify(report.summary));
