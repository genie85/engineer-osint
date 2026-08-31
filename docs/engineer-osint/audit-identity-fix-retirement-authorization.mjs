import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseJsonStrict} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES,PUBLIC_RUNTIME_MODULES,TRANSITION_RUNTIME_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const fail=message=>{throw new Error(`IDENTITY_FIX_RETIREMENT_AUTHORIZATION: ${message}`)};
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const auth=readJson('V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json');
const readinessPolicy=readJson('V4544_IDENTITY_FIX_RETIREMENT_READINESS.json');
if(auth.schema_version!=='engineer-osint-identity-fix-retirement-authorization-v1'||auth.status!=='READY_FOR_EXACT_IDENTITY_FIX_RETIREMENT_SLICE')fail('authorization schema/status drift');
if(readinessPolicy.schema_version!=='engineer-osint-identity-fix-retirement-readiness-v1'||readinessPolicy.status!=='READINESS_ONLY_NO_RETIREMENT_AUTHORIZATION')fail('v4.5.44 readiness policy drift');

for(const key of ['required_persistent_run_id','required_b99_file_sha256','required_b99_canonical_sha256']){
  if(auth[key]!==readinessPolicy[key])fail(`v4.5.44 to v4.5.45 B99 handoff drift: ${key}`);
}
for(const key of ['file','runtime_id','git_blob_sha','sentinel'])if(auth.identity_fix?.[key]!==readinessPolicy.identity_fix?.[key])fail(`identity-fix handoff drift: ${key}`);
if(gitBlobSha(readFileSync(join(src,'V4544_IDENTITY_FIX_RETIREMENT_READINESS.json'),'utf8'))!==auth.current_runtime_pins.v4544_readiness_policy_git_blob_sha)fail('v4.5.44 readiness policy blob drift');
if(gitBlobSha(readFileSync(join(src,'runtime-modules.mjs'),'utf8'))!==auth.current_runtime_pins.runtime_modules_git_blob_sha)fail('runtime module manifest drift since authorization review');
if(gitBlobSha(readFileSync(join(src,'legacy-runtime-overlay-baseline.json'),'utf8'))!==auth.current_runtime_pins.legacy_runtime_overlay_baseline_git_blob_sha)fail('legacy active baseline drift since authorization review');
if(gitBlobSha(readFileSync(join(src,auth.identity_fix.file),'utf8'))!==auth.identity_fix.git_blob_sha)fail('identity-fix source blob drift');

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b99Index=manifest.runs.findIndex(entry=>entry.run_id===auth.required_persistent_run_id);
if(b99Index<0||b99Index!==manifest.runs.findLastIndex(entry=>entry.run_id===auth.required_persistent_run_id))fail('unique historical B99 anchor missing');
const b99=manifest.runs[b99Index];
if(b99.file_sha256!==auth.required_b99_file_sha256||b99.canonical_sha256!==auth.required_b99_canonical_sha256)fail('B99 historical hash drift');
if(store.report.current_run_id!==manifest.runs.at(-1).run_id||store.report.canonical_sha256!==manifest.runs.at(-1).canonical_sha256)fail('run-store tip/report mismatch');
if(manifest.runs.length-1<b99Index)fail('canonical tip predates B99');

const identity=auth.identity_fix;
if(LEGACY_FACTUAL_OVERLAY_MODULES.length!==1||LEGACY_FACTUAL_OVERLAY_MODULES[0][0]!==identity.runtime_id||LEGACY_FACTUAL_OVERLAY_MODULES[0][1]!==identity.file)fail('pre-retirement legacy factual runtime scope drift');
if(!PUBLIC_RUNTIME_MODULES.some(([id,file])=>id===identity.runtime_id&&file===identity.file))fail('identity-fix not active before authorized retirement slice');
if(!TRANSITION_RUNTIME_MODULES.some(([,file])=>file==='overlay-transition-runtime-guard.js'))fail('transition guard runtime missing before identity retirement');
const baseline=readJson('legacy-runtime-overlay-baseline.json');
if(Object.keys(baseline.modules||{}).length!==1||!baseline.modules?.[identity.file])fail('pre-retirement active legacy baseline scope drift');

const evidence=auth.reviewed_readiness_evidence||{};
if(evidence.v4544_pr_number!==263||evidence.v4544_pr_head_sha!=='13a01ef785d616519c9baecb9f6281e7ec6c8472'||evidence.v4544_main_merge_sha!==auth.reviewed_baseline_main_sha)fail('v4.5.44 reviewed GitHub identity drift');
if(evidence.v4544_pr_workflow_run_id!==33392271079||evidence.v4544_pr_workflow_job_id!==99488457836||evidence.v4544_pr_workflow_conclusion!=='success')fail('v4.5.44 readiness workflow evidence drift');
if(evidence.v4544_pr_validation_workflow_count!==11||evidence.v4544_pr_validation_success_count!==11)fail('v4.5.44 PR validation count drift');
if(evidence.post_merge_push_workflow_count!==6||evidence.post_merge_push_success_count!==6||evidence.post_merge_push_failure_count!==0||evidence.post_merge_push_in_progress_count!==0)fail('v4.5.44 post-merge validation count drift');
if(evidence.v4544_artifact_id!==9757942023||evidence.v4544_artifact_sha256!=='914d3e90e16c3589353dac7a155fd07b7de48fed8338783c3f2e41e34ce427af')fail('v4.5.44 artifact evidence drift');
if(evidence.browser_normalized_dom_sha256!=='6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31')fail('v4.5.44 browser digest evidence drift');
if(evidence.identity_overlay_residual_mutations!==0||evidence.other_public_runtime_sentinel_consumer_count!==0)fail('v4.5.44 zero-effect evidence drift');
if(evidence.test_total!==337||evidence.test_pass!==334||evidence.test_fail!==0||evidence.test_skipped!==3)fail('v4.5.44 test evidence drift');

const readinessAuditPath=join(dist,'identity-fix-retirement-readiness-audit.json');
const readinessAudit=parseJsonStrict(readFileSync(readinessAuditPath,'utf8'),{source:readinessAuditPath});
if(readinessAudit.status!=='PASS'||readinessAudit.identity_overlay_residual_mutations!==0||readinessAudit.other_public_runtime_sentinel_consumer_count!==0)fail('current reproduced v4.5.44 readiness evidence mismatch');
if(readinessAudit.identity_fix_runtime_active!==true||readinessAudit.active_legacy_factual_module_count!==1)fail('current reproduced v4.5.44 runtime scope mismatch');
if(readinessAudit.browser_normalized_dom_parity!==true||readinessAudit.browser_parity_evidence_pending!==false||readinessAudit.ready_for_separate_retirement_authorization_review!==true)fail('current reproduced browser readiness proof missing');

const a=auth.authorization||{};
const mustTrue=['one_retirement_slice_only','allow_identity_fix_runtime_removal','allow_identity_overlay_retirement','allow_remove_exact_identity_entry_from_legacy_factual_overlay_modules','allow_remove_exact_identity_entry_from_active_legacy_baseline','retain_identity_fix_source_as_historical_artifact'];
for(const key of mustTrue)if(a[key]!==true)fail(`required exact retirement authorization missing: ${key}`);
if(a.expected_resulting_active_legacy_factual_module_count!==0||a.expected_resulting_active_legacy_baseline_module_count!==0)fail('authorized resulting legacy module count drift');
const mustFalse=['allow_identity_fix_file_deletion','allow_transition_guard_runtime_removal','allow_any_other_runtime_module_removal','allow_canonical_data_edit','allow_run_store_manifest_edit','allow_run_append','allow_b99_file_edit','allow_manual_hash_edit'];
for(const key of mustFalse)if(a[key]!==false)fail(`authorization scope broadened: ${key}`);

const proof=auth.required_retirement_proof||{};
if(proof.identity_overlay_residual_mutations_before!==0||proof.other_public_runtime_sentinel_consumer_count_before!==0||proof.browser_normalized_dom_parity_before!==true||proof.browser_normalized_dom_parity_after!==true)fail('required retirement parity proof weakened');
if(proof.canonical_write_performed!==false||proof.run_store_manifest_edit_performed!==false||proof.identity_fix_source_retained!==true||proof.historical_b99_hashes_unchanged!==true)fail('required retirement safety proof weakened');

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-retirement-authorization-audit-v1',
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  reviewed_baseline_main_sha:auth.reviewed_baseline_main_sha,
  historical_b99:{run_id:auth.required_persistent_run_id,file_sha256:auth.required_b99_file_sha256,canonical_sha256:auth.required_b99_canonical_sha256,status:'PASS'},
  readiness_reproduced:true,identity_overlay_residual_mutations:0,other_public_runtime_sentinel_consumer_count:0,browser_normalized_dom_parity:true,
  authorization:{
    exact_identity_fix_retirement_slice_authorized:true,
    identity_fix_runtime_removal_authorized:true,
    identity_overlay_retirement_authorized:true,
    source_file_deletion_authorized:false,
    transition_guard_removal_authorized:false,
    other_runtime_module_removal_authorized:false,
    canonical_data_edit_authorized:false,
    run_store_manifest_edit_authorized:false,
    run_append_authorized:false
  },
  retirement_performed:false,canonical_write_performed:false,run_store_manifest_edit_performed:false
};
writeFileSync(join(dist,'identity-fix-retirement-authorization-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'identity-fix-retirement-authorization-audit.md'),`# ENGINEER OSINT v4.5.45 — identity-fix retirement authorization\n\nStatus: **PASS**\n\nThis slice authorizes exactly one future retirement change for the final identity-fix compatibility overlay. It does **not** perform that retirement.\n\n- persistent B99 anchor: **PASS**\n- v4.5.44 readiness reproduced: **PASS**\n- identity overlay residual mutations: **0**\n- external sentinel consumers: **0**\n- browser normalized DOM parity: **PASS**\n- exact identity runtime retirement authorized: **yes, next isolated slice only**\n- identity source deletion authorized: **no**\n- transition guard removal authorized: **no**\n- other runtime module removal authorized: **no**\n- canonical/run-store writes authorized: **no**\n- retirement performed here: **no**\n`);
appendFileSync(join(dist,'health.txt'),'identity_fix_retirement_authorization=pass\nidentity_fix_retirement_exact_slice_authorized=1\nidentity_fix_retirement_performed=0\nidentity_fix_source_deletion_authorized=0\nidentity_fix_canonical_writes_authorized=0\n');
console.log('IDENTITY_FIX_RETIREMENT_AUTHORIZATION=PASS exact_slice=authorized retirement_performed=0');
