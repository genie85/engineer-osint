import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4538_B99_PAGES_READINESS.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(src,'data/run-store-manifest.json'),'utf8'));
const runs=manifest.runs||[],currentIndex=runs.length-1,currentRun=runs.at(-1)?.run_id||manifest.snapshot.run_id;
const b99Index=runs.findIndex(entry=>entry.run_id===policy.b99_run_id);
const fail=message=>{throw new Error(`B99_PAGES_GATE: ${message}`)};
const requireDist=name=>{const path=join(dist,name);if(!existsSync(path)||!statSync(path).isFile()||statSync(path).size===0)fail(`missing/empty ${name}`);return path;};

if(b99Index<0){
  if(currentRun!==policy.b98_run_id)fail(`B99 absent but current tip is unexpected ${currentRun}`);
  console.log('B99 Pages gate PRE_B99: not yet persistent; no append authorization');
  process.exit(0);
}
if(currentIndex<b99Index)fail('current tip predates persistent B99');
for(const value of Object.values(policy.safety))if(value!==false)fail('historical B99 Pages readiness safety boundary broadened');
requireDist('persistent-b99-identity-audit.json');
requireDist('persistent-b99-identity-audit.md');
const audit=JSON.parse(readFileSync(join(dist,'persistent-b99-identity-audit.json'),'utf8'));
if(audit.status!=='PASS')fail('persistent B99 audit did not pass');
if(audit.current_run_id!==currentRun)fail('persistent B99 audit is stale');
if(audit.historical_b99?.run_id!==policy.b99_run_id||audit.historical_b99?.parent_run_id!==policy.b98_run_id||audit.historical_b99?.file_sha256!==policy.b99_file_sha256||audit.historical_b99?.canonical_sha256!==policy.b99_canonical_sha256||audit.historical_b99?.status!=='PASS')fail('historical B99 identity/hash drift');
if(audit.operation_count!==policy.operation_count||audit.replace_field_count!==policy.replace_field_count||audit.remove_field_count!==policy.remove_field_count)fail('B99 operation scope drift');
if(audit.mirror_sync_request_count!==policy.mirror_sync_request_count||audit.mirror_sync_target_id!==policy.mirror_sync_target_id||audit.mirror_sync_field_count!==policy.mirror_sync_field_count)fail('B99 mirror sync scope drift');
if(audit.identity_overlay_residual_mutations!==policy.expected_identity_overlay_residual)fail('B99 identity overlay residual is non-zero');
if(audit.b99_append_authorized!==false||audit.canonical_write_performed!==false)fail('persistent B99 audit canonical/append safety boundary broadened');

if(audit.identity_fix_runtime_active===true){
  if(audit.identity_fix_runtime_retired!==false||audit.identity_fix_runtime_removal_authorized!==false||audit.identity_overlay_retirement_authorized!==false||audit.identity_retirement_validated!==false)fail('active identity lifecycle safety state mismatch');
  console.log(`B99 Pages gate PASS: mode=${audit.mode}; current=${currentRun}; exact-b99=pass; identity-runtime=active; residual=0; retirement=blocked`);
  process.exit(0);
}

if(audit.identity_fix_runtime_active!==false||audit.identity_fix_runtime_retired!==true||audit.identity_fix_runtime_removal_authorized!==true||audit.identity_overlay_retirement_authorized!==true||audit.identity_retirement_validated!==true)fail('retired identity lifecycle authorization/validation mismatch');
execFileSync(process.execPath,[join(src,'audit-identity-fix-retirement.mjs')],{stdio:'inherit'});
requireDist('identity-fix-retirement-audit.json');
const retirement=JSON.parse(readFileSync(join(dist,'identity-fix-retirement-audit.json'),'utf8'));
if(retirement.status!=='PASS'||retirement.current_run_id!==currentRun||retirement.identity_fix_runtime_active!==false||retirement.identity_fix_runtime_retired!==true||retirement.identity_fix_source_retained!==true)fail('identity retirement audit failed');
if(retirement.active_legacy_factual_module_count!==0||retirement.active_legacy_baseline_module_count!==0||retirement.historical_identity_source_residual_mutations!==0||retirement.other_public_runtime_sentinel_consumer_count!==0)fail('identity retirement zero-debt proof failed');
if(retirement.built_identity_script_count!==0||retirement.transition_guard_runtime_active!==true||retirement.transition_guard_script_count!==1)fail('identity retirement built runtime contract failed');
if(retirement.canonical_write_performed!==false||retirement.run_store_manifest_edit_performed!==false||retirement.run_appended!==false||retirement.source_file_deleted!==false||retirement.other_runtime_module_removed!==false)fail('identity retirement safety boundary broadened');
console.log(`B99 Pages gate PASS: mode=${audit.mode}; current=${currentRun}; exact-b99=pass; identity-runtime=retired-authorized; residual=0; retirement=validated`);
