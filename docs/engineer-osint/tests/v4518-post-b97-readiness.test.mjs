import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const authorization=JSON.parse(readFileSync(`${root}/V4518_B97_APPEND_AUTHORIZATION.json`,'utf8'));
const readiness=JSON.parse(readFileSync(`${root}/V4517_B97_READINESS.json`,'utf8'));
const candidateRaw=readFileSync(`${root}/V4517_B97_PATCH_CANDIDATE.json`,'utf8');
const candidate=JSON.parse(candidateRaw);
const appendRun=readFileSync(`${root}/append-run.mjs`,'utf8');
const persistentAudit=readFileSync(`${root}/audit-persistent-b97.mjs`,'utf8');
const mediaLib=readFileSync(`${root}/lib/media-sweep-exceptions.mjs`,'utf8');
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const attestationRaw=readFileSync(`${root}/data/attestations/engineer-osint-20260830-B97-media-omission.md`,'utf8');
const workflow=readFileSync('.github/workflows/pages.yml','utf8');
const verifier=readFileSync(`${root}/verify-pages-artifact-pre-b98.mjs`,'utf8');
const sha256=text=>createHash('sha256').update(text).digest('hex');
const b97Exception=registry.exceptions.find(item=>item.run_id==='engineer-osint-20260830-B97');

const B96='engineer-osint-20260829-B96';
const B97='engineer-osint-20260830-B97';
const B96_SHA='4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5';
const B97_FILE_SHA='b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad';
const B97_CANONICAL_SHA='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';

test('v4.5.19 activates only the exact B97 candidate after reviewed POST_B97 CI evidence',()=>{
  assert.equal(authorization.schema_version,'engineer-osint-b97-append-authorization-v1');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.review_date,'2026-08-30');
  assert.equal(authorization.reviewed_baseline_main_sha,'c9bfbd3c5813e1a5cb10cac9519fae5e97ec3e02');
  assert.equal(authorization.candidate_run_id,B97);
  assert.equal(authorization.expected_parent_run_id,B96);
  assert.equal(authorization.expected_parent_canonical_sha256,B96_SHA);
  assert.equal(authorization.exact_candidate_file_sha256,B97_FILE_SHA);
  assert.equal(authorization.expected_resulting_canonical_sha256,B97_CANONICAL_SHA);
  assert.equal(authorization.expected_gap_count,15);
  assert.equal(authorization.expected_assessment_count,0);
  assert.equal(authorization.expected_contradiction_count,0);
  assert.equal(authorization.current_blocker,null);
  assert.equal(authorization.required_preconditions.post_b97_ci_pipeline_ready,true);
  assert.equal(authorization.authorization.append_exact_candidate_only,true);
  assert.equal(authorization.authorization.standard_append_run_write_required,true);
  assert.equal(authorization.authorization.one_run_only,true);
  assert.equal(authorization.authorization.allow_manual_manifest_or_hash_edit,false);
  assert.equal(authorization.authorization.allow_b98_same_slice,false);
  assert.equal(authorization.authorization.allow_overlay_retirement,false);
  assert.equal(authorization.authorization.allow_identity_fix_migration,false);
  assert.equal(authorization.activation_evidence.readiness_pr_number,232);
  assert.equal(authorization.activation_evidence.reviewed_ci_head_sha,'7d8da16a5bc6dd486ace9145188a919b785c22a2');
  assert.equal(authorization.activation_evidence.runtime_audit_workflow_run_id,33319980190);
  assert.equal(authorization.activation_evidence.runtime_audit_workflow_conclusion,'success');
  assert.equal(authorization.activation_evidence.pages_pr_workflow_run_id,33319980184);
  assert.equal(authorization.activation_evidence.pages_pr_workflow_conclusion,'success');
  assert.equal(authorization.activation_evidence.b97_readiness_pr_workflow_run_id,33319980208);
  assert.equal(authorization.activation_evidence.b97_readiness_pr_workflow_conclusion,'success');
  assert.equal(authorization.activation_evidence.merged_readiness_main_sha,'c9bfbd3c5813e1a5cb10cac9519fae5e97ec3e02');
  assert.equal(authorization.activation_evidence.pages_main_workflow_run_id,33320057536);
  assert.equal(authorization.activation_evidence.pages_main_workflow_conclusion,'success');
  assert.equal(authorization.activation_evidence.b97_readiness_main_workflow_run_id,33320057511);
  assert.equal(authorization.activation_evidence.b97_readiness_main_workflow_conclusion,'success');
  assert.equal(authorization.activation_evidence.post_b97_pages_simulation,'success');
  assert.equal(sha256(candidateRaw),B97_FILE_SHA);
  assert.equal(readiness.expected_resulting_canonical_sha256,B97_CANONICAL_SHA);
});

test('B97 multimedia omission attestation is one-run, hash-pinned and Intelligence-migration-only',()=>{
  assert.ok(b97Exception);
  assert.equal(registry.exceptions.filter(item=>item.run_id===B97).length,1);
  assert.equal(b97Exception.exception_id,'MEDIA-SWEEP-ATTEST-B97-INTELLIGENCE-MIGRATION');
  assert.equal(b97Exception.parent_run_id,B96);
  assert.equal(b97Exception.attestation_basis,'REPOSITORY_REVIEWED_MIGRATION');
  assert.equal(b97Exception.attestation_reference,'V4517_B97_READINESS');
  assert.equal(b97Exception.repository_file_sha256,B97_FILE_SHA);
  assert.equal(b97Exception.repository_canonical_sha256,B97_CANONICAL_SHA);
  assert.equal(b97Exception.waiver_scope,'INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(b97Exception.resolved_status,'MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(sha256(attestationRaw),b97Exception.report_text_sha256);
  assert.equal(b97Exception.report_drive_id,undefined);
  assert.match(mediaLib,/INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION'/);
  assert.match(mediaLib,/ensureIntelligenceMigrationNoMediaAddition/);
  assert.match(mediaLib,/requires exactly 15 gaps and no assessments\/contradictions/);
  assert.match(mediaLib,/native gap identity drift/);
  assert.match(mediaLib,/cannot cover correction operations/);
});

test('B97 guarded write path requires active exact authorization and refuses broader scope',()=>{
  assert.match(appendRun,/guardedB97='engineer-osint-20260830-B97'/);
  assert.match(appendRun,/V4518_B97_APPEND_AUTHORIZATION\.json/);
  assert.match(appendRun,/authorization\.status!=='READY_FOR_APPEND'/);
  assert.match(appendRun,/post_b97_ci_pipeline_ready!==true/);
  assert.match(appendRun,/B97 append candidate file SHA differs from reviewed authorization/);
  assert.match(appendRun,/B97 append resulting canonical SHA differs from reviewed authorization/);
  assert.match(appendRun,/B97 append native gap count mismatch/);
  assert.match(appendRun,/B97 append Intelligence v1 scope mismatch/);
  assert.match(appendRun,/B97 append may not include factual correction operations/);
  assert.match(appendRun,/allow_b98_same_slice!==false/);
  assert.match(appendRun,/allow_overlay_retirement!==false/);
  assert.match(appendRun,/allow_identity_fix_migration!==false/);
});

test('persistent B97 audit proves both simulated pre-append and exact post-append lifecycle states',()=>{
  assert.match(persistentAudit,/SIMULATED_PRE_APPEND_READINESS/);
  assert.match(persistentAudit,/PERSISTENT_POST_APPEND/);
  assert.match(persistentAudit,/simulation requires persistent B96/);
  assert.match(persistentAudit,/persistent audit requires exact B97 tip/);
  assert.match(persistentAudit,/persistent B97 bytes differ from reviewed candidate/);
  assert.match(persistentAudit,/native gap missing/);
  assert.match(persistentAudit,/B98 assessment materialized before Stage C/);
  assert.match(persistentAudit,/residual debt drift/);
  assert.match(persistentAudit,/runtime guard short-circuit drift/);
  assert.match(persistentAudit,/MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION/);
  assert.match(persistentAudit,/native_gap_count:15/);
  assert.match(persistentAudit,/b98_assessment_count:0/);
  assert.match(persistentAudit,/b98_materialized:false/);
  assert.match(persistentAudit,/overlays_must_remain_active:true/);
  assert.match(persistentAudit,/post_b97_pages_validation_ready:true/);
  assert.match(persistentAudit,/canonical_write_performed:false/);
});

test('Pages workflow has explicit POST_B97 phase and simulates it before B97 append',()=>{
  assert.match(workflow,/else if\(run==='engineer-osint-20260830-B97'\)phase='POST_B97'/);
  assert.match(workflow,/name: Simulate post-B97 Pages validation before append/);
  assert.match(workflow,/if: steps\.migration-phase\.outputs\.phase == 'POST_B96'/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-persistent-b97\.mjs --simulate-from-candidate/);
  assert.match(workflow,/name: Audit persistent B97 post-append state/);
  assert.match(workflow,/if: steps\.migration-phase\.outputs\.phase == 'POST_B97'/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-persistent-b97\.mjs/);
});

test('final Pages verifier requires active exact-only B97 authorization in pre-write and persistent states',()=>{
  assert.match(verifier,/currentRun===b97\?'POST_B97'/);
  assert.match(verifier,/persistent_b97_mode=simulated-pre-append/);
  assert.match(verifier,/persistent_b97_mode=persistent/);
  assert.match(verifier,/candidate_file_sha256!=='b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad'/);
  assert.match(verifier,/resulting_canonical_sha256!=='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4'/);
  assert.match(verifier,/native_gap_count!==15/);
  assert.match(verifier,/b98_assessment_count!==0/);
  assert.match(verifier,/residual_signature_count!==61/);
  assert.match(verifier,/residual_factual_leaf_mutations!==81/);
  assert.match(verifier,/guard_short_circuit_count!==0/);
  assert.match(verifier,/post_b97_pages_validation_ready!==true/);
  assert.equal((verifier.match(/authorization\.status!=='READY_FOR_APPEND'/g)||[]).length,2);
  assert.equal((verifier.match(/append_exact_candidate_only!==true/g)||[]).length,2);
  assert.match(verifier,/B97 pre-write authorization is not active and exact-only/);
  assert.match(verifier,/persisted B97 lacks reviewed active authorization/);
  assert.match(verifier,/allow_b98_same_slice!==false/);
  assert.match(verifier,/allow_overlay_retirement!==false/);
  assert.match(verifier,/allow_identity_fix_migration!==false/);
});

test('reviewed B97 candidate remains gaps-only and unchanged by activation work',()=>{
  assert.equal(candidate.state.run_id,B97);
  assert.equal(candidate.state.parent_run_id,B96);
  assert.deepEqual(candidate.extensions.intelligence_v1.gaps.map(item=>item.gap_id),Array.from({length:15},(_,i)=>`ENG-GAP-B97-OVL-${String(i+1).padStart(3,'0')}`));
  assert.equal(candidate.extensions.intelligence_v1.assessments.length,0);
  assert.equal(candidate.extensions.intelligence_v1.contradictions.length,0);
  assert.equal(candidate.extensions.operations_v1,undefined);
  for(const value of Object.values(candidate.state.counts))assert.equal(value,0);
  for(const value of Object.values(candidate.true_delta))assert.equal(value,0);
  for(const field of ['new_records','updated_records','sources','relations','evidence','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned'])assert.equal(candidate[field].length,0);
});
