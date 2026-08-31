import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES,TRANSITION_RUNTIME_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const fail=message=>{throw new Error(`IDENTITY_FIX_RETIREMENT: ${message}`)};
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});
const sha256=text=>createHash('sha256').update(text).digest('hex');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const policy=readJson('V4546_IDENTITY_FIX_RETIREMENT.json');
const auth=readJson('V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json');
if(policy.schema_version!=='engineer-osint-identity-fix-retirement-v1'||policy.status!=='AUTHORIZED_RETIREMENT_APPLIED')fail('retirement policy schema/status drift');
if(gitBlobSha(readFileSync(join(src,'V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json'),'utf8'))!==policy.authorization_policy_git_blob_sha)fail('authorization policy blob drift');
if(auth.status!=='READY_FOR_EXACT_IDENTITY_FIX_RETIREMENT_SLICE'||auth.reviewed_baseline_main_sha!=='43f686feeba2890afa4784dd2b82e68166ba927c')fail('v4.5.45 authorization identity drift');
if(policy.reviewed_authorization_main_sha!=='a8a67ac1f3bb5dbdc2841c5df7d552a8f5d3b5f9')fail('reviewed authorization main SHA drift');
for(const key of ['required_persistent_run_id','required_b99_file_sha256','required_b99_canonical_sha256'])if(policy[key]!==auth[key])fail(`authorization to retirement B99 handoff drift: ${key}`);
for(const key of ['file','runtime_id','git_blob_sha','sentinel'])if(policy.identity_fix?.[key]!==auth.identity_fix?.[key])fail(`authorization to retirement identity handoff drift: ${key}`);

const a=auth.authorization||{};
for(const key of ['one_retirement_slice_only','allow_identity_fix_runtime_removal','allow_identity_overlay_retirement','allow_remove_exact_identity_entry_from_legacy_factual_overlay_modules','allow_remove_exact_identity_entry_from_active_legacy_baseline','retain_identity_fix_source_as_historical_artifact'])if(a[key]!==true)fail(`required v4.5.45 authorization missing: ${key}`);
for(const key of ['allow_identity_fix_file_deletion','allow_transition_guard_runtime_removal','allow_any_other_runtime_module_removal','allow_canonical_data_edit','allow_run_store_manifest_edit','allow_run_append','allow_b99_file_edit','allow_manual_hash_edit'])if(a[key]!==false)fail(`v4.5.45 authorization scope broadened: ${key}`);

const identity=policy.identity_fix,guard=policy.transition_guard;
if(LEGACY_FACTUAL_OVERLAY_MODULES.length!==policy.retirement.resulting_active_legacy_factual_module_count)fail(`active legacy factual module count ${LEGACY_FACTUAL_OVERLAY_MODULES.length}`);
if(PUBLIC_RUNTIME_MODULES.some(([id,file])=>id===identity.runtime_id||file===identity.file))fail('identity-fix remains active in public runtime');
if(!TRANSITION_RUNTIME_MODULES.some(([id,file])=>id===guard.runtime_id&&file===guard.file))fail('transition guard removed despite explicit prohibition');
if(!PUBLIC_RUNTIME_MODULES.some(([id,file])=>id===guard.runtime_id&&file===guard.file))fail('transition guard missing from public runtime');

const identityCode=readFileSync(join(src,identity.file),'utf8');
if(gitBlobSha(identityCode)!==identity.git_blob_sha)fail('historical identity-fix source blob drift');
if(!identityCode.includes(identity.sentinel))fail('historical identity-fix sentinel missing');
const baseline=readJson('legacy-runtime-overlay-baseline.json');
if(baseline.version!==policy.retirement.resulting_legacy_baseline_version||baseline.status!==policy.retirement.resulting_legacy_baseline_status)fail('retired active baseline version/status drift');
if(Object.keys(baseline.modules||{}).length!==policy.retirement.resulting_active_legacy_baseline_module_count)fail('retired active baseline module count drift');
if(baseline.retired_identity_fix_at!=='v4.5.46')fail('active baseline retirement marker drift');

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b99Index=manifest.runs.findIndex(entry=>entry.run_id===policy.required_persistent_run_id);
if(b99Index<0||b99Index!==manifest.runs.findLastIndex(entry=>entry.run_id===policy.required_persistent_run_id))fail('unique historical B99 anchor missing');
const b99=manifest.runs[b99Index];
if(b99.file_sha256!==policy.required_b99_file_sha256||b99.canonical_sha256!==policy.required_b99_canonical_sha256)fail('historical B99 hash drift');
if(sha256(readFileSync(join(src,b99.path),'utf8'))!==policy.required_b99_file_sha256)fail('historical B99 raw file hash drift');
if(manifest.runs.length-1<b99Index)fail('canonical tip predates B99');
const current=manifest.runs.at(-1);
if(store.report.current_run_id!==current.run_id||store.report.canonical_sha256!==current.canonical_sha256)fail('run-store tip/report mismatch');

const historicalResolved=structuredClone(store.data),context={window:{__ENGINEER_DATA__:historicalResolved},console};
vm.runInNewContext(identityCode,context,{filename:identity.file,timeout:3000});
if(!context.window[identity.sentinel]||context.window[identity.sentinel].assertions!=='PASS')fail('historical identity source assertions no longer pass');
const residual=deepDiff(store.data,historicalResolved);
if(residual.length!==policy.required_proof.historical_source_residual_mutations)fail(`historical identity source residual ${residual.length}`);

const sentinelConsumers=[];
for(const [runtimeId,file] of PUBLIC_RUNTIME_MODULES){
  const code=readFileSync(join(src,file),'utf8');
  if(code.includes(identity.sentinel))sentinelConsumers.push({runtime_id:runtimeId,file});
}
if(sentinelConsumers.length!==policy.required_proof.other_public_runtime_sentinel_consumer_count)fail(`unexpected public sentinel consumers: ${sentinelConsumers.map(x=>x.file).join(',')}`);

const html=readFileSync(join(dist,'index.html'),'utf8');
const identityMarker=`id="${identity.runtime_id}"`,guardMarker=`id="${guard.runtime_id}"`;
const identityScriptCount=html.split(identityMarker).length-1,guardScriptCount=html.split(guardMarker).length-1;
if(identityScriptCount!==policy.required_proof.built_identity_script_count)fail(`built identity script count ${identityScriptCount}`);
if(guardScriptCount!==policy.required_proof.transition_guard_script_count)fail(`built transition guard count ${guardScriptCount}`);

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-retirement-audit-v1',
  mode:store.report.current_run_id===policy.required_persistent_run_id?'EXACT_POST_B99_IDENTITY_RETIRED':'POST_B99_DESCENDANT_IDENTITY_RETIRED',
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b99:{run_id:policy.required_persistent_run_id,file_sha256:policy.required_b99_file_sha256,canonical_sha256:policy.required_b99_canonical_sha256,status:'PASS'},
  authorization_main_sha:policy.reviewed_authorization_main_sha,authorization_policy_blob_sha:policy.authorization_policy_git_blob_sha,
  identity_fix_source_retained:true,identity_fix_source_blob_sha:identity.git_blob_sha,
  identity_fix_runtime_active:false,identity_fix_runtime_retired:true,identity_overlay_retirement_authorized:true,identity_fix_runtime_removal_authorized:true,
  active_legacy_factual_module_count:LEGACY_FACTUAL_OVERLAY_MODULES.length,active_legacy_baseline_module_count:Object.keys(baseline.modules||{}).length,
  historical_identity_source_residual_mutations:residual.length,other_public_runtime_sentinel_consumers:sentinelConsumers,other_public_runtime_sentinel_consumer_count:sentinelConsumers.length,
  built_identity_script_count:identityScriptCount,transition_guard_runtime_active:true,transition_guard_script_count:guardScriptCount,
  browser_normalized_dom_sha256:null,browser_parity_pending:true,
  canonical_write_performed:false,run_store_manifest_edit_performed:false,run_appended:false,source_file_deleted:false,other_runtime_module_removed:false
};
writeFileSync(join(dist,'identity-fix-retirement-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'identity-fix-retirement-audit.md'),`# ENGINEER OSINT v4.5.46 — final identity-fix retirement audit\n\nStatus: **PASS / browser digest pending**\nCurrent run: **${report.current_run_id}**\n\n- exact historical B99 anchor: **PASS**\n- identity-fix removed from active runtime: **PASS**\n- active legacy factual overlays: **0**\n- active legacy baseline modules: **0**\n- historical identity-fix source retained/hash-pinned: **PASS**\n- historical source residual mutations on current canonical data: **0**\n- other public-runtime sentinel consumers: **0**\n- identity script in built artifact: **0**\n- transition guard retained/injected: **PASS**\n- browser normalized DOM digest: **pending workflow gate**\n- canonical/run-store writes: **0**\n`);
appendFileSync(join(dist,'health.txt'),`identity_fix_retirement=pass-pre-browser\nidentity_fix_runtime_active=0\nidentity_fix_runtime_retired=1\nidentity_fix_historical_source_retained=1\nidentity_fix_historical_residual_mutations=${residual.length}\nidentity_fix_sentinel_consumers=${sentinelConsumers.length}\nidentity_fix_active_legacy_modules=0\nidentity_fix_active_baseline_modules=0\nidentity_fix_transition_guard_retained=1\nidentity_fix_retirement_browser_digest=pending\nidentity_fix_retirement_canonical_writes=0\n`);
console.log(`IDENTITY_FIX_RETIREMENT=PASS_PRE_BROWSER current=${report.current_run_id} residual=${residual.length} active-legacy=0`);
