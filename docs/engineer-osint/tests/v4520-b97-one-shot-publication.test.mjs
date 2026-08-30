import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/b97-one-shot-publish.yml','utf8');
const contract=readFileSync('docs/engineer-osint/V4520_B97_ONE_SHOT_PUBLICATION.md','utf8');

test('v4.5.23 B97 one-shot regeneration is main-triggered but writes only the fresh isolated review branch',()=>{
  assert.match(workflow,/push:\n    branches: \[main\]/);
  assert.match(workflow,/paths:\n      - '\.github\/workflows\/b97-one-shot-publish\.yml'/);
  assert.match(workflow,/B97_RESULT_BRANCH: automation\/b97-append-result-v2/);
  assert.match(workflow,/git ls-remote --exit-code --heads origin/);
  assert.match(workflow,/git switch -c "\$B97_RESULT_BRANCH"/);
  assert.match(workflow,/git push --set-upstream origin "\$B97_RESULT_BRANCH"/);
  assert.doesNotMatch(workflow,/git push[^\n]*\bmain\b/);
});

test('v4.5.20 pins the exact B96-to-B97 identity, hashes and Intelligence-only scope',()=>{
  assert.match(workflow,/B96_RUN: engineer-osint-20260829-B96/);
  assert.match(workflow,/B97_RUN: engineer-osint-20260830-B97/);
  assert.match(workflow,/B97_CANDIDATE_SHA256: b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad/);
  assert.match(workflow,/B97_RESULT_SHA256: 9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4/);
  assert.match(workflow,/expected_gap_count!==15/);
  assert.match(workflow,/expected_assessment_count!==0/);
  assert.match(workflow,/expected_contradiction_count!==0/);
  assert.match(workflow,/intel\.gaps\?\.length!==15/);
  assert.match(workflow,/intel\.assessments\?\.length!==0/);
  assert.match(workflow,/intel\.contradictions\?\.length!==0/);
  assert.match(workflow,/operations_v1!==undefined/);
});

test('v4.5.21 creates the standard B97 dry-run plan before readiness and simulated POST_B97 audits',()=>{
  const baseline=workflow.indexOf('Build persistent B96 and verify current canonical baseline');
  const dry=workflow.indexOf('Dry-run exact reviewed B97 through standard append helper');
  const readiness=workflow.indexOf('Re-audit exact B97 readiness and simulated POST_B97 state');
  const write=workflow.indexOf('Execute guarded standard B97 append locally');
  const audit=workflow.indexOf('Verify persistent B97 locally before any push');
  const diff=workflow.indexOf('Enforce exact two-file publication diff');
  const push=workflow.indexOf('Push append-generated result to isolated review branch');
  assert.ok(baseline>0&&dry>baseline&&readiness>dry&&write>readiness&&audit>write&&diff>audit&&push>diff);
  assert.match(workflow,/plan='docs\/engineer-osint-dist\/b97-append-plan\.json'/);
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-b97-readiness\.mjs/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-persistent-b97\.mjs --simulate-from-candidate/);
  assert.ok(workflow.indexOf('node docs/engineer-osint/audit-b97-readiness.mjs')>workflow.indexOf('node docs/engineer-osint/append-run.mjs "$candidate" > "$plan"'));
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" --write/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-persistent-b97\.mjs\n/);
  assert.match(workflow,/plan\.status!=='VALIDATED_DRY_RUN'/);
  assert.match(workflow,/plan\.status!=='APPENDED'/);
});

test('v4.5.20 result diff is exactly manifest plus immutable B97 run and excludes B98',()=>{
  assert.match(workflow,/'docs\/engineer-osint\/data\/run-store-manifest\.json'/);
  assert.match(workflow,/'docs\/engineer-osint\/data\/runs\/engineer-osint-20260830-B97\.json'/);
  assert.match(workflow,/test "\$\(wc -l < \/tmp\/b97-actual-paths\.txt \| tr -d ' '\)" = '2'/);
  assert.match(workflow,/B98 leaked into B97 slice/);
  assert.match(workflow,/allow_b98_same_slice!==false/);
  assert.match(workflow,/allow_overlay_retirement!==false/);
  assert.match(workflow,/allow_identity_fix_migration!==false/);
});

test('v4.5.20 documentation preserves the review-before-publication boundary',()=>{
  assert.match(contract,/review branch generated/);
  assert.match(contract,/separate review PR/);
  assert.match(contract,/production Pages deploy succeeds/);
  assert.match(contract,/must not:\n\n- push the append result directly to `main`/);
  assert.match(contract,/persist B98 in the same slice/);
  assert.match(contract,/retire or short-circuit the three legacy factual overlays/);
});
