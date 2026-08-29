import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validateIntelligenceExtensionV1} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=parseJsonStrict(readFileSync(join(src,'V456_STAGE_B_POLICY.json'),'utf8'),{source:'v4.5.6 Stage B policy'});
const preview=parseJsonStrict(readFileSync(join(dist,'overlay-production-migration-preview.json'),'utf8'),{source:'v4.5.4 production preview'});
const stageA=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate.json'),'utf8'),{source:'v4.5.5 Stage A candidate'});
const stageAMeta=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate-meta.json'),'utf8'),{source:'v4.5.5 Stage A candidate meta'});
const stageAPlan=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-append-plan.json'),'utf8'),{source:'v4.5.5 Stage A append plan'});
const priorImpact=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-impact-preview.json'),'utf8'),{source:'v4.5.5 Stage A impact'});
const store=loadCanonicalRunStore({root:src});

if(policy.schema_version!=='engineer-osint-stage-b-intelligence-policy-v1')throw new Error('STAGE_B: policy schema mismatch');
if(policy.policy!=='MATERIALIZE_GAPS_BIND_ASSESSMENTS_ONLY_WITH_EXPLICIT_EVIDENCE')throw new Error('STAGE_B: policy mismatch');
if(store.report.current_run_id!==policy.persistent_tip_required)throw new Error(`STAGE_B stale persistent tip: expected ${policy.persistent_tip_required}, got ${store.report.current_run_id}`);
if(stageA.state?.run_id!==policy.expected_parent_run_id||stageA.state?.parent_run_id!==policy.persistent_tip_required)throw new Error('STAGE_B: Stage A identity mismatch');
if(stageAMeta.candidate_file_sha256!==policy.expected_stage_a_file_sha256)throw new Error('STAGE_B: Stage A candidate file SHA drift');
if(stageAPlan.entry?.canonical_sha256!==policy.expected_stage_a_result_canonical_sha256)throw new Error('STAGE_B: Stage A result canonical SHA drift');
if(stageAPlan.entry?.file_sha256!==policy.expected_stage_a_file_sha256||stageAPlan.status!=='VALIDATED_DRY_RUN')throw new Error('STAGE_B: Stage A append plan is not the reviewed dry-run');
for(const [key,value] of Object.entries(policy.safety||{})){if(value!==false)throw new Error(`STAGE_B: unsafe policy flag ${key}`);}

const analytical=preview.analytical_candidates||[];
const gapCandidates=analytical.filter(item=>item.route==='INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED');
const assessmentCandidates=analytical.filter(item=>item.route!=='INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED');
if(analytical.length!==policy.expected.analytical_candidates||gapCandidates.length!==policy.expected.gap_candidates||assessmentCandidates.length!==policy.expected.assessment_candidates)throw new Error(`STAGE_B candidate count mismatch: all=${analytical.length}, gaps=${gapCandidates.length}, assessments=${assessmentCandidates.length}`);

const afterA=applyStrictPatchToCanonicalData(structuredClone(store.data),stageA);
if(afterA.state_latest?.run_id!==policy.expected_parent_run_id)throw new Error('STAGE_B: Stage A simulation did not advance to B96');

const unique=values=>[...new Set(values.filter(value=>typeof value==='string'&&value))];
const evidenceArrays=[
  Array.isArray(afterA.evidence)?afterA.evidence:[],
  Array.isArray(afterA.evidence?.evidence)?afterA.evidence.evidence:[],
  Array.isArray(afterA.evidence_registry?.evidence)?afterA.evidence_registry.evidence:[],
  Array.isArray(afterA.dashboard_patch_extras?.evidence)?afterA.dashboard_patch_extras.evidence:[]
];
const evidence=[...new Map(evidenceArrays.flat().map(item=>[item?.evidence_id||item?.id,item]).filter(([id])=>id)).values()];
const evidenceId=item=>item?.evidence_id||item?.id;
const evidenceSources=item=>unique([item?.source_id,...(Array.isArray(item?.source_ids)?item.source_ids:[])]);
const evidenceTargets=item=>unique([
  item?.record_id,item?.related_record_id,item?.target_id,
  ...(Array.isArray(item?.related_ids)?item.related_ids:[]),
  ...(Array.isArray(item?.related_record_ids)?item.related_record_ids:[])
]);
const intersects=(a,b)=>a.some(value=>b.includes(value));

const gaps=[...gapCandidates].sort((a,b)=>`${a.related_id}|${a.legacy_field}`.localeCompare(`${b.related_id}|${b.legacy_field}`)).map((candidate,index)=>({
  gap_id:`${policy.id_prefixes.gap}${String(index+1).padStart(3,'0')}`,
  question:String(candidate.content),priority:policy.gap_priority,status:policy.gap_status,
  related_ids:[candidate.related_id],sources_checked:unique(candidate.source_ids||[]),
  first_opened:policy.candidate_run_date,last_checked:policy.candidate_run_date,
  migration_origin:{legacy_field:candidate.legacy_field,route:candidate.route}
}));

const assessmentBindings=[...assessmentCandidates].sort((a,b)=>`${a.related_id}|${a.legacy_field}`.localeCompare(`${b.related_id}|${b.legacy_field}`)).map((candidate,index)=>{
  const sources=unique(candidate.source_ids||[]);
  const matches=evidence.filter(item=>evidenceTargets(item).includes(candidate.related_id)&&intersects(evidenceSources(item),sources)).map(evidenceId).filter(Boolean).sort();
  return {
    proposed_assessment_id:`${policy.id_prefixes.assessment}${String(index+1).padStart(3,'0')}`,
    related_id:candidate.related_id,legacy_field:candidate.legacy_field,assessment:String(candidate.content),source_ids:sources,
    explicit_same_target_and_source_evidence_ids:matches,
    binding_status:matches.length?'CURATOR_APPROVAL_REQUIRED':'EVIDENCE_BINDING_REQUIRED',
    auto_materialized:false
  };
});

const counts={CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0};
const patch={
  schema_version:'engineer-osint-patch-v1',
  state:{run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,status:'SUCCESS',window_from:policy.window_from,window_to:policy.window_to,counts},
  continuity:{
    status:'STAGE_B_GAP_MATERIALIZATION_CANDIDATE_AFTER_REVIEWED_STAGE_A',
    source_stage_a_run_id:policy.expected_parent_run_id,
    source_stage_a_canonical_sha256:policy.expected_stage_a_result_canonical_sha256,
    assessment_materialization_status:'BLOCKED_PENDING_EXPLICIT_EVIDENCE_AND_CURATOR_APPROVAL',
    overlay_retirement_authorized:false
  },
  true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0},
  new_records:[],updated_records:[],sources:[],relations:[],evidence:[],visuals:[],media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{
    status:'STAGE_B_GAPS_ONLY_READ_ONLY_CANDIDATE',canonical_write_performed:false,append_run_invoked:false,
    native_gap_count:gaps.length,assessment_candidate_count:assessmentBindings.length,assessment_auto_materialized:false,
    safe_to_append:false,safe_to_retire_overlays:false
  },
  extensions:{intelligence_v1:{assessments:[],gaps,contradictions:[]}}
};
validateIntelligenceExtensionV1(patch);
const afterAB=applyStrictPatchToCanonicalData(structuredClone(afterA),patch);
const materializedGaps=afterAB.intelligence_gaps?.gaps||afterAB.gaps?.gaps||afterAB.gaps||[];
const newGapIds=new Set(gaps.map(item=>item.gap_id));
const presentGapIds=new Set((Array.isArray(materializedGaps)?materializedGaps:[]).map(item=>item.gap_id||item.id));
for(const id of newGapIds)if(!presentGapIds.has(id))throw new Error(`STAGE_B: materialized gap ${id} missing after strict patch`);

const rawToLogical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
const residualSignature=(change,before,after)=>{
  const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);
  if(!match)return `UNSCOPED|${change.path}`;
  const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'';
  const beforeItem=objectAt(before,top,raw,index),afterItem=objectAt(after,top,raw,index);
  const id=itemId(afterItem)||itemId(beforeItem)||'UNKNOWN';
  const field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');
  return `${rawToLogical[raw]||raw}|${id}|${field}`;
};
const priorByModule=new Map((priorImpact.modules||[]).map(item=>[item.module,new Set(item.residual_signatures||[])]));
let runtime=afterAB;
const modules=[];const unexpected=[];
for(const module of policy.scope_modules||preview.scope_modules){
  const before=structuredClone(runtime),after=structuredClone(runtime);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const residual=deepDiff(before,after),factual=residual.filter(item=>!isOverlayMeta(item.path));
  const signatures=[...new Set(factual.map(change=>residualSignature(change,before,after)))].sort();
  const prior=priorByModule.get(module)||new Set();
  const added=signatures.filter(signature=>!prior.has(signature));
  const removed=[...prior].filter(signature=>!signatures.includes(signature)).sort();
  unexpected.push(...added.map(signature=>`${module}:${signature}`));
  modules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length,added_vs_stage_a:added,removed_vs_stage_a:removed,residual_signatures:signatures});
  runtime=after;
}
const residualSignatures=modules.reduce((sum,item)=>sum+item.residual_signature_count,0);
const residualFactualLeafs=modules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
const blockerCount=assessmentBindings.length;
const candidateText=JSON.stringify(patch,null,2)+'\n';
writeFileSync(join(dist,'overlay-stage-b-gap-patch-candidate.json'),candidateText,'utf8');
const status=unexpected.length===0?'PASS':'FAIL';
const output={
  generated_at:new Date().toISOString(),status,schema_version:'engineer-osint-stage-b-intelligence-audit-v1',
  policy:policy.policy,persistent_tip:store.report.current_run_id,stage_a_run_id:policy.expected_parent_run_id,stage_b_candidate_run_id:policy.candidate_run_id,
  stage_a_candidate_file_sha256:stageAMeta.candidate_file_sha256,stage_a_result_canonical_sha256:stageAPlan.entry.canonical_sha256,
  canonical_write_performed:false,append_run_invoked:false,safe_to_append_stage_a:false,safe_to_append_stage_b:false,safe_to_retire_overlays:false,
  native_gap_candidate_count:gaps.length,assessment_candidate_count:assessmentBindings.length,assessment_materialized_count:0,
  assessment_binding_blockers:blockerCount,assessment_with_explicit_same_target_source_evidence:assessmentBindings.filter(item=>item.explicit_same_target_and_source_evidence_ids.length>0).length,
  stage_b_gap_candidate_file_sha256:sha256Text(candidateText),post_stage_ab_residual_signature_count:residualSignatures,
  post_stage_ab_residual_factual_leaf_mutations:residualFactualLeafs,unexpected_residual_signatures:unexpected,
  assessment_bindings:assessmentBindings,modules
};
writeFileSync(join(dist,'overlay-stage-b-intelligence-audit.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.6 — Stage B Intelligence v1 readiness','',
  `Generated: ${output.generated_at}`,
  `Status: **${status}**`,'',
  'The reviewed B96 Stage A patch is applied only in memory. A chained B97 candidate then materializes the 15 legacy intelligence-gap questions as native Intelligence v1 gap objects. The four assessment/limitation candidates are **not** auto-created: the Intelligence v1 contract requires real supporting evidence IDs, and matching by topic or text is forbidden.','',
  `- Native gap candidates validated: **${gaps.length}**`,
  `- Assessment/limitation candidates: **${assessmentBindings.length}**`,
  `- Assessments auto-materialized: **0**`,
  `- Assessments with explicit same-target + reviewed-source evidence matches: **${output.assessment_with_explicit_same_target_source_evidence}**`,
  `- Assessment binding blockers retained: **${blockerCount}**`,
  `- Post Stage A+B residual signatures: **${residualSignatures}**`,
  `- Post Stage A+B factual residual leaf mutations: **${residualFactualLeafs}**`,
  `- Unexpected new residual signatures: **${unexpected.length}**`,'',
  '## Assessment evidence binding','',
  ...assessmentBindings.map(item=>`- \`${item.proposed_assessment_id}\` ← \`${item.related_id}.${item.legacy_field}\` — **${item.binding_status}** — explicit matching evidence: ${item.explicit_same_target_and_source_evidence_ids.length?item.explicit_same_target_and_source_evidence_ids.map(id=>`\`${id}\``).join(', '):'none'}`),'',
  '## Safety','',
  '- B96 and B97 remain unpersisted candidates.',
  '- No assessment is created from source IDs alone.',
  '- The 15 gaps are structurally valid native Intelligence v1 candidates, but `safe_to_append_stage_b=false` until the preceding B96 production decision is explicit.',
  '- Overlay retirement remains blocked; native analytical preservation does not by itself make legacy record-level overlay writes no-op.'
].join('\n');
writeFileSync(join(dist,'overlay-stage-b-intelligence-audit.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_stage_b_intelligence=${status.toLowerCase()}\noverlay_stage_b_gap_candidates=${gaps.length}\noverlay_stage_b_assessment_candidates=${assessmentBindings.length}\noverlay_stage_b_assessments_materialized=0\noverlay_stage_b_assessment_binding_blockers=${blockerCount}\noverlay_stage_b_explicit_evidence_matches=${output.assessment_with_explicit_same_target_source_evidence}\noverlay_stage_b_post_ab_residual_signatures=${residualSignatures}\noverlay_stage_b_post_ab_residual_factual_leafs=${residualFactualLeafs}\noverlay_stage_b_unexpected_residuals=${unexpected.length}\noverlay_stage_b_safe_to_append=0\noverlay_stage_b_safe_to_retire=0\noverlay_stage_b_canonical_writes=0\n`,'utf8');
console.log(`Stage B Intelligence ${status}: gaps=${gaps.length}; assessments=${assessmentBindings.length}; assessment-evidence-matches=${output.assessment_with_explicit_same_target_source_evidence}; blockers=${blockerCount}; postAB-signatures=${residualSignatures}; unexpected=${unexpected.length}; safe-to-append=NO`);
if(status!=='PASS')throw new Error(`STAGE_B failed: unexpected residual signatures=${unexpected.length}`);
await import('./audit-overlay-assessment-evidence.mjs');
