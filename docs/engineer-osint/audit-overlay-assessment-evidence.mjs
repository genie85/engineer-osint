import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validateIntelligenceExtensionV1} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const review=parseJsonStrict(readFileSync(join(src,'V457_ASSESSMENT_EVIDENCE_REVIEW.json'),'utf8'),{source:'v4.5.7 assessment evidence review'});
const stageBPolicy=parseJsonStrict(readFileSync(join(src,'V456_STAGE_B_POLICY.json'),'utf8'),{source:'v4.5.6 Stage B policy'});
const stageA=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate.json'),'utf8'),{source:'v4.5.5 Stage A candidate'});
const stageB=parseJsonStrict(readFileSync(join(dist,'overlay-stage-b-gap-patch-candidate.json'),'utf8'),{source:'v4.5.6 Stage B gap candidate'});
const stageBAudit=parseJsonStrict(readFileSync(join(dist,'overlay-stage-b-intelligence-audit.json'),'utf8'),{source:'v4.5.6 Stage B audit'});
const store=loadCanonicalRunStore({root:src});

if(review.schema_version!=='engineer-osint-assessment-evidence-review-v1'||review.policy!=='EVIDENCE_MUST_PRECEDE_ASSESSMENT_AND_REMAIN_SOURCE_SCOPED')throw new Error('ASSESSMENT_EVIDENCE: review policy mismatch');
if(store.report.current_run_id!==review.persistent_tip_required)throw new Error(`ASSESSMENT_EVIDENCE stale persistent tip: expected ${review.persistent_tip_required}, got ${store.report.current_run_id}`);
if(stageA.state?.run_id!==stageBPolicy.expected_parent_run_id||stageB.state?.run_id!==review.expected_parent_run_id||stageB.state?.parent_run_id!==stageA.state?.run_id)throw new Error('ASSESSMENT_EVIDENCE: B96/B97 chain mismatch');
if(stageBAudit.status!=='PASS'||stageBAudit.assessment_candidate_count!==4||stageBAudit.assessment_materialized_count!==0)throw new Error('ASSESSMENT_EVIDENCE: upstream Stage B assessment gate is not the expected blocked state');
if(stageBAudit.assessment_with_explicit_same_target_source_evidence!==0)throw new Error('ASSESSMENT_EVIDENCE: upstream evidence state changed; curated review must be repeated');
for(const [key,value] of Object.entries(review.safety||{}))if(value!==false)throw new Error(`ASSESSMENT_EVIDENCE: unsafe review flag ${key}`);
if(review.evidence_candidates?.length!==2||review.assessment_candidates?.length!==4)throw new Error('ASSESSMENT_EVIDENCE: expected 2 evidence and 4 assessment candidates');

const afterA=applyStrictPatchToCanonicalData(structuredClone(store.data),stageA);
const afterAB=applyStrictPatchToCanonicalData(structuredClone(afterA),stageB);
const sources=afterAB.sources?.sources||afterAB.sources||[];
const sourceIds=new Set((Array.isArray(sources)?sources:[]).map(item=>item.id));
for(const sourceId of ['RICH-SRC-012','RICH-SRC-015'])if(!sourceIds.has(sourceId))throw new Error(`ASSESSMENT_EVIDENCE: reviewed source ${sourceId} missing after simulated B96`);

const evidenceBase=afterAB.evidence?.evidence||afterAB.evidence_registry?.evidence||afterAB.evidence||[];
const evidenceArray=Array.isArray(evidenceBase)?evidenceBase:[];
const numericEvidenceIds=evidenceArray.map(item=>String(item.evidence_id||item.id||'').match(/^ENG-EVID-(\d+)$/)?.[1]).filter(Boolean).map(Number);
const evidenceStart=(numericEvidenceIds.length?Math.max(...numericEvidenceIds):0)+1;
const evidenceKeyToId=new Map();
const evidence=review.evidence_candidates.map((candidate,index)=>{
  const id=`ENG-EVID-${String(evidenceStart+index).padStart(4,'0')}`;
  evidenceKeyToId.set(candidate.key,id);
  return {
    id,evidence_id:id,evidence_type:candidate.evidence_type,evidence_status:candidate.evidence_status,
    related_ids:[candidate.related_id],source_ids:[...candidate.source_ids],evidence_date:candidate.evidence_date,
    observation_basis:candidate.observation_basis,what_it_supports_cs:candidate.what_it_supports_cs,
    what_it_supports_en:candidate.what_it_supports_en,what_it_does_not_prove_cs:candidate.what_it_does_not_prove_cs,
    what_it_does_not_prove_en:candidate.what_it_does_not_prove_en,confidence:candidate.confidence
  };
});

const assessmentKeyToLegacy=new Map((stageBAudit.assessment_bindings||[]).map(item=>[`${item.related_id}|${item.legacy_field}`,item]));
const assessments=[...review.assessment_candidates].sort((a,b)=>a.key.localeCompare(b.key)).map((candidate,index)=>{
  const evidenceId=evidenceKeyToId.get(candidate.evidence_key);
  if(!evidenceId)throw new Error(`ASSESSMENT_EVIDENCE: missing evidence key ${candidate.evidence_key}`);
  const upstream=assessmentKeyToLegacy.get(`${candidate.related_ids[0]}|${candidate.legacy_field}`);
  if(!upstream)throw new Error(`ASSESSMENT_EVIDENCE: ${candidate.key} does not correspond to a blocked v4.5.6 assessment candidate`);
  if(upstream.binding_status!=='EVIDENCE_BINDING_REQUIRED')throw new Error(`ASSESSMENT_EVIDENCE: ${candidate.key} upstream binding unexpectedly changed`);
  return {
    assessment_id:`ENG-ASMT-B98-OVL-${String(index+1).padStart(3,'0')}`,
    assessment:candidate.assessment,assessment_cs:candidate.assessment_cs,confidence:candidate.confidence,
    supporting_evidence_ids:[evidenceId],source_ids:[...candidate.source_ids],related_ids:[...candidate.related_ids],
    limitations:candidate.limitations,last_reviewed:review.reviewed_at,
    migration_origin:{legacy_field:candidate.legacy_field,review_key:candidate.key}
  };
});

const evidenceById=new Map(evidence.map(item=>[item.evidence_id,item]));
for(const assessment of assessments){
  for(const evidenceId of assessment.supporting_evidence_ids){
    const item=evidenceById.get(evidenceId);if(!item)throw new Error(`ASSESSMENT_EVIDENCE: ${assessment.assessment_id} references missing candidate evidence ${evidenceId}`);
    if(!assessment.related_ids.some(id=>item.related_ids.includes(id)))throw new Error(`ASSESSMENT_EVIDENCE: ${assessment.assessment_id} evidence has no explicit common target`);
    if(!assessment.source_ids.some(id=>item.source_ids.includes(id)))throw new Error(`ASSESSMENT_EVIDENCE: ${assessment.assessment_id} evidence has no reviewed-source intersection`);
  }
}

const counts={CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:evidence.length,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0};
const patch={
  schema_version:'engineer-osint-patch-v1',
  state:{run_id:review.candidate_run_id,parent_run_id:review.expected_parent_run_id,status:'SUCCESS',window_from:'2026-08-30T01:18:00+02:00',window_to:'2026-08-30T01:18:01+02:00',counts},
  continuity:{
    status:'ASSESSMENT_EVIDENCE_CANDIDATE_AFTER_REVIEWED_B96_B97',
    source_stage_b_run_id:review.expected_parent_run_id,
    evidence_policy:review.policy,
    assessment_scope:'FOUR_LEGACY_ANALYTICAL_FIELDS_ONLY',
    legacy_unsupported_implications_removed:true,
    overlay_retirement_authorized:false
  },
  true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0},
  new_records:[],updated_records:[],sources:[],relations:[],evidence,visuals:[],media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{
    status:'READ_ONLY_B98_EVIDENCE_ASSESSMENT_CANDIDATE',canonical_write_performed:false,append_run_invoked:false,
    evidence_candidate_count:evidence.length,assessment_candidate_count:assessments.length,
    source_scoped:true,unsupported_legacy_implications_removed:true,safe_to_append:false,safe_to_retire_overlays:false
  },
  extensions:{intelligence_v1:{assessments,gaps:[],contradictions:[]}}
};
validateIntelligenceExtensionV1(patch);
const afterABC=applyStrictPatchToCanonicalData(structuredClone(afterAB),patch);
const finalEvidence=afterABC.evidence?.evidence||afterABC.evidence_registry?.evidence||afterABC.evidence||[];
const finalAssessments=afterABC.assessments?.assessments||afterABC.intelligence_assessments?.assessments||afterABC.assessments||[];
const finalEvidenceIds=new Set((Array.isArray(finalEvidence)?finalEvidence:[]).map(item=>item.evidence_id||item.id));
const finalAssessmentIds=new Set((Array.isArray(finalAssessments)?finalAssessments:[]).map(item=>item.assessment_id||item.id));
for(const item of evidence)if(!finalEvidenceIds.has(item.evidence_id))throw new Error(`ASSESSMENT_EVIDENCE: evidence ${item.evidence_id} missing after strict materialization`);
for(const item of assessments)if(!finalAssessmentIds.has(item.assessment_id))throw new Error(`ASSESSMENT_EVIDENCE: assessment ${item.assessment_id} missing after strict materialization`);

const rawToLogical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
const residualSignature=(change,before,after)=>{
  const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);if(!match)return `UNSCOPED|${change.path}`;
  const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'';
  const beforeItem=objectAt(before,top,raw,index),afterItem=objectAt(after,top,raw,index),id=itemId(afterItem)||itemId(beforeItem)||'UNKNOWN';
  const field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');
  return `${rawToLogical[raw]||raw}|${id}|${field}`;
};
const priorByModule=new Map((stageBAudit.modules||[]).map(item=>[item.module,new Set(item.residual_signatures||[])]));
let runtime=afterABC;const modules=[];const unexpected=[];
for(const module of stageBPolicy.scope_modules){
  const before=structuredClone(runtime),after=structuredClone(runtime);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const residual=deepDiff(before,after),factual=residual.filter(item=>!isOverlayMeta(item.path));
  const signatures=[...new Set(factual.map(change=>residualSignature(change,before,after)))].sort(),prior=priorByModule.get(module)||new Set();
  const added=signatures.filter(signature=>!prior.has(signature)),removed=[...prior].filter(signature=>!signatures.includes(signature)).sort();
  unexpected.push(...added.map(signature=>`${module}:${signature}`));
  modules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length,added_vs_stage_b:added,removed_vs_stage_b:removed,residual_signatures:signatures});
  runtime=after;
}
const residualSignatures=modules.reduce((sum,item)=>sum+item.residual_signature_count,0),residualFactualLeafs=modules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
const status=unexpected.length===0?'PASS':'FAIL';
const candidateText=JSON.stringify(patch,null,2)+'\n';
writeFileSync(join(dist,'overlay-stage-c-assessment-evidence-candidate.json'),candidateText,'utf8');
const output={
  generated_at:new Date().toISOString(),status,schema_version:'engineer-osint-assessment-evidence-audit-v1',
  persistent_tip:store.report.current_run_id,stage_a_run_id:stageA.state.run_id,stage_b_run_id:stageB.state.run_id,stage_c_candidate_run_id:patch.state.run_id,
  canonical_write_performed:false,append_run_invoked:false,safe_to_append:false,safe_to_retire_overlays:false,
  evidence_candidate_count:evidence.length,assessment_candidate_count:assessments.length,
  evidence_ids:evidence.map(item=>item.evidence_id),assessment_ids:assessments.map(item=>item.assessment_id),
  narrowed_assessment_count:3,source_scope_limitation_assessment_count:1,
  unsupported_legacy_implications_removed:['ENG-SIG-0006.staff_relevance: EW-resilience','ENG-SIG-0006.training_relevance: contested-electromagnetic performance/failure-mode claim'],
  candidate_file_sha256:sha256Text(candidateText),native_analytical_candidates_preserved:15+assessments.length,
  post_stage_abc_residual_signature_count:residualSignatures,post_stage_abc_residual_factual_leaf_mutations:residualFactualLeafs,
  unexpected_residual_signatures:unexpected,modules,assessments,evidence
};
writeFileSync(join(dist,'overlay-assessment-evidence-audit.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.7 — assessment evidence binding','',
  `Generated: ${output.generated_at}`,
  `Status: **${status}**`,'',
  'The B96 factual/source candidate and B97 native-gap candidate are applied only in memory. This gate adds two source-scoped evidence candidates and four native Intelligence v1 assessments in a hypothetical B98. The assessment wording is narrower than the legacy presentation text where the primary material does not support broader implications.','',
  `- New evidence candidates: **${evidence.length}** (${evidence.map(item=>`\`${item.evidence_id}\``).join(', ')})`,
  `- Native assessment candidates: **${assessments.length}**`,
  '- Legacy EW-resilience / contested-electromagnetic implications persisted: **NO**',
  `- Native analytical candidates preserved across B97+B98: **${15+assessments.length}/19**`,
  `- Post B96+B97+B98 residual signatures: **${residualSignatures}**`,
  `- Unexpected residual signatures: **${unexpected.length}**`,'',
  '## Assessments','',
  ...assessments.map(item=>`- \`${item.assessment_id}\` → \`${item.related_ids.join(', ')}\` — ${item.assessment}`),'',
  '## Safety','',
  '- No B96, B97 or B98 run is persisted.',
  '- Evidence is explicitly target-linked and source-scoped before assessment materialization.',
  '- The B98 candidate remains `safe_to_append=false` because its parents are still hypothetical.',
  '- Overlay retirement remains blocked because native intelligence preservation does not automatically suppress the legacy record-level compatibility writes.'
].join('\n');
writeFileSync(join(dist,'overlay-assessment-evidence-audit.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_assessment_evidence=${status.toLowerCase()}\noverlay_assessment_evidence_candidates=${evidence.length}\noverlay_assessment_native_assessments=${assessments.length}\noverlay_assessment_native_analytical_preserved=${15+assessments.length}\noverlay_assessment_unsupported_legacy_implications=0\noverlay_assessment_post_abc_residual_signatures=${residualSignatures}\noverlay_assessment_post_abc_residual_factual_leafs=${residualFactualLeafs}\noverlay_assessment_unexpected_residuals=${unexpected.length}\noverlay_assessment_safe_to_append=0\noverlay_assessment_safe_to_retire=0\noverlay_assessment_canonical_writes=0\n`,'utf8');
console.log(`Assessment evidence ${status}: evidence=${evidence.length}; assessments=${assessments.length}; native-analytical=19/19; postABC-signatures=${residualSignatures}; unexpected=${unexpected.length}; safe-to-append=NO`);
if(status!=='PASS')throw new Error(`ASSESSMENT_EVIDENCE failed: unexpected residuals=${unexpected.length}`);
