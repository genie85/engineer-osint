import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const builder=fs.readFileSync(new URL('../build-overlay-stage-a-candidate.mjs',import.meta.url),'utf8');
const impact=fs.readFileSync(new URL('../audit-overlay-stage-a-impact.mjs',import.meta.url),'utf8');
const policy=JSON.parse(fs.readFileSync(new URL('../V455_STAGE_A_CANDIDATE.json',import.meta.url),'utf8'));
const doc=fs.readFileSync(new URL('../V455_STAGE_A_CANDIDATE.md',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');

test('v4.5.5 candidate is pinned to B95 and proposed as B96 on 2026-08-29',()=>{
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260826-B95');
  assert.equal(policy.candidate_run_id,'engineer-osint-20260829-B96');
  assert.equal(policy.candidate_run_date,'2026-08-29');
  assert.match(builder,/STAGE_A_CANDIDATE stale parent/);
  assert.match(policy.staleness_policy,/FAIL_IF_CANONICAL_TIP_IS_NOT_EXPECTED_PARENT/);
});

test('v4.5.5 emits exactly 104 correction operations and 15 reviewed source appends',()=>{
  assert.equal(policy.expected.operation_count,104);
  assert.equal(policy.expected.source_append_count,15);
  assert.equal(policy.expected.stage_b_intelligence_candidates,19);
  assert.equal(policy.expected.explicit_no_write_candidates,18);
  assert.equal(policy.operation_id_prefix,'ENG-OP-B96-OVL-MIG-');
  assert.match(builder,/CORRECTION:operations\.length/);
  assert.match(builder,/NEW_SOURCES:sources\.length/);
  assert.match(builder,/policy\.operation_id_prefix/);
});

test('candidate generation uses real candidate date for runtime verification fields and preserves reviewed fixed values',()=>{
  assert.match(builder,/template\.value_mode==='REAL_APPEND_RUN_DATE'\?policy\.candidate_run_date/);
  assert.match(builder,/structuredClone\(template\.value\)/);
  assert.match(doc,/10\.7 t/);
  assert.match(doc,/BLT Arjun.*sentinel/i);
  assert.match(doc,/Namer/i);
});

test('candidate is validated through production strict operations/materialization before publication',()=>{
  assert.match(builder,/validatePatchOperations\(patch\)/);
  assert.match(builder,/applyStrictPatchToCanonicalData\(structuredClone\(store\.data\),patch\)/);
  assert.match(builder,/candidate_file_sha256:sha256Text\(normalized\)/);
});

test('post-Stage-A impact audit fails on every unreviewed residual signature',()=>{
  assert.match(impact,/ALL_POST_STAGE_A_OVERLAY_RESIDUALS_MUST_MAP_TO_REVIEWED_TRANSITION_DEBT/);
  assert.match(impact,/unexpected=signatures\.filter\(signature=>!expected\.has\(signature\)\)/);
  assert.match(impact,/allUnexpected\.length===0/);
  assert.match(impact,/retirementReadyAfterStageA===false/);
  assert.match(impact,/INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED/);
  assert.match(impact,/UNION_CANONICAL_AND_REVIEWED_SOURCE_IDS/);
  assert.match(impact,/GENERATE_AT_REAL_APPEND_RUN_DATE/);
});

test('v4.5.5 safety policy prohibits persistent append and retirement',()=>{
  for(const key of ['canonical_write_performed','append_run_write_flag_allowed','run_file_write_allowed','manifest_write_allowed','safe_to_append','safe_to_retire_overlays','identity_fix_overlay_in_scope'])assert.equal(policy.safety[key],false);
  assert.match(builder,/safe_to_append:false/);
  assert.match(builder,/safe_to_retire_overlays:false/);
  assert.doesNotMatch(builder,/--write/);
  assert.match(doc,/does not append that patch/i);
});

test('Pages uses append-run dry-run and proves persistent data stayed byte/count clean',()=>{
  assert.match(workflow,/Build exact Stage A migration candidate/);
  assert.match(workflow,/Validate Stage A candidate through append-run dry-run/);
  assert.match(workflow,/candidate='docs\/engineer-osint-dist\/overlay-stage-a-patch-candidate\.json'/);
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  assert.match(workflow,/manifest_before/);
  assert.match(workflow,/runs_before/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.match(workflow,/overlay-stage-a-append-plan\.json/);
  assert.match(workflow,/Audit residual overlay impact after Stage A candidate/);
});
