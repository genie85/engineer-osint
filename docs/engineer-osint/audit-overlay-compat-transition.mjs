import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';
import {evaluateFirstThreeOverlayTransition} from './lib/overlay-transition-guard.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=parseJsonStrict(readFileSync(join(src,'V459_COMPAT_TRANSITION_POLICY.json'),'utf8'),{source:'v4.5.9 compatibility transition policy'});
const stageA=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate.json'),'utf8'),{source:'v4.5.5 Stage A candidate'});
const stageAMeta=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate-meta.json'),'utf8'),{source:'v4.5.5 Stage A meta'});
const stageB=parseJsonStrict(readFileSync(join(dist,'overlay-stage-b-gap-patch-candidate.json'),'utf8'),{source:'v4.5.6 Stage B candidate'});
const stageBAudit=parseJsonStrict(readFileSync(join(dist,'overlay-stage-b-intelligence-audit.json'),'utf8'),{source:'v4.5.6 Stage B audit'});
const stageC=parseJsonStrict(readFileSync(join(dist,'overlay-stage-c-assessment-evidence-candidate.json'),'utf8'),{source:'v4.5.7 Stage C candidate'});
const stageCAudit=parseJsonStrict(readFileSync(join(dist,'overlay-assessment-evidence-audit.json'),'utf8'),{source:'v4.5.7 Stage C audit'});
const preview=parseJsonStrict(readFileSync(join(dist,'overlay-production-migration-preview.json'),'utf8'),{source:'v4.5.4 production preview'});
const review=parseJsonStrict(readFileSync(join(src,'V457_ASSESSMENT_EVIDENCE_REVIEW.json'),'utf8'),{source:'v4.5.7 assessment review'});
const store=loadCanonicalRunStore({root:src});

if(policy.schema_version!=='engineer-osint-compat-transition-policy-v1'||policy.policy!=='FULL_NATIVE_MATERIALIZATION_REQUIRED_BEFORE_LEGACY_OVERLAY_SHORT_CIRCUIT')throw new Error('COMPAT_TRANSITION: policy mismatch');
if(store.report.current_run_id!==policy.persistent_tip_required)throw new Error(`COMPAT_TRANSITION stale persistent tip: expected ${policy.persistent_tip_required}, got ${store.report.current_run_id}`);
if(stageA.state?.run_id!==policy.stage_a_run_id||stageA.state?.parent_run_id!==policy.persistent_tip_required)throw new Error('COMPAT_TRANSITION: Stage A chain mismatch');
if(stageB.state?.run_id!==policy.stage_b_run_id||stageB.state?.parent_run_id!==policy.stage_a_run_id)throw new Error('COMPAT_TRANSITION: Stage B chain mismatch');
if(stageC.state?.run_id!==policy.stage_c_run_id||stageC.state?.parent_run_id!==policy.stage_b_run_id)throw new Error('COMPAT_TRANSITION: Stage C chain mismatch');
if(stageBAudit.status!=='PASS'||stageCAudit.status!=='PASS'||stageBAudit.unexpected_residual_signatures?.length!==0||stageCAudit.unexpected_residual_signatures?.length!==0)throw new Error('COMPAT_TRANSITION: upstream Stage B/C audit is not clean');
for(const [key,value] of Object.entries(policy.safety||{}))if(value!==false)throw new Error(`COMPAT_TRANSITION: unsafe policy flag ${key}`);

const afterA=applyStrictPatchToCanonicalData(structuredClone(store.data),stageA);
const afterAB=applyStrictPatchToCanonicalData(structuredClone(afterA),stageB);
const afterABC=applyStrictPatchToCanonicalData(structuredClone(afterAB),stageC);
const exactGuard=evaluateFirstThreeOverlayTransition({data:afterABC,stageA,stageB,stageC,policy});
if(!exactGuard.short_circuit_allowed)throw new Error(`COMPAT_TRANSITION: exact B96+B97+B98 guard failed (${exactGuard.failed_check_count} checks)`);
const persistentGuard=evaluateFirstThreeOverlayTransition({data:structuredClone(store.data),stageA,stageB,stageC,policy});
if(persistentGuard.short_circuit_allowed)throw new Error('COMPAT_TRANSITION: persistent B95 must not satisfy future native transition guard');

const idOf=item=>item?.id||item?.source_id||item?.evidence_id||item?.assessment_id||item?.gap_id;
const findById=(items,id)=>Array.isArray(items)?items.find(item=>idOf(item)===id):undefined;
const getOperationTarget=(data,operation)=>{
  if(operation.collection==='records')return findById(data?.records?.records,operation.target_id);
  if(operation.collection==='sources')return findById(data?.sources?.sources,operation.target_id);
  if(operation.collection==='evidence')return findById(data?.evidence?.evidence,operation.target_id);
  return undefined;
};
const removeById=(items,id)=>{if(!Array.isArray(items))return false;const index=items.findIndex(item=>idOf(item)===id);if(index<0)return false;items.splice(index,1);return true;};
const negativeCases=[];
const expectBlocked=(name,data)=>{
  const result=evaluateFirstThreeOverlayTransition({data,stageA,stageB,stageC,policy});
  negativeCases.push({name,blocked:!result.short_circuit_allowed,failed_check_count:result.failed_check_count,first_failure:result.failures[0]?.code||null});
  if(result.short_circuit_allowed)throw new Error(`COMPAT_TRANSITION negative case unexpectedly passed: ${name}`);
};
{
  const data=structuredClone(afterABC),gap=stageB.extensions.intelligence_v1.gaps[0];
  if(!removeById(data.intelligence_gaps?.gaps,gap.gap_id))throw new Error('COMPAT_TRANSITION: could not construct missing-gap negative case');
  expectBlocked('MISSING_NATIVE_GAP',data);
}
{
  const data=structuredClone(afterABC),assessment=stageC.extensions.intelligence_v1.assessments[0];
  if(!removeById(data.assessments?.assessments,assessment.assessment_id))throw new Error('COMPAT_TRANSITION: could not construct missing-assessment negative case');
  expectBlocked('MISSING_NATIVE_ASSESSMENT',data);
}
{
  const data=structuredClone(afterABC),evidence=stageC.evidence[0];
  if(!removeById(data.evidence?.evidence,evidence.evidence_id))throw new Error('COMPAT_TRANSITION: could not construct missing-evidence negative case');
  expectBlocked('MISSING_NATIVE_EVIDENCE',data);
}
{
  const data=structuredClone(afterABC),source=stageA.sources[0];
  if(!removeById(data.sources?.sources,source.id))throw new Error('COMPAT_TRANSITION: could not construct missing-source negative case');
  expectBlocked('MISSING_REVIEWED_SOURCE',data);
}
{
  const data=structuredClone(afterABC),operation=stageA.extensions.operations_v1[0],target=getOperationTarget(data,operation);
  if(!target)throw new Error('COMPAT_TRANSITION: could not construct factual-drift negative case');
  target[operation.field]='__V459_FACTUAL_DRIFT__';
  expectBlocked('STAGE_A_FACTUAL_VALUE_DRIFT',data);
}
{
  const data=structuredClone(afterABC),operation=stageA.extensions.operations_v1[0],log=data.canonical_change_log?.operations;
  if(!Array.isArray(log))throw new Error('COMPAT_TRANSITION: canonical operation log missing');
  const index=log.findIndex(item=>item.operation_id===operation.operation_id);if(index<0)throw new Error('COMPAT_TRANSITION: operation log negative-case target missing');log.splice(index,1);
  expectBlocked('MISSING_STAGE_A_OPERATION_LOG',data);
}
if(negativeCases.length!==policy.expected.guard_negative_cases||negativeCases.some(item=>!item.blocked))throw new Error('COMPAT_TRANSITION: negative guard suite incomplete');

const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
const executeModule=(data,module)=>{const after=structuredClone(data);vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});return after;};
let unguarded=structuredClone(afterABC),unguardedFactualLeafs=0,unguardedAllLeafs=0;
for(const module of policy.scope_modules){const before=structuredClone(unguarded);unguarded=executeModule(unguarded,module);const diff=deepDiff(before,unguarded);unguardedAllLeafs+=diff.length;unguardedFactualLeafs+=diff.filter(item=>!isOverlayMeta(item.path)).length;}
if(unguardedFactualLeafs!==stageCAudit.post_stage_abc_residual_factual_leaf_mutations)throw new Error(`COMPAT_TRANSITION: unguarded post-ABC factual baseline drift ${unguardedFactualLeafs} != ${stageCAudit.post_stage_abc_residual_factual_leaf_mutations}`);
if(unguardedFactualLeafs===0)throw new Error('COMPAT_TRANSITION: unguarded overlays unexpectedly have no post-ABC debt');

let guarded=structuredClone(afterABC);const guardedModules=[];
for(const module of policy.scope_modules){
  const before=structuredClone(guarded),guard=evaluateFirstThreeOverlayTransition({data:guarded,stageA,stageB,stageC,policy});
  if(!guard.short_circuit_allowed)guarded=executeModule(guarded,module);
  const diff=deepDiff(before,guarded);
  guardedModules.push({module,guard_pass:guard.short_circuit_allowed,mutation_count:diff.length,factual_mutation_count:diff.filter(item=>!isOverlayMeta(item.path)).length});
}
const guardedMutations=guardedModules.reduce((sum,item)=>sum+item.mutation_count,0);
if(guardedModules.length!==policy.expected.zero_mutation_modules_when_guarded||guardedModules.some(item=>!item.guard_pass||item.mutation_count!==0))throw new Error('COMPAT_TRANSITION: guarded first-three overlays are not prospective zero-mutation');

const analytical=preview.analytical_candidates||[];
const analyticalMap=new Map(analytical.map(item=>[`${item.related_id}|${item.legacy_field}`,item]));
const nativeGaps=stageB.extensions.intelligence_v1.gaps||[];
const exactGapMappings=nativeGaps.filter(gap=>{
  const key=`${gap.related_ids?.[0]}|${gap.migration_origin?.legacy_field}`,origin=analyticalMap.get(key);
  return origin?.route==='INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED'&&String(origin.content)===String(gap.question);
});
if(exactGapMappings.length!==policy.expected.native_gaps)throw new Error(`COMPAT_TRANSITION: native gap semantic mapping ${exactGapMappings.length}/${policy.expected.native_gaps}`);

const reviewMap=new Map((review.assessment_candidates||[]).map(item=>[`${item.related_ids?.[0]}|${item.legacy_field}`,item]));
const nativeAssessments=stageC.extensions.intelligence_v1.assessments||[];
const reviewedAssessmentMappings=nativeAssessments.filter(item=>{
  const key=`${item.related_ids?.[0]}|${item.migration_origin?.legacy_field}`,reviewed=reviewMap.get(key);
  return reviewed&&item.assessment===reviewed.assessment&&item.assessment_cs===reviewed.assessment_cs&&item.confidence===reviewed.confidence&&item.limitations===reviewed.limitations;
});
if(reviewedAssessmentMappings.length!==policy.expected.native_assessments)throw new Error(`COMPAT_TRANSITION: reviewed assessment mapping ${reviewedAssessmentMappings.length}/${policy.expected.native_assessments}`);

const ui42=readFileSync(join(src,'ui-v42-situation-hubs.js'),'utf8');
const ui43=readFileSync(join(src,'ui-v43-entity-detail.js'),'utf8');
const uiChecks={
  situation_native_assessments:/D\.assessments\?\.assessments/.test(ui42),
  situation_native_gaps:/D\.intelligence_gaps\?\.gaps/.test(ui42),
  situation_legacy_fallback_labeled:/LEGACY COMPATIBILITY VIEW/.test(ui42)&&/KOMPATIBILNÍ POHLED ZE STARŠÍCH POLÍ/.test(ui42),
  entity_native_assessments:/const assessments=\(\)=>arr\(D\.assessments\?\.assessments\)/.test(ui43),
  entity_native_gaps:/const gaps=\(\)=>arr\(D\.intelligence_gaps\?\.gaps\)/.test(ui43),
  entity_assessments_rendered:/renderAssessments\(aa\)/.test(ui43),
  entity_gaps_rendered:/renderGaps\(gg\)/.test(ui43),
  entity_gap_native_preferred:/if\(native\.length\)return native/.test(ui43),
  legacy_relevance_sections_still_read_record_fields:/function renderRelevance\(r\)/.test(ui43)&&/why_it_matters/.test(ui43)&&/staff_relevance/.test(ui43)&&/training_relevance/.test(ui43)
};
if(Object.entries(uiChecks).filter(([key])=>key!=='legacy_relevance_sections_still_read_record_fields').some(([,value])=>!value))throw new Error('COMPAT_TRANSITION: public UI native Intelligence v1 contract incomplete');

const noWrite=preview.no_write_candidates||[];
let noWritePreserved=0;
for(const candidate of noWrite){
  if(candidate.decision==='OMIT_NO_CANONICAL_FACTUAL_WRITE'||String(candidate.decision).startsWith('DROP_LEGACY_')){
    const before=findById(store.data?.records?.records,candidate.target_id),after=findById(afterABC?.records?.records,candidate.target_id);
    const beforeOwn=Boolean(before)&&Object.hasOwn(before,candidate.field),afterOwn=Boolean(after)&&Object.hasOwn(after,candidate.field);
    const unchanged=(beforeOwn===afterOwn)&&(!beforeOwn||JSON.stringify(before[candidate.field])===JSON.stringify(after[candidate.field]));
    if(unchanged)noWritePreserved++;
  }
}
if(noWritePreserved!==noWrite.length)throw new Error(`COMPAT_TRANSITION: explicit no-write semantics drift ${noWritePreserved}/${noWrite.length}`);

const guardSpec={
  schema_version:'engineer-osint-overlay-transition-guard-spec-v1',policy:policy.policy,
  required_state_latest_run_id:policy.stage_c_run_id,
  stage_a_candidate_sha256:stageAMeta.candidate_file_sha256,
  stage_b_candidate_sha256:stageBAudit.stage_b_gap_candidate_file_sha256,
  stage_c_candidate_sha256:stageCAudit.candidate_file_sha256,
  operation_ids:stageA.extensions.operations_v1.map(item=>item.operation_id),
  source_ids:stageA.sources.map(item=>item.id),
  gap_ids:nativeGaps.map(item=>item.gap_id),
  assessment_ids:nativeAssessments.map(item=>item.assessment_id),
  evidence_ids:stageC.evidence.map(item=>item.evidence_id),
  short_circuit_scope:[...policy.scope_modules],
  persistent_tip_currently_satisfies_guard:false,
  production_short_circuit_enabled:false
};
const guardSpecText=JSON.stringify(guardSpec,null,2)+'\n';writeFileSync(join(dist,'overlay-compat-transition-guard-spec.json'),guardSpecText,'utf8');

const output={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-compat-transition-preview-v1',policy:policy.policy,
  persistent_tip:store.report.current_run_id,hypothetical_tip:afterABC.state_latest?.run_id,
  canonical_write_performed:false,append_run_invoked:false,runtime_overlay_changed:false,short_circuit_enabled_in_production:false,
  safe_to_append:false,safe_to_retire_overlays:false,identity_fix_overlay_in_scope:false,
  exact_guard:{status:exactGuard.status,check_count:exactGuard.check_count,failed_check_count:exactGuard.failed_check_count,short_circuit_allowed:exactGuard.short_circuit_allowed},
  persistent_guard:{status:persistentGuard.status,failed_check_count:persistentGuard.failed_check_count,short_circuit_allowed:persistentGuard.short_circuit_allowed},
  negative_guard_cases:negativeCases,negative_guard_cases_passed:negativeCases.filter(item=>item.blocked).length,
  unguarded_post_abc:{factual_leaf_mutations:unguardedFactualLeafs,all_leaf_mutations:unguardedAllLeafs,residual_signatures:stageCAudit.post_stage_abc_residual_signature_count},
  guarded_transition:{module_count:guardedModules.length,total_mutations:guardedMutations,zero_mutation_modules:guardedModules.filter(item=>item.mutation_count===0).length,modules:guardedModules},
  native_semantics:{gap_exact_mappings:exactGapMappings.length,assessment_reviewed_replacements:reviewedAssessmentMappings.length,evidence_count:stageC.evidence.length,analytical_total:exactGapMappings.length+reviewedAssessmentMappings.length,no_write_semantics_preserved:noWritePreserved},
  presentation:{status:'NATIVE_INTELLIGENCE_PRESERVED_WITH_REVIEWED_RECLASSIFICATION',semantic_content_preserved:true,legacy_section_layout_equivalence:false,ui_checks:uiChecks},
  guard_spec_sha256:sha256Text(guardSpecText),guard_spec:guardSpec
};
writeFileSync(join(dist,'overlay-compat-transition-preview.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.9 — compatibility transition preview','',
  `Generated: ${output.generated_at}`,
  `Status: **${output.status}**`,'',
  'B96, B97 and B98 are applied only in memory. The transition guard then proves whether the first three legacy factual overlays could be short-circuited without trusting a run ID alone. Every reviewed Stage A field and operation-log entry, all 15 reviewed sources, all 15 native gaps, all four native assessments and both Stage C evidence objects must be present.','',
  `- Exact post-B98 guard: **${exactGuard.status}** (${exactGuard.passed_check_count}/${exactGuard.check_count} checks)`,
  `- Current persistent B95 satisfies guard: **NO**`,
  `- Negative fail-closed cases: **${negativeCases.filter(item=>item.blocked).length}/${negativeCases.length} blocked**`,
  `- Unguarded post-B98 factual overlay mutations: **${unguardedFactualLeafs}**`,
  `- Guarded prospective mutations from first three overlays: **${guardedMutations}**`,
  `- Prospective zero-mutation modules: **${guardedModules.filter(item=>item.mutation_count===0).length}/${guardedModules.length}**`,'',
  '## Native analytical preservation','',
  `- Intelligence gaps preserved exactly: **${exactGapMappings.length}/15**`,
  `- Reviewed native assessment replacements: **${reviewedAssessmentMappings.length}/4**`,
  `- Target-linked assessment evidence: **${stageC.evidence.length}/2**`,
  `- Native analytical coverage: **${exactGapMappings.length+reviewedAssessmentMappings.length}/19**`,
  `- Explicit no-write decisions preserved: **${noWritePreserved}/${noWrite.length}**`,'',
  'The public situation hub and entity-detail renderer already consume native Intelligence v1 assessments/gaps. The four reviewed assessment replacements therefore remain visible in Current Assessment rather than depending on legacy record-level relevance fields. Dedicated legacy section placement is not byte/layout-equivalent and is intentionally not treated as a factual requirement.','',
  '## Fail-closed negative cases','',
  ...negativeCases.map(item=>`- ${item.name}: **${item.blocked?'BLOCKED':'FAILED TO BLOCK'}** (${item.failed_check_count} failed guard checks; first: \`${item.first_failure}\`)`),'',
  '## Safety','',
  '- No B96/B97/B98 append is performed.',
  '- No runtime overlay is changed or disabled.',
  '- The generated guard specification is a preview artifact only.',
  '- `safe_to_append=false` and `safe_to_retire_overlays=false` remain mandatory.',
  '- The separate identity-fix overlay remains outside this scope.',
  '- A later slice may add the same fail-closed guard to the first three runtime overlays, but it will remain inert on persistent B95 until the reviewed native chain is actually materialized.'
].join('\n');
writeFileSync(join(dist,'overlay-compat-transition-preview.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_compat_transition=pass\noverlay_compat_transition_guard=pass\noverlay_compat_transition_guard_checks=${exactGuard.check_count}\noverlay_compat_transition_negative_cases=${negativeCases.filter(item=>item.blocked).length}\noverlay_compat_transition_persistent_guard=blocked\noverlay_compat_transition_unguarded_factual_leafs=${unguardedFactualLeafs}\noverlay_compat_transition_first3_zero_mutations=1\noverlay_compat_transition_zero_mutation_modules=${guardedModules.filter(item=>item.mutation_count===0).length}\noverlay_compat_transition_native_gaps=${exactGapMappings.length}\noverlay_compat_transition_native_assessments=${reviewedAssessmentMappings.length}\noverlay_compat_transition_native_evidence=${stageC.evidence.length}\noverlay_compat_transition_native_analytical=${exactGapMappings.length+reviewedAssessmentMappings.length}\noverlay_compat_transition_no_write_preserved=${noWritePreserved}\noverlay_compat_transition_ui_native=pass\noverlay_compat_transition_production_short_circuit=0\noverlay_compat_transition_safe_to_append=0\noverlay_compat_transition_safe_to_retire=0\noverlay_compat_transition_canonical_writes=0\n`,'utf8');
console.log(`Compatibility transition PASS: guard=${exactGuard.passed_check_count}/${exactGuard.check_count}; negatives=${negativeCases.filter(item=>item.blocked).length}/${negativeCases.length}; unguarded-factual=${unguardedFactualLeafs}; guarded-mutations=${guardedMutations}; native=${exactGapMappings.length+reviewedAssessmentMappings.length}/19; safe-to-retire=NO`);
