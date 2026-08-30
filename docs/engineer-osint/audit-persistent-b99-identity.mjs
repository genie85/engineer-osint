import {createHash} from 'node:crypto';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4537_B99_LIFECYCLE.json'),'utf8'));
const candidatePolicy=JSON.parse(readFileSync(join(src,'V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`PERSISTENT_B99_IDENTITY: ${message}`)};
const sha256=text=>createHash('sha256').update(text).digest('hex');
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});

if(policy.status!=='LIFECYCLE_HARDENING_NO_APPEND_AUTHORIZATION')fail('lifecycle policy status drift');
if(policy.b99_file_sha256!==candidatePolicy.exact_candidate_file_sha256||policy.b99_canonical_sha256!==candidatePolicy.expected_resulting_canonical_sha256)fail('v4.5.36 exact hash handoff drift');
for(const value of Object.values(policy.safety))if(value!==false)fail('lifecycle safety boundary broadened');

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b99Index=manifest.runs.findIndex(entry=>entry.run_id===policy.b99_run_id);
if(b99Index<0||b99Index!==manifest.runs.findLastIndex(entry=>entry.run_id===policy.b99_run_id))fail('unique persistent B99 manifest entry missing');
const currentIndex=manifest.runs.length-1;
if(currentIndex<b99Index)fail('current tip predates B99');
const entry=manifest.runs[b99Index];
if(entry.parent_run_id!==policy.b98_run_id||entry.parent_canonical_sha256!==policy.b98_canonical_sha256)fail('B99 parent lineage drift');
if(entry.file_sha256!==policy.b99_file_sha256||entry.canonical_sha256!==policy.b99_canonical_sha256)fail('B99 manifest hash drift');
if(entry.path!=='data/runs/engineer-osint-20260830-B99.json')fail(`unexpected B99 path ${entry.path}`);
const raw=readFileSync(join(src,entry.path),'utf8');
if(sha256(raw)!==policy.b99_file_sha256)fail('persistent B99 raw file hash drift');
const run=parseJsonStrict(raw,{source:entry.path});
if(run.state?.run_id!==policy.b99_run_id||run.state?.parent_run_id!==policy.b98_run_id)fail('B99 run identity drift');
const operations=run.extensions?.operations_v1||[];
if(operations.length!==policy.operation_count)fail(`B99 operation count ${operations.length}`);
if(operations.filter(item=>item.op==='REPLACE_FIELD').length!==policy.replace_field_count)fail('B99 replace count drift');
if(operations.filter(item=>item.op==='REMOVE_FIELD').length!==policy.remove_field_count)fail('B99 remove count drift');
const sync=run.extensions?.legacy_mirror_sync_v1?.updated_records||[];
if(sync.length!==policy.mirror_sync_request_count)fail('B99 mirror sync request count drift');
if(sync[0]?.target_id!==policy.mirror_sync_target_id||sync[0]?.fields?.length!==policy.mirror_sync_field_count)fail('B99 mirror sync scope drift');
if(JSON.stringify(sync[0].fields)!==JSON.stringify(candidatePolicy.sync_fields))fail('B99 mirror sync exact fields drift');

if(store.report.current_run_id!==manifest.runs[currentIndex].run_id||store.report.canonical_sha256!==manifest.runs[currentIndex].canonical_sha256)fail('current store report/manifest tip mismatch');
if(currentIndex===b99Index&&store.report.canonical_sha256!==policy.b99_canonical_sha256)fail('exact B99 current canonical SHA drift');
const identityFile='data-integrity-identity-fixes.js';
if(JSON.stringify(LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file))!==JSON.stringify([identityFile]))fail('identity-fix is not sole active legacy factual overlay');
if(!PUBLIC_RUNTIME_MODULES.some(([,file])=>file===identityFile))fail('identity-fix runtime unexpectedly absent');
const baseline=readJson('legacy-runtime-overlay-baseline.json');
if(Object.keys(baseline.modules||{}).length!==1||!baseline.modules?.[identityFile])fail('active legacy baseline is not identity-fix only');
const overlayCode=readFileSync(join(src,identityFile),'utf8');
const resolved=structuredClone(store.data);
vm.runInNewContext(overlayCode,{window:{__ENGINEER_DATA__:resolved},console},{filename:identityFile,timeout:3000});
const residual=deepDiff(store.data,resolved);
if(residual.length!==policy.expected_identity_overlay_residual_after_b99)fail(`identity overlay residual after persistent B99: ${residual.length}`);

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-persistent-b99-identity-audit-v1',
  mode:currentIndex===b99Index?'EXACT_PERSISTENT_B99':'POST_B99_DESCENDANT',
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b99:{run_id:policy.b99_run_id,parent_run_id:policy.b98_run_id,file_sha256:policy.b99_file_sha256,canonical_sha256:policy.b99_canonical_sha256,manifest_index:b99Index,status:'PASS'},
  operation_count:operations.length,replace_field_count:policy.replace_field_count,remove_field_count:policy.remove_field_count,
  mirror_sync_request_count:sync.length,mirror_sync_target_id:sync[0].target_id,mirror_sync_field_count:sync[0].fields.length,
  identity_fix_runtime_active:true,identity_overlay_residual_mutations:residual.length,
  b99_append_authorized:false,identity_fix_runtime_removal_authorized:false,identity_overlay_retirement_authorized:false,canonical_write_performed:false
};
writeFileSync(join(dist,'persistent-b99-identity-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'persistent-b99-identity-audit.md'),`# ENGINEER OSINT v4.5.37 — persistent B99 identity lifecycle audit\n\nStatus: **PASS**\nMode: **${report.mode}**\nCurrent run: **${report.current_run_id}**\n\n- exact historical B99 file/canonical hashes: **PASS**\n- identity operations: **36** (27 replace + 9 remove)\n- legacy mirror sync: **1 request / 18 fields / ENG-TECH-0036**\n- identity-fix runtime remains active: **yes**\n- identity overlay residual mutations: **0**\n- B99 append authorization from this audit: **no**\n- identity overlay retirement authorization: **no**\n- canonical writes: **0**\n`);
appendFileSync(join(dist,'health.txt'),`persistent_b99_identity=pass\npersistent_b99_identity_mode=${report.mode}\npersistent_b99_identity_run=${report.current_run_id}\npersistent_b99_identity_residual_mutations=0\npersistent_b99_identity_runtime_active=1\npersistent_b99_append_authorized=0\npersistent_b99_identity_retirement_authorized=0\npersistent_b99_canonical_writes=0\n`);
console.log(`PERSISTENT_B99_IDENTITY=PASS mode=${report.mode} current=${report.current_run_id} residual=0 runtime=active`);
