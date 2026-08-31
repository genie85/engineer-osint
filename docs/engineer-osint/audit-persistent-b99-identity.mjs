import {createHash} from 'node:crypto';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES,TRANSITION_RUNTIME_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4537_B99_LIFECYCLE.json'),'utf8'));
const candidatePolicy=JSON.parse(readFileSync(join(src,'V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`PERSISTENT_B99_IDENTITY: ${message}`)};
const sha256=text=>createHash('sha256').update(text).digest('hex');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});

if(policy.status!=='LIFECYCLE_HARDENING_NO_APPEND_AUTHORIZATION')fail('lifecycle policy status drift');
if(policy.b99_file_sha256!==candidatePolicy.exact_candidate_file_sha256||policy.b99_canonical_sha256!==candidatePolicy.expected_resulting_canonical_sha256)fail('v4.5.36 exact hash handoff drift');
for(const value of Object.values(policy.safety))if(value!==false)fail('historical B99 lifecycle safety boundary broadened');

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

const identityFile='data-integrity-identity-fixes.js',identityRuntimeId='engineer-data-integrity-identity-fixes-module';
const identityCode=readFileSync(join(src,identityFile),'utf8');
const activeLegacyFiles=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file);
const runtimeHasIdentity=PUBLIC_RUNTIME_MODULES.some(([id,file])=>id===identityRuntimeId&&file===identityFile);
const identityActive=activeLegacyFiles.length===1&&activeLegacyFiles[0]===identityFile&&runtimeHasIdentity;
const identityRetired=activeLegacyFiles.length===0&&!runtimeHasIdentity;
if(!identityActive&&!identityRetired)fail(`partial/inconsistent identity runtime state: legacy=${activeLegacyFiles.join(',')}; public=${runtimeHasIdentity}`);
if(!TRANSITION_RUNTIME_MODULES.some(([,file])=>file==='overlay-transition-runtime-guard.js'))fail('transition guard runtime unexpectedly absent');

const baseline=readJson('legacy-runtime-overlay-baseline.json');
let removalAuthorized=false,retirementAuthorized=false,retirementValidated=false,retirementPolicy=null;
if(identityActive){
  if(Object.keys(baseline.modules||{}).length!==1||!baseline.modules?.[identityFile])fail('active legacy baseline is not identity-fix only');
  if(baseline.version!==2||baseline.status!=='IDENTITY_FIX_MIGRATION_DEBT_ONLY')fail('active identity legacy baseline version/status drift');
}else{
  const auth=readJson('V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json');
  retirementPolicy=readJson('V4546_IDENTITY_FIX_RETIREMENT.json');
  if(auth.status!=='READY_FOR_EXACT_IDENTITY_FIX_RETIREMENT_SLICE'||auth.authorization?.allow_identity_fix_runtime_removal!==true||auth.authorization?.allow_identity_overlay_retirement!==true)fail('identity retirement lacks v4.5.45 authorization');
  if(auth.authorization?.allow_identity_fix_file_deletion!==false||auth.authorization?.allow_transition_guard_runtime_removal!==false||auth.authorization?.allow_canonical_data_edit!==false||auth.authorization?.allow_run_store_manifest_edit!==false)fail('identity retirement authorization scope broadened');
  if(retirementPolicy.status!=='AUTHORIZED_RETIREMENT_APPLIED'||retirementPolicy.required_persistent_run_id!==policy.b99_run_id||retirementPolicy.required_b99_file_sha256!==policy.b99_file_sha256||retirementPolicy.required_b99_canonical_sha256!==policy.b99_canonical_sha256)fail('v4.5.46 retirement policy/B99 handoff drift');
  if(retirementPolicy.identity_fix?.file!==identityFile||retirementPolicy.identity_fix?.runtime_id!==identityRuntimeId||gitBlobSha(identityCode)!==retirementPolicy.identity_fix?.git_blob_sha)fail('retired identity historical source drift');
  if(baseline.version!==3||baseline.status!=='NO_ACTIVE_LEGACY_FACTUAL_OVERLAY_DEBT'||Object.keys(baseline.modules||{}).length!==0||baseline.retired_identity_fix_at!=='v4.5.46')fail('retired active legacy baseline drift');
  removalAuthorized=true;retirementAuthorized=true;retirementValidated=true;
}

const resolved=structuredClone(store.data),context={window:{__ENGINEER_DATA__:resolved},console};
vm.runInNewContext(identityCode,context,{filename:identityFile,timeout:3000});
const residual=deepDiff(store.data,resolved);
if(residual.length!==policy.expected_identity_overlay_residual_after_b99)fail(`identity overlay residual after persistent B99: ${residual.length}`);

const baseMode=currentIndex===b99Index?'EXACT_PERSISTENT_B99':'POST_B99_DESCENDANT';
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-persistent-b99-identity-audit-v2',
  mode:`${baseMode}_${identityActive?'IDENTITY_ACTIVE':'IDENTITY_RETIRED_AUTHORIZED'}`,
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b99:{run_id:policy.b99_run_id,parent_run_id:policy.b98_run_id,file_sha256:policy.b99_file_sha256,canonical_sha256:policy.b99_canonical_sha256,manifest_index:b99Index,status:'PASS'},
  operation_count:operations.length,replace_field_count:policy.replace_field_count,remove_field_count:policy.remove_field_count,
  mirror_sync_request_count:sync.length,mirror_sync_target_id:sync[0].target_id,mirror_sync_field_count:sync[0].fields.length,
  identity_fix_runtime_active:identityActive,identity_fix_runtime_retired:identityRetired,
  identity_fix_source_retained:true,identity_overlay_residual_mutations:residual.length,
  b99_append_authorized:false,identity_fix_runtime_removal_authorized:removalAuthorized,identity_overlay_retirement_authorized:retirementAuthorized,
  identity_retirement_validated:retirementValidated,identity_retirement_policy_status:retirementPolicy?.status||null,
  transition_guard_runtime_active:true,canonical_write_performed:false
};
writeFileSync(join(dist,'persistent-b99-identity-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'persistent-b99-identity-audit.md'),`# ENGINEER OSINT — persistent B99 identity lifecycle audit\n\nStatus: **PASS**\nMode: **${report.mode}**\nCurrent run: **${report.current_run_id}**\n\n- exact historical B99 file/canonical hashes: **PASS**\n- identity operations: **36** (27 replace + 9 remove)\n- legacy mirror sync: **1 request / 18 fields / ENG-TECH-0036**\n- historical identity source residual mutations: **0**\n- identity-fix runtime active: **${identityActive?'yes':'no'}**\n- identity-fix runtime retired under v4.5.45/v4.5.46: **${identityRetired?'yes':'no'}**\n- transition guard retained: **yes**\n- B99 append authorization from this audit: **no**\n- canonical writes: **0**\n`);
appendFileSync(join(dist,'health.txt'),`persistent_b99_identity=pass\npersistent_b99_identity_mode=${report.mode}\npersistent_b99_identity_run=${report.current_run_id}\npersistent_b99_identity_residual_mutations=0\npersistent_b99_identity_runtime_active=${identityActive?1:0}\npersistent_b99_identity_runtime_retired=${identityRetired?1:0}\npersistent_b99_identity_retirement_authorized=${retirementAuthorized?1:0}\npersistent_b99_identity_retirement_validated=${retirementValidated?1:0}\npersistent_b99_append_authorized=0\npersistent_b99_canonical_writes=0\n`);
console.log(`PERSISTENT_B99_IDENTITY=PASS mode=${report.mode} current=${report.current_run_id} residual=0 runtime=${identityActive?'active':'retired-authorized'}`);
