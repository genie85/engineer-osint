import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const fail=message=>{throw new Error(`IDENTITY_FIX_RETIREMENT_READINESS: ${message}`)};
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const policy=readJson('V4544_IDENTITY_FIX_RETIREMENT_READINESS.json');
if(policy.schema_version!=='engineer-osint-identity-fix-retirement-readiness-v1'||policy.status!=='READINESS_ONLY_NO_RETIREMENT_AUTHORIZATION')fail('policy schema/status drift');
for(const value of Object.values(policy.safety||{}))if(value!==false)fail('readiness safety boundary broadened');

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b99Index=manifest.runs.findIndex(entry=>entry.run_id===policy.required_persistent_run_id);
if(b99Index<0||b99Index!==manifest.runs.findLastIndex(entry=>entry.run_id===policy.required_persistent_run_id))fail('unique persistent B99 anchor missing');
const b99=manifest.runs[b99Index];
if(b99.file_sha256!==policy.required_b99_file_sha256||b99.canonical_sha256!==policy.required_b99_canonical_sha256)fail('B99 exact hash drift');
if(manifest.runs.length-1<b99Index)fail('canonical tip predates B99');
const current=manifest.runs.at(-1);
if(store.report.current_run_id!==current.run_id||store.report.canonical_sha256!==current.canonical_sha256)fail('run-store tip/report mismatch');

const identity=policy.identity_fix;
const activeLegacy=LEGACY_FACTUAL_OVERLAY_MODULES.map(([runtime_id,file])=>({runtime_id,file}));
if(activeLegacy.length!==policy.expected.active_legacy_factual_module_count)fail(`unexpected active legacy factual module count ${activeLegacy.length}`);
if(activeLegacy.length!==1||activeLegacy[0].file!==identity.file||activeLegacy[0].runtime_id!==identity.runtime_id)fail('identity-fix is not the sole active legacy factual overlay');
if(!PUBLIC_RUNTIME_MODULES.some(([runtimeId,file])=>runtimeId===identity.runtime_id&&file===identity.file))fail('identity-fix is not active in public runtime');

const identityCode=readFileSync(join(src,identity.file),'utf8');
if(gitBlobSha(identityCode)!==identity.git_blob_sha)fail('identity-fix source blob drift');
if(!identityCode.includes(identity.sentinel))fail('identity-fix sentinel missing from source');

const resolved=structuredClone(store.data);
const context={window:{__ENGINEER_DATA__:resolved},console};
vm.runInNewContext(identityCode,context,{filename:identity.file,timeout:3000});
if(!context.window[identity.sentinel]||context.window[identity.sentinel].assertions!=='PASS')fail('identity-fix execution sentinel/assertions did not PASS');
const residual=deepDiff(store.data,resolved);
if(residual.length!==policy.expected.identity_overlay_residual_mutations)fail(`identity overlay still mutates canonical data: ${residual.length}`);

const sentinelConsumers=[];
for(const [runtimeId,file] of PUBLIC_RUNTIME_MODULES){
  if(file===identity.file)continue;
  const code=readFileSync(join(src,file),'utf8');
  if(code.includes(identity.sentinel))sentinelConsumers.push({runtime_id:runtimeId,file});
}
if(sentinelConsumers.length!==policy.expected.other_public_runtime_sentinel_consumer_count)fail(`unexpected identity sentinel consumers: ${sentinelConsumers.map(item=>item.file).join(',')}`);

const html=readFileSync(join(dist,'index.html'),'utf8');
const escaped=identity.runtime_id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp(`<script id=["']${escaped}["'][^>]*>[\\s\\S]*?<\\/script>`,'g');
const matches=html.match(pattern)||[];
if(matches.length!==policy.expected.built_identity_script_count)fail(`built identity script count ${matches.length}`);
const noIdentity=html.replace(pattern,'');
if((noIdentity.match(pattern)||[]).length!==policy.expected.simulated_no_identity_script_count)fail('simulated no-identity artifact still contains identity script');
if(noIdentity===html)fail('simulated retirement did not alter built artifact');
writeFileSync(join(dist,'v4544-identity-active.html'),html,'utf8');
writeFileSync(join(dist,'v4544-identity-retired-simulated.html'),noIdentity,'utf8');

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-retirement-readiness-audit-v1',
  mode:store.report.current_run_id===policy.required_persistent_run_id?'EXACT_POST_B99':'POST_B99_DESCENDANT',
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b99:{run_id:policy.required_persistent_run_id,file_sha256:policy.required_b99_file_sha256,canonical_sha256:policy.required_b99_canonical_sha256,status:'PASS'},
  identity_fix:{file:identity.file,runtime_id:identity.runtime_id,git_blob_sha:identity.git_blob_sha,source_pin_passed:true},
  active_legacy_factual_module_count:activeLegacy.length,identity_fix_runtime_active:true,
  identity_overlay_residual_mutations:residual.length,
  other_public_runtime_sentinel_consumers:sentinelConsumers,other_public_runtime_sentinel_consumer_count:sentinelConsumers.length,
  built_identity_script_count:matches.length,simulated_no_identity_script_count:(noIdentity.match(pattern)||[]).length,
  browser_normalized_dom_parity:null,browser_parity_evidence_pending:true,
  ready_for_separate_retirement_authorization_review:false,
  canonical_write_performed:false,run_store_manifest_edit_performed:false,
  identity_fix_runtime_removal_authorized:false,identity_overlay_retirement_authorized:false,
  runtime_manifest_edit_authorized:false,identity_fix_file_deletion_authorized:false,legacy_baseline_edit_authorized:false
};
writeFileSync(join(dist,'identity-fix-retirement-readiness-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'identity-fix-retirement-readiness-audit.md'),`# ENGINEER OSINT v4.5.44 — identity-fix retirement readiness\n\nStatus: **PASS / browser parity pending**\nCurrent run: **${report.current_run_id}**\n\n- exact historical B99 anchor: **PASS**\n- identity-fix source pin: **PASS**\n- active legacy factual overlays: **1** (identity-fix only)\n- identity overlay residual data mutations: **${residual.length}**\n- other public runtime sentinel consumers: **${sentinelConsumers.length}**\n- built identity script count: **${matches.length}**\n- simulated no-identity artifact prepared: **yes**\n- browser normalized DOM parity: **pending workflow gate**\n- retirement authorization from this audit: **no**\n- canonical writes: **0**\n\nThis is readiness evidence only. It does not authorize removing the identity-fix runtime module, editing the runtime manifest, deleting the historical source file, or changing the legacy baseline.\n`);
appendFileSync(join(dist,'health.txt'),`identity_fix_retirement_readiness=pass-pre-browser\nidentity_fix_retirement_residual_mutations=${residual.length}\nidentity_fix_retirement_sentinel_consumers=${sentinelConsumers.length}\nidentity_fix_retirement_browser_parity=pending\nidentity_fix_retirement_authorized=0\nidentity_fix_retirement_canonical_writes=0\n`);
console.log(`IDENTITY_FIX_RETIREMENT_READINESS=PASS_PRE_BROWSER residual=${residual.length} sentinel_consumers=${sentinelConsumers.length}`);
