import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,mutationFingerprint,parseJsonStrict,validatePublicUrls} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('OVERLAY_RETIREMENT_AUDIT: ENGINEER_DATA marker missing');
const canonical=parseJsonStrict(html.slice(a+marker.length,b),{source:'built canonical ENGINEER_DATA'});
validatePublicUrls(canonical);
const history=loadCanonicalRunStore({root:src}).report;
const baseline=parseJsonStrict(readFileSync(join(src,'legacy-runtime-overlay-baseline.json'),'utf8'),{source:'legacy overlay baseline'});
const resolved=structuredClone(canonical),context={window:{__ENGINEER_DATA__:resolved},console};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const modules=[];

for(const [,file] of LEGACY_FACTUAL_OVERLAY_MODULES){
  const expected=baseline.modules[file];
  if(!expected)throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} has no pinned baseline`);
  const code=readFileSync(join(src,file),'utf8');
  const fileHash=createHash('sha256').update(code).digest('hex');
  if(fileHash!==expected.file_sha256)throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} changed without migration review`);

  const before=structuredClone(resolved);
  vm.runInNewContext(code,context,{filename:file,timeout:3000});
  const changes=deepDiff(before,resolved),changedIds=new Set(),unscoped=[];
  for(const change of changes){
    const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\]/);
    if(!match){
      if(change.path!=='rich_backfill_meta'&&!change.path.startsWith('rich_backfill_meta.'))unscoped.push(change.path);
      continue;
    }
    const item=objectAt(resolved,match[1],match[2],Number(match[3]))||objectAt(before,match[1],match[2],Number(match[3]));
    const id=item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.evidence_id||item?.relation_id;
    if(id)changedIds.add(id);else unscoped.push(change.path);
  }
  const unexpected=[...changedIds].filter(id=>!expected.allowed_target_ids.includes(id));
  if(unexpected.length||unscoped.length)throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} escaped pinned targets: ${[...unexpected,...unscoped.slice(0,10)].join(', ')}`);
  const exactPinnedBaseline=canonical.state_latest?.run_id===baseline.baseline_run_id;
  if(exactPinnedBaseline&&(changes.length!==expected.mutation_count||mutationFingerprint(changes)!==expected.mutation_fingerprint))throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} no longer matches pinned baseline`);

  modules.push({
    file,
    file_sha256:fileHash,
    mutation_count:changes.length,
    changed_ids:[...changedIds].sort(),
    retirement_status:changes.length===0?'READY_FOR_RETIREMENT_REVIEW':'ACTIVE_MUTATION_DEBT'
  });
}
validatePublicUrls(resolved);

const ready=modules.filter(x=>x.retirement_status==='READY_FOR_RETIREMENT_REVIEW').length;
const blocked=modules.length-ready;
const mutations=modules.reduce((n,x)=>n+x.mutation_count,0);
const report={
  generated_at:new Date().toISOString(),
  status:'PASS',
  policy:'ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT',
  policy_note:'Zero current mutations are necessary but not sufficient: removal still requires regression tests, public-output comparison and baseline/manifest cleanup.',
  current_run_id:history.current_run_id,
  canonical_sha256:history.canonical_sha256,
  module_count:modules.length,
  ready_count:ready,
  blocked_count:blocked,
  total_current_mutations:mutations,
  modules
};
writeFileSync(join(dist,'overlay-retirement-audit.json'),JSON.stringify(report,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT overlay retirement audit','',
  `Generated: ${report.generated_at}`,
  `Current canonical run: **${report.current_run_id}**`,
  `Canonical SHA-256: \`${report.canonical_sha256}\``,'',
  `Policy: **${report.policy}**`,'',
  'A zero current mutation count is a necessary retirement gate, not automatic authorization to delete a module. A candidate still requires public-output comparison, regression tests and baseline/runtime-manifest cleanup.','',
  `- Ready for retirement review: **${ready}**`,
  `- Blocked by active mutations: **${blocked}**`,
  `- Total current overlay mutations: **${mutations}**`,'',
  '| Module | Current mutations | Changed IDs | Retirement status |','|---|---:|---|---|',
  ...modules.map(x=>`| \`${x.file}\` | ${x.mutation_count} | ${x.changed_ids.length?x.changed_ids.map(id=>`\`${id}\``).join(', '):'—'} | \`${x.retirement_status}\` |`),'',
  'No canonical data, append-only run, source, evidence or claim is modified by this audit.'
].join('\n');
writeFileSync(join(dist,'overlay-retirement-audit.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_retirement_audit=pass\noverlay_retirement_policy=zero-current-mutations\noverlay_retirement_ready=${ready}\noverlay_retirement_blocked=${blocked}\nlegacy_factual_overlay_mutations=${mutations}\n`,'utf8');
console.log(`Overlay retirement audit PASS: ${modules.map(x=>`${x.file}=${x.mutation_count}/${x.retirement_status}`).join('; ')}`);
