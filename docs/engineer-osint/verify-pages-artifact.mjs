import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {loadCanonicalRunStore} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const b98='engineer-osint-20260830-B98',b97='engineer-osint-20260830-B97';
const exactFileSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const exactCanonicalSha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const sha256=text=>createHash('sha256').update(text).digest('hex');
const requireFile=name=>{
  const path=join(dist,name);
  if(!existsSync(path)||!statSync(path).isFile()||statSync(path).size===0)throw new Error(`PAGES_VERIFY: missing/empty ${name}`);
  return path;
};
const requireHealth=(health,marker)=>{if(!health.includes(marker))throw new Error(`PAGES_VERIFY: missing health marker ${marker}`);};
const requireIndex=(index,marker)=>{if(!index.includes(marker))throw new Error(`PAGES_VERIFY: missing index marker ${marker}`);};

const manifest=readJson(join(src,'data/run-store-manifest.json'));
const runs=manifest.runs||[],currentIndex=runs.length-1,currentRun=runs.at(-1)?.run_id||manifest.snapshot.run_id;
const b98Index=runs.findIndex(entry=>entry.run_id===b98),postB98Descendant=b98Index>=0&&currentIndex>b98Index;
if(currentRun!==b98&&!postB98Descendant){
  execFileSync(process.execPath,[join(src,'verify-pages-artifact-pre-b98.mjs')],{stdio:'inherit'});
  process.exit(0);
}

[
  'index.html','health.txt','media-history-audit.json','media-history-audit.md','media-coverage-qa.json','media-coverage-qa.md',
  'public-cz-ui-audit.json','public-cz-ui-audit.md','overlay-retirement-audit.json','overlay-retirement-audit.md',
  'post-b98-steady-state-audit.json','post-b98-steady-state-audit.md'
].forEach(requireFile);
if(currentRun===b98)['persistent-b98-audit.json','persistent-b98-audit.md'].forEach(requireFile);

const health=readFileSync(join(dist,'health.txt'),'utf8'),index=readFileSync(join(dist,'index.html'),'utf8');
[
  'status=SUCCESS','run_store=append-only-v1','patch_history_materialization=snapshot-chain','patch_continuity=SNAPSHOT_CHAIN_COMPLETE',
  'legacy_history_status=DEGRADED_LEGACY_ACKNOWLEDGED','legacy_malformed_revisions=3','legacy_duplicate_runs=5','legacy_parent_gaps=3',
  'legacy_factual_overlays=pinned-migration-debt','overlay_retirement_audit=pass','overlay_retirement_policy=zero-current-mutations',
  'localization_mutation_violations=0','canonical_export_snapshot=legacy-overlay-resolved','runtime_audit=pass',`run=${currentRun}`,
  'post_b98_steady_state=pass',`post_b98_steady_state_run=${currentRun}`,'post_b98_historical_b98_integrity=pass',
  'post_b98_guard_short_circuits=3','post_b98_guarded_first3_factual_mutations=0','post_b98_prelocalization_semantic_diffs=0',
  'post_b98_postlocalization_semantic_diffs=0','post_b98_public_data_semantic_parity=1','post_b98_first3_retirement_review_ready=1',
  'post_b98_retirement_authorized=0','post_b98_identity_fix_in_scope=0','post_b98_browser_retirement_regression_required=1',
  'post_b98_canonical_writes=0','post_b98_retirement_current_state_validated=1'
].forEach(marker=>requireHealth(health,marker));
if(currentRun===b98)[
  'persistent_b98_audit=pass','persistent_b98_mode=persistent',`persistent_b98_candidate_run=${b98}`,`persistent_b98_parent_run=${b97}`,
  `persistent_b98_candidate_file_sha=${exactFileSha}`,`persistent_b98_result_sha=${exactCanonicalSha}`,'persistent_b98_persistent_gaps=15',
  'persistent_b98_native_evidence=2','persistent_b98_native_assessments=4','persistent_b98_residual_signatures=61','persistent_b98_residual_factual_leafs=81',
  'persistent_b98_unexpected_residual_modules=0','persistent_b98_guard_short_circuits=3','persistent_b98_guarded_factual_mutations=0',
  'persistent_b98_media_status=MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION','persistent_b98_overlays_must_remain_active=1',
  'persistent_b98_overlay_retirement_authorized=0','persistent_b98_identity_fix_migration_authorized=0','persistent_b98_pages_validation_ready=1','persistent_b98_canonical_writes=0'
].forEach(marker=>requireHealth(health,marker));

[
  'engineer-ui-phase8-navigation-module','engineer-ui-phase9-intelligence-module','engineer-media-source-materialization',
  'engineer-i18n-content-cs-public-cz-backlog-module','engineer-i18n-content-cs-public-cz-2110-module','engineer-i18n-content-cs-public-cz-0633-module',
  'engineer-public-cz-ui-canary','engineer-i18n-runtime-switch-fix','CZ_EN_CZ_DYNAMIC_CONTENT','CANONICAL_SNAPSHOT_PLUS_APPEND_ONLY_RUNS',"default_language:'cs'"
].forEach(marker=>requireIndex(index,marker));

const store=loadCanonicalRunStore({root:src});
if(store.report.current_run_id!==currentRun)throw new Error('PAGES_VERIFY: current run-store tip mismatch');
const currentEntry=runs.at(-1);
if(currentEntry?.run_id!==currentRun||currentEntry?.canonical_sha256!==store.report.canonical_sha256)throw new Error('PAGES_VERIFY: current manifest canonical hash mismatch');
const media=readJson(join(dist,'media-coverage-qa.json'));
if(media.publish_gate?.pass!==true)throw new Error('PAGES_VERIFY: current-run media publish gate failed');
const retirement=readJson(join(dist,'overlay-retirement-audit.json'));
if(retirement.status!=='PASS'||retirement.policy!=='ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT'||retirement.module_count!==retirement.ready_count+retirement.blocked_count)throw new Error('PAGES_VERIFY: overlay retirement audit invalid');
if(retirement.current_run_id!==currentRun)throw new Error(`PAGES_VERIFY: overlay retirement audit is stale for ${currentRun}`);

const b98Entry=runs[b98Index];
if(!b98Entry||b98Entry.run_id!==b98||b98Entry.parent_run_id!==b97||b98Entry.parent_canonical_sha256!==b97Sha)throw new Error('PAGES_VERIFY: historical B98 manifest lineage mismatch');
if(b98Entry.file_sha256!==exactFileSha||b98Entry.canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: historical B98 manifest hash mismatch');
if(b98Entry.path!=='data/runs/engineer-osint-20260830-B98.json')throw new Error('PAGES_VERIFY: historical B98 manifest path mismatch');
const runPath=join(src,b98Entry.path),runRaw=readFileSync(runPath,'utf8'),run=JSON.parse(runRaw);
if(sha256(runRaw)!==exactFileSha)throw new Error('PAGES_VERIFY: persistent B98 file SHA mismatch');
if(run.state?.run_id!==b98||run.state?.parent_run_id!==b97||run.state?.status!=='SUCCESS')throw new Error('PAGES_VERIFY: persistent B98 state identity mismatch');
if((run.evidence||[]).length!==2)throw new Error('PAGES_VERIFY: persistent B98 evidence count mismatch');
const intel=run.extensions?.intelligence_v1;
if(!intel||intel.assessments?.length!==4||intel.gaps?.length!==0||intel.contradictions?.length!==0)throw new Error('PAGES_VERIFY: persistent B98 Intelligence scope mismatch');
if(run.extensions?.operations_v1!==undefined)throw new Error('PAGES_VERIFY: factual operations leaked into B98');
if(run.continuity?.overlay_retirement_authorized!==false)throw new Error('PAGES_VERIFY: B98 run authorizes overlay retirement');

const steady=readJson(join(dist,'post-b98-steady-state-audit.json'));
if(steady.status!=='PASS'||steady.schema_version!=='engineer-osint-post-b98-steady-state-v2'||steady.current_run_id!==currentRun||steady.current_canonical_sha256!==store.report.canonical_sha256)throw new Error('PAGES_VERIFY: post-B98 steady-state audit identity mismatch');
if(steady.historical_b98?.status!=='PASS'||steady.historical_b98?.run_id!==b98||steady.historical_b98?.parent_run_id!==b97||steady.historical_b98?.file_sha256!==exactFileSha||steady.historical_b98?.canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: post-B98 historical anchor drift');
if(steady.native_historical_intelligence?.persistent_b97_gaps!==15||steady.native_historical_intelligence?.b98_evidence!==2||steady.native_historical_intelligence?.b98_assessments!==4)throw new Error('PAGES_VERIFY: post-B98 native Intelligence retention mismatch');
if(steady.guard_short_circuit_count!==3||steady.guarded_first_three_factual_mutation_count!==0||steady.pre_localization_semantic_diff_count!==0||steady.post_localization_semantic_diff_count!==0||steady.public_data_semantic_parity!==true||steady.production_public_data_sha256!==steady.retired_candidate_public_data_sha256)throw new Error('PAGES_VERIFY: first-three public-data semantic parity failed');
if(steady.first_three_ready_for_retirement_review!==true||steady.review_gate_status!=='HISTORICAL_FIRST_THREE_RETIREMENT_VALIDATED'||steady.retirement_authorized!==false||steady.runtime_module_removal_performed!==false||steady.baseline_manifest_cleanup_performed!==false||steady.full_browser_retirement_regression_required!==true||steady.full_browser_retirement_regression_passed!==false||steady.identity_fix_in_scope!==false||steady.canonical_write_performed!==false||steady.retirement_current_state_validated!==true)throw new Error('PAGES_VERIFY: post-B98 historical retirement-review safety boundary broadened');
const identityActive=steady.identity_fix_runtime_active===true&&steady.identity_fix_runtime_retired===false;
const identityRetired=steady.identity_fix_runtime_active===false&&steady.identity_fix_runtime_retired===true;
if(!identityActive&&!identityRetired)throw new Error('PAGES_VERIFY: post-B98 identity lifecycle partial/inconsistent');
if(identityActive){
  if(steady.mode!=='POST_RETIREMENT_COMPATIBILITY_IDENTITY_ACTIVE'||steady.runtime_state!=='RETIRED_FIRST_THREE_IDENTITY_ACTIVE'||steady.identity_fix_migration_authorized!==false)throw new Error('PAGES_VERIFY: active identity lifecycle invalid');
  requireHealth(health,'post_b98_identity_fix_runtime_active=1');
  requireHealth(health,'post_b98_identity_fix_runtime_retired=0');
  requireHealth(health,'post_b98_identity_fix_migration_authorized=0');
}else{
  if(steady.mode!=='POST_RETIREMENT_COMPATIBILITY_IDENTITY_RETIRED_AUTHORIZED'||steady.runtime_state!=='ALL_FACTUAL_LEGACY_OVERLAYS_RETIRED'||steady.identity_fix_migration_authorized!==true)throw new Error('PAGES_VERIFY: retired identity lifecycle invalid');
  if(steady.b99_pages_gate_applicable!==true||steady.b99_pages_gate_passed!==true||steady.b99_identity_overlay_residual_mutations!==0||steady.b99_identity_fix_runtime_active!==false||steady.b99_identity_fix_runtime_retired!==true||steady.b99_identity_overlay_retirement_authorized!==true)throw new Error('PAGES_VERIFY: retired B99 identity lifecycle invalid');
  requireHealth(health,'post_b98_identity_fix_runtime_active=0');
  requireHealth(health,'post_b98_identity_fix_runtime_retired=1');
  requireHealth(health,'post_b98_identity_fix_migration_authorized=1');
  requireHealth(health,'b99_pages_gate_applicable=1');
  requireHealth(health,'b99_pages_gate_passed=1');
}

if(currentRun===b98){
  const audit=readJson(join(dist,'persistent-b98-audit.json'));
  if(audit.status!=='PASS'||audit.mode!=='PERSISTENT_POST_APPEND'||audit.persistent_tip!==b98)throw new Error('PAGES_VERIFY: persistent B98 audit mode mismatch');
  if(audit.candidate_file_sha256!==exactFileSha||audit.resulting_canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: persistent B98 audit hash mismatch');
  if(audit.persistent_gap_count!==15||audit.native_evidence_count!==2||audit.native_assessment_count!==4)throw new Error('PAGES_VERIFY: persistent B98 audit Intelligence scope mismatch');
  if(audit.residual_signature_count!==61||audit.residual_factual_leaf_mutations!==81||audit.unexpected_residual_modules?.length!==0)throw new Error('PAGES_VERIFY: persistent B98 residual baseline mismatch');
  if(audit.guard_short_circuit_count!==3||audit.guarded_factual_mutation_count!==0)throw new Error('PAGES_VERIFY: persistent B98 runtime guard transition failed');
  if(audit.multimedia_status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION')throw new Error('PAGES_VERIFY: persistent B98 media status mismatch');
  if(audit.overlays_must_remain_active!==true||audit.overlay_retirement_authorized!==false||audit.identity_fix_migration_authorized!==false||audit.post_b98_pages_validation_ready!==true||audit.canonical_write_performed!==false)throw new Error('PAGES_VERIFY: persistent B98 safety boundary broadened');
}

const auth=readJson(join(src,'V4526_B98_APPEND_AUTHORIZATION.json'));
if(auth.schema_version!=='engineer-osint-b98-append-authorization-v1'||auth.status!=='READY_FOR_APPEND')throw new Error('PAGES_VERIFY: B98 authorization inactive');
if(auth.candidate_run_id!==b98||auth.expected_parent_run_id!==b97||auth.exact_candidate_file_sha256!==exactFileSha||auth.expected_resulting_canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: B98 authorization identity/hash drift');
if(auth.authorization?.append_exact_candidate_only!==true||auth.authorization?.standard_append_run_write_required!==true||auth.authorization?.one_run_only!==true)throw new Error('PAGES_VERIFY: B98 authorization incomplete');
if(auth.authorization?.allow_manual_manifest_or_hash_edit!==false||auth.authorization?.allow_future_run_same_slice!==false||auth.authorization?.allow_overlay_retirement!==false||auth.authorization?.allow_identity_fix_migration!==false)throw new Error('PAGES_VERIFY: B98 authorization safety scope broadened');

if(currentRun===b98)console.log(`PAGES_VERIFY PASS: phase=POST_B98; run=${b98}; persistent-b98=pass; steady-state=pass; identity=${identityActive?'active':'retired-authorized'}`);
else console.log(`PAGES_VERIFY PASS: phase=POST_B98_STEADY; run=${currentRun}; historical-b98=pass; steady-state=pass; identity=${identityActive?'active':'retired-authorized'}`);
