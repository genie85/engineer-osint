import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFileSync,existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,isAbsolute,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';
import {canonicalDigest,parseJsonStrict,sha256Text} from './lib/integrity.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(here,'../..');
const osintRoot='docs/engineer-osint';
const requestPrefix=`${osintRoot}/canonical-execution-requests/`;

const gitRaw=(args,options={})=>execFileSync('git',args,{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options});
const git=(args,options={})=>gitRaw(args,options).trim();
const sha1GitBlob=raw=>createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');
const safeRepoPath=value=>{
  if(typeof value!=='string'||!value||isAbsolute(value)||value.includes('\\')||value.split('/').includes('..'))throw new Error(`Unsafe repository path: ${String(value)}`);
  return value;
};
const readRepo=path=>readFileSync(resolve(repoRoot,safeRepoPath(path)),'utf8');
const readJson=path=>parseJsonStrict(readRepo(path),{source:path});
const readBase=(baseSha,path)=>gitRaw(['show',`${baseSha}:${safeRepoPath(path)}`]);
const assertBaseIdentity=(baseSha,path)=>{
  const current=readRepo(path),base=readBase(baseSha,path);
  if(current!==base)throw new Error(`Protected base file drifted on execution branch: ${path}`);
  return current;
};
const statusPaths=()=>gitRaw(['status','--porcelain=v1']).split('\n').filter(Boolean).map(line=>line.slice(3));

export function validateAuthorizationContract({authorization,candidate,normalizedCandidate,store,authorizationPath,candidatePath,runId}){
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`Authorization is not READY_FOR_APPEND: ${authorization.status}`);
  if(authorization.candidate_run_id!==runId||candidate.state?.run_id!==runId)throw new Error('Authorization/candidate run identity mismatch');
  if(authorization.candidate_path!==candidatePath)throw new Error('Authorization candidate path mismatch');
  if(authorization.expected_parent_run_id!==store.report.current_run_id||candidate.state?.parent_run_id!==store.report.current_run_id)throw new Error('Authorization/candidate parent run mismatch');
  if(authorization.expected_parent_canonical_sha256!==store.report.canonical_sha256)throw new Error('Authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==sha256Text(normalizedCandidate))throw new Error('Authorization candidate SHA256 mismatch');
  if(authorization.candidate_git_blob_sha&&authorization.candidate_git_blob_sha!==sha1GitBlob(readRepo(candidatePath)))throw new Error('Authorization candidate Git blob SHA mismatch');
  validatePatchOperations(candidate);
  const result=applyStrictPatchToCanonicalData(store.data,candidate);
  const resultingCanonical=canonicalDigest(result);
  if(authorization.expected_resulting_canonical_sha256!==resultingCanonical)throw new Error('Authorization resulting canonical SHA mismatch');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true||authorization.authorization?.execution_requires_separate_slice!==true)throw new Error('Authorization does not permit isolated exact standard append execution');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_canonical_history_rewrite!==false)throw new Error('Authorization manual/history protections are incomplete');
  const guard=authorization.authorized_guard_successor_contract;
  if(!guard||guard.guarded_run_id!==runId||guard.authorization_path!==authorizationPath||guard.allow_wildcard_or_current_state_acceptance!==false)throw new Error('Authorization guard successor contract mismatch');
  if(guard.schema_version&&guard.schema_version!==authorization.schema_version)throw new Error('Authorization guard schema mismatch');
  if(guard.required_status&&guard.required_status!==authorization.status)throw new Error('Authorization guard status mismatch');
  return {resultingCanonical};
}

function eventContext(){
  if(process.env.GITHUB_EVENT_NAME!=='pull_request')throw new Error('Authorized canonical executor requires pull_request event');
  const eventPath=process.env.GITHUB_EVENT_PATH;
  if(!eventPath||!existsSync(eventPath))throw new Error('Missing GitHub pull_request event payload');
  const event=parseJsonStrict(readFileSync(eventPath,'utf8'),{source:'GITHUB_EVENT_PATH'});
  const repository=process.env.GITHUB_REPOSITORY||event.repository?.full_name;
  if(!repository||event.pull_request?.head?.repo?.full_name!==repository)throw new Error('Executor is limited to same-repository pull requests');
  if(event.pull_request?.base?.ref!=='main')throw new Error('Executor pull request must target main');
  if(event.pull_request?.head?.ref==='main')throw new Error('Direct main execution is forbidden');
  const baseSha=event.pull_request?.base?.sha;
  const headRef=event.pull_request?.head?.ref;
  if(!baseSha||!headRef)throw new Error('Incomplete pull request base/head identity');
  return {event,repository,baseSha,headRef};
}

function lifecyclePlan(authorization,baseSha){
  const item=authorization.photo_review_status_successor;
  if(!item)return null;
  const sourcePath=safeRepoPath(item.source_path),successorPath=safeRepoPath(item.successor_path);
  const sourceRaw=assertBaseIdentity(baseSha,sourcePath);
  const successorRaw=assertBaseIdentity(baseSha,successorPath);
  if(item.source_git_blob_sha!==sha1GitBlob(sourceRaw)||item.source_sha256!==sha256Text(sourceRaw))throw new Error('Lifecycle source hash mismatch');
  if(item.successor_git_blob_sha!==sha1GitBlob(successorRaw)||item.successor_sha256!==sha256Text(successorRaw))throw new Error('Lifecycle successor hash mismatch');
  if(authorization.authorization?.apply_exact_photo_review_status_successor!==true||authorization.authorization?.allow_photo_status_other_than_exact_successor!==false)throw new Error('Lifecycle successor is not exactly authorized');
  return {sourcePath,successorPath,successorRaw};
}

function verifyPersisted({authorization,runId,lifecycle}){
  const store=loadCanonicalRunStore({root:resolve(repoRoot,osintRoot)});
  if(store.report.current_run_id!==runId||store.report.canonical_sha256!==authorization.expected_resulting_canonical_sha256)throw new Error('Persisted canonical head does not match authorization');
  const runPath=`${osintRoot}/data/runs/${runId}.json`;
  if(!existsSync(resolve(repoRoot,runPath)))throw new Error('Authorized run file is missing');
  if(sha256Text(readRepo(runPath))!==authorization.exact_candidate_file_sha256)throw new Error('Persisted run file SHA mismatch');
  if(lifecycle&&readRepo(lifecycle.sourcePath)!==lifecycle.successorRaw)throw new Error('Persisted lifecycle successor mismatch');
  return {store,runPath};
}

function runPostWriteGates(){
  const testsDir=resolve(repoRoot,`${osintRoot}/tests`);
  const testFiles=readdirSync(testsDir).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>`${osintRoot}/tests/${name}`);
  if(testFiles.length===0)throw new Error('No regression tests found for post-write gate');
  execFileSync(process.execPath,['--test',...testFiles],{cwd:repoRoot,encoding:'utf8',stdio:'inherit'});
  execFileSync(process.execPath,[`${osintRoot}/validate-patch.mjs`],{cwd:repoRoot,encoding:'utf8',stdio:'inherit'});
}

export function executeRequest(requestPath,{execute=false}={}){
  requestPath=safeRepoPath(requestPath);
  if(!requestPath.startsWith(requestPrefix)||!requestPath.endsWith('.json'))throw new Error('Execution request must be a JSON file in canonical-execution-requests');
  const request=readJson(requestPath);
  if(request.schema_version!=='engineer-osint-canonical-execution-request-v1')throw new Error('Unsupported execution request schema');
  const {baseSha,headRef}=eventContext();
  if(request.base_sha!==baseSha)throw new Error(`Stale execution request base SHA: expected ${baseSha}, got ${request.base_sha}`);
  const authorizationPath=safeRepoPath(request.authorization_path),candidatePath=safeRepoPath(request.candidate_path),runId=request.run_id;
  if(!authorizationPath.startsWith(`${osintRoot}/`)||!candidatePath.startsWith(`${osintRoot}/`))throw new Error('Authorization and candidate must live under docs/engineer-osint');
  const authorizationRaw=assertBaseIdentity(baseSha,authorizationPath);
  const candidateRaw=assertBaseIdentity(baseSha,candidatePath);
  const authorization=parseJsonStrict(authorizationRaw,{source:authorizationPath});
  const candidate=parseJsonStrict(candidateRaw,{source:candidatePath});
  const normalizedCandidate=JSON.stringify(candidate,null,2)+'\n';
  const store=loadCanonicalRunStore({root:resolve(repoRoot,osintRoot)});
  validateAuthorizationContract({authorization,candidate,normalizedCandidate,store,authorizationPath,candidatePath,runId});
  const lifecycle=lifecyclePlan(authorization,baseSha);
  const runPath=`${osintRoot}/data/runs/${runId}.json`;
  const expectedChanged=new Set([requestPath,`${osintRoot}/data/run-store-manifest.json`,runPath,...(lifecycle?[lifecycle.sourcePath]:[])]);

  if(existsSync(resolve(repoRoot,runPath))){
    verifyPersisted({authorization,runId,lifecycle});
    const diff=git(['diff','--name-only',`${baseSha}...HEAD`]).split('\n').filter(Boolean);
    for(const path of diff)if(!expectedChanged.has(path))throw new Error(`Execution PR contains unrelated path after materialization: ${path}`);
    return {status:'ALREADY_MATERIALIZED',runId};
  }

  const initialDiff=git(['diff','--name-only',`${baseSha}...HEAD`]).split('\n').filter(Boolean);
  if(initialDiff.length!==1||initialDiff[0]!==requestPath)throw new Error(`Execution request PR must be isolated before write; changed paths: ${initialDiff.join(', ')}`);
  if(!execute)return {status:'VALIDATED',runId};

  execFileSync(process.execPath,[`${osintRoot}/append-run.mjs`,candidatePath,'--write','--authorization',authorizationPath],{cwd:repoRoot,encoding:'utf8',stdio:'inherit'});
  if(lifecycle)copyFileSync(resolve(repoRoot,lifecycle.successorPath),resolve(repoRoot,lifecycle.sourcePath));
  verifyPersisted({authorization,runId,lifecycle});
  runPostWriteGates();

  const dirty=statusPaths();
  const expectedDirty=new Set([`${osintRoot}/data/run-store-manifest.json`,runPath,...(lifecycle?[lifecycle.sourcePath]:[])]);
  for(const path of dirty)if(!expectedDirty.has(path))throw new Error(`Executor produced unrelated working-tree change: ${path}`);
  if(!dirty.includes(runPath)||!dirty.includes(`${osintRoot}/data/run-store-manifest.json`))throw new Error('Executor did not materialize required canonical outputs');

  git(['config','user.name','ENGINEER OSINT canonical executor']);
  git(['config','user.email','actions@users.noreply.github.com']);
  git(['add','--',...dirty]);
  git(['commit','-m',`canonical: execute authorized ${runId}`]);
  git(['push','origin',`HEAD:${headRef}`],{stdio:['ignore','pipe','pipe']});
  return {status:'EXECUTED_TO_PR_HEAD',runId};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const requestPath=process.argv[2];
  if(!requestPath)throw new Error('Usage: node authorized-canonical-executor.mjs <request.json> [--execute]');
  const result=executeRequest(requestPath,{execute:process.argv.includes('--execute')});
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
}
