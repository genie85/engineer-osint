import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {normalize,resolve,sep} from 'node:path';
import {parseJsonStrict} from './integrity.mjs';

const ROOT='docs/engineer-osint';
const sha256=(buf)=>createHash('sha256').update(buf).digest('hex');
const gitBlobSha=(buf)=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`),buf])).digest('hex');
const same=(a,b)=>normalize(a)===normalize(b);
const safeRepoPath=(value,label)=>{
  if(typeof value!=='string'||!value.startsWith(`${ROOT}/`))throw new Error(`${label} must stay under ${ROOT}/`);
  const root=resolve(ROOT),candidate=resolve(value);
  if(candidate!==root&&!candidate.startsWith(`${root}${sep}`))throw new Error(`${label} escapes ${ROOT}`);
  return value;
};
const exactIds=(items,key='id')=>(items||[]).map((item)=>item?.[key]);
const expectOptionalCount=(authorization,key,actual,label)=>{
  if(authorization[key]!==undefined&&actual!==authorization[key])throw new Error(`${label} count mismatch`);
};
const expectOptionalIds=(authorization,key,actual,label)=>{
  if(authorization[key]!==undefined&&JSON.stringify(actual)!==JSON.stringify(authorization[key]))throw new Error(`${label} exact ID scope mismatch`);
};

export function loadAndValidateGenericAppendAuthorization({authorizationPath,input,patch,entry}){
  safeRepoPath(authorizationPath,'authorization path');
  safeRepoPath(input,'candidate path');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'generic append authorization'});
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`Generic append blocked by authorization status ${authorization.status}`);
  if(authorization.candidate_run_id!==patch.state?.run_id)throw new Error('Generic append authorization run identity mismatch');
  if(authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('Generic append authorization parent run mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('Generic append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('Generic append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('Generic append resulting canonical SHA differs from reviewed authorization');
  if(authorization.candidate_path&&!same(authorization.candidate_path,input))throw new Error('Generic append candidate path differs from reviewed authorization');

  const candidateBytes=readFileSync(input);
  if(authorization.candidate_git_blob_sha&&gitBlobSha(candidateBytes)!==authorization.candidate_git_blob_sha)throw new Error('Generic append candidate Git blob differs from reviewed authorization');

  const scope=authorization.authorization||{};
  if(scope.append_exact_candidate_only!==true||scope.standard_append_run_write_required!==true||scope.one_run_only!==true||scope.isolated_review_branch_required!==true||scope.execution_requires_separate_slice!==true)throw new Error('Generic append authorization is incomplete');
  if(scope.allow_candidate_mutation!==false||scope.allow_manual_manifest_or_hash_edit!==false||scope.allow_future_run_same_slice!==false||scope.allow_canonical_history_rewrite!==false)throw new Error('Generic append authorization scope is unsafe');
  const guardKey=Object.keys(scope).find((key)=>/^install_exact_.+_append_guard_successor$/.test(key));
  if(!guardKey||scope[guardKey]!==true)throw new Error('Generic append authorization lacks exact guard-successor permission');

  const contract=authorization.authorized_guard_successor_contract||{};
  if(contract.guarded_run_id!==patch.state?.run_id||contract.required_status!=='READY_FOR_APPEND'||contract.allow_wildcard_or_current_state_acceptance!==false)throw new Error('Generic append guard successor contract mismatch');
  if(contract.authorization_path&&!same(contract.authorization_path,authorizationPath))throw new Error('Generic append guard authorization path mismatch');
  if(contract.require_exact_candidate_hashes!==true||contract.require_candidate_no_write_flags!==true)throw new Error('Generic append guard exactness contract is incomplete');

  if(patch.continuity?.canonical_write_authorized!==undefined&&patch.continuity.canonical_write_authorized!==false)throw new Error('Frozen candidate canonical self-authorization drifted');
  if(patch.continuity?.publication_write_authorized!==undefined&&patch.continuity.publication_write_authorized!==false)throw new Error('Frozen candidate publication self-authorization drifted');
  if(patch.continuity?.canonical_write_performed!==undefined&&patch.continuity.canonical_write_performed!==false)throw new Error('Frozen candidate canonical no-write state drifted');
  if(patch.continuity?.photo_review_status_successor_applied!==undefined&&patch.continuity.photo_review_status_successor_applied!==false)throw new Error('Frozen candidate lifecycle no-write state drifted');
  if(patch.qa?.canonical_write_performed!==undefined&&patch.qa.canonical_write_performed!==false)throw new Error('Frozen candidate QA no-write state drifted');
  for(const [key,value] of Object.entries(authorization.execution_state||{}))if(value!==false)throw new Error(`Authorization execution_state.${key} must remain false before execution`);

  expectOptionalCount(authorization,'expected_new_record_count',(patch.new_records||[]).length,'new record');
  expectOptionalCount(authorization,'expected_updated_record_count',(patch.updated_records||[]).length,'updated record');
  expectOptionalCount(authorization,'expected_new_source_count',(patch.sources||[]).length,'new source');
  expectOptionalCount(authorization,'expected_new_evidence_count',(patch.evidence||[]).length,'new evidence');
  expectOptionalCount(authorization,'expected_new_relation_count',(patch.relations||[]).length,'new relation');
  expectOptionalCount(authorization,'expected_new_visual_count',(patch.visuals||[]).length,'new visual');
  expectOptionalCount(authorization,'expected_new_media_count',(patch.media||[]).length,'new media');
  expectOptionalIds(authorization,'expected_record_ids',exactIds(patch.new_records),'new record');
  expectOptionalIds(authorization,'expected_card_ids',exactIds(patch.updated_records),'updated card');
  expectOptionalIds(authorization,'expected_source_ids',exactIds(patch.sources),'source');
  expectOptionalIds(authorization,'expected_evidence_ids',exactIds(patch.evidence),'evidence');
  expectOptionalIds(authorization,'expected_visual_ids',exactIds(patch.visuals),'visual');

  for(const local of authorization.local_files||[]){
    safeRepoPath(local.path,'local binary path');
    const bytes=readFileSync(local.path);
    if(local.sha256&&sha256(bytes)!==local.sha256)throw new Error(`${local.card_id||local.path} local SHA-256 drift`);
    if(local.git_blob_sha&&gitBlobSha(bytes)!==local.git_blob_sha)throw new Error(`${local.card_id||local.path} local Git blob drift`);
  }
  const acquisition=authorization.source_acquisition_manifest;
  if(acquisition){
    safeRepoPath(acquisition.path,'acquisition manifest path');
    const bytes=readFileSync(acquisition.path);
    if(acquisition.sha256&&sha256(bytes)!==acquisition.sha256)throw new Error('Acquisition manifest SHA-256 drift');
    if(acquisition.git_blob_sha&&gitBlobSha(bytes)!==acquisition.git_blob_sha)throw new Error('Acquisition manifest Git blob drift');
  }
  return authorization;
}

export function assertGenericAuthorizedAppend({input,patch,entry,argv=process.argv}){
  const index=argv.indexOf('--authorization');
  if(index<0||!argv[index+1])throw new Error('Unrecognized canonical write requires explicit --authorization <path>');
  return loadAndValidateGenericAppendAuthorization({authorizationPath:argv[index+1],input,patch,entry});
}

export const authorizedAppendHash={sha256,gitBlobSha};
