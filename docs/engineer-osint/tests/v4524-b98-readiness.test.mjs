import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4524_B98_READINESS.json`,'utf8'));
const review=JSON.parse(readFileSync(`${root}/V457_ASSESSMENT_EVIDENCE_REVIEW.json`,'utf8'));
const generator=readFileSync(`${root}/build-b98-readiness.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/b98-readiness.yml','utf8');
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const currentRun=manifest.runs.at(-1)?.run_id||manifest.snapshot.run_id;
const b98Path=`${root}/data/runs/engineer-osint-20260830-B98.json`;
const b96Raw=readFileSync(`${root}/data/runs/engineer-osint-20260829-B96.json`,'utf8');
const b97Raw=readFileSync(`${root}/data/runs/engineer-osint-20260830-B97.json`,'utf8');
const b96=JSON.parse(b96Raw),b97=JSON.parse(b97Raw);

const assertLifecyclePresence=()=>{
  if(currentRun==='engineer-osint-20260830-B97')assert.equal(existsSync(b98Path),false);
  else if(currentRun==='engineer-osint-20260830-B98')assert.equal(existsSync(b98Path),true);
  else assert.fail(`unexpected B98 lifecycle tip ${currentRun}`);
};

test('v4.5.24 B98 readiness is pinned to exact persistent B97 and remains no-write',()=>{
  assert.equal(policy.schema_version,'engineer-osint-b98-readiness-v1');
  assert.equal(policy.status,'READ_ONLY_CANDIDATE_BUILD');
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260830-B97');
  assert.equal(policy.expected_parent_canonical_sha256,'9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4');
  assert.equal(policy.expected_b96_file_sha256,'3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1');
  assert.equal(policy.expected_b97_file_sha256,'b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad');
  assert.equal(policy.expected_evidence_count,2);
  assert.equal(policy.expected_assessment_count,4);
  assert.equal(policy.expected_gap_count_already_persistent,15);
  assert.equal(policy.expected_guard_short_circuits_before,0);
  assert.equal(policy.expected_guard_short_circuits_after_simulated_b98,3);
  assert.equal(policy.expected_unguarded_residual_signatures,61);
  assert.equal(policy.expected_unguarded_residual_factual_leaf_mutations,81);
  for(const value of Object.values(policy.safety))assert.equal(value,false);
  assertLifecyclePresence();
});

test('persistent B96 and B97 inputs retain the exact reviewed migration scope',()=>{
  assert.equal(b96.state.run_id,'engineer-osint-20260829-B96');
  assert.equal(b96.state.parent_run_id,'engineer-osint-20260826-B95');
  assert.equal(b96.extensions.operations_v1.length,104);
  assert.equal(b96.sources.length,15);
  assert.equal(b97.state.run_id,'engineer-osint-20260830-B97');
  assert.equal(b97.state.parent_run_id,'engineer-osint-20260829-B96');
  assert.equal(b97.extensions.intelligence_v1.gaps.length,15);
  assert.equal(b97.extensions.intelligence_v1.assessments.length,0);
  assert.equal(b97.extensions.intelligence_v1.contradictions.length,0);
  assert.equal(b97.extensions.operations_v1,undefined);
});

test('B98 generator reuses the curated review but rebuilds Stage C directly from persistent B97',()=>{
  assert.equal(review.candidate_run_id,'engineer-osint-20260830-B98');
  assert.equal(review.expected_parent_run_id,'engineer-osint-20260830-B97');
  assert.equal(review.evidence_candidates.length,2);
  assert.equal(review.assessment_candidates.length,4);
  assert.match(generator,/V457_ASSESSMENT_EVIDENCE_REVIEW\.json/);
  assert.match(generator,/loadCanonicalRunStore\(\{root:src\}\)/);
  assert.match(generator,/requires exact persistent B97/);
  assert.match(generator,/expected_b96_file_sha256/);
  assert.match(generator,/expected_b97_file_sha256/);
  assert.doesNotMatch(generator,/overlay-stage-a-patch-candidate\.json/);
  assert.doesNotMatch(generator,/overlay-stage-b-gap-patch-candidate\.json/);
  assert.match(generator,/historical_review_persistent_tip_required:review\.persistent_tip_required/);
});

test('B98 candidate is evidence-first, assessments-only Intelligence and has exact stable IDs',()=>{
  assert.match(generator,/NEW_EVIDENCE:evidence\.length/);
  assert.match(generator,/extensions:\{intelligence_v1:\{assessments,gaps:\[\],contradictions:\[\]\}\}/);
  assert.match(generator,/ENG-ASMT-B98-OVL-/);
  assert.match(generator,/evidence_candidate_count:evidence\.length/);
  assert.match(generator,/assessment_candidate_count:assessments\.length/);
  assert.match(generator,/evidence target mismatch/);
  assert.match(generator,/evidence source mismatch/);
  assert.match(generator,/legacy_unsupported_implications_removed:true/);
  assert.match(generator,/overlay_retirement_authorized:false/);
});

test('B98 simulation proves fail-closed runtime transition from zero to three short-circuits',()=>{
  assert.match(generator,/evaluateFirstThreeOverlayTransition/);
  assert.match(generator,/library transition guard passes before persistent B98/);
  assert.match(generator,/library transition guard blocks simulated B98/);
  assert.match(generator,/overlay-transition-runtime-guard\.js/);
  assert.match(generator,/expected_guard_short_circuits_before/);
  assert.match(generator,/expected_guard_short_circuits_after_simulated_b98/);
  assert.match(generator,/guarded simulated B98 overlays are not zero-mutation/);
  assert.match(generator,/expected_unguarded_residual_signatures/);
  assert.match(generator,/expected_unguarded_residual_factual_leaf_mutations/);
});

test('B98 readiness workflow is lifecycle-aware, never writes, and preserves the exact pre-B98 dry-run',()=>{
  assert.match(generator,/b98-patch-candidate\.json/);
  assert.match(generator,/b98-readiness-audit\.json/);
  assert.match(generator,/b98-readiness-audit\.md/);
  assert.match(workflow,/Detect B98 lifecycle phase/);
  assert.match(workflow,/phase=PRE_B98/);
  assert.match(workflow,/phase=POST_B98/);
  assert.match(workflow,/steps\.lifecycle\.outputs\.phase == 'PRE_B98'/);
  assert.match(workflow,/steps\.lifecycle\.outputs\.phase == 'POST_B98'/);
  assert.match(workflow,/node docs\/engineer-osint\/build-b98-readiness\.mjs/);
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.match(workflow,/plan\.status!=='VALIDATED_DRY_RUN'/);
  assert.match(workflow,/B98_DRY_RUN_RESULT_SHA=/);
  assert.match(workflow,/audit-persistent-b98\.mjs/);
  assert.match(workflow,/PERSISTENT_POST_APPEND/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  assert.doesNotMatch(generator,/append-run\.mjs/);
});
