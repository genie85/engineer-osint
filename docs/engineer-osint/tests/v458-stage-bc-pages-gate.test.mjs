import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gate=fs.readFileSync(new URL('../verify-stage-bc-pages-gate.mjs',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');

test('v4.5.8 explicitly requires all six Stage B/C artifacts',()=>{
  for(const file of [
    'overlay-stage-b-intelligence-audit.json','overlay-stage-b-intelligence-audit.md','overlay-stage-b-gap-patch-candidate.json',
    'overlay-assessment-evidence-audit.json','overlay-assessment-evidence-audit.md','overlay-stage-c-assessment-evidence-candidate.json'
  ])assert.match(gate,new RegExp(file.replaceAll('.','\\.')));
  assert.match(gate,/missing\/empty artifact/);
});

test('v4.5.8 parses Stage B audit and patch rather than trusting script completion',()=>{
  assert.match(gate,/engineer-osint-stage-b-intelligence-audit-v1/);
  assert.match(gate,/native_gap_candidate_count!==15/);
  assert.match(gate,/assessment_candidate_count!==4/);
  assert.match(gate,/assessment_materialized_count!==0/);
  assert.match(gate,/assessment_binding_blockers!==4/);
  assert.match(gate,/assessment_with_explicit_same_target_source_evidence!==0/);
  assert.match(gate,/post_stage_ab_residual_signature_count!==61/);
  assert.match(gate,/unexpected_residual_signatures\.length!==0/);
  assert.match(gate,/Stage B patch gaps/);
});

test('v4.5.8 parses Stage C evidence and native assessments',()=>{
  assert.match(gate,/engineer-osint-assessment-evidence-audit-v1/);
  assert.match(gate,/evidence_candidate_count!==2/);
  assert.match(gate,/assessment_candidate_count!==4/);
  assert.match(gate,/native_analytical_candidates_preserved!==19/);
  assert.match(gate,/Stage C patch evidence/);
  assert.match(gate,/Stage C patch assessments/);
  assert.match(gate,/unsupported_legacy_implications_removed/);
});

test('v4.5.8 fails closed on Stage B/C safety drift or unexpected residuals',()=>{
  for(const token of ['canonical_write_performed','append_run_invoked','safe_to_append','safe_to_retire_overlays'])assert.match(gate,new RegExp(token));
  assert.match(gate,/Stage B has unexpected residuals/);
  assert.match(gate,/Stage C has unexpected residuals/);
  assert.match(gate,/overlay_stage_bc_pages_gate_canonical_writes=0/);
});

test('Pages runs the explicit Stage B/C verifier before PUBLIC-CZ and deployment',()=>{
  const gateIndex=workflow.indexOf('Explicitly gate Stage B/C migration artifacts');
  const publicIndex=workflow.indexOf('Audit PUBLIC-CZ-UI runtime');
  const deployIndex=workflow.indexOf('Configure GitHub Pages');
  assert.ok(gateIndex>0&&publicIndex>gateIndex&&deployIndex>publicIndex);
  assert.match(workflow,/verify-stage-bc-pages-gate\.mjs/);
  assert.match(workflow,/overlay_stage_bc_pages_gate=pass/);
  assert.match(workflow,/overlay_stage_bc_pages_gate_unexpected_residuals=0/);
  assert.match(workflow,/overlay_stage_bc_pages_gate_canonical_writes=0/);
});

test('final Pages verification independently requires Stage B/C artifacts',()=>{
  for(const file of [
    'overlay-stage-b-intelligence-audit.json','overlay-stage-b-intelligence-audit.md','overlay-stage-b-gap-patch-candidate.json',
    'overlay-assessment-evidence-audit.json','overlay-assessment-evidence-audit.md','overlay-stage-c-assessment-evidence-candidate.json'
  ])assert.match(workflow,new RegExp(`test -s docs/engineer-osint-dist/${file.replaceAll('.','\\.')}`));
});
