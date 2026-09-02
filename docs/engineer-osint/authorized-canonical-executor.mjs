import {createHash} from 'node:crypto';
import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalize,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalDigest,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';

const ROOT='docs/engineer-osint';
const REQUEST_ROOT=`${ROOT}/canonical-execution-requests`;
const APPEND_RUN=`${ROOT}/append-run.mjs`;
const REQUEST_SCHEMA='engineer-osint-canonical-execution-request-v1';
const sha256=(buf)=>createHash('sha256').update(buf).digest('hex');
const gitBlobSha=(buf)=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`),buf])).digest('hex');
const same=(a,b)=>normalize(a)===normalize(b);
const safeRepoPath=(value,label,{request=false}={})=>{
  const prefix=request?`${REQUEST_ROOT}/`:`${ROOT}/`;
  if(typeof value!=='string'||!value.startsWith(prefix))throw new Error(`${label} must stay under ${prefix}`);
  const root=resolve(request?REQUEST_ROOT:ROOT),candidate=resolve(value);
  if(candidate!==root&&!candidate.startsWith(`${root}${sep}`))throw new Error(`${label} escapes ${root}`);
  return value;
};
const exactIds=(items,key='id')=>(items||[]).map((item)=>item?.[key]);
const expectOptionalCount=(authorization,key,actual,label)=>{
  if(authorization[key]!==undefined&&actual!==authorization[key])throw new Error(`${label} count mismatch`);
};
const expectOptionalIds=(authorization,key,actual,label)=>{
  if(authorization[key]!==undefined&&JSON.stringify(actual)!==JSON.stringify(authorization[key]))throw new Error(`${label} exact ID scope mismatch`);
};
const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',...options}).trim();
const gitBytes=(args)=>execFileSync('git',args);
const sorted=(items)=>[...items].sort();
const assertExactSet=(actual,expected,label)=>{
  if(JSON.stringify(sorted(actual))!==JSON.stringify(sorted(expected)))throw new Error(`${label} scope mismatch: ${JSON.stringify(actual)}`);
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

function assertBaseFileUnchanged(baseSha,path,label){
  const baseBytes=gitBytes(['show',`${baseSha}:${path}`]);
  const current=readFileSync(path);
  if(!baseBytes.equals(current))throw new Error(`${label} differs from the reviewed base-main file`);
}

function validateLifecycleSuccessor(authorization,{executed=false}={}){
  const lifecycle=authorization.photo_review_status_successor;
  if(!lifecycle)return null;
  safeRepoPath(lifecycle.source_path,'lifecycle source path');
  safeRepoPath(lifecycle.successor_path,'lifecycle successor path');
  const sourceBytes=readFileSync(lifecycle.source_path),successorBytes=readFileSync(lifecycle.successor_path);
  if(lifecycle.successor_sha256&&sha256(successorBytes)!==lifecycle.successor_sha256)throw new Error('Lifecycle successor SHA-256 drift');
  if(lifecycle.successor_git_blob_sha&&gitBlobSha(successorBytes)!==lifecycle.successor_git_blob_sha)throw new Error('Lifecycle successor Git blob drift');
  if(executed){
    if(!sourceBytes.equals(successorBytes))throw new Error('Executed lifecycle source does not equal the exact authorized successor');
  }else{
    if(lifecycle.source_sha256&&sha256(sourceBytes)!==lifecycle.source_sha256)throw new Error('Lifecycle source SHA-256 drift');
    if(lifecycle.source_git_blob_sha&&gitBlobSha(sourceBytes)!==lifecycle.source_git_blob_sha)throw new Error('Lifecycle source Git blob drift');
  }
  if(authorization.authorization?.apply_exact_photo_review_status_successor!==true)throw new Error('Lifecycle successor is not explicitly authorized');
  if(authorization.authorization?.allow_photo_status_other_than_exact_successor!==false)throw new Error('Lifecycle authorization allows an unsafe alternative successor');
  return lifecycle;
}

function expectedExecutionFiles(requestPath,authorization){
  const runPath=`${ROOT}/data/runs/${authorization.candidate_run_id}.json`;
  const files=[requestPath,`${ROOT}/data/run-store-manifest.json`,runPath];
  if(authorization.photo_review_status_successor)files.push(authorization.photo_review_status_successor.source_path);
  return files;
}

export function executeAuthorizedCanonicalRequest(requestPath,{env=process.env}={}){
  safeRepoPath(requestPath,'execution request path',{request:true});
  const request=parseJsonStrict(readFileSync(requestPath,'utf8'),{source:'canonical execution request'});
  if(request.schema_version!==REQUEST_SCHEMA)throw new Error('Canonical execution request schema mismatch');
  if(!['READY_FOR_EXECUTION','EXECUTED'].includes(request.status))throw new Error(`Unsupported execution request status ${request.status}`);
  safeRepoPath(request.authorization_path,'request authorization path');
  safeRepoPath(request.candidate_path,'request candidate path');

  const repository=env.ENGINEER_OSINT_REPOSITORY,headRepository=env.ENGINEER_OSINT_HEAD_REPOSITORY;
  const headRef=env.ENGINEER_OSINT_HEAD_REF,baseSha=env.ENGINEER_OSINT_BASE_SHA;
  if(!repository||headRepository!==repository)throw new Error('Canonical executor accepts same-repository pull requests only');
  if(!headRef||headRef==='main')throw new Error('Canonical executor refuses direct main execution');
  if(!baseSha||request.expected_base_sha!==baseSha)throw new Error('Execution request base SHA differs from pull-request base SHA');
  const currentMain=git(['rev-parse','origin/main']);
  if(currentMain!==baseSha)throw new Error(`Base main moved: expected ${baseSha}, current origin/main ${currentMain}`);

  assertBaseFileUnchanged(baseSha,request.authorization_path,'Authorization');
  assertBaseFileUnchanged(baseSha,request.candidate_path,'Candidate');
  const authorization=parseJsonStrict(readFileSync(request.authorization_path,'utf8'),{source:'execution authorization'});
  const patch=parseJsonStrict(readFileSync(request.candidate_path,'utf8'),{source:'execution candidate'});
  validatePatchOperations(patch);
  if(authorization.candidate_path&&!same(authorization.candidate_path,request.candidate_path))throw new Error('Request candidate path is not the authorized candidate path');
  if(authorization.candidate_run_id!==patch.state?.run_id)throw new Error('Request candidate run is not the authorized run');

  const store=loadCanonicalRunStore({root:ROOT});
  const alreadyExecuted=request.status==='EXECUTED';
  if(!alreadyExecuted&&(store.report.current_run_id!==authorization.expected_parent_run_id||store.report.canonical_sha256!==authorization.expected_parent_canonical_sha256))throw new Error('Current canonical parent drifted from authorization');
  const result=alreadyExecuted?null:applyStrictPatchToCanonicalData(store.data,patch);
  const normalized=JSON.stringify(patch,null,2)+'\n';
  const entry=alreadyExecuted?{
    run_id:authorization.candidate_run_id,
    parent_run_id:authorization.expected_parent_run_id,
    parent_canonical_sha256:authorization.expected_parent_canonical_sha256,
    path:`data/runs/${authorization.candidate_run_id}.json`,
    file_sha256:authorization.exact_candidate_file_sha256,
    canonical_sha256:authorization.expected_resulting_canonical_sha256
  }:{
    run_id:patch.state.run_id,
    parent_run_id:store.report.current_run_id,
    parent_canonical_sha256:store.report.canonical_sha256,
    path:`data/runs/${patch.state.run_id}.json`,
    file_sha256:sha256Text(normalized),
    canonical_sha256:canonicalDigest(result)
  };
  loadAndValidateGenericAppendAuthorization({authorizationPath:request.authorization_path,input:request.candidate_path,patch,entry});
  const lifecycle=validateLifecycleSuccessor(authorization,{executed:alreadyExecuted});
  const allowed=expectedExecutionFiles(requestPath,authorization);
  const committedDiff=git(['diff','--name-only',`${baseSha}...HEAD`]).split('\n').filter(Boolean);

  if(alreadyExecuted){
    assertExactSet(committedDiff,allowed,'Executed request committed');
    const verified=loadCanonicalRunStore({root:ROOT});
    if(verified.report.current_run_id!==authorization.candidate_run_id||verified.report.canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('Executed request canonical state no longer matches authorization');
    return {status:'VERIFIED_ALREADY_EXECUTED',run_id:authorization.candidate_run_id,canonical_sha256:authorization.expected_resulting_canonical_sha256,allowed_files:allowed};
  }

  assertExactSet(committedDiff,[requestPath],'Ready request initial committed');
  execFileSync(process.execPath,[APPEND_RUN,request.candidate_path,'--write','--authorization',request.authorization_path],{stdio:'inherit'});
  if(lifecycle)copyFileSync(lifecycle.successor_path,lifecycle.source_path);
  const verified=loadCanonicalRunStore({root:ROOT});
  if(verified.report.current_run_id!==authorization.candidate_run_id||verified.report.canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('Post-execution canonical verification failed');
  const successor={...request,status:'EXECUTED',executed_run_id:authorization.candidate_run_id,resulting_canonical_sha256:authorization.expected_resulting_canonical_sha256,execution_base_sha:baseSha};
  writeFileSync(requestPath,JSON.stringify(successor,null,2)+'\n','utf8');
  const working=git(['status','--porcelain']).split('\n').filter(Boolean).map((line)=>line.slice(3));
  const expectedWorking=allowed;
  assertExactSet(working,expectedWorking,'Executor working-tree');
  return {status:'EXECUTED',run_id:authorization.candidate_run_id,canonical_sha256:authorization.expected_resulting_canonical_sha256,allowed_files:allowed};
}

export const authorizedExecutorHash={sha256,gitBlobSha};

if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  const requestPath=process.argv[2];
  if(!requestPath)throw new Error(`Usage: node ${ROOT}/authorized-canonical-executor.mjs ${REQUEST_ROOT}/<request>.json`);
  console.log(JSON.stringify(executeAuthorizedCanonicalRequest(requestPath),null,2));
}
