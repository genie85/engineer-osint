import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const preview=parseJsonStrict(readFileSync(join(dist,'overlay-production-migration-preview.json'),'utf8'),{source:'v4.5.4 production preview'});
const policy=parseJsonStrict(readFileSync(join(src,'V455_STAGE_A_CANDIDATE.json'),'utf8'),{source:'v4.5.5 Stage A candidate policy'});
const store=loadCanonicalRunStore({root:src});

if(preview.status!=='PASS'||preview.schema_version!=='engineer-osint-overlay-production-preview-v1')throw new Error('STAGE_A_CANDIDATE: v4.5.4 preview is not PASS');
if(policy.schema_version!=='engineer-osint-stage-a-candidate-policy-v1'||policy.policy!=='EXACT_APPEND_RUN_DRY_RUN_CANDIDATE_NO_WRITE')throw new Error('STAGE_A_CANDIDATE: policy mismatch');
if(store.report.current_run_id!==policy.expected_parent_run_id)throw new Error(`STAGE_A_CANDIDATE stale parent: expected ${policy.expected_parent_run_id}, got ${store.report.current_run_id}`);
if(preview.current_run_id!==policy.expected_parent_run_id)throw new Error('STAGE_A_CANDIDATE: upstream preview parent is stale');
if(preview.canonical_sha256!==store.report.canonical_sha256)throw new Error('STAGE_A_CANDIDATE: upstream preview canonical SHA is stale');
if(JSON.stringify(preview.scope_modules)!==JSON.stringify(policy.scope_modules))throw new Error('STAGE_A_CANDIDATE: scope mismatch');
if(preview.stage_a?.strict_preview_status!=='PASS'||preview.unresolved_error_count!==0)throw new Error('STAGE_A_CANDIDATE: unresolved Stage A preview errors');
if(preview.stage_a?.operation_templates!==policy.expected.operation_count||preview.stage_a?.source_appends!==policy.expected.source_append_count)throw new Error('STAGE_A_CANDIDATE: Stage A count mismatch');
if(preview.stage_b?.candidate_count!==policy.expected.stage_b_intelligence_candidates||preview.no_write?.candidate_count!==policy.expected.explicit_no_write_candidates)throw new Error('STAGE_A_CANDIDATE: downstream debt count mismatch');
for(const [key,value] of Object.entries(policy.safety||{})){
  if(key==='identity_fix_overlay_in_scope'){if(value!==false)throw new Error('STAGE_A_CANDIDATE: identity-fix overlay must remain out of scope');continue;}
  if(value!==false)throw new Error(`STAGE_A_CANDIDATE: unsafe policy flag ${key}`);
}

const operations=preview.operation_templates.map((template,index)=>{
  const operationId=`${policy.operation_id_prefix}${String(index+1).padStart(3,'0')}`;
  const value=template.value_mode==='REAL_APPEND_RUN_DATE'?policy.candidate_run_date:structuredClone(template.value);
  return {
    operation_id:operationId,
    op:'REPLACE_FIELD',
    collection:template.collection,
    target_id:template.target_id,
    field:template.field,
    value,
    reason:`Reviewed legacy-overlay Stage A migration for ${template.collection}:${template.target_id}:${template.field}; resolution=${template.decision}`,
    source_ids:[...template.source_ids]
  };
});
const sources=preview.source_appends.map(item=>structuredClone(item.value));
const counts={
  CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,
  NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:operations.length,CONTRADICTION:0,LEAD:0,
  NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,
  NEW_SOURCES:sources.length,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0
};
const patch={
  schema_version:'engineer-osint-patch-v1',
  state:{
    run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,status:'SUCCESS',
    window_from:policy.window_from,window_to:policy.window_to,counts
  },
  continuity:{
    status:'MIGRATION_CANDIDATE_FROM_VERIFIED_CANONICAL_TIP',
    source_canonical_run_id:policy.expected_parent_run_id,
    source_canonical_sha256:store.report.canonical_sha256,
    migration_scope:'FIRST_THREE_PINNED_LEGACY_FACTUAL_OVERLAYS_STAGE_A_ONLY',
    research_delta_performed:false,
    stage_b_intelligence_materialization_pending:true,
    overlay_retirement_authorized:false
  },
  true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0},
  new_records:[],updated_records:[],sources,relations:[],evidence:[],visuals:[],media:[],technology_signals:[],
  lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{
    status:'REVIEWED_STAGE_A_PATCH_CANDIDATE_ONLY',
    provenance_gate:'PASS',production_preview:'PASS',
    candidate_generated_from:'overlay-production-migration-preview-v1',
    canonical_write_performed:false,append_run_write_flag_used:false,
    safe_to_append:false,safe_to_retire_overlays:false,
    stage_b_intelligence_candidates:preview.stage_b.candidate_count,
    explicit_no_write_candidates:preview.no_write.candidate_count
  },
  extensions:{operations_v1:operations}
};
validatePatchOperations(patch);
applyStrictPatchToCanonicalData(structuredClone(store.data),patch);
const normalized=JSON.stringify(patch,null,2)+'\n';
writeFileSync(join(dist,'overlay-stage-a-patch-candidate.json'),normalized,'utf8');
const meta={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-stage-a-patch-candidate-meta-v1',
  candidate_run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,parent_canonical_sha256:store.report.canonical_sha256,
  operation_count:operations.length,source_append_count:sources.length,stage_b_intelligence_candidates:preview.stage_b.candidate_count,
  explicit_no_write_candidates:preview.no_write.candidate_count,candidate_file_sha256:sha256Text(normalized),
  append_run_dry_run_required:true,append_run_write_flag_allowed:false,canonical_write_performed:false,
  production_operation_ids_generated:true,production_run_id_proposed:true,safe_to_append:false,safe_to_retire_overlays:false
};
writeFileSync(join(dist,'overlay-stage-a-patch-candidate-meta.json'),JSON.stringify(meta,null,2)+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_stage_a_candidate=pass\noverlay_stage_a_candidate_run=${meta.candidate_run_id}\noverlay_stage_a_candidate_parent=${meta.parent_run_id}\noverlay_stage_a_candidate_ops=${meta.operation_count}\noverlay_stage_a_candidate_sources=${meta.source_append_count}\noverlay_stage_a_candidate_stage_b_pending=${meta.stage_b_intelligence_candidates}\noverlay_stage_a_candidate_no_write=${meta.explicit_no_write_candidates}\noverlay_stage_a_candidate_safe_to_append=0\noverlay_stage_a_candidate_safe_to_retire=0\noverlay_stage_a_candidate_canonical_writes=0\n`,'utf8');
console.log(`Stage A patch candidate PASS: run=${meta.candidate_run_id}; parent=${meta.parent_run_id}; ops=${meta.operation_count}; sources=${meta.source_append_count}; file_sha256=${meta.candidate_file_sha256}; safe-to-append=NO`);
