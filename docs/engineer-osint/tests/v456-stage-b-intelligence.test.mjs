import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const audit=fs.readFileSync(new URL('../audit-overlay-stage-b-intelligence.mjs',import.meta.url),'utf8');
const policy=JSON.parse(fs.readFileSync(new URL('../V456_STAGE_B_POLICY.json',import.meta.url),'utf8'));
const doc=fs.readFileSync(new URL('../V456_STAGE_B_INTELLIGENCE.md',import.meta.url),'utf8');
const contract=fs.readFileSync(new URL('../INTELLIGENCE_V1_CONTRACT.md',import.meta.url),'utf8');

test('v4.5.6 chains B97 only after the exact reviewed B96 candidate',()=>{
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B97');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260829-B96');
  assert.equal(policy.persistent_tip_required,'engineer-osint-20260826-B95');
  assert.equal(policy.expected_stage_a_file_sha256,'3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1');
  assert.equal(policy.expected_stage_a_result_canonical_sha256,'4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5');
  assert.match(audit,/Stage A candidate file SHA drift/);
  assert.match(audit,/Stage A result canonical SHA drift/);
});

test('v4.5.6 materializes all 15 gaps without inventing priority',()=>{
  assert.equal(policy.expected.analytical_candidates,19);
  assert.equal(policy.expected.gap_candidates,15);
  assert.equal(policy.expected.assessment_candidates,4);
  assert.equal(policy.gap_priority,'UNASSESSED');
  assert.equal(policy.gap_status,'OPEN');
  assert.match(audit,/ENG-GAP-B97-OVL-/);
  assert.match(audit,/sources_checked:unique\(candidate\.source_ids/);
  assert.match(audit,/extensions:\{intelligence_v1:\{assessments:\[\],gaps,contradictions:\[\]\}\}/);
  assert.match(contract,/An empty `sources_checked` array is valid/);
});

test('assessment materialization requires explicit structural evidence and reviewed source intersection',()=>{
  assert.equal(policy.assessment_binding_rule,'EXPLICIT_TARGET_LINK_AND_REVIEWED_SOURCE_INTERSECTION_PLUS_CURATOR_APPROVAL');
  assert.equal(policy.safety.assessment_auto_materialization_allowed,false);
  assert.match(audit,/evidenceTargets\(item\)\.includes\(candidate\.related_id\)/);
  assert.match(audit,/intersects\(evidenceSources\(item\),sources\)/);
  assert.match(audit,/CURATOR_APPROVAL_REQUIRED/);
  assert.match(audit,/EVIDENCE_BINDING_REQUIRED/);
  assert.match(audit,/assessment_materialized_count:0/);
  assert.match(contract,/supporting_evidence_ids/);
});

test('v4.5.6 never turns the four legacy analytical fields into factual operations',()=>{
  for(const field of ['what_it_does_not_prove','staff_relevance','training_relevance','why_it_matters'])assert.match(doc,new RegExp(field));
  assert.doesNotMatch(audit,/operations_v1/);
  assert.match(doc,/not automatically materialized/i);
});

test('post Stage A+B overlay residuals cannot expand beyond reviewed Stage-A debt',()=>{
  assert.match(audit,/priorByModule/);
  assert.match(audit,/added=signatures\.filter\(signature=>!prior\.has\(signature\)\)/);
  assert.match(audit,/unexpected\.length===0\?'PASS':'FAIL'/);
  assert.match(doc,/may not expand beyond the reviewed Stage-A residual set/i);
});

test('v4.5.6 remains fully read-only and blocks append and retirement',()=>{
  for(const value of Object.values(policy.safety))assert.equal(value,false);
  assert.match(audit,/canonical_write_performed:false/);
  assert.match(audit,/append_run_invoked:false/);
  assert.match(audit,/safe_to_append_stage_a:false/);
  assert.match(audit,/safe_to_append_stage_b:false/);
  assert.match(audit,/safe_to_retire_overlays:false/);
  assert.doesNotMatch(audit,/append-run\.mjs/);
  assert.match(doc,/no manifest or `data\/runs` file is written/i);
});
