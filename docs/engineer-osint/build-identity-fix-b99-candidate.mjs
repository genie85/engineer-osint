import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {canonicalDigest,deepDiff} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4533_IDENTITY_FIX_CANDIDATE_READINESS.json'),'utf8'));
const readiness=JSON.parse(readFileSync(join(src,'V4531_IDENTITY_FIX_MIGRATION_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`IDENTITY_FIX_B99_CANDIDATE: ${message}`)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const store=loadCanonicalRunStore({root:src});
if(store.report.current_run_id!==policy.expected_parent_run_id)fail(`persistent tip ${store.report.current_run_id} != ${policy.expected_parent_run_id}`);
if(store.report.canonical_sha256!==policy.expected_parent_canonical_sha256)fail('parent canonical SHA drift');
if(readiness.persistent_tip_required!==policy.expected_parent_run_id||readiness.persistent_canonical_sha256_required!==policy.expected_parent_canonical_sha256)fail('v4.5.31 parent anchor drift');

// Recreate the exact read-only v4.5.31 migration map from the current built artifact.
execFileSync(process.execPath,[join(src,'audit-identity-fix-migration-readiness.mjs')],{stdio:'inherit'});
const audit=JSON.parse(readFileSync(join(dist,'identity-fix-migration-readiness.json'),'utf8'));
const map=JSON.parse(readFileSync(join(dist,'overlay-migration-map.json'),'utf8'));
if(audit.status!=='PASS'||audit.current_mutation_count!==policy.expected_overlay_mutations_before)fail('identity readiness audit drift');
if(map.migration_candidate_count!==policy.expected_operation_count||map.operations_v1_candidates!==policy.expected_replace_field_count||map.manual_review_candidates!==policy.expected_remove_field_count)fail('migration candidate counts drift');
if(map.strict_append_candidates!==0||map.source_binding_required_candidates!==0)fail('unexpected append/source-binding scope');
const changedIds=[...new Set(map.candidates.map(item=>item.target_id))].sort();
if(!same(changedIds,[...policy.expected_changed_ids].sort()))fail(`changed ID scope drift: ${changedIds.join(',')}`);

const operations=map.candidates.map((candidate,index)=>{
  const base={
    operation_id:`ENG-OP-B99-IDFIX-${String(index+1).padStart(3,'0')}`,
    collection:candidate.logical_collection,
    target_id:candidate.target_id,
    field:candidate.field,
    reason:`Materialize reviewed identity correction for ${candidate.target_id}.${candidate.field} from the pinned v4.5.31 identity-fix migration map.`,
    source_ids:[...(candidate.source_id_hints||[])]
  };
  if(!base.collection||!base.target_id||!base.field||base.source_ids.length===0)fail(`candidate ${index+1} lacks strict operation provenance`);
  if(candidate.route==='OPERATIONS_V1_REPLACE_FIELD'){
    if(candidate.after_value?.present!==true)fail(`replace candidate ${index+1} has no after value`);
    return {...base,op:'REPLACE_FIELD',value:structuredClone(candidate.after_value.value)};
  }
  if(candidate.route==='FIELD_REMOVAL_MANUAL_MIGRATION_REVIEW'){
    if(candidate.after_value?.present!==false)fail(`remove candidate ${index+1} is not a field removal`);
    return {...base,op:'REMOVE_FIELD'};
  }
  fail(`unsupported migration route ${candidate.route} for ${candidate.target_id}.${candidate.field}`);
});
const replaceCount=operations.filter(item=>item.op==='REPLACE_FIELD').length;
const removeCount=operations.filter(item=>item.op==='REMOVE_FIELD').length;
if(operations.length!==policy.expected_operation_count||replaceCount!==policy.expected_replace_field_count||removeCount!==policy.expected_remove_field_count)fail('generated operation counts drift');

const zeroCounts={CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:operations.length,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0};
const patch={
  schema_version:'engineer-osint-patch-v1',
  state:{
    run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,status:'SUCCESS',
    window_from:'2026-08-30T23:00:00+02:00',window_to:'2026-08-30T23:00:01+02:00',counts:zeroCounts
  },
  continuity:{
    status:'IDENTITY_FIX_CANONICAL_MIGRATION_CANDIDATE_AFTER_PERSISTENT_B98',
    source_readiness_policy:'V4531_IDENTITY_FIX_MIGRATION_READINESS',
    remove_field_contract:'V4532_FAIL_CLOSED_REMOVE_FIELD',
    identity_fix_runtime_removal_authorized:false
  },
  true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,IDENTITY_CORRECTION_OPERATIONS:operations.length},
  new_records:[],updated_records:[],sources:[],relations:[],evidence:[],visuals:[],media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],
  qa:{status:'PASS',mode:'READ_ONLY_IDENTITY_FIX_MIGRATION_CANDIDATE',review_scope:[...policy.expected_changed_ids],canonical_write_performed:false},
  presentation_fact_overlay_gap:'OPEN',
  extensions:{operations_v1:operations}
};

const overlayCode=readFileSync(join(src,readiness.overlay_file),'utf8');
const runOverlay=data=>{
  const resolved=structuredClone(data),context={window:{__ENGINEER_DATA__:resolved},console};
  vm.runInNewContext(overlayCode,context,{filename:readiness.overlay_file,timeout:3000});
  return resolved;
};
const beforeOverlay=runOverlay(store.data);
const overlayMutationsBefore=deepDiff(store.data,beforeOverlay).length;
if(overlayMutationsBefore!==policy.expected_overlay_mutations_before)fail(`pre-candidate overlay mutation count ${overlayMutationsBefore}`);

const result=applyStrictPatchToCanonicalData(store.data,patch);
const afterOverlay=runOverlay(result);
const overlayMutationsAfter=deepDiff(result,afterOverlay).length;
if(overlayMutationsAfter!==policy.expected_overlay_mutations_after)fail(`post-candidate overlay mutation count ${overlayMutationsAfter}`);

const raw=JSON.stringify(patch,null,2)+'\n';
const candidateFileSha=createHash('sha256').update(raw).digest('hex');
const resultingCanonicalSha=canonicalDigest(result);
const candidatePath=join(dist,'identity-fix-b99-candidate.json');
writeFileSync(candidatePath,raw,'utf8');
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-b99-candidate-audit-v1',
  candidate_run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,parent_canonical_sha256:policy.expected_parent_canonical_sha256,
  candidate_file_sha256:candidateFileSha,resulting_canonical_sha256:resultingCanonicalSha,
  operation_count:operations.length,replace_field_count:replaceCount,remove_field_count:removeCount,
  changed_ids:changedIds,overlay_mutations_before:overlayMutationsBefore,overlay_mutations_after:overlayMutationsAfter,
  canonical_write_performed:false,append_run_write_invoked:false,identity_fix_runtime_removal_authorized:false,
  safe_to_append:false,safe_to_retire_identity_fix_overlay:false
};
writeFileSync(join(dist,'identity-fix-b99-candidate-audit.json'),JSON.stringify(report,null,2)+'\n','utf8');
writeFileSync(join(dist,'identity-fix-b99-candidate-audit.md'),`# ENGINEER OSINT v4.5.33 — identity-fix B99 candidate\n\nStatus: **PASS — generated for exact review only**\nCandidate: **${report.candidate_run_id}**\nCandidate SHA-256: \`${candidateFileSha}\`\nResulting canonical SHA-256: \`${resultingCanonicalSha}\`\n\n- operations: **${operations.length}** (${replaceCount} REPLACE_FIELD + ${removeCount} REMOVE_FIELD)\n- identity overlay mutations before candidate: **${overlayMutationsBefore}**\n- identity overlay mutations after candidate: **${overlayMutationsAfter}**\n- canonical writes: **0**\n- append authorization: **false**\n- runtime retirement authorization: **false**\n`,'utf8');
console.log(`IDENTITY_FIX_B99_CANDIDATE=PASS file_sha=${candidateFileSha} canonical_sha=${resultingCanonicalSha} overlay_after=${overlayMutationsAfter}`);
