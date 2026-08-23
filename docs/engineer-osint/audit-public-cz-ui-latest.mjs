import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const canonical='docs/engineer-osint/audit-public-cz-ui.mjs';
const generated='docs/engineer-osint/.audit-public-cz-ui-latest.generated.mjs';
const src=readFileSync(canonical,'utf8');
let patched=src;

// A very small allow-list for public enum values whose correct Czech rendering is
// intentionally byte-for-byte identical to the base token. Do not generalize this
// to arbitrary equal strings: equality alone is not proof of localization.
const neutralEnumValues=['VIDEO'];
const mappedAnchor="const uiCs=context.window.__ENGINEER_I18N__?.ui?.cs||{};\nconst mappedCs=v=>{if(v===undefined||v===null)return undefined;const s=String(v);return uiCs[s]??uiCs[s.toUpperCase()]??rendererEnumCs[s]??rendererEnumCs[s.toUpperCase()];};";
const mappedReplacement=mappedAnchor+"\nconst explicitNeutralEnumCs=new Set("+JSON.stringify(neutralEnumValues)+");";
if(!patched.includes(mappedAnchor))throw new Error('PUBLIC_CZ_UI_LATEST: enum mapping anchor missing');
patched=patched.replace(mappedAnchor,mappedReplacement);
const conditionAnchor="mapped!==undefined&&String(mapped)!==String(base)";
const conditionReplacement="mapped!==undefined&&(String(mapped)!==String(base)||explicitNeutralEnumCs.has(String(base)))";
if(!patched.includes(conditionAnchor))throw new Error('PUBLIC_CZ_UI_LATEST: enum localization condition anchor missing');
patched=patched.replace(conditionAnchor,conditionReplacement);

writeFileSync(generated,patched,'utf8');
try{
  await import(pathToFileURL(generated).href+'?v='+Date.now());
}finally{
  try{unlinkSync(generated)}catch{}
}

// These fields are intentionally not safe translation backlog. They are structured
// status/enum values requiring controlled mapping. The two former semantic identity
// conflicts (ENG-TECH-0036 and ENG-VIS-0054) are no longer listed here because the
// data-integrity module repairs their canonical identities before this audit runs.
const explicitFieldReview=new Map([
  ['ENG-SIG-0014',new Map([['maturity','structured-enum-composite-review']])],
  ['ENG-SRC-0455',new Map([['role','structured-enum-mixed-case-review']])],
  ['ENG-VIS-0001',new Map([['observation_basis','structured-status-composite-review'],['verification_status','structured-status-composite-review']])],
  ['ENG-VIS-0002',new Map([['observation_basis','structured-status-composite-review'],['verification_status','structured-status-composite-review']])]
]);

const jsonPath='docs/engineer-osint-dist/public-cz-ui-audit.json';
const mdPath='docs/engineer-osint-dist/public-cz-ui-audit.md';
const report=JSON.parse(readFileSync(jsonPath,'utf8'));
for(const item of report.items||[]){
  const rules=explicitFieldReview.get(item.id);if(!rules||!Array.isArray(item.missing_fields))continue;
  const keep=[];
  for(const field of item.missing_fields){
    const reason=rules.get(field);
    if(!reason){keep.push(field);continue}
    item.review_fields=item.review_fields||[];
    const marker=`${field}:${reason}`;
    if(!item.review_fields.includes(marker))item.review_fields.push(marker);
  }
  item.missing_fields=keep;
  if(!keep.length)item.status='TRANSLATION_REVIEW_NEEDED';
}
report.PUBLIC_CZ_UI_BACKLOG_ITEMS=(report.items||[]).filter(x=>(x.missing_fields||[]).length).length;
report.PUBLIC_CZ_UI_BACKLOG_FIELDS=(report.items||[]).reduce((n,x)=>n+(x.missing_fields||[]).length,0);
report.TRANSLATION_REVIEW_NEEDED=(report.items||[]).filter(x=>x.status==='TRANSLATION_REVIEW_NEEDED').length;
report.TRANSLATION_REVIEW_FIELDS=(report.items||[]).reduce((n,x)=>n+(x.review_fields||[]).length,0);
report.status=report.PUBLIC_CZ_UI_BACKLOG_FIELDS===0&&report.I18N_RENDERING_FAILURE===0?(report.TRANSLATION_REVIEW_FIELDS?'PUBLIC_CZ_UI_BACKLOG_ZERO_WITH_REVIEWS':'PUBLIC_CZ_UI_BACKLOG_ZERO'):'PUBLIC_CZ_UI_BACKLOG_OPEN';
writeFileSync(jsonPath,JSON.stringify(report,null,2)+'\n');
const md=['# PUBLIC-CZ-UI audit','',`Run: ${report.current_run_id}`,`FULLY_LOCALIZED_PUBLIC_ITEMS: ${report.FULLY_LOCALIZED_PUBLIC_ITEMS}`,`PARTIALLY_LOCALIZED_PUBLIC_ITEMS: ${report.PARTIALLY_LOCALIZED_PUBLIC_ITEMS}`,`TRANSLATION_REVIEW_NEEDED: ${report.TRANSLATION_REVIEW_NEEDED}`,`PUBLIC_CZ_UI_BACKLOG_ITEMS/FIELDS: ${report.PUBLIC_CZ_UI_BACKLOG_ITEMS}/${report.PUBLIC_CZ_UI_BACKLOG_FIELDS}`,`I18N_RENDERING_FAILURE: ${report.I18N_RENDERING_FAILURE}`,`ENUM_MAPPED_PUBLIC_FIELDS: ${report.ENUM_MAPPED_PUBLIC_FIELDS}`,`ENUM_TRANSLATION_REVIEW_FIELDS: ${report.ENUM_TRANSLATION_REVIEW_FIELDS}`,`RENDERER_ENUM_MAPPINGS: ${report.RENDERER_ENUM_MAPPINGS}`,`CS_CONTENT_QUALITY_REVIEW_FIELDS: ${report.CS_CONTENT_QUALITY_REVIEW_FIELDS}`,'',`STATUS: ${report.status}`,'','## Canaries',...Object.entries(report.canaries||{}).map(([k,v])=>`- ${k}: ${v.status}`),'','## Backlog / review',...((report.items||[]).length?(report.items||[]).slice(0,300).map(x=>`- ${x.group} ${x.id}: ${x.status}; missing=${(x.missing_fields||[]).join(',')||'-'}; review=${(x.review_fields||[]).join(',')||'-'}`):['- None'])].join('\n')+'\n';
writeFileSync(mdPath,md);
