import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const authorization=JSON.parse(readFileSync(`${root}/V4526_B98_APPEND_AUTHORIZATION.json`,'utf8'));
const appendRun=readFileSync(`${root}/append-run.mjs`,'utf8');
const oneShot=readFileSync('.github/workflows/b98-one-shot-publish.yml','utf8');
const pagesGate=readFileSync(`${root}/verify-post-b98-pages-readiness.mjs`,'utf8');
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const currentRun=manifest.runs.at(-1)?.run_id||manifest.snapshot.run_id;
const b98Path=`${root}/data/runs/engineer-osint-20260830-B98.json`;
const sha256=text=>createHash('sha256').update(text).digest('hex');

const assertAuthorizedLifecyclePresence=()=>{
  if(currentRun==='engineer-osint-20260830-B97')assert.equal(existsSync(b98Path),false);
  else if(currentRun==='engineer-osint-20260830-B98'){
    assert.equal(existsSync(b98Path),true);
    assert.equal(sha256(readFileSync(b98Path,'utf8')),authorization.exact_candidate_file_sha256);
  }else assert.fail(`unexpected B98 lifecycle tip ${currentRun}`);
};

test('v4.5.26 activates only the exact reviewed B98 candidate',()=>{
  assert.equal(authorization.schema_version,'engineer-osint-b98-append-authorization-v1');
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.candidate_run_id,'engineer-osint-20260830-B98');
  assert.equal(authorization.expected_parent_run_id,'engineer-osint-20260830-B97');
  assert.equal(authorization.expected_parent_canonical_sha256,'9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4');
  assert.equal(authorization.exact_candidate_file_sha256,'ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79');
  assert.equal(authorization.expected_resulting_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(authorization.expected_candidate_evidence_count,2);
  assert.equal(authorization.expected_candidate_assessment_count,4);
  assert.equal(authorization.expected_candidate_gap_count,0);
  assert.equal(authorization.expected_candidate_contradiction_count,0);
  assert.equal(authorization.expected_persistent_gap_count,15);
  assert.equal(authorization.required_preconditions.v4525_post_b98_ci_pipeline_ready,true);
  assert.equal(authorization.required_preconditions.pages_post_b98_phase_ready,true);
  assert.equal(authorization.required_preconditions.expected_guard_short_circuits,3);
  assert.equal(authorization.required_preconditions.expected_guarded_factual_mutations,0);
  assert.equal(authorization.authorization.append_exact_candidate_only,true);
  assert.equal(authorization.authorization.standard_append_run_write_required,true);
  assert.equal(authorization.authorization.one_run_only,true);
  assert.equal(authorization.authorization.allow_manual_manifest_or_hash_edit,false);
  assert.equal(authorization.authorization.allow_future_run_same_slice,false);
  assert.equal(authorization.authorization.allow_overlay_retirement,false);
  assert.equal(authorization.authorization.allow_identity_fix_migration,false);
  assertAuthorizedLifecyclePresence();
});

test('B98 authorization is based on reviewed green PR and main POST_B98 evidence',()=>{
  const evidence=authorization.activation_evidence;
  assert.equal(evidence.readiness_pr_number,241);
  assert.equal(evidence.reviewed_ci_head_sha,'0f4c0e63a0c483c2e6a1341d0a84c903a7ac7080');
  for(const key of [
    'b98_post_ci_pr_workflow_conclusion','b98_readiness_pr_workflow_conclusion','b97_readiness_pr_workflow_conclusion','runtime_audit_pr_workflow_conclusion','pages_pr_workflow_conclusion',
    'b98_post_ci_main_workflow_conclusion','b98_readiness_main_workflow_conclusion','b97_readiness_main_workflow_conclusion','pages_main_workflow_conclusion'
  ])assert.equal(evidence[key],'success');
  assert.equal(evidence.merged_readiness_main_sha,'0ac1ac61d602416d4b78f29ce1dc241095c8bae8');
  assert.equal(evidence.post_b98_pages_simulation,'success');
  assert.equal(evidence.post_b98_pages_deploy,'success');
});

test('standard append helper independently guards B98 exact hashes and scope',()=>{
  assert.match(appendRun,/guardedB98='engineer-osint-20260830-B98'/);
  assert.match(appendRun,/V4526_B98_APPEND_AUTHORIZATION\.json/);
  assert.match(appendRun,/B98 append authorization schema mismatch/);
  assert.match(appendRun,/B98 append candidate file SHA differs from reviewed authorization/);
  assert.match(appendRun,/B98 append resulting canonical SHA differs from reviewed authorization/);
  assert.match(appendRun,/B98 append evidence count mismatch/);
  assert.match(appendRun,/B98 append Intelligence v1 scope mismatch/);
  assert.match(appendRun,/B98 append may not include factual correction operations/);
  assert.match(appendRun,/B98 append candidate may not authorize overlay retirement/);
  assert.match(appendRun,/allow_future_run_same_slice/);
  assert.match(appendRun,/allow_overlay_retirement/);
  assert.match(appendRun,/allow_identity_fix_migration/);
});

test('B98 one-shot is main-triggered but writes only an isolated review branch',()=>{
  assert.match(oneShot,/name: ENGINEER OSINT one-shot B98 publication branch/);
  assert.match(oneShot,/branches: \[main\]/);
  assert.match(oneShot,/\.github\/workflows\/b98-one-shot-publish\.yml/);
  assert.match(oneShot,/B98_RESULT_BRANCH: automation\/b98-append-result/);
  assert.match(oneShot,/git ls-remote --exit-code --heads origin/);
  assert.match(oneShot,/build-b98-readiness\.mjs/);
  assert.match(oneShot,/append-run\.mjs "\$candidate" --write/);
  assert.match(oneShot,/audit-persistent-b98\.mjs --simulate-from-generated/);
  assert.match(oneShot,/audit-persistent-b98\.mjs/);
  assert.match(oneShot,/Enforce exact two-file publication diff/);
  assert.match(oneShot,/docs\/engineer-osint\/data\/run-store-manifest\.json/);
  assert.match(oneShot,/docs\/engineer-osint\/data\/runs\/engineer-osint-20260830-B98\.json/);
  assert.match(oneShot,/git switch -c "\$B98_RESULT_BRANCH"/);
  assert.match(oneShot,/git push --set-upstream origin "\$B98_RESULT_BRANCH"/);
  assert.doesNotMatch(oneShot,/git (push|checkout|switch)[^\n]* main/);
  assert.doesNotMatch(oneShot,/rm [^\n]*rich-backfill/);
});

test('Pages keeps persistent B98 fail-closed behind the separately reviewed v4.5.26 authorization',()=>{
  assert.match(pagesGate,/V4526_B98_APPEND_AUTHORIZATION\.json/);
  assert.match(pagesGate,/status!=='READY_FOR_APPEND'/);
  assert.match(pagesGate,/append_exact_candidate_only!==true/);
  assert.match(pagesGate,/standard_append_run_write_required!==true/);
  assert.match(pagesGate,/allow_overlay_retirement!==false/);
  assert.match(pagesGate,/allow_identity_fix_migration!==false/);
});
