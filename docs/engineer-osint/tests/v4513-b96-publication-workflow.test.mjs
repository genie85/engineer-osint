import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/b96-one-shot-publish.yml','utf8');
const appendRun=fs.readFileSync(new URL('../append-run.mjs',import.meta.url),'utf8');
const authorization=JSON.parse(fs.readFileSync(new URL('../V4511_B96_APPEND_AUTHORIZATION.json',import.meta.url),'utf8'));

test('v4.5.13 one-shot trigger is scoped to its own main-branch enablement commit',()=>{
  assert.match(workflow,/push:\n    branches: \[main\]/);
  assert.match(workflow,/\.github\/workflows\/b96-one-shot-publish\.yml/);
  assert.match(workflow,/contents: write/);
  assert.doesNotMatch(workflow,/workflow_dispatch:/);
  assert.match(workflow,/cancel-in-progress: false/);
});

test('v4.5.13 pins the exact authorized B95-to-B96 identities and hashes',()=>{
  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.required_preconditions.post_b96_ci_pipeline_ready,true);
  assert.match(workflow,/B95_RUN: engineer-osint-20260826-B95/);
  assert.match(workflow,/B96_RUN: engineer-osint-20260829-B96/);
  assert.match(workflow,/B96_CANDIDATE_SHA256: 3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1/);
  assert.match(workflow,/B96_RESULT_SHA256: 4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5/);
  assert.match(workflow,/authorization\.status!=='READY_FOR_APPEND'/);
  assert.match(workflow,/post_b96_ci_pipeline_ready!==true/);
  assert.match(workflow,/allow_overlay_retirement!==false/);
  assert.match(workflow,/allow_b97_or_b98_same_slice!==false/);
  assert.match(workflow,/allow_identity_fix_migration!==false/);
});

test('v4.5.13 regenerates and dry-runs the exact candidate before any guarded write',()=>{
  const build=workflow.indexOf('build-overlay-stage-a-candidate.mjs');
  const dry=workflow.indexOf('append-run.mjs "$candidate" > "$plan"');
  const impact=workflow.indexOf('audit-overlay-stage-a-impact.mjs');
  const simulate=workflow.indexOf('audit-persistent-b96.mjs --simulate-from-candidate');
  const write=workflow.indexOf('append-run.mjs "$candidate" --write');
  assert.ok(build>0&&dry>build&&impact>dry&&simulate>impact&&write>simulate);
  assert.match(workflow,/meta\.operation_count!==104\|\|meta\.source_append_count!==15/);
  assert.match(workflow,/meta\.candidate_file_sha256!==process\.env\.B96_CANDIDATE_SHA256/);
  assert.match(workflow,/plan\.entry\.canonical_sha256!==process\.env\.B96_RESULT_SHA256/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
});

test('guarded repository append helper independently enforces exact B96 authorization',()=>{
  assert.match(appendRun,/if\(write&&runId===guardedB96\)/);
  assert.match(appendRun,/authorization\.status!=='READY_FOR_APPEND'/);
  assert.match(appendRun,/exact_candidate_file_sha256!==entry\.file_sha256/);
  assert.match(appendRun,/expected_resulting_canonical_sha256!==entry\.canonical_sha256/);
  assert.match(appendRun,/expected_operation_count/);
  assert.match(appendRun,/expected_source_append_count/);
  assert.match(appendRun,/allow_manual_manifest_or_hash_edit!==false/);
  assert.match(appendRun,/allow_overlay_retirement!==false/);
  assert.match(appendRun,/allow_b97_or_b98_same_slice!==false/);
});

test('v4.5.13 audits persistent B96 and excludes B97/B98 before preparing a branch',()=>{
  const write=workflow.indexOf('append-run.mjs "$candidate" --write');
  const validate=workflow.indexOf('node docs/engineer-osint/validate-patch.mjs',write);
  const persistent=workflow.indexOf('node docs/engineer-osint/audit-persistent-b96.mjs',write);
  const switchBranch=workflow.indexOf('git switch -c "$B96_RESULT_BRANCH"');
  assert.ok(write>0&&validate>write&&persistent>validate&&switchBranch>persistent);
  assert.match(workflow,/engineer-osint-20260830-B97\.json/);
  assert.match(workflow,/engineer-osint-20260830-B98\.json/);
});

test('v4.5.13 permits exactly the append-generated manifest plus B96 run file',()=>{
  assert.match(workflow,/docs\/engineer-osint\/data\/run-store-manifest\.json/);
  assert.match(workflow,/docs\/engineer-osint\/data\/runs\/engineer-osint-20260829-B96\.json/);
  assert.match(workflow,/diff -u \/tmp\/b96-expected-paths\.txt \/tmp\/b96-actual-paths\.txt/);
  assert.match(workflow,/wc -l < \/tmp\/b96-actual-paths\.txt/);
  assert.match(workflow,/= '2'/);
});

test('append-generated canonical changes are pushed only to an isolated review branch',()=>{
  assert.match(workflow,/B96_RESULT_BRANCH: automation\/b96-append-result/);
  assert.match(workflow,/git ls-remote --exit-code --heads origin/);
  assert.match(workflow,/git push --set-upstream origin "\$B96_RESULT_BRANCH"/);
  assert.doesNotMatch(workflow,/git push[^\n]*HEAD:main/);
  assert.doesNotMatch(workflow,/git push[^\n]*origin main/);
});
