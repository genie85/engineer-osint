import {appendFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validateIntelligenceExtensionV1} from './lib/run-store.mjs';
import {evaluateFirstThreeOverlayTransition} from './lib/overlay-transition-guard.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const read=(path,label=path)=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:label});
const policy=read('V4524_B98_READINESS.json','v4.5.24 B98 readiness policy');
const review=read('V457_ASSESSMENT_EVIDENCE_REVIEW.json','historical curated B98 review');
const transition=read('V459_COMPAT_TRANSITION_POLICY.json','compatibility transition policy');
const residualBaseline=read('V4512_POST_B96_RESIDUAL_BASELINE.json','post-B96 residual baseline');
const b96Path='data/runs/engineer-osint-20260829-B96.json';
const b97Path='data/runs/engineer-osint-20260830-B97.json';
const b96Raw=readFileSync(join(src,b96Path),'utf8');
const b97Raw=readFileSync(join(src,b97Path),'utf8');
const b96=parseJsonStrict(b96Raw,{source:'persistent B96 run'});
const b97=parseJsonStrict(b97Raw,{source:'persistent B97 run'});
const store=loadCanonicalRunStore({root:src});
const fail=message=>{throw new Error(`B98_READINESS: ${message}`)};
const b95='engineer-osint-20260826-B95',b96Id='engineer-osint-20260829-B96',b97Id='engineer-osint-20260830-B97',b98Id='engineer-osint-20260830-B98';

if(policy.schema_version!=='engineer-osint-b98-readiness-v1'||policy.status!=='READ_ONLY_CANDIDATE_BUILD')fail('policy mismatch');
if(policy.candidate_run_id!==b98Id||policy.expected_parent_run_id!==b97Id)fail('candidate identity drift');
if(store.report.current_run_id!==b97Id||store.report.canonical_sha256!==policy.expected_parent_canonical_sha256)fail(`requires exact persistent B97, got ${store.report.current_run_id}`);
if(existsSync(join(src,`data/runs/${b98Id}.json`)))fail('persistent B98 already exists; readiness slice is no longer applicable');
if(sha256Text(b96Raw)!==policy.expected_b96_file_sha256)fail('persistent B96 file SHA drift');
if(sha256Text(b97Raw)!==policy.expected_b97_file_sha256)fail('persistent B97 file SHA drift');
if(b96.state?.run_id!==b96Id||b96.state?.parent_run_id!==b95)fail('persistent B96 chain drift');
if(b97.state?.run_id!==b97Id||b97.state?.parent_run_id!==b96Id)fail('persistent B97 chain drift');
const b96Ops=b96.extensions?.operations_v1||[];
if(b96Ops.length!==104||b96.sources?.length!==15)fail(`persistent B96 scope drift ops=${b96Ops.length} sources=${b96.sources?.length||0}`);
const b97Intel=b97.extensions?.intelligence_v1;
if(!b97Intel||b97Intel.gaps?.length!==policy.expected_gap_count_already_persistent||b97Intel.assessments?.length!==0||b97Intel.contradictions?.length!==0)fail('persistent B97 Intelligence scope drift');
if(b97.extensions?.operations_v1!==undefined)fail('persistent B97 unexpectedly contains factual operations');

if(review.schema_version!=='engineer-osint-assessment-evidence-review-v1'||review.policy!=='EVIDENCE_MUST_PRECEDE_ASSESSMENT_AND_REMAIN_SOURCE_SCOPED')fail('historical review policy drift');
if(review.candidate_run_id!==b98Id||review.expected_parent_run_id!==b97Id)fail('historical review B98 identity drift');
if(review.evidence_candidates?.length!==policy.expected_evidence_count||review.assessment_candidates?.length!==policy.expected_assessment_count)fail('historical review candidate-count drift');
if(transition.schema_version!=='engineer-osint-compat-transition-policy-v1'||transition.stage_a_run_id!==b96Id||transition.stage_b_run_id!==b97Id||transition.stage_c_run_id!==b98Id)fail('transition chain policy drift');
if(transition.expected?.stage_a_operations!==104||transition.expected?.stage_a_sources!==15||transition.expected?.native_gaps!==15||transition.expected?.native_assessments!==4||transition.expected?.native_evidence!==2||transition.expected?.native_analytical_total!==19)fail('transition count policy drift');
for(const [key,value] of Object.entries(policy.safety||{}))if(value!==false)fail(`unsafe readiness flag ${key}`);

const currentGaps=Array.isArray(store.data?.intelligence_gaps?.gaps)?store.data.intelligence_gaps.gaps:[];
const expectedGapIds=Array.from({length:15},(_,index)=>`ENG-GAP-B97-OVL-${String(index+1).padStart(3,'0')}`);
for(const id of expectedGapIds)if(!currentGaps.some(item=>(item?.gap_id||item?.id)===id))fail(`persistent native gap missing ${id}`);
const currentAssessments=Array.isArray(store.data?.assessments?.assessments)?store.data.assessments.assessments:[];
if(currentAssessments.some(item=>String(item?.assessment_id||item?.id||'').startsWith('ENG-ASMT-B98-OVL-')))fail('B98 assessment already present before simulation');
const currentSources=store.data?.sources?.sources||[];
const sourceIds=new Set((Array.isArray(currentSources)?currentSources:[]).map(item=>item?.id));
for(const id of ['RICH-SRC-012','RICH-SRC-015'])if(!sourceIds.has(id))fail(`required reviewed source ${id} missing from persistent B97`);

const evidenceBase=store.data?.evidence?.evidence||store.data?.evidence_registry?.evidence||store.data?.evidence||[];
const evidenceArray=Array.isArray(evidenceBase)?evidenceBase:[];
const numericEvidenceIds=evidenceArray.map(item=>String(item?.evidence_id||item?.id||'').match(/^ENG-EVID-(\d+)$/)?.[1]).filter(Boolean).map(Number);
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
const assessments=[...review.assessment_candidates].sort((a,b)=>a.key.localeCompare(b.key)).map((candidate,index)=>{
  const evidenceId=evidenceKeyToId.get(candidate.evidence_key);
  if(!evidenceId)fail(`assessment ${candidate.key} lacks reviewed evidence`);
  return {
    assessment_id:`ENG-ASMT-B98-OVL-${String(index+1).padStart(3,'0')}`,
    assessment:candidate.assessment,assessment_cs:candidate.assessment_cs,confidence:candidate.confidence,
    supporting_evidence_ids:[evidenceId],source_ids:[...candidate.source_ids],related_ids:[...candidate.related_ids],
    limitations:candidate.limitations,last_reviewed:review.reviewed_at,
    migration_origin:{legacy_field:candidate.legacy_field,review_key:candidate.key}
  };
});

const counts={CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:evidence.length,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0};
const patch={
  schema_version:'engineer-osint-patch-v1',
  state:{run_id:b98Id,parent_run_id:b97Id,status:'SUCCESS',window_from:'2026-08-30T16:08:00+02:00',window_to:'2026-08-30T16:08:01+02:00',counts},
  continuity:{status:'ASSESSMENT_EVIDENCE_CANDIDATE_AFTER_PERSISTENT_B97',source_stage_b_run_id:b97Id,evidence_policy:review.policy,assessment_scope:'FOUR_LEGACY_ANALYTICAL_FIELDS_ONLY',legacy_unsupported_implications_removed:true,overlay_retirement_authorized:false},
  true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0},
  new_records:[],updated_records:[],sources:[],relations:[],evidence,visuals:[],media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{status:'READ_ONLY_B98_READINESS_CANDIDATE',canonical_write_performed:false,append_run_invoked:false,evidence_candidate_count:evidence.length,assessment_candidate_count:assessments.length,source_scoped:true,unsupported_legacy_implications_removed:true,safe_to_append:false,safe_to_retire_overlays:false},
  extensions:{intelligence_v1:{assessments,gaps:[],contradictions:[]}}
};
validateIntelligenceExtensionV1(patch);
const afterB98=applyStrictPatchToCanonicalData(structuredClone(store.data),patch);
if(afterB98.state_latest?.run_id!==b98Id)fail('strict materialization did not advance state_latest to B98');
const afterEvidence=afterB98.evidence?.evidence||afterB98.evidence_registry?.evidence||afterB98.evidence||[];
const afterAssessments=afterB98.assessments?.assessments||afterB98.intelligence_assessments?.assessments||afterB98.assessments||[];
const evidenceById=new Map((Array.isArray(afterEvidence)?afterEvidence:[]).map(item=>[item?.evidence_id||item?.id,item]));
const assessmentById=new Map((Array.isArray(afterAssessments)?afterAssessments:[]).map(item=>[item?.assessment_id||item?.id,item]));
for(const item of evidence)if(!evidenceById.has(item.evidence_id))fail(`materialized evidence missing ${item.evidence_id}`);
for(const item of assessments){
  const actual=assessmentById.get(item.assessment_id);if(!actual)fail(`materialized assessment missing ${item.assessment_id}`);
  for(const evidenceId of actual.supporting_evidence_ids||[]){
    const linked=evidenceById.get(evidenceId);if(!linked)fail(`${item.assessment_id} references missing evidence ${evidenceId}`);
    if(!(actual.related_ids||[]).some(id=>(linked.related_ids||[]).includes(id)))fail(`${item.assessment_id} evidence target mismatch`);
    if(!(actual.source_ids||[]).some(id=>(linked.source_ids||[]).includes(id)))fail(`${item.assessment_id} evidence source mismatch`);
  }
}

const libraryBefore=evaluateFirstThreeOverlayTransition({data:structuredClone(store.data),stageA:b96,stageB:b97,stageC:patch,policy:transition});
const libraryAfter=evaluateFirstThreeOverlayTransition({data:structuredClone(afterB98),stageA:b96,stageB:b97,stageC:patch,policy:transition});
if(libraryBefore.short_circuit_allowed)fail('library transition guard passes before persistent B98');
if(!libraryAfter.short_circuit_allowed)fail(`library transition guard blocks simulated B98 (${libraryAfter.failed_check_count} failures)`);

const runtimeGuardText=readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8');
const overlayScope=[...transition.scope_modules];
const runtimeEvaluate=data=>{
  const context=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(data)},console});
  vm.runInContext(runtimeGuardText,context,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
  const api=context.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;if(!api?.shouldShortCircuit)fail('deployed runtime guard API missing');
  return overlayScope.map(module=>({module,short_circuit:Boolean(api.shouldShortCircuit(module,context.window.__ENGINEER_DATA__))}));
};
const guardBefore=runtimeEvaluate(store.data),guardAfter=runtimeEvaluate(afterB98);
const beforeShort=guardBefore.filter(item=>item.short_circuit).length,afterShort=guardAfter.filter(item=>item.short_circuit).length;
if(beforeShort!==policy.expected_guard_short_circuits_before)fail(`runtime guard before B98 drift ${beforeShort}/${overlayScope.length}`);
if(afterShort!==policy.expected_guard_short_circuits_after_simulated_b98)fail(`runtime guard after simulated B98 drift ${afterShort}/${overlayScope.length}`);

const logical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const obj=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const residualSignature=(change,before,after)=>{const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);if(!match)return `UNSCOPED|${change.path}`;const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'',beforeItem=obj(before,top,raw,index),afterItem=obj(after,top,raw,index),field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');return `${logical[raw]||raw}|${itemId(afterItem)||itemId(beforeItem)||'UNKNOWN'}|${field}`;};
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
let unguarded=structuredClone(afterB98);const unguardedModules=[];
for(const module of overlayScope){
  const before=structuredClone(unguarded),after=structuredClone(unguarded);
  vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const factual=deepDiff(before,after).filter(change=>!isOverlayMeta(change.path));
  const signatures=[...new Set(factual.map(change=>residualSignature(change,before,after)))].sort();
  const expected=residualBaseline.modules?.[module];if(!expected)fail(`residual baseline missing ${module}`);
  const expectedSignatures=[...expected.residual_signatures].sort();
  const added=signatures.filter(signature=>!expectedSignatures.includes(signature)),missing=expectedSignatures.filter(signature=>!signatures.includes(signature));
  if(signatures.length!==expected.residual_signature_count||factual.length!==expected.residual_factual_leaf_mutations||added.length||missing.length)fail(`unguarded residual drift ${module}: ${signatures.length}/${factual.length}, added=${added.length}, missing=${missing.length}`);
  unguardedModules.push({module,residual_signature_count:signatures.length,residual_factual_leaf_mutations:factual.length});
  unguarded=after;
}
const unguardedSignatures=unguardedModules.reduce((sum,item)=>sum+item.residual_signature_count,0),unguardedLeaves=unguardedModules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
if(unguardedSignatures!==policy.expected_unguarded_residual_signatures||unguardedLeaves!==policy.expected_unguarded_residual_factual_leaf_mutations)fail(`total unguarded residual drift ${unguardedSignatures}/${unguardedLeaves}`);

let guarded=structuredClone(afterB98);const guardedModules=[];
for(const module of overlayScope){
  const before=structuredClone(guarded);
  const context=vm.createContext({window:{__ENGINEER_DATA__:guarded},console});
  vm.runInContext(runtimeGuardText,context,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
  const shortCircuit=Boolean(context.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME?.shouldShortCircuit(module,guarded));
  if(!shortCircuit)vm.runInNewContext(readFileSync(join(src,module),'utf8'),{window:{__ENGINEER_DATA__:guarded},console},{filename:module,timeout:3000});
  const diff=deepDiff(before,guarded);
  guardedModules.push({module,short_circuit:shortCircuit,mutation_count:diff.length,factual_mutation_count:diff.filter(change=>!isOverlayMeta(change.path)).length});
}
const guardedMutations=guardedModules.reduce((sum,item)=>sum+item.mutation_count,0);
if(guardedModules.some(item=>!item.short_circuit||item.mutation_count!==0)||guardedMutations!==0)fail('guarded simulated B98 overlays are not zero-mutation');

const candidateText=JSON.stringify(patch,null,2)+'\n';
const candidateSha=sha256Text(candidateText);
writeFileSync(join(dist,'b98-patch-candidate.json'),candidateText,'utf8');
const output={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-b98-readiness-audit-v1',
  persistent_tip:store.report.current_run_id,persistent_canonical_sha256:store.report.canonical_sha256,
  candidate_run_id:b98Id,parent_run_id:b97Id,candidate_file_sha256:candidateSha,
  evidence_count:evidence.length,assessment_count:assessments.length,evidence_ids:evidence.map(item=>item.evidence_id),assessment_ids:assessments.map(item=>item.assessment_id),
  library_guard_before:{short_circuit_allowed:libraryBefore.short_circuit_allowed,failed_check_count:libraryBefore.failed_check_count},
  library_guard_after:{short_circuit_allowed:libraryAfter.short_circuit_allowed,failed_check_count:libraryAfter.failed_check_count},
  runtime_guard_before_short_circuits:beforeShort,runtime_guard_after_short_circuits:afterShort,
  runtime_guard_before:guardBefore,runtime_guard_after:guardAfter,
  unguarded_residual_signature_count:unguardedSignatures,unguarded_residual_factual_leaf_mutations:unguardedLeaves,unguarded_modules:unguardedModules,
  guarded_mutation_count:guardedMutations,guarded_modules:guardedModules,
  historical_review_persistent_tip_required:review.persistent_tip_required,
  canonical_write_performed:false,append_run_invoked:false,safe_to_append:false,safe_to_retire_overlays:false
};
writeFileSync(join(dist,'b98-readiness-audit.json'),JSON.stringify(output,null,2)+'\n','utf8');
writeFileSync(join(dist,'b98-readiness-audit.md'),`# ENGINEER OSINT v4.5.24 — B98 readiness\n\nStatus: **PASS**\n\n- Persistent parent: **${b97Id}**\n- Candidate: **${b98Id}**\n- Candidate SHA-256: \`${candidateSha}\`\n- Evidence / assessments: **${evidence.length} / ${assessments.length}**\n- Runtime guard before B98: **${beforeShort}/${overlayScope.length}** short-circuits\n- Runtime guard after simulated B98: **${afterShort}/${overlayScope.length}** short-circuits\n- Unguarded residual signatures / factual leaves: **${unguardedSignatures} / ${unguardedLeaves}**\n- Guarded mutation count after simulated B98: **${guardedMutations}**\n\nNo canonical write or append occurred. B98 persistence and overlay retirement remain separately blocked.\n`,'utf8');
appendFileSync(join(dist,'health.txt'),`b98_readiness=pass\nb98_readiness_persistent_tip=${store.report.current_run_id}\nb98_readiness_candidate_run=${b98Id}\nb98_readiness_candidate_file_sha=${candidateSha}\nb98_readiness_evidence=${evidence.length}\nb98_readiness_assessments=${assessments.length}\nb98_readiness_guard_before=${beforeShort}\nb98_readiness_guard_after=${afterShort}\nb98_readiness_unguarded_signatures=${unguardedSignatures}\nb98_readiness_unguarded_factual_leafs=${unguardedLeaves}\nb98_readiness_guarded_mutations=${guardedMutations}\nb98_readiness_canonical_writes=0\nb98_readiness_append_invoked=0\nb98_readiness_safe_to_append=0\nb98_readiness_safe_to_retire=0\n`);
console.log(`B98 readiness PASS: candidate=${candidateSha}; evidence=${evidence.length}; assessments=${assessments.length}; guard=${beforeShort}->${afterShort}; unguarded=${unguardedSignatures}/${unguardedLeaves}; guarded=${guardedMutations}`);
