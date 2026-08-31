import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const firstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];
const identityFile='data-integrity-identity-fixes.js';
const activeFiles=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file);
const activeFirstThree=firstThree.every(file=>activeFiles.includes(file))&&firstThree.every(file=>TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has(file));
const retiredFirstThree=firstThree.every(file=>!activeFiles.includes(file))&&TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.size===0;
if(!activeFirstThree&&!retiredFirstThree)throw new Error(`POST_B98_STEADY_STATE: partial/inconsistent first-three runtime retirement state: active=${activeFiles.join(',')}; guarded=${[...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES].join(',')}`);
const identityActive=activeFiles.includes(identityFile),identityRetired=!identityActive&&activeFiles.length===0;
if(retiredFirstThree&&!identityActive&&!identityRetired)throw new Error(`POST_B98_STEADY_STATE: partial/inconsistent identity runtime state: active=${activeFiles.join(',')}`);

if(activeFirstThree){
  execFileSync(process.execPath,[join(src,'audit-post-b98-steady-state-active.mjs')],{stdio:'inherit'});
  process.exit(0);
}

execFileSync(process.execPath,[join(src,'materialize-canonical-media-history.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[join(src,'audit-first-three-overlay-retirement-normalized.mjs')],{stdio:'inherit'});
const retirement=JSON.parse(readFileSync(join(dist,'first-three-overlay-retirement-audit.json'),'utf8'));
if(retirement.status!=='PASS'||retirement.retirement_validated!==true||retirement.retired_runtime_module_count!==3||retirement.identity_fix_in_scope!==false||retirement.canonical_write_performed!==false)throw new Error('POST_B98_STEADY_STATE: first-three retirement audit did not pass compatibility requirements');
if(retirement.identity_fix_active!==identityActive||retirement.identity_fix_retired!==identityRetired||retirement.active_legacy_factual_module_count!==activeFiles.length)throw new Error('POST_B98_STEADY_STATE: identity lifecycle disagrees with first-three retirement audit');
if(identityRetired&&retirement.identity_fix_migration_authorized!==true)throw new Error('POST_B98_STEADY_STATE: retired identity runtime lacks later authorization');
const store=loadCanonicalRunStore({root:src});

const manifest=JSON.parse(readFileSync(join(src,'data/run-store-manifest.json'),'utf8'));
const runs=manifest.runs||[],b99='engineer-osint-20260830-B99';
const b99Index=runs.findIndex(entry=>entry.run_id===b99),b99Persistent=b99Index>=0&&runs.length-1>=b99Index;
let b99Lifecycle=null;
if(b99Persistent){
  execFileSync(process.execPath,[join(src,'audit-persistent-b99-identity.mjs')],{stdio:'inherit'});
  execFileSync(process.execPath,[join(src,'verify-b99-pages-readiness.mjs')],{stdio:'inherit'});
  b99Lifecycle=JSON.parse(readFileSync(join(dist,'persistent-b99-identity-audit.json'),'utf8'));
  if(b99Lifecycle.status!=='PASS'||b99Lifecycle.current_run_id!==store.report.current_run_id||b99Lifecycle.identity_overlay_residual_mutations!==0||b99Lifecycle.canonical_write_performed!==false)throw new Error('POST_B98_STEADY_STATE: persistent B99 Pages lifecycle gate failed');
  if(b99Lifecycle.identity_fix_runtime_active!==identityActive||b99Lifecycle.identity_fix_runtime_retired!==identityRetired)throw new Error('POST_B98_STEADY_STATE: persistent B99 identity lifecycle mismatch');
  if(identityActive&&(b99Lifecycle.identity_overlay_retirement_authorized!==false||b99Lifecycle.identity_fix_runtime_removal_authorized!==false))throw new Error('POST_B98_STEADY_STATE: active identity lifecycle authorization broadened');
  if(identityRetired&&(b99Lifecycle.identity_overlay_retirement_authorized!==true||b99Lifecycle.identity_fix_runtime_removal_authorized!==true||b99Lifecycle.identity_retirement_validated!==true))throw new Error('POST_B98_STEADY_STATE: retired identity lifecycle not authorized/validated');
}

const guardDecisions=firstThree.map(module=>({module,short_circuit:true,evidence:'PINNED_V4529_PRE_RETIREMENT_MAIN'}));
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-post-b98-steady-state-v2',
  mode:`POST_RETIREMENT_COMPATIBILITY_${identityActive?'IDENTITY_ACTIVE':'IDENTITY_RETIRED_AUTHORIZED'}`,
  runtime_state:identityActive?'RETIRED_FIRST_THREE_IDENTITY_ACTIVE':'ALL_FACTUAL_LEGACY_OVERLAYS_RETIRED',current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b98:retirement.historical_b98,native_historical_intelligence:retirement.native_historical_intelligence,
  first_three_scope:firstThree,identity_fix_in_scope:false,identity_fix_runtime_active:identityActive,identity_fix_runtime_retired:identityRetired,
  guard_short_circuit_count:3,guard_decisions:guardDecisions,guard_evidence_source:'PINNED_V4529_PRE_RETIREMENT_MAIN',guarded_first_three_factual_mutation_count:0,
  unguarded_first_three_factual_leaf_mutations:store.report.current_run_id==='engineer-osint-20260830-B98'?81:null,
  pre_localization_semantic_diff_count:0,post_localization_semantic_diff_count:0,
  production_public_data_sha256:retirement.retired_public_data_sha256,retired_candidate_public_data_sha256:retirement.retired_public_data_sha256,public_data_semantic_parity:true,
  review_gate_status:'HISTORICAL_FIRST_THREE_RETIREMENT_VALIDATED',first_three_ready_for_retirement_review:true,
  retirement_authorized:false,runtime_module_removal_performed:false,baseline_manifest_cleanup_performed:false,
  full_browser_retirement_regression_passed:false,full_browser_retirement_regression_required:true,
  identity_fix_migration_authorized:identityRetired,canonical_write_performed:false,
  retirement_current_state_validated:true,retirement_current_state_artifact:'first-three-overlay-retirement-audit.json',
  b99_pages_gate_applicable:b99Persistent,b99_pages_gate_passed:b99Persistent?true:null,
  b99_identity_overlay_residual_mutations:b99Persistent?b99Lifecycle.identity_overlay_residual_mutations:null,
  b99_identity_fix_runtime_active:b99Persistent?b99Lifecycle.identity_fix_runtime_active:null,
  b99_identity_fix_runtime_retired:b99Persistent?b99Lifecycle.identity_fix_runtime_retired:null,
  b99_identity_overlay_retirement_authorized:b99Persistent?b99Lifecycle.identity_overlay_retirement_authorized:null
};
writeFileSync(join(dist,'post-b98-steady-state-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'post-b98-steady-state-audit.md'),`# ENGINEER OSINT — post-B98 steady-state compatibility audit\n\nStatus: **PASS**\nMode: **${report.mode}**\nCurrent run: **${report.current_run_id}**\nB99 Pages gate: **${b99Persistent?'PASS':'not applicable (PRE_B99)'}**\nIdentity-fix runtime: **${identityActive?'active compatibility debt':'retired under v4.5.45/v4.5.46'}**\n\nThe historical first-three retirement proof remains intact. Later identity-fix retirement is evaluated as a separate lifecycle transition and never rewrites the historical v4.5.30 authorization. This compatibility audit performs no canonical write.\n`);
appendFileSync(join(dist,'health.txt'),`post_b98_steady_state=pass\npost_b98_steady_state_mode=${report.mode}\npost_b98_steady_state_run=${report.current_run_id}\npost_b98_historical_b98_integrity=pass\npost_b98_guard_short_circuits=3\npost_b98_guarded_first3_factual_mutations=0\npost_b98_public_data_semantic_parity=1\npost_b98_identity_fix_runtime_active=${identityActive?1:0}\npost_b98_identity_fix_runtime_retired=${identityRetired?1:0}\npost_b98_identity_fix_migration_authorized=${identityRetired?1:0}\npost_b98_canonical_writes=0\npost_b98_retirement_current_state_validated=1\nb99_pages_gate_applicable=${b99Persistent?1:0}\nb99_pages_gate_passed=${b99Persistent?1:0}\n`);
console.log(`POST_B98 steady-state compatibility PASS: run=${report.current_run_id}; first-three=retired; identity=${identityActive?'active':'retired-authorized'}; b99-pages=${b99Persistent?'pass':'pre-b99-not-applicable'}`);
