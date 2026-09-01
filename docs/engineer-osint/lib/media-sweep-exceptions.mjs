import {createHash} from 'node:crypto';

const REGISTRY_SCHEMA='engineer-osint-media-sweep-exceptions-v2';
const RESOLVED_STATUSES={
  ZERO_DELTA:'MISSING_WAIVED_PINNED_ZERO_DELTA',
  NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_NO_MEDIA_ADDITION',
  MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_MIGRATION_NO_MEDIA_ADDITION',
  INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION',
  INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION',
  IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION'
};
const EXPLICIT_STATUSES=new Set([
  'COMPLETE_NO_CANONICAL_MEDIA_ADDITION',
  'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION'
]);
const ELIGIBLE_RUNS=new Map([
  ['engineer-osint-20260825-B72',{attestationBasis:'DRIVE_REPORT',reportDriveId:'1fVtgCE2qMDw7tGIOdEGqHoiKdDGiqDuV',waiverScope:'ZERO_DELTA'}],
  ['engineer-osint-20260825-B73',{attestationBasis:'DRIVE_REPORT',reportDriveId:'1sbw2oAoeD2999qQrI3F0VvHIJTdu3r3n',waiverScope:'NO_MEDIA_ADDITION'}],
  ['engineer-osint-20260825-B74',{attestationBasis:'DRIVE_REPORT',reportDriveId:'1gH3xYPSSeY-eEIieDQ6pUCq7m30fiACx',waiverScope:'NO_MEDIA_ADDITION'}],
  ['engineer-osint-20260829-B96',{attestationBasis:'REPOSITORY_REVIEWED_MIGRATION',attestationReference:'V4511_B96_APPEND_AUTHORIZATION+V4513_B96_PUBLICATION',waiverScope:'MIGRATION_NO_MEDIA_ADDITION'}],
  ['engineer-osint-20260830-B97',{attestationBasis:'REPOSITORY_REVIEWED_MIGRATION',attestationReference:'V4517_B97_READINESS',waiverScope:'INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION'}],
  ['engineer-osint-20260830-B98',{attestationBasis:'REPOSITORY_REVIEWED_MIGRATION',attestationReference:'V4524_B98_READINESS+V4525_B98_POST_CI_READINESS',waiverScope:'INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION'}],
  ['engineer-osint-20260830-B99',{attestationBasis:'REPOSITORY_REVIEWED_MIGRATION',attestationReference:'V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS+V4537_B99_LIFECYCLE+V4538_B99_PAGES_READINESS',waiverScope:'IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION'}],
  ['engineer-osint-20260902-B100',{attestationBasis:'REPOSITORY_REVIEWED_PUBLICATION',attestationReference:'V4592_B100_PUBLICATION_CANDIDATE+V4593_B100_APPEND_AUTHORIZATION+V4594_B100_EXECUTION',waiverScope:'NO_MEDIA_ADDITION'}]
]);
const HASH=/^[a-f0-9]{64}$/;
const ALLOWED=new Set([
  'exception_id','run_id','parent_run_id','attestation_basis','attestation_reference',
  'source_drive_raw_file_sha256','source_transport_normalization',
  'repository_file_sha256','repository_canonical_sha256','report_drive_id','report_text_sha256',
  'report_snapshot_path','omitted_field','resolved_status','waiver_scope','rationale'
]);

const fail=message=>{throw new Error(`Invalid media-sweep exception: ${message}`)};
const asArray=value=>Array.isArray(value)?value:[];
const sha256=text=>createHash('sha256').update(text).digest('hex');

export function validateMediaSweepExceptionRegistry(registry){
  if(!registry||registry.schema_version!==REGISTRY_SCHEMA)fail('unsupported registry schema');
  for(const key of Object.keys(registry))if(!['schema_version','exceptions'].includes(key))fail(`registry contains unsupported field ${key}`);
  if(!Array.isArray(registry.exceptions))fail('exceptions must be an array');
  const ids=new Set(),runs=new Set();
  for(const item of registry.exceptions){
    if(!item||typeof item!=='object'||Array.isArray(item))fail('each entry must be an object');
    for(const key of Object.keys(item))if(!ALLOWED.has(key))fail(`${item.exception_id||'UNKNOWN'} contains unsupported field ${key}`);
    for(const field of ['exception_id','run_id','parent_run_id','attestation_basis','report_snapshot_path','rationale']){
      if(typeof item[field]!=='string'||!item[field].trim())fail(`${item.exception_id||'UNKNOWN'} is missing ${field}`);
    }
    for(const field of ['repository_file_sha256','repository_canonical_sha256','report_text_sha256']){
      if(!HASH.test(item[field]||''))fail(`${item.exception_id} has invalid ${field}`);
    }
    if(item.omitted_field!=='qa.multimedia_status')fail(`${item.exception_id} may only attest qa.multimedia_status`);
    if(item.resolved_status!==RESOLVED_STATUSES[item.waiver_scope])fail(`${item.exception_id} has unsupported resolved_status`);
    const eligibility=ELIGIBLE_RUNS.get(item.run_id);
    if(!eligibility||eligibility.attestationBasis!==item.attestation_basis||eligibility.waiverScope!==item.waiver_scope)fail(`${item.exception_id} is not an approved one-run attestation`);
    if(item.attestation_basis==='DRIVE_REPORT'){
      for(const field of ['report_drive_id','source_drive_raw_file_sha256','source_transport_normalization']){
        if(typeof item[field]!=='string'||!item[field].trim())fail(`${item.exception_id} is missing ${field}`);
      }
      if(!HASH.test(item.source_drive_raw_file_sha256))fail(`${item.exception_id} has invalid source_drive_raw_file_sha256`);
      if(!['IDENTITY','APPEND_SINGLE_LF'].includes(item.source_transport_normalization))fail(`${item.exception_id} has unsupported source_transport_normalization`);
      if(eligibility.reportDriveId!==item.report_drive_id)fail(`${item.exception_id} is not an approved one-run attestation`);
      if(item.attestation_reference!==undefined)fail(`${item.exception_id} DRIVE_REPORT may not set attestation_reference`);
    }else if(['REPOSITORY_REVIEWED_MIGRATION','REPOSITORY_REVIEWED_PUBLICATION'].includes(item.attestation_basis)){
      if(typeof item.attestation_reference!=='string'||item.attestation_reference!==eligibility.attestationReference)fail(`${item.exception_id} repository attestation reference mismatch`);
      for(const field of ['report_drive_id','source_drive_raw_file_sha256','source_transport_normalization'])if(item[field]!==undefined)fail(`${item.exception_id} repository attestation may not use ${field}`);
    }else fail(`${item.exception_id} has unsupported attestation_basis`);
    if(!item.report_snapshot_path.startsWith('data/attestations/')||item.report_snapshot_path.includes('..')||item.report_snapshot_path.includes('\\'))fail(`${item.exception_id} has unsafe report_snapshot_path`);
    if(ids.has(item.exception_id)||runs.has(item.run_id))fail(`duplicate exception identity for ${item.run_id}`);
    ids.add(item.exception_id);runs.add(item.run_id);
  }
  return registry;
}

function hasMediaPayload(patch){
  for(const field of ['new_media','media']){
    if(patch[field]!==undefined&&!Array.isArray(patch[field]))fail(`${field} must be an array when present`);
    if(asArray(patch[field]).length)return true;
  }
  if(patch.multimedia!==undefined&&patch.multimedia!==null)fail('multimedia must be absent for the pinned media-status waiver');
  return false;
}

function ensureOptionalEmptyArray(value,label){
  if(value===undefined)return;
  if(!Array.isArray(value)||value.length)fail(`${label} must be an empty array when present`);
}

function ensureZeroDelta(patch,item){
  const counts=patch?.state?.counts;
  if(!counts||typeof counts!=='object'||Array.isArray(counts)||!Object.keys(counts).length)fail(`${item.exception_id} requires state.counts`);
  if(Object.values(counts).some(value=>typeof value!=='number'||value!==0))fail(`${item.exception_id} requires every declared count to equal zero`);
  for(const field of ['new_records','updated_records','sources','relations','evidence','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned']){
    if(!Array.isArray(patch[field])||patch[field].length)fail(`${item.exception_id} requires empty ${field}`);
  }
  const operations=patch?.extensions?.operations_v1;
  if(operations!==undefined&&!Array.isArray(operations))fail(`${item.exception_id} requires operations_v1 to be an array when present`);
  if(asArray(operations).length)fail(`${item.exception_id} cannot cover correction operations`);
}

function ensureMigrationNoMediaAddition(patch,item){
  if(patch?.continuity?.research_delta_performed!==false)fail(`${item.exception_id} requires research_delta_performed=false`);
  if(patch?.continuity?.migration_scope!=='FIRST_THREE_PINNED_LEGACY_FACTUAL_OVERLAYS_STAGE_A_ONLY')fail(`${item.exception_id} migration scope mismatch`);
  if(patch?.continuity?.stage_b_intelligence_materialization_pending!==true||patch?.continuity?.overlay_retirement_authorized!==false)fail(`${item.exception_id} migration lifecycle flags mismatch`);
  const trueDelta=patch?.true_delta;
  const trueDeltaKeys=['CURRENT_DELTA','LATE_DISCOVERED_CURRENT','HISTORICAL_BACKFILL','ENTITY_ENRICHMENT'];
  if(!trueDelta||Object.keys(trueDelta).length!==trueDeltaKeys.length||trueDeltaKeys.some(key=>trueDelta[key]!==0))fail(`${item.exception_id} requires exact zero true_delta`);
  const counts=patch?.state?.counts;
  if(!counts||counts.CURRENT_DELTA!==0||counts.LATE_DISCOVERED_CURRENT!==0||counts.HISTORICAL_BACKFILL!==0||counts.ENTITY_ENRICHMENT!==0)fail(`${item.exception_id} requires zero factual research delta counts`);
  if(counts.CORRECTION!==104||counts.NEW_SOURCES!==15||counts.NEW_MEDIA!==0||counts.NEW_VISUALS!==0)fail(`${item.exception_id} reviewed Stage A counts mismatch`);
  if(!Array.isArray(patch.sources)||patch.sources.length!==15)fail(`${item.exception_id} requires exactly 15 reviewed source appends`);
  for(const field of ['media','visuals'])if(!Array.isArray(patch[field])||patch[field].length)fail(`${item.exception_id} requires empty ${field}`);
  const operations=patch?.extensions?.operations_v1;
  if(!Array.isArray(operations)||operations.length!==104)fail(`${item.exception_id} requires exactly 104 reviewed correction operations`);
  if(operations.some(operation=>['media','media_registry'].includes(operation?.collection)))fail(`${item.exception_id} cannot cover media correction operations`);
  const visualOps=operations.filter(operation=>['visuals','visual_registry'].includes(operation?.collection)).map(operation=>({
    operation_id:operation.operation_id,op:operation.op,collection:operation.collection,target_id:operation.target_id,field:operation.field,
    value:operation.value,source_ids:operation.source_ids
  }));
  const expectedVisualOps=[
    {operation_id:'ENG-OP-B96-OVL-MIG-064',op:'REPLACE_FIELD',collection:'visuals',target_id:'ENG-VIS-0009',field:'last_verified_date',value:'2026-08-29',source_ids:['RICH-SRC-014','RICH-SRC-015']},
    {operation_id:'ENG-OP-B96-OVL-MIG-065',op:'REPLACE_FIELD',collection:'visuals',target_id:'ENG-VIS-0009',field:'source_ids',value:['RICH-SRC-014','RICH-SRC-015'],source_ids:['RICH-SRC-014','RICH-SRC-015']}
  ];
  if(JSON.stringify(visualOps)!==JSON.stringify(expectedVisualOps))fail(`${item.exception_id} visual migration operations differ from the exact reviewed metadata pair`);
}

function ensureIntelligenceMigrationNoMediaAddition(patch,item){
  ensureZeroDelta(patch,item);
  if(patch?.continuity?.status!=='STAGE_B_GAP_MATERIALIZATION_CANDIDATE_AFTER_REVIEWED_STAGE_A')fail(`${item.exception_id} continuity status mismatch`);
  if(patch?.continuity?.source_stage_a_run_id!=='engineer-osint-20260829-B96'||patch?.continuity?.source_stage_a_canonical_sha256!=='4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5')fail(`${item.exception_id} Stage A lineage mismatch`);
  if(patch?.continuity?.assessment_materialization_status!=='BLOCKED_PENDING_EXPLICIT_EVIDENCE_AND_CURATOR_APPROVAL'||patch?.continuity?.overlay_retirement_authorized!==false)fail(`${item.exception_id} migration lifecycle flags mismatch`);
  const trueDelta=patch?.true_delta;
  const keys=['CURRENT_DELTA','LATE_DISCOVERED_CURRENT','HISTORICAL_BACKFILL','ENTITY_ENRICHMENT'];
  if(!trueDelta||Object.keys(trueDelta).length!==keys.length||keys.some(key=>trueDelta[key]!==0))fail(`${item.exception_id} requires exact zero true_delta`);
  const intel=patch?.extensions?.intelligence_v1;
  if(!intel||!Array.isArray(intel.gaps)||!Array.isArray(intel.assessments)||!Array.isArray(intel.contradictions))fail(`${item.exception_id} requires native Intelligence v1 payload`);
  if(intel.gaps.length!==15||intel.assessments.length!==0||intel.contradictions.length!==0)fail(`${item.exception_id} requires exactly 15 gaps and no assessments/contradictions`);
  const expectedIds=Array.from({length:15},(_,index)=>`ENG-GAP-B97-OVL-${String(index+1).padStart(3,'0')}`);
  if(JSON.stringify(intel.gaps.map(gap=>gap?.gap_id))!==JSON.stringify(expectedIds))fail(`${item.exception_id} native gap identity drift`);
  if(patch?.extensions?.operations_v1!==undefined)fail(`${item.exception_id} cannot cover correction operations`);
}

function ensureIntelligenceAssessmentMigrationNoMediaAddition(patch,item){
  const counts=patch?.state?.counts;
  if(!counts||counts.NEW_EVIDENCE!==2||counts.NEW_MEDIA!==0||counts.NEW_VISUALS!==0)fail(`${item.exception_id} reviewed Stage C counts mismatch`);
  const zeroCountKeys=['CURRENT_DELTA','LATE_DISCOVERED_CURRENT','HISTORICAL_BACKFILL','ENTITY_ENRICHMENT','NEW','UPDATE','CONFIRMATION','CORRECTION','CONTRADICTION','LEAD','NEW_RELATIONS','UPDATED_RELATIONS','UPDATED_EVIDENCE','NEW_SOURCES','UPDATED_SOURCES'];
  if(zeroCountKeys.some(key=>counts[key]!==0))fail(`${item.exception_id} requires zero non-evidence Stage C counts`);
  const trueDelta=patch?.true_delta;
  const keys=['CURRENT_DELTA','LATE_DISCOVERED_CURRENT','HISTORICAL_BACKFILL','ENTITY_ENRICHMENT'];
  if(!trueDelta||Object.keys(trueDelta).length!==keys.length||keys.some(key=>trueDelta[key]!==0))fail(`${item.exception_id} requires exact zero true_delta`);
  if(patch?.continuity?.status!=='ASSESSMENT_EVIDENCE_CANDIDATE_AFTER_PERSISTENT_B97')fail(`${item.exception_id} continuity status mismatch`);
  if(patch?.continuity?.source_stage_b_run_id!=='engineer-osint-20260830-B97'||patch?.continuity?.assessment_scope!=='FOUR_LEGACY_ANALYTICAL_FIELDS_ONLY'||patch?.continuity?.legacy_unsupported_implications_removed!==true||patch?.continuity?.overlay_retirement_authorized!==false)fail(`${item.exception_id} Stage C lifecycle flags mismatch`);
  if(!Array.isArray(patch.evidence)||patch.evidence.length!==2)fail(`${item.exception_id} requires exactly two reviewed evidence objects`);
  for(const field of ['new_records','updated_records','sources','relations','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned'])if(!Array.isArray(patch[field])||patch[field].length)fail(`${item.exception_id} requires empty ${field}`);
  const intel=patch?.extensions?.intelligence_v1;
  if(!intel||!Array.isArray(intel.gaps)||!Array.isArray(intel.assessments)||!Array.isArray(intel.contradictions))fail(`${item.exception_id} requires native Intelligence v1 payload`);
  if(intel.gaps.length!==0||intel.assessments.length!==4||intel.contradictions.length!==0)fail(`${item.exception_id} requires exactly four assessments and no new gaps/contradictions`);
  const expectedIds=Array.from({length:4},(_,index)=>`ENG-ASMT-B98-OVL-${String(index+1).padStart(3,'0')}`);
  if(JSON.stringify(intel.assessments.map(item=>item?.assessment_id))!==JSON.stringify(expectedIds))fail(`${item.exception_id} native assessment identity drift`);
  if(patch.extensions.operations_v1!==undefined)fail(`${item.exception_id} cannot cover correction operations`);
}

function ensureIdentityFixMigrationNoMediaAddition(patch,item){
  const counts=patch?.state?.counts;
  if(!counts||typeof counts!=='object'||Array.isArray(counts))fail(`${item.exception_id} requires state.counts`);
  const expectedCountKeys=['CURRENT_DELTA','LATE_DISCOVERED_CURRENT','HISTORICAL_BACKFILL','ENTITY_ENRICHMENT','NEW','UPDATE','CONFIRMATION','CORRECTION','CONTRADICTION','LEAD','NEW_RELATIONS','UPDATED_RELATIONS','NEW_EVIDENCE','UPDATED_EVIDENCE','NEW_SOURCES','UPDATED_SOURCES','NEW_VISUALS','NEW_MEDIA'];
  if(Object.keys(counts).length!==expectedCountKeys.length||expectedCountKeys.some(key=>!Object.hasOwn(counts,key)))fail(`${item.exception_id} requires exact declared count keys`);
  if(counts.CORRECTION!==36)fail(`${item.exception_id} requires CORRECTION=36`);
  if(expectedCountKeys.filter(key=>key!=='CORRECTION').some(key=>counts[key]!==0))fail(`${item.exception_id} requires every non-correction count to equal zero`);
  const trueDelta=patch?.true_delta;
  const expectedTrueDelta={CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,IDENTITY_CORRECTION_OPERATIONS:36};
  if(JSON.stringify(trueDelta)!==JSON.stringify(expectedTrueDelta))fail(`${item.exception_id} requires exact identity-fix true_delta`);
  for(const field of ['new_records','updated_records','sources','relations','evidence','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned'])if(!Array.isArray(patch[field])||patch[field].length)fail(`${item.exception_id} requires empty ${field}`);
  const operations=patch?.extensions?.operations_v1;
  if(!Array.isArray(operations)||operations.length!==36)fail(`${item.exception_id} requires exactly 36 reviewed correction operations`);
  if(operations.filter(operation=>operation?.op==='REPLACE_FIELD').length!==27||operations.filter(operation=>operation?.op==='REMOVE_FIELD').length!==9)fail(`${item.exception_id} reviewed identity operation mix mismatch`);
  if(operations.some(operation=>['media','media_registry'].includes(operation?.collection)))fail(`${item.exception_id} cannot cover media correction operations`);
  const expectedSyncFields=['record_role','title_cs','title_en','temporal_status','summary_cs','summary_en','source_ids','evidence_ids','timeline_events','confidence','event_date','date_precision','fact_cs','analysis_cs','mine_action_context','secondary_contexts','classification','translation_status'];
  const sync=patch?.extensions?.legacy_mirror_sync_v1?.updated_records;
  if(!Array.isArray(sync)||sync.length!==1||sync[0]?.target_id!=='ENG-TECH-0036'||JSON.stringify(sync[0]?.fields)!==JSON.stringify(expectedSyncFields))fail(`${item.exception_id} exact legacy mirror sync scope mismatch`);
  if(patch?.continuity?.status!=='IDENTITY_FIX_CANONICAL_MIGRATION_CANDIDATE_AFTER_PERSISTENT_B98')fail(`${item.exception_id} continuity status mismatch`);
  if(patch?.continuity?.legacy_mirror_sync_contract!=='V4535_EXPLICIT_FAIL_CLOSED_LEGACY_UPDATED_RECORDS_MIRROR_SYNC'||patch?.continuity?.legacy_mirror_cleanup_required!==false||patch?.continuity?.legacy_mirror_sync_target!=='ENG-TECH-0036'||patch?.continuity?.legacy_mirror_sync_field_count!==18||patch?.continuity?.identity_fix_runtime_removal_authorized!==false)fail(`${item.exception_id} identity migration lifecycle flags mismatch`);
  if(patch?.qa?.mode!=='READ_ONLY_IDENTITY_FIX_MIGRATION_WITH_EXPLICIT_LEGACY_MIRROR_SYNC'||patch?.qa?.canonical_write_performed!==false)fail(`${item.exception_id} identity migration QA scope mismatch`);
}

export function resolvePinnedMultimediaStatus({patch,manifestEntry,repositoryFileRaw,reportSnapshotRaw,registry}){
  validateMediaSweepExceptionRegistry(registry);
  const explicitCandidates=[patch?.qa?.multimedia_status,patch?.qa?.multimedia?.status,patch?.multimedia?.status].filter(value=>value!==undefined&&value!==null);
  if(explicitCandidates.length){
    if(explicitCandidates.some(value=>typeof value!=='string'||!EXPLICIT_STATUSES.has(value)))fail('explicit multimedia status is not a supported enum value');
    if(new Set(explicitCandidates).size!==1)fail('conflicting explicit multimedia status values');
    return {status:explicitCandidates[0],basis:'PATCH_EXPLICIT',exception_id:null};
  }

  const runId=patch?.state?.run_id,parentRunId=patch?.state?.parent_run_id;
  const matches=registry.exceptions.filter(item=>item.run_id===runId);
  if(matches.length!==1)fail(`${runId||'UNKNOWN'} has no unique hash-pinned attestation`);
  const item=matches[0];
  if(item.parent_run_id!==parentRunId)fail(`${item.exception_id} parent mismatch`);
  if(!manifestEntry||manifestEntry.run_id!==runId||manifestEntry.parent_run_id!==parentRunId)fail(`${item.exception_id} manifest identity mismatch`);
  if(manifestEntry.file_sha256!==item.repository_file_sha256)fail(`${item.exception_id} manifest file hash mismatch`);
  if(manifestEntry.canonical_sha256!==item.repository_canonical_sha256)fail(`${item.exception_id} canonical hash mismatch`);
  if(sha256(repositoryFileRaw)!==item.repository_file_sha256)fail(`${item.exception_id} repository file bytes mismatch`);
  if(item.attestation_basis==='DRIVE_REPORT'){
    const sourceNormalized=item.source_transport_normalization==='IDENTITY'?repositoryFileRaw:repositoryFileRaw.endsWith('\n')?repositoryFileRaw.slice(0,-1):null;
    if(sourceNormalized===null||sha256(sourceNormalized)!==item.source_drive_raw_file_sha256)fail(`${item.exception_id} Drive-to-repository normalization mismatch`);
  }
  let parsedRepositoryPatch;
  try{parsedRepositoryPatch=JSON.parse(repositoryFileRaw)}catch{fail(`${item.exception_id} repository file is not valid JSON`)}
  if(JSON.stringify(parsedRepositoryPatch)!==JSON.stringify(patch))fail(`${item.exception_id} patch object does not match the pinned repository bytes`);
  if(sha256(reportSnapshotRaw)!==item.report_text_sha256)fail(`${item.exception_id} report snapshot bytes mismatch`);
  if(Number(patch?.state?.counts?.NEW_MEDIA??patch?.counts?.NEW_MEDIA??0)!==0)fail(`${item.exception_id} requires NEW_MEDIA=0`);
  if(hasMediaPayload(patch))fail(`${item.exception_id} cannot cover a media payload`);
  ensureOptionalEmptyArray(patch?.qa?.worth_watching,'qa.worth_watching');
  ensureOptionalEmptyArray(patch?.qa?.worth_listening,'qa.worth_listening');
  if(item.waiver_scope==='ZERO_DELTA')ensureZeroDelta(patch,item);
  else if(item.waiver_scope==='MIGRATION_NO_MEDIA_ADDITION')ensureMigrationNoMediaAddition(patch,item);
  else if(item.waiver_scope==='INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION')ensureIntelligenceMigrationNoMediaAddition(patch,item);
  else if(item.waiver_scope==='INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION')ensureIntelligenceAssessmentMigrationNoMediaAddition(patch,item);
  else if(item.waiver_scope==='IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION')ensureIdentityFixMigrationNoMediaAddition(patch,item);
  else{
    const operations=patch?.extensions?.operations_v1;
    if(operations!==undefined&&!Array.isArray(operations))fail(`${item.exception_id} requires operations_v1 to be an array when present`);
    if(asArray(operations).some(operation=>operation?.collection==='media'))fail(`${item.exception_id} cannot cover media correction operations`);
  }
  return {status:item.resolved_status,basis:'HASH_PINNED_REPORT_ATTESTATION',exception_id:item.exception_id};
}
