import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateFirstThreeOverlayTransition} from '../lib/overlay-transition-guard.mjs';

const audit=fs.readFileSync(new URL('../audit-overlay-compat-transition.mjs',import.meta.url),'utf8');
const policy=JSON.parse(fs.readFileSync(new URL('../V459_COMPAT_TRANSITION_POLICY.json',import.meta.url),'utf8'));
const ui42=fs.readFileSync(new URL('../ui-v42-situation-hubs.js',import.meta.url),'utf8');
const ui43=fs.readFileSync(new URL('../ui-v43-entity-detail.js',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');

function fixture(){
  const p={policy:'TEST',persistent_tip_required:'B0',stage_a_run_id:'B1',stage_b_run_id:'B2',stage_c_run_id:'B3',expected:{stage_a_operations:1,stage_a_sources:1,native_gaps:1,native_assessments:1,native_evidence:1,native_analytical_total:2}};
  const stageA={state:{run_id:'B1',parent_run_id:'B0'},sources:[{id:'S1',url:'https://example.test/1'}],extensions:{operations_v1:[{operation_id:'OP1',op:'REPLACE_FIELD',collection:'records',target_id:'R1',field:'fact',value:'reviewed'}]}};
  const stageB={state:{run_id:'B2',parent_run_id:'B1'},extensions:{intelligence_v1:{gaps:[{gap_id:'G1',question:'Q',related_ids:['R1'],sources_checked:['S1'],first_opened:'2026-08-30',last_checked:'2026-08-30'}]}}};
  const stageC={state:{run_id:'B3',parent_run_id:'B2'},evidence:[{id:'E1',evidence_id:'E1',related_ids:['R1'],source_ids:['S1'],what_it_supports:'X'}],extensions:{intelligence_v1:{assessments:[{assessment_id:'A1',assessment:'A',confidence:'HIGH',supporting_evidence_ids:['E1'],source_ids:['S1'],related_ids:['R1'],last_reviewed:'2026-08-30'}]}}};
  const data={state_latest:{run_id:'B3'},records:{records:[{id:'R1',fact:'reviewed'}]},sources:{sources:[{id:'S1',url:'https://example.test/1',name:'extra'}]},evidence:{evidence:[{id:'E1',evidence_id:'E1',related_ids:['R1'],source_ids:['S1'],what_it_supports:'X',run_id:'B3'}]},intelligence_gaps:{gaps:[{gap_id:'G1',id:'G1',question:'Q',related_ids:['R1'],sources_checked:['S1'],first_opened:'2026-08-30',last_checked:'2026-08-30',run_id:'B2'}]},assessments:{assessments:[{assessment_id:'A1',id:'A1',assessment:'A',confidence:'HIGH',supporting_evidence_ids:['E1'],source_ids:['S1'],related_ids:['R1'],last_reviewed:'2026-08-30',run_id:'B3'}]},canonical_change_log:{operations:[{operation_id:'OP1'}]}};
  return {p,stageA,stageB,stageC,data};
}

test('transition guard passes only on full native materialization',()=>{
  const {p,stageA,stageB,stageC,data}=fixture();
  const result=evaluateFirstThreeOverlayTransition({data,stageA,stageB,stageC,policy:p});
  assert.equal(result.status,'PASS');
  assert.equal(result.short_circuit_allowed,true);
  assert.equal(result.failed_check_count,0);
});

test('transition guard fails closed on missing native or factual state',()=>{
  const {p,stageA,stageB,stageC,data}=fixture();
  const variants=[];
  const gap=structuredClone(data);gap.intelligence_gaps.gaps=[];variants.push(gap);
  const assessment=structuredClone(data);assessment.assessments.assessments=[];variants.push(assessment);
  const evidence=structuredClone(data);evidence.evidence.evidence=[];variants.push(evidence);
  const source=structuredClone(data);source.sources.sources=[];variants.push(source);
  const fact=structuredClone(data);fact.records.records[0].fact='drift';variants.push(fact);
  const log=structuredClone(data);log.canonical_change_log.operations=[];variants.push(log);
  for(const candidate of variants){
    const result=evaluateFirstThreeOverlayTransition({data:candidate,stageA,stageB,stageC,policy:p});
    assert.equal(result.short_circuit_allowed,false);
    assert.ok(result.failed_check_count>0);
  }
});

test('v4.5.9 policy keeps production short-circuit, append and retirement disabled',()=>{
  assert.equal(policy.expected.stage_a_operations,104);
  assert.equal(policy.expected.stage_a_sources,15);
  assert.equal(policy.expected.native_gaps,15);
  assert.equal(policy.expected.native_assessments,4);
  assert.equal(policy.expected.native_evidence,2);
  assert.equal(policy.expected.native_analytical_total,19);
  assert.equal(policy.expected.guard_negative_cases,6);
  for(const key of ['canonical_write_performed','append_run_invoked','runtime_overlay_changed','short_circuit_enabled_in_production','safe_to_append','safe_to_retire_overlays','identity_fix_overlay_in_scope'])assert.equal(policy.safety[key],false);
});

test('v4.5.9 audit proves current B95 cannot satisfy guard and guarded first three become prospective no-ops',()=>{
  assert.match(audit,/persistent B95 must not satisfy future native transition guard/);
  assert.match(audit,/MISSING_NATIVE_GAP/);
  assert.match(audit,/MISSING_NATIVE_ASSESSMENT/);
  assert.match(audit,/MISSING_NATIVE_EVIDENCE/);
  assert.match(audit,/MISSING_REVIEWED_SOURCE/);
  assert.match(audit,/STAGE_A_FACTUAL_VALUE_DRIFT/);
  assert.match(audit,/MISSING_STAGE_A_OPERATION_LOG/);
  assert.match(audit,/guardedModules\.some\(item=>!item\.guard_pass\|\|item\.mutation_count!==0\)/);
  assert.match(audit,/unguardedFactualLeafs!==stageCAudit\.post_stage_abc_residual_factual_leaf_mutations/);
});

test('native UI already renders the 15 gaps and four reviewed assessments',()=>{
  assert.match(ui42,/D\.assessments\?\.assessments/);
  assert.match(ui42,/D\.intelligence_gaps\?\.gaps/);
  assert.match(ui42,/LEGACY COMPATIBILITY VIEW/);
  assert.match(ui43,/const assessments=\(\)=>arr\(D\.assessments\?\.assessments\)/);
  assert.match(ui43,/const gaps=\(\)=>arr\(D\.intelligence_gaps\?\.gaps\)/);
  assert.match(ui43,/function relatedAssessments/);
  assert.match(ui43,/if\(native\.length\)return native/);
  assert.match(ui43,/renderAssessments\(aa\)/);
  assert.match(ui43,/renderGaps\(gg\)/);
});

test('v4.5.9 treats reviewed assessment narrowing as semantic replacement, not byte equivalence',()=>{
  assert.equal(policy.presentation_contract.native_gap_content,'EXACT_LEGACY_QUESTION_PRESERVATION');
  assert.equal(policy.presentation_contract.native_assessment_content,'CURATED_REVIEWED_REPLACEMENT_NOT_BYTE_EQUIVALENCE');
  assert.equal(policy.presentation_contract.legacy_section_layout_equivalence_required,false);
  assert.match(audit,/reviewedAssessmentMappings/);
  assert.match(audit,/NATIVE_INTELLIGENCE_PRESERVED_WITH_REVIEWED_RECLASSIFICATION/);
});

test('Pages runs compatibility transition after explicit Stage B/C gate and before PUBLIC-CZ',()=>{
  const stageBC=workflow.indexOf('Explicitly gate Stage B/C migration artifacts');
  const transition=workflow.indexOf('Preview fail-closed legacy overlay compatibility transition');
  const publicCZ=workflow.indexOf('Audit PUBLIC-CZ-UI runtime');
  assert.ok(stageBC>0&&transition>stageBC&&publicCZ>transition);
  assert.match(workflow,/audit-overlay-compat-transition\.mjs/);
  assert.match(workflow,/overlay-compat-transition-preview\.json/);
  assert.match(workflow,/overlay-compat-transition-guard-spec\.json/);
  assert.match(workflow,/overlay_compat_transition=pass/);
  assert.match(workflow,/overlay_compat_transition_first3_zero_mutations=1/);
  assert.match(workflow,/overlay_compat_transition_safe_to_retire=0/);
});
