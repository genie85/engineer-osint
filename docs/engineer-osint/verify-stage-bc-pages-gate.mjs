import {appendFileSync,existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {parseJsonStrict} from './lib/integrity.mjs';

const dist='docs/engineer-osint-dist';
const required=[
  'overlay-stage-b-intelligence-audit.json',
  'overlay-stage-b-intelligence-audit.md',
  'overlay-stage-b-gap-patch-candidate.json',
  'overlay-assessment-evidence-audit.json',
  'overlay-assessment-evidence-audit.md',
  'overlay-stage-c-assessment-evidence-candidate.json'
];
for(const file of required){
  const path=join(dist,file);
  if(!existsSync(path)||!statSync(path).isFile()||statSync(path).size===0)throw new Error(`STAGE_BC_PAGES_GATE: missing/empty artifact ${file}`);
}
const readJson=file=>parseJsonStrict(readFileSync(join(dist,file),'utf8'),{source:file});
const stageB=readJson('overlay-stage-b-intelligence-audit.json');
const stageBPatch=readJson('overlay-stage-b-gap-patch-candidate.json');
const stageC=readJson('overlay-assessment-evidence-audit.json');
const stageCPatch=readJson('overlay-stage-c-assessment-evidence-candidate.json');
const health=readFileSync(join(dist,'health.txt'),'utf8');
const healthMap=new Map(health.split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return i<0?[line,'']:[line.slice(0,i),line.slice(i+1)];}));
const requireHealth=(key,value)=>{if(healthMap.get(key)!==String(value))throw new Error(`STAGE_BC_PAGES_GATE: health ${key} expected ${value}, got ${healthMap.get(key)}`);};
const requireFalse=(obj,key,label)=>{if(obj?.[key]!==false)throw new Error(`STAGE_BC_PAGES_GATE: ${label}.${key} must be false`);};
const requireArray=(value,length,label)=>{if(!Array.isArray(value)||value.length!==length)throw new Error(`STAGE_BC_PAGES_GATE: ${label} expected length ${length}`);};

if(stageB.status!=='PASS'||stageB.schema_version!=='engineer-osint-stage-b-intelligence-audit-v1')throw new Error('STAGE_BC_PAGES_GATE: Stage B audit schema/status invalid');
if(stageB.persistent_tip!=='engineer-osint-20260826-B95'||stageB.stage_a_run_id!=='engineer-osint-20260829-B96'||stageB.stage_b_candidate_run_id!=='engineer-osint-20260830-B97')throw new Error('STAGE_BC_PAGES_GATE: Stage B chain identity mismatch');
if(stageB.native_gap_candidate_count!==15||stageB.assessment_candidate_count!==4||stageB.assessment_materialized_count!==0)throw new Error('STAGE_BC_PAGES_GATE: Stage B candidate/materialization counts mismatch');
if(stageB.assessment_binding_blockers!==4||stageB.assessment_with_explicit_same_target_source_evidence!==0)throw new Error('STAGE_BC_PAGES_GATE: Stage B evidence-binding state drift');
if(stageB.post_stage_ab_residual_signature_count!==61||stageB.post_stage_ab_residual_factual_leaf_mutations!==81)throw new Error('STAGE_BC_PAGES_GATE: Stage B residual baseline drift');
if(!Array.isArray(stageB.unexpected_residual_signatures)||stageB.unexpected_residual_signatures.length!==0)throw new Error('STAGE_BC_PAGES_GATE: Stage B has unexpected residuals');
for(const key of ['canonical_write_performed','append_run_invoked','safe_to_append_stage_a','safe_to_append_stage_b','safe_to_retire_overlays'])requireFalse(stageB,key,'Stage B');

if(stageBPatch.schema_version!=='engineer-osint-patch-v1'||stageBPatch.state?.run_id!=='engineer-osint-20260830-B97'||stageBPatch.state?.parent_run_id!=='engineer-osint-20260829-B96')throw new Error('STAGE_BC_PAGES_GATE: Stage B patch identity invalid');
requireArray(stageBPatch.extensions?.intelligence_v1?.gaps,15,'Stage B patch gaps');
requireArray(stageBPatch.extensions?.intelligence_v1?.assessments,0,'Stage B patch assessments');
requireArray(stageBPatch.extensions?.intelligence_v1?.contradictions,0,'Stage B patch contradictions');
if(stageBPatch.qa?.safe_to_append!==false||stageBPatch.qa?.safe_to_retire_overlays!==false||stageBPatch.qa?.canonical_write_performed!==false||stageBPatch.qa?.append_run_invoked!==false)throw new Error('STAGE_BC_PAGES_GATE: Stage B patch safety contract violated');

if(stageC.status!=='PASS'||stageC.schema_version!=='engineer-osint-assessment-evidence-audit-v1')throw new Error('STAGE_BC_PAGES_GATE: assessment-evidence audit schema/status invalid');
if(stageC.persistent_tip!=='engineer-osint-20260826-B95'||stageC.stage_a_run_id!=='engineer-osint-20260829-B96'||stageC.stage_b_run_id!=='engineer-osint-20260830-B97'||stageC.stage_c_candidate_run_id!=='engineer-osint-20260830-B98')throw new Error('STAGE_BC_PAGES_GATE: Stage C chain identity mismatch');
if(stageC.evidence_candidate_count!==2||stageC.assessment_candidate_count!==4||stageC.narrowed_assessment_count!==3||stageC.source_scope_limitation_assessment_count!==1)throw new Error('STAGE_BC_PAGES_GATE: Stage C evidence/assessment count drift');
if(stageC.native_analytical_candidates_preserved!==19)throw new Error('STAGE_BC_PAGES_GATE: Stage C does not preserve all 19 analytical candidates');
requireArray(stageC.evidence_ids,2,'Stage C evidence IDs');
requireArray(stageC.assessment_ids,4,'Stage C assessment IDs');
requireArray(stageC.unsupported_legacy_implications_removed,2,'Stage C removed unsupported implications');
if(stageC.post_stage_abc_residual_signature_count!==61||stageC.post_stage_abc_residual_factual_leaf_mutations!==81)throw new Error('STAGE_BC_PAGES_GATE: Stage C residual baseline drift');
if(!Array.isArray(stageC.unexpected_residual_signatures)||stageC.unexpected_residual_signatures.length!==0)throw new Error('STAGE_BC_PAGES_GATE: Stage C has unexpected residuals');
for(const key of ['canonical_write_performed','append_run_invoked','safe_to_append','safe_to_retire_overlays'])requireFalse(stageC,key,'Stage C');

if(stageCPatch.schema_version!=='engineer-osint-patch-v1'||stageCPatch.state?.run_id!=='engineer-osint-20260830-B98'||stageCPatch.state?.parent_run_id!=='engineer-osint-20260830-B97')throw new Error('STAGE_BC_PAGES_GATE: Stage C patch identity invalid');
requireArray(stageCPatch.evidence,2,'Stage C patch evidence');
requireArray(stageCPatch.extensions?.intelligence_v1?.assessments,4,'Stage C patch assessments');
requireArray(stageCPatch.extensions?.intelligence_v1?.gaps,0,'Stage C patch gaps');
requireArray(stageCPatch.extensions?.intelligence_v1?.contradictions,0,'Stage C patch contradictions');
if(stageCPatch.qa?.safe_to_append!==false||stageCPatch.qa?.safe_to_retire_overlays!==false||stageCPatch.qa?.canonical_write_performed!==false||stageCPatch.qa?.append_run_invoked!==false)throw new Error('STAGE_BC_PAGES_GATE: Stage C patch safety contract violated');

const expectedHealth={
  overlay_stage_b_intelligence:'pass',
  overlay_stage_b_gap_candidates:'15',
  overlay_stage_b_assessment_candidates:'4',
  overlay_stage_b_assessments_materialized:'0',
  overlay_stage_b_assessment_binding_blockers:'4',
  overlay_stage_b_explicit_evidence_matches:'0',
  overlay_stage_b_unexpected_residuals:'0',
  overlay_stage_b_safe_to_append:'0',
  overlay_stage_b_safe_to_retire:'0',
  overlay_stage_b_canonical_writes:'0',
  overlay_assessment_evidence:'pass',
  overlay_assessment_evidence_candidates:'2',
  overlay_assessment_native_assessments:'4',
  overlay_assessment_native_analytical_preserved:'19',
  overlay_assessment_unsupported_legacy_implications:'0',
  overlay_assessment_unexpected_residuals:'0',
  overlay_assessment_safe_to_append:'0',
  overlay_assessment_safe_to_retire:'0',
  overlay_assessment_canonical_writes:'0'
};
for(const [key,value] of Object.entries(expectedHealth))requireHealth(key,value);
appendFileSync(join(dist,'health.txt'),'overlay_stage_bc_pages_gate=pass\noverlay_stage_bc_pages_gate_artifacts=6\noverlay_stage_bc_pages_gate_native_analytical=19\noverlay_stage_bc_pages_gate_unexpected_residuals=0\noverlay_stage_bc_pages_gate_canonical_writes=0\n','utf8');
console.log('Stage B/C Pages gate PASS: 6 artifacts; 15 gaps; 4 assessments; 2 evidence; 19/19 native analytical; unexpected residuals=0; persistent writes=0');
