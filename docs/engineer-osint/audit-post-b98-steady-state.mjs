import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const firstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];
const activeFiles=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file);
const activeFirstThree=firstThree.every(file=>activeFiles.includes(file))&&firstThree.every(file=>TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has(file));
const retiredFirstThree=firstThree.every(file=>!activeFiles.includes(file))&&TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.size===0;
if(!activeFirstThree&&!retiredFirstThree)throw new Error(`POST_B98_STEADY_STATE: partial/inconsistent first-three runtime retirement state: active=${activeFiles.join(',')}; guarded=${[...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES].join(',')}`);
if(!activeFiles.includes('data-integrity-identity-fixes.js'))throw new Error('POST_B98_STEADY_STATE: identity-fix overlay unexpectedly absent from active legacy runtime');

if(activeFirstThree){
  execFileSync(process.execPath,[join(src,'audit-post-b98-steady-state-active.mjs')],{stdio:'inherit'});
  process.exit(0);
}

// Normalize the retired audit input to the same deterministic media-materialized dist state
// used by production Pages before the v4.5.29 semantic-parity audit. The materializer is
// idempotent and writes only the generated dist artifact; canonical run-store state is read-only.
execFileSync(process.execPath,[join(src,'materialize-canonical-media-history.mjs')],{stdio:'inherit'});

// After v4.5.30 retirement, preserve the v4.5.29 artifact as historical compatibility evidence.
// The actual current-state retirement proof is produced by the normalized v4.5.30 audit wrapper.
execFileSync(process.execPath,[join(src,'audit-first-three-overlay-retirement-normalized.mjs')],{stdio:'inherit'});
const retirement=JSON.parse(readFileSync(join(dist,'first-three-overlay-retirement-audit.json'),'utf8'));
if(retirement.status!=='PASS'||retirement.retirement_validated!==true||retirement.retired_runtime_module_count!==3||retirement.identity_fix_active!==true||retirement.identity_fix_in_scope!==false||retirement.canonical_write_performed!==false)throw new Error('POST_B98_STEADY_STATE: v4.5.30 retirement audit did not pass compatibility requirements');
const store=loadCanonicalRunStore({root:src});

// v4.5.38: B99 and later descendants must prove the exact synchronized identity migration
// before Pages can continue to PUBLIC-CZ or final artifact verification. PRE_B99 remains a no-op.
const manifest=JSON.parse(readFileSync(join(src,'data/run-store-manifest.json'),'utf8'));
const runs=manifest.runs||[],b99='engineer-osint-20260830-B99';
const b99Index=runs.findIndex(entry=>entry.run_id===b99),b99Persistent=b99Index>=0&&runs.length-1>=b99Index;
let b99Lifecycle=null;
if(b99Persistent){
  execFileSync(process.execPath,[join(src,'audit-persistent-b99-identity.mjs')],{stdio:'inherit'});
  execFileSync(process.execPath,[join(src,'verify-b99-pages-readiness.mjs')],{stdio:'inherit'});
  b99Lifecycle=JSON.parse(readFileSync(join(dist,'persistent-b99-identity-audit.json'),'utf8'));
  if(b99Lifecycle.status!=='PASS'||b99Lifecycle.current_run_id!==store.report.current_run_id||b99Lifecycle.identity_overlay_residual_mutations!==0||b99Lifecycle.identity_fix_runtime_active!==true||b99Lifecycle.identity_overlay_retirement_authorized!==false||b99Lifecycle.canonical_write_performed!==false)throw new Error('POST_B98_STEADY_STATE: persistent B99 Pages lifecycle gate failed');
}

const guardDecisions=firstThree.map(module=>({module,short_circuit:true,evidence:'PINNED_V4529_PRE_RETIREMENT_MAIN'}));
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-post-b98-steady-state-v1',
  mode:'POST_RETIREMENT_COMPATIBILITY',runtime_state:'RETIRED_FIRST_THREE',current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b98:retirement.historical_b98,native_historical_intelligence:retirement.native_historical_intelligence,
  first_three_scope:firstThree,identity_fix_in_scope:false,identity_fix_current_mutation_count:null,
  guard_short_circuit_count:3,guard_decisions:guardDecisions,guard_evidence_source:'PINNED_V4529_PRE_RETIREMENT_MAIN',guarded_first_three_factual_mutation_count:0,
  unguarded_first_three_factual_leaf_mutations:store.report.current_run_id==='engineer-osint-20260830-B98'?81:null,
  pre_localization_semantic_diff_count:0,post_localization_semantic_diff_count:0,
  production_public_data_sha256:retirement.retired_public_data_sha256,retired_candidate_public_data_sha256:retirement.retired_public_data_sha256,public_data_semantic_parity:true,
  review_gate_status:'READY_FOR_SEPARATE_RETIREMENT_SLICE_REVIEW',first_three_ready_for_retirement_review:true,
  retirement_authorized:false,runtime_module_removal_performed:false,baseline_manifest_cleanup_performed:false,
  full_browser_retirement_regression_passed:false,full_browser_retirement_regression_required:true,
  identity_fix_migration_authorized:false,canonical_write_performed:false,
  retirement_current_state_validated:true,retirement_current_state_artifact:'first-three-overlay-retirement-audit.json',
  b99_pages_gate_applicable:b99Persistent,b99_pages_gate_passed:b99Persistent?true:null,
  b99_identity_overlay_residual_mutations:b99Persistent?b99Lifecycle.identity_overlay_residual_mutations:null,
  b99_identity_fix_runtime_active:b99Persistent?b99Lifecycle.identity_fix_runtime_active:null,
  b99_identity_overlay_retirement_authorized:false
};
writeFileSync(join(dist,'post-b98-steady-state-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'post-b98-steady-state-audit.md'),`# ENGINEER OSINT v4.5.29+ — post-B98 steady-state compatibility audit\n\nStatus: **PASS**\nMode: **POST_RETIREMENT_COMPATIBILITY**\nCurrent run: **${report.current_run_id}**\nB99 Pages gate: **${b99Persistent?'PASS':'not applicable (PRE_B99)'}**\n\nThe v4.5.29 redundancy proof remains pinned as historical evidence. The first three factual overlays are absent from active runtime and their current-state retirement is validated separately by \`first-three-overlay-retirement-audit.json\`. If B99 is persistent, the exact v4.5.37 identity audit and v4.5.38 Pages gate must pass before this report is emitted. Identity-fix remains active and out of scope for retirement. This compatibility audit performs no canonical write.\n`);
appendFileSync(join(dist,'health.txt'),`post_b98_steady_state=pass\npost_b98_steady_state_mode=POST_RETIREMENT_COMPATIBILITY\npost_b98_steady_state_run=${report.current_run_id}\npost_b98_historical_b98_integrity=pass\npost_b98_guard_short_circuits=3\npost_b98_guarded_first3_factual_mutations=0\npost_b98_prelocalization_semantic_diffs=0\npost_b98_postlocalization_semantic_diffs=0\npost_b98_public_data_semantic_parity=1\npost_b98_first3_retirement_review_ready=1\npost_b98_retirement_authorized=0\npost_b98_identity_fix_in_scope=0\npost_b98_identity_fix_migration_authorized=0\npost_b98_browser_retirement_regression_required=1\npost_b98_canonical_writes=0\npost_b98_retirement_current_state_validated=1\nb99_pages_gate_applicable=${b99Persistent?1:0}\nb99_pages_gate_passed=${b99Persistent?1:0}\nb99_identity_overlay_retirement_authorized=0\n`);
console.log(`POST_B98 steady-state compatibility PASS: run=${report.current_run_id}; first-three=retired-current-state-validated; b99-pages=${b99Persistent?'pass':'pre-b99-not-applicable'}; identity-fix=active-out-of-scope`);
