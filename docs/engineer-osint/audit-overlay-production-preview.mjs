import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseJsonStrict} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const map=parseJsonStrict(readFileSync(join(dist,'overlay-migration-map.json'),'utf8'),{source:'overlay migration map'});
const provenance=parseJsonStrict(readFileSync(join(dist,'overlay-provenance-audit.json'),'utf8'),{source:'overlay provenance audit'});
const resolution=parseJsonStrict(readFileSync(join(src,'V454_MIGRATION_RESOLUTION.json'),'utf8'),{source:'v4.5.4 migration resolution'});
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('OVERLAY_PRODUCTION_PREVIEW: ENGINEER_DATA marker missing');
const canonical=parseJsonStrict(html.slice(a+marker.length,b),{source:'built canonical ENGINEER_DATA'});

if(map.status!=='PASS'||map.schema_version!=='engineer-osint-overlay-migration-map-v1')throw new Error('OVERLAY_PRODUCTION_PREVIEW: invalid migration map');
if(provenance.status!=='PASS'||provenance.schema_version!=='engineer-osint-overlay-provenance-audit-v1')throw new Error('OVERLAY_PRODUCTION_PREVIEW: provenance gate is not PASS');
if(resolution.schema_version!=='engineer-osint-overlay-migration-resolution-v1'||resolution.policy!=='READ_ONLY_PRODUCTION_PREVIEW_NO_CANONICAL_APPEND')throw new Error('OVERLAY_PRODUCTION_PREVIEW: resolution policy mismatch');
if(map.current_run_id!==canonical.state_latest?.run_id||provenance.current_run_id!==map.current_run_id)throw new Error('OVERLAY_PRODUCTION_PREVIEW: stale upstream artifact');
if(JSON.stringify(resolution.scope_modules)!==JSON.stringify(provenance.scope_modules))throw new Error('OVERLAY_PRODUCTION_PREVIEW: resolution/provenance scope mismatch');
if(resolution.safety?.canonical_write_performed!==false||resolution.safety?.append_run_invoked!==false||resolution.safety?.safe_to_append!==false||resolution.safety?.safe_to_retire_overlays!==false)throw new Error('OVERLAY_PRODUCTION_PREVIEW: unsafe resolution flags');

const keyOf=item=>`${item.logical_collection}:${item.target_id}:${item.field||item.action}`;
const mapKey=item=>`${item.module}|${item.logical_collection}|${item.target_id}|${item.field||item.action}`;
const mapByKey=new Map(map.candidates.filter(item=>resolution.scope_modules.includes(item.module)).map(item=>[mapKey(item),item]));
const provenanceCandidates=provenance.candidates.filter(item=>resolution.scope_modules.includes(item.module));
if(provenanceCandidates.length!==156)throw new Error(`OVERLAY_PRODUCTION_PREVIEW: expected 156 provenance candidates, got ${provenanceCandidates.length}`);
const special=resolution.special_resolutions||{};
const analyticalRoutes=resolution.analytical_routes||{};
const administrativeRoutes=resolution.administrative_routes||{};
const errors=[];
const operationTemplates=[];
const sourceAppends=[];
const analyticalCandidates=[];
const noWriteCandidates=[];
const runtimeGenerated=[];
const decisions=[];
const reviewedCategories=new Set(['REVIEWED_SOURCE_BACKED','REVIEWED_SOURCE_BACKED_WITH_ATTRIBUTION_LIMIT']);
const union=(...arrays)=>[...new Set(arrays.flat().filter(value=>typeof value==='string'&&value))];
const sourceIdsFor=item=>union(item.source_id_hints||[]);
const valueEnvelope=candidate=>{
  const env=candidate.after_value;
  if(env?.present!==true)throw new Error(`OVERLAY_PRODUCTION_PREVIEW: ${keyOf(candidate)} has no after value`);
  return structuredClone(env.value);
};
const addOperation=(candidate,value,decision,valueMode='FIXED')=>{
  const sourceIds=sourceIdsFor(candidate);
  if(sourceIds.length===0)errors.push(`${keyOf(candidate)}: operation has no reviewed supporting source ids`);
  operationTemplates.push({
    collection:candidate.logical_collection,target_id:candidate.target_id,field:candidate.field,
    op:'REPLACE_FIELD',value_mode:valueMode,value:valueMode==='FIXED'?structuredClone(value):null,
    source_ids:sourceIds,decision,production_operation_id:null
  });
};

for(const p of provenanceCandidates){
  const k=`${p.module}|${p.logical_collection}|${p.target_id}|${p.field||p.action}`;
  const candidate=mapByKey.get(k);
  if(!candidate){errors.push(`${k}: missing migration-map candidate`);continue;}
  const semanticKey=keyOf(candidate);
  let decision=null;
  if(p.category==='SOURCE_DEFINITION_REVIEWED'){
    if(candidate.logical_collection!=='sources'||candidate.payload?.present!==true){errors.push(`${semanticKey}: invalid source append candidate`);continue;}
    sourceAppends.push({source_id:candidate.target_id,value:structuredClone(candidate.payload.value),decision:'STRICT_SOURCE_APPEND_READY_AS_REVIEWED'});
    decision='STRICT_SOURCE_APPEND_READY_AS_REVIEWED';
  }else if(reviewedCategories.has(p.category)){
    addOperation(candidate,valueEnvelope(candidate),p.category==='REVIEWED_SOURCE_BACKED_WITH_ATTRIBUTION_LIMIT'?'FACTUAL_OPERATION_READY_WITH_ATTRIBUTION_LIMIT':'FACTUAL_OPERATION_READY_AS_REVIEWED');
    decision=p.category==='REVIEWED_SOURCE_BACKED_WITH_ATTRIBUTION_LIMIT'?'FACTUAL_OPERATION_READY_WITH_ATTRIBUTION_LIMIT':'FACTUAL_OPERATION_READY_AS_REVIEWED';
  }else if(p.category==='PRECISION_REVIEW_REQUIRED'||p.category==='ABSENCE_REVIEW_REQUIRED'||p.category==='EXPANDED_SOURCE_REVIEW_REQUIRED'){
    const r=special[semanticKey];
    if(!r){errors.push(`${semanticKey}: unresolved special provenance blocker ${p.category}`);continue;}
    if(r.provenance_category!==p.category){errors.push(`${semanticKey}: special resolution category mismatch`);continue;}
    if(!Array.isArray(r.source_ids)||r.source_ids.length===0){errors.push(`${semanticKey}: special resolution source ids missing`);continue;}
    if(p.category==='ABSENCE_REVIEW_REQUIRED'){
      if(r.resolution!=='OMIT_NO_CANONICAL_FACTUAL_WRITE')errors.push(`${semanticKey}: absence review must explicitly omit factual write`);
      if(candidate.before_value?.present===true)errors.push(`${semanticKey}: cannot omit absence sentinel because a pre-overlay canonical value exists`);
      noWriteCandidates.push({collection:candidate.logical_collection,target_id:candidate.target_id,field:candidate.field,decision:r.resolution,reason:r.note});
      decision=r.resolution;
    }else{
      if(!Object.prototype.hasOwnProperty.call(r,'final_value')){errors.push(`${semanticKey}: resolved final value missing`);continue;}
      addOperation({...candidate,source_id_hints:r.source_ids},r.final_value,r.resolution);
      decision=r.resolution;
    }
  }else if(p.category==='ANALYTICAL_ROUTE_REQUIRED'){
    const route=analyticalRoutes[candidate.field];
    if(!route){errors.push(`${semanticKey}: analytical route missing`);continue;}
    analyticalCandidates.push({
      related_id:candidate.target_id,source_ids:sourceIdsFor(candidate),legacy_field:candidate.field,
      route,content:valueEnvelope(candidate),production_intelligence_id:null,
      requires_supporting_evidence_binding:true
    });
    decision=route;
  }else if(p.category==='ADMINISTRATIVE_METADATA_REVIEW_REQUIRED'){
    const route=administrativeRoutes[candidate.field];
    if(!route){errors.push(`${semanticKey}: administrative route missing`);continue;}
    if(candidate.field==='source_ids'){
      const before=candidate.before_value?.present===true&&Array.isArray(candidate.before_value.value)?candidate.before_value.value:[];
      const after=candidate.after_value?.present===true&&Array.isArray(candidate.after_value.value)?candidate.after_value.value:[];
      const merged=union(before,after,sourceIdsFor(candidate));
      if(before.some(id=>!merged.includes(id)))errors.push(`${semanticKey}: source union lost a pre-overlay canonical source`);
      addOperation(candidate,merged,route);
    }else if(candidate.field==='last_verified_date'){
      addOperation(candidate,null,route,'REAL_APPEND_RUN_DATE');
      runtimeGenerated.push({collection:candidate.logical_collection,target_id:candidate.target_id,field:candidate.field,decision:route});
    }else if(candidate.field==='provenance_granularity'){
      const hasClaims=provenanceCandidates.some(other=>other.target_id===candidate.target_id&&other.field==='claims'&&reviewedCategories.has(other.category));
      if(!hasClaims)errors.push(`${semanticKey}: CLAIM_LEVEL provenance requested without a reviewed claims candidate`);
      const value=valueEnvelope(candidate);
      if(value!=='CLAIM_LEVEL')errors.push(`${semanticKey}: unsupported provenance granularity ${value}`);
      addOperation(candidate,value,route);
    }else if(candidate.field==='rich_backfill_status'||candidate.field==='verification_note'){
      noWriteCandidates.push({collection:candidate.logical_collection,target_id:candidate.target_id,field:candidate.field,decision:route,reason:'Legacy presentation/migration metadata is not canonical production truth.'});
    }else errors.push(`${semanticKey}: unsupported administrative field ${candidate.field}`);
    decision=route;
  }else errors.push(`${semanticKey}: unsupported provenance category ${p.category}`);
  decisions.push({module:candidate.module,collection:candidate.logical_collection,target_id:candidate.target_id,field:candidate.field||null,provenance_category:p.category,decision});
}

const specialUsed=new Set(decisions.filter(d=>special[`${d.collection}:${d.target_id}:${d.field}`]).map(d=>`${d.collection}:${d.target_id}:${d.field}`));
for(const k of Object.keys(special)){if(!specialUsed.has(k))errors.push(`${k}: special resolution did not match a scoped candidate`);}

const analyticalGap=analyticalCandidates.filter(item=>item.route==='INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED').length;
const analyticalAssessment=analyticalCandidates.length-analyticalGap;
const sourceUnionOps=operationTemplates.filter(item=>item.decision==='UNION_CANONICAL_AND_REVIEWED_SOURCE_IDS').length;
const runtimeDateOps=operationTemplates.filter(item=>item.value_mode==='REAL_APPEND_RUN_DATE').length;
const provenanceOps=operationTemplates.filter(item=>item.decision==='PRESERVE_CLAIM_LEVEL_ONLY_WHEN_CLAIMS_PERSIST').length;
const fixedOps=operationTemplates.length-runtimeDateOps;
const noWriteLegacy=noWriteCandidates.filter(item=>item.decision.startsWith('DROP_LEGACY_')).length;
const noWriteAbsence=noWriteCandidates.filter(item=>item.decision==='OMIT_NO_CANONICAL_FACTUAL_WRITE').length;

// Validate Stage A with the same strict materializer as a real append. Dynamic run-date values use a synthetic
// placeholder only inside this in-memory check and are never written to the repository or exported as final values.
const syntheticOperations=operationTemplates.map((item,index)=>({
  operation_id:`ENG-OP-PREVIEW-V454-${String(index+1).padStart(3,'0')}`,
  op:'REPLACE_FIELD',collection:item.collection,target_id:item.target_id,field:item.field,
  value:item.value_mode==='REAL_APPEND_RUN_DATE'?'2099-12-31':structuredClone(item.value),
  reason:'Synthetic v4.5.4 production-stage structural preview only',source_ids:[...item.source_ids]
}));
const sourceValues=sourceAppends.map(item=>structuredClone(item.value));
const counts={
  CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,
  NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:syntheticOperations.length,CONTRADICTION:0,LEAD:0,
  NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,
  NEW_SOURCES:sourceValues.length,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0
};
const syntheticRunId='engineer-osint-20991231-B9954';
const syntheticPatch={
  schema_version:'engineer-osint-patch-v1',
  state:{run_id:syntheticRunId,parent_run_id:canonical.state_latest?.run_id,status:'SUCCESS',window_from:'2099-12-31T00:00:00Z',window_to:'2099-12-31T00:00:01Z',counts},
  continuity:{status:'SYNTHETIC_PREVIEW_ONLY'},true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0},
  new_records:[],updated_records:[],sources:sourceValues,relations:[],evidence:[],visuals:[],media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{status:'SYNTHETIC_PREVIEW_ONLY'},extensions:{operations_v1:syntheticOperations}
};
let strictPreviewStatus='PASS';
try{applyStrictPatchToCanonicalData(structuredClone(canonical),syntheticPatch);}catch(error){strictPreviewStatus='FAIL';errors.push(`strict Stage A preview failed: ${error.message}`);}

const expectedTotal=operationTemplates.length+sourceAppends.length+analyticalCandidates.length+noWriteCandidates.length;
if(expectedTotal!==provenanceCandidates.length)errors.push(`decision decomposition mismatch: ${expectedTotal} != ${provenanceCandidates.length}`);
if(sourceAppends.length!==15)errors.push(`expected 15 source appends, got ${sourceAppends.length}`);
if(analyticalCandidates.length!==19)errors.push(`expected 19 analytical candidates, got ${analyticalCandidates.length}`);
if(noWriteCandidates.length!==18)errors.push(`expected 18 no-write candidates, got ${noWriteCandidates.length}`);
if(operationTemplates.length!==104)errors.push(`expected 104 Stage A operation templates, got ${operationTemplates.length}`);
if(sourceUnionOps!==16||runtimeDateOps!==13||provenanceOps!==7)errors.push(`administrative operation decomposition mismatch: source-union=${sourceUnionOps}, run-date=${runtimeDateOps}, provenance=${provenanceOps}`);
if(analyticalGap!==15||analyticalAssessment!==4)errors.push(`Intelligence v1 routing mismatch: gaps=${analyticalGap}, assessments=${analyticalAssessment}`);

const pass=errors.length===0&&strictPreviewStatus==='PASS';
const output={
  generated_at:new Date().toISOString(),status:pass?'PASS':'FAIL',schema_version:'engineer-osint-overlay-production-preview-v1',
  current_run_id:map.current_run_id,canonical_sha256:map.canonical_sha256,policy:resolution.policy,scope_modules:resolution.scope_modules,
  canonical_write_performed:false,append_run_invoked:false,production_operation_ids_generated:false,production_run_id_generated:false,
  safe_to_append:false,safe_to_retire_overlays:false,identity_fix_overlay_in_scope:false,
  candidate_count:provenanceCandidates.length,
  stage_a:{
    purpose:'sources + factual fields + resolved precision/narrowing + generated source binding/admin metadata',
    strict_preview_status:strictPreviewStatus,operation_templates:operationTemplates.length,fixed_value_operations:fixedOps,
    runtime_date_operations:runtimeDateOps,source_appends:sourceAppends.length,source_union_operations:sourceUnionOps,
    provenance_granularity_operations:provenanceOps,synthetic_run_id_used_for_validation:syntheticRunId,
    synthetic_only:true,ready_for_real_append:false
  },
  stage_b:{
    purpose:'native Intelligence v1 objectization before overlay retirement',candidate_count:analyticalCandidates.length,
    gap_candidates:analyticalGap,assessment_or_limitation_candidates:analyticalAssessment,
    production_intelligence_ids_generated:false,ready_for_real_append:false
  },
  no_write:{candidate_count:noWriteCandidates.length,legacy_metadata_drops:noWriteLegacy,absence_sentinel_omissions:noWriteAbsence},
  unresolved_error_count:errors.length,errors,
  operation_templates:operationTemplates,source_appends:sourceAppends,analytical_candidates:analyticalCandidates,no_write_candidates:noWriteCandidates,decisions
};
writeFileSync(join(dist,'overlay-production-migration-preview.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.4 production migration preview','',
  `Generated: ${output.generated_at}`,
  `Current canonical run: **${output.current_run_id}**`,
  `Status: **${output.status}**`,'',
  'This is a read-only production migration preview. It resolves the v4.5.3 candidate classes into staged future actions and validates Stage A through the production strict materializer entirely in memory. It does not create operation IDs, a production run ID, a run file or a manifest entry.','',
  '## Stage A — factual/source migration template','',
  `- Strict in-memory validation: **${strictPreviewStatus}**`,
  `- Future operation templates: **${operationTemplates.length}**`,
  `- Fixed-value templates: **${fixedOps}**`,
  `- Values generated only at real run time: **${runtimeDateOps}**`,
  `- New reviewed source definitions: **${sourceAppends.length}**`,
  `- Source-ID union operations preserving earlier canonical sources: **${sourceUnionOps}**`,
  `- Claim-level provenance metadata operations: **${provenanceOps}**`,'',
  '## Stage B — Intelligence v1','',
  `- Analytical candidates: **${analyticalCandidates.length}**`,
  `- Intelligence-gap candidates: **${analyticalGap}**`,
  `- Assessment / limitation candidates: **${analyticalAssessment}**`,
  '- Production Intelligence v1 IDs are intentionally not generated in this slice. Each future object still needs required supporting evidence/source bindings under the Intelligence v1 contract.','',
  '## Explicit no-write decisions','',
  `- Total: **${noWriteCandidates.length}**`,
  `- Legacy presentation/migration metadata dropped: **${noWriteLegacy}**`,
  `- Absence sentinel omitted from factual storage: **${noWriteAbsence}**`,'',
  '## Resolved special cases','',
  ...Object.entries(special).map(([key,value])=>`- \`${key}\` → **${value.resolution}**${Object.prototype.hasOwnProperty.call(value,'final_value')?` → \`${typeof value.final_value==='string'?value.final_value:JSON.stringify(value.final_value)}\``:''}`),'',
  '## Safety / next gate','',
  '- `safe_to_append = false`',
  '- `safe_to_retire_overlays = false`',
  '- The identity-fix overlay remains out of scope.',
  '- A real factual append can be prepared only in a separate reviewed slice that assigns the actual run date/run ID/operation IDs and re-validates the exact patch.',
  '- Overlay retirement still requires native analytical preservation plus a post-append zero-mutation/public-output comparison strategy.','',
  '## Errors','',
  ...(errors.length?errors.map(value=>`- ${value}`):['- None'])
].join('\n');
writeFileSync(join(dist,'overlay-production-migration-preview.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_production_preview=${pass?'pass':'fail'}\noverlay_production_preview_candidates=${provenanceCandidates.length}\noverlay_production_preview_stage_a_ops=${operationTemplates.length}\noverlay_production_preview_stage_a_sources=${sourceAppends.length}\noverlay_production_preview_stage_a_strict=${strictPreviewStatus.toLowerCase()}\noverlay_production_preview_stage_b_intelligence=${analyticalCandidates.length}\noverlay_production_preview_stage_b_gaps=${analyticalGap}\noverlay_production_preview_stage_b_assessments=${analyticalAssessment}\noverlay_production_preview_no_write=${noWriteCandidates.length}\noverlay_production_preview_unresolved_errors=${errors.length}\noverlay_production_preview_safe_to_append=0\noverlay_production_preview_safe_to_retire=0\noverlay_production_preview_canonical_writes=0\n`,'utf8');
console.log(`Overlay production preview ${output.status}: candidates=${provenanceCandidates.length}; stageA-ops=${operationTemplates.length}; sources=${sourceAppends.length}; strict=${strictPreviewStatus}; intelligence=${analyticalCandidates.length} (${analyticalGap} gaps/${analyticalAssessment} assessments); no-write=${noWriteCandidates.length}; errors=${errors.length}; safe-to-append=NO`);
if(!pass)throw new Error(`OVERLAY_PRODUCTION_PREVIEW failed with ${errors.length} error(s)`);
