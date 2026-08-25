import {createHash} from 'node:crypto';

const REGISTRY_SCHEMA='engineer-osint-media-sweep-exceptions-v1';
const RESOLVED_STATUS='MISSING_WAIVED_PINNED_ZERO_DELTA';
const EXPLICIT_STATUSES=new Set([
  'COMPLETE_NO_CANONICAL_MEDIA_ADDITION',
  'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION'
]);
const ELIGIBLE_RUNS=new Map([
  ['engineer-osint-20260825-B72','1fVtgCE2qMDw7tGIOdEGqHoiKdDGiqDuV']
]);
const HASH=/^[a-f0-9]{64}$/;
const ALLOWED=new Set([
  'exception_id','run_id','parent_run_id','source_drive_raw_file_sha256',
  'source_transport_normalization',
  'repository_file_sha256','repository_canonical_sha256','report_drive_id','report_text_sha256',
  'report_snapshot_path','omitted_field','resolved_status','rationale'
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
    for(const field of ['exception_id','run_id','parent_run_id','report_drive_id','report_snapshot_path','rationale']){
      if(typeof item[field]!=='string'||!item[field].trim())fail(`${item.exception_id||'UNKNOWN'} is missing ${field}`);
    }
    for(const field of ['source_drive_raw_file_sha256','repository_file_sha256','repository_canonical_sha256','report_text_sha256']){
      if(!HASH.test(item[field]||''))fail(`${item.exception_id} has invalid ${field}`);
    }
    if(item.omitted_field!=='qa.multimedia_status')fail(`${item.exception_id} may only attest qa.multimedia_status`);
    if(item.resolved_status!==RESOLVED_STATUS)fail(`${item.exception_id} has unsupported resolved_status`);
    if(item.source_transport_normalization!=='APPEND_SINGLE_LF')fail(`${item.exception_id} has unsupported source_transport_normalization`);
    if(!ELIGIBLE_RUNS.has(item.run_id)||ELIGIBLE_RUNS.get(item.run_id)!==item.report_drive_id)fail(`${item.exception_id} is not an approved one-run attestation`);
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
  if(patch.multimedia!==undefined&&patch.multimedia!==null)fail('multimedia must be absent for the pinned zero-delta waiver');
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
  if(!repositoryFileRaw.endsWith('\n')||sha256(repositoryFileRaw.slice(0,-1))!==item.source_drive_raw_file_sha256)fail(`${item.exception_id} Drive-to-repository normalization mismatch`);
  let parsedRepositoryPatch;
  try{parsedRepositoryPatch=JSON.parse(repositoryFileRaw)}catch{fail(`${item.exception_id} repository file is not valid JSON`)}
  if(JSON.stringify(parsedRepositoryPatch)!==JSON.stringify(patch))fail(`${item.exception_id} patch object does not match the pinned repository bytes`);
  if(sha256(reportSnapshotRaw)!==item.report_text_sha256)fail(`${item.exception_id} report snapshot bytes mismatch`);
  if(Number(patch?.state?.counts?.NEW_MEDIA??patch?.counts?.NEW_MEDIA??0)!==0)fail(`${item.exception_id} requires NEW_MEDIA=0`);
  if(hasMediaPayload(patch))fail(`${item.exception_id} cannot cover a media payload`);
  ensureOptionalEmptyArray(patch?.qa?.worth_watching,'qa.worth_watching');
  ensureOptionalEmptyArray(patch?.qa?.worth_listening,'qa.worth_listening');
  ensureZeroDelta(patch,item);
  return {status:item.resolved_status,basis:'HASH_PINNED_REPORT_ATTESTATION',exception_id:item.exception_id};
}
