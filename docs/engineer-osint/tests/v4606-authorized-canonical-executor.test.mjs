import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';
import {validateAuthorizationContract,validateAuthorizationPreAppendContract,validateAuthorizationStaticContract,validatePersistedStoreContract} from '../authorized-canonical-executor.mjs';

const root='docs/engineer-osint';
const authPath=`${root}/V4605_CANONICAL_EXECUTOR_AUTHORIZATION.json`;
const historicalB103AuthPath=`${root}/V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const b103AuthPath=`${root}/V4619_B103_PUBLIC_CZ_APPEND_AUTHORIZATION.json`;
const b104AuthPath=`${root}/V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const candidatePath=`${root}/osint-publication-candidates/v4616-b103-local-images-public-cz.json`;
const b103PersistedPath=`${root}/data/runs/engineer-osint-20260902-B103.json`;
const b104PersistedPath=`${root}/data/runs/engineer-osint-20260903-B104.json`;
const workflowPath='.github/workflows/authorized-canonical-executor.yml';
const appendRunPath=`${root}/append-run.mjs`;
const executorPath=`${root}/authorized-canonical-executor.mjs`;
const appendRunRaw=readFileSync(appendRunPath,'utf8');
const executorRaw=readFileSync(executorPath,'utf8');
const workflowRaw=readFileSync(workflowPath,'utf8');
const implementationAuth=JSON.parse(readFileSync(authPath,'utf8'));
const historicalB103Auth=JSON.parse(readFileSync(historicalB103AuthPath,'utf8'));
const b103Auth=JSON.parse(readFileSync(b103AuthPath,'utf8'));
const b104Auth=JSON.parse(readFileSync(b104AuthPath,'utf8'));
const candidateRaw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(candidateRaw);
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const sha256=text=>createHash('sha256').update(text).digest('hex');
const IMPLEMENTED_APPEND_RUN_SHA='376bdf810c47c3bf934d0cadeacff3b1f61e1115';
const B102_RUN_ID='engineer-osint-20260902-B102';
const B102_CANONICAL_SHA='5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91';
const B103_RUN_ID='engineer-osint-20260902-B103';
const B103_CANONICAL_SHA='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const B104_RUN_ID='engineer-osint-20260903-B104';
const B104_CANONICAL_SHA='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';

test('v4.6.06 installs the exact authorized executor surface across the exact B102/B103/B104 lifecycle',()=>{
  assert.equal(implementationAuth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(implementationAuth.authorized_targets.workflow_path,workflowPath);
  assert.equal(implementationAuth.authorized_targets.executor_path,executorPath);
  assert.equal(implementationAuth.authorized_targets.append_run_path,appendRunPath);
  assert.equal(implementationAuth.implementation_authorization.allow_canonical_run_write,false);
  assert.equal(implementationAuth.implementation_authorization.allow_manifest_change,false);
  assert.equal(implementationAuth.implementation_authorization.allow_b103_execution_same_slice,false);
  assert.equal(gitBlobSha(appendRunRaw),IMPLEMENTED_APPEND_RUN_SHA);
  assert.equal(historicalB103Auth.expected_resulting_canonical_sha256,'5c81535081adba0957efa85a15d2dc63cf566e98279e5754a8c0796e0d9f2066');
  assert.equal(b103Auth.expected_resulting_canonical_sha256,B103_CANONICAL_SHA);
  assert.equal(b104Auth.expected_parent_run_id,B103_RUN_ID);
  assert.equal(b104Auth.expected_parent_canonical_sha256,B103_CANONICAL_SHA);
  assert.equal(b104Auth.expected_resulting_canonical_sha256,B104_CANONICAL_SHA);
  const store=loadCanonicalRunStore({root});
  const exactStates=new Map([[B102_RUN_ID,B102_CANONICAL_SHA],[B103_RUN_ID,B103_CANONICAL_SHA],[B104_RUN_ID,B104_CANONICAL_SHA]]);
  assert.ok(exactStates.has(store.report.current_run_id),`unexpected current run ${store.report.current_run_id}`);
  assert.equal(store.report.canonical_sha256,exactStates.get(store.report.current_run_id));
});

test('v4.6.06 validates B103 read-only before append or verifies exact persisted B103 after later exact successors',()=>{
  const store=loadCanonicalRunStore({root});
  if(store.report.current_run_id===B102_RUN_ID){
    const normalizedCandidate=JSON.stringify(candidate,null,2)+'\n';
    const result=validateAuthorizationContract({authorization:b103Auth,candidate,normalizedCandidate,store,authorizationPath:b103AuthPath,candidatePath,runId:b103Auth.candidate_run_id});
    assert.equal(result.resultingCanonical,b103Auth.expected_resulting_canonical_sha256);
    return;
  }
  if(store.report.current_run_id===B104_RUN_ID){
    assert.equal(store.report.canonical_sha256,B104_CANONICAL_SHA);
    assert.equal(b104Auth.expected_parent_run_id,B103_RUN_ID);
    assert.equal(b104Auth.expected_parent_canonical_sha256,B103_CANONICAL_SHA);
  } else {
    assert.equal(store.report.current_run_id,B103_RUN_ID);
    assert.equal(store.report.canonical_sha256,B103_CANONICAL_SHA);
  }
  assert.ok(existsSync(b103PersistedPath),'exact persisted B103 run missing');
  const persistedRaw=readFileSync(b103PersistedPath,'utf8');
  assert.equal(sha256(persistedRaw),b103Auth.exact_candidate_file_sha256);
  assert.deepEqual(JSON.parse(persistedRaw),candidate);
  const entry=store.manifest.runs.find(item=>item.run_id===B103_RUN_ID);
  assert.ok(entry,'B103 manifest entry missing');
  assert.equal(entry.parent_run_id,B102_RUN_ID);
  assert.equal(entry.file_sha256,b103Auth.exact_candidate_file_sha256);
  assert.equal(entry.canonical_sha256,B103_CANONICAL_SHA);
});

test('v4.6.17 separates static authorization, pre-append parent checks and exact persisted rerun verification',()=>{
  const normalizedCandidate=JSON.stringify(candidate,null,2)+'\n';
  assert.doesNotThrow(()=>validateAuthorizationStaticContract({authorization:b103Auth,candidate,normalizedCandidate,authorizationPath:b103AuthPath,candidatePath,runId:B103_RUN_ID}));

  const live=loadCanonicalRunStore({root});
  let persisted;
  if(live.report.current_run_id===B102_RUN_ID){
    persisted={
      report:{...live.report,current_run_id:B103_RUN_ID,canonical_sha256:B103_CANONICAL_SHA},
      manifest:{...structuredClone(live.manifest),runs:[...structuredClone(live.manifest.runs),{run_id:B103_RUN_ID,parent_run_id:B102_RUN_ID,file_sha256:b103Auth.exact_candidate_file_sha256,canonical_sha256:B103_CANONICAL_SHA}]}
    };
  } else {
    if(live.report.current_run_id===B104_RUN_ID)assert.equal(live.report.canonical_sha256,B104_CANONICAL_SHA);
    else {
      assert.equal(live.report.current_run_id,B103_RUN_ID);
      assert.equal(live.report.canonical_sha256,B103_CANONICAL_SHA);
    }
    const b103Index=live.manifest.runs.findIndex(item=>item.run_id===B103_RUN_ID);
    assert.ok(b103Index>=0,'B103 ancestor missing from exact persisted lifecycle');
    persisted={
      report:{...structuredClone(live.report),current_run_id:B103_RUN_ID,canonical_sha256:B103_CANONICAL_SHA},
      manifest:{...structuredClone(live.manifest),runs:structuredClone(live.manifest.runs.slice(0,b103Index+1))}
    };
  }

  assert.throws(()=>validateAuthorizationPreAppendContract({authorization:b103Auth,candidate,store:persisted}),/parent run mismatch/);
  assert.doesNotThrow(()=>validatePersistedStoreContract({authorization:b103Auth,store:persisted,runId:B103_RUN_ID}));

  const wrongParent=structuredClone(persisted);
  wrongParent.manifest.runs.find(item=>item.run_id===B103_RUN_ID).parent_run_id='engineer-osint-invalid-parent';
  assert.throws(()=>validatePersistedStoreContract({authorization:b103Auth,store:wrongParent,runId:B103_RUN_ID}),/manifest parent/);

  const wrongCandidate=structuredClone(persisted);
  wrongCandidate.manifest.runs.find(item=>item.run_id===B103_RUN_ID).file_sha256='0'.repeat(64);
  assert.throws(()=>validatePersistedStoreContract({authorization:b103Auth,store:wrongCandidate,runId:B103_RUN_ID}),/candidate SHA/);

  const wrongCanonical=structuredClone(persisted);
  wrongCanonical.report.canonical_sha256='0'.repeat(64);
  assert.throws(()=>validatePersistedStoreContract({authorization:b103Auth,store:wrongCanonical,runId:B103_RUN_ID}),/canonical head/);

  assert.match(executorRaw,/validateAuthorizationStaticContract\([\s\S]*const alreadyMaterialized=existsSync\(resolve\(repoRoot,runPath\)\)[\s\S]*if\(alreadyMaterialized\)[\s\S]*validateAuthorizationPreAppendContract/);
});

test('v4.6.06 rejects an unrecognized canonical write without explicit authorization before any write',()=>{
  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4606-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    const tempRoot=join(temp,root);
    const tempManifest=join(tempRoot,'data/run-store-manifest.json');
    let reconstructed=loadCanonicalRunStore({root:tempRoot});
    if(reconstructed.report.current_run_id===B104_RUN_ID){
      assert.equal(reconstructed.report.canonical_sha256,B104_CANONICAL_SHA);
      const manifest=JSON.parse(readFileSync(tempManifest,'utf8'));
      const b104Index=manifest.runs.findIndex(item=>item.run_id===B104_RUN_ID);
      assert.equal(b104Index,manifest.runs.length-1,'exact B104 must be the current manifest tip before reconstructing B103 fixture');
      const [entry]=manifest.runs.splice(b104Index,1);
      assert.equal(entry.parent_run_id,B103_RUN_ID);
      assert.equal(entry.parent_canonical_sha256,B103_CANONICAL_SHA);
      assert.equal(entry.file_sha256,b104Auth.exact_candidate_file_sha256);
      assert.equal(entry.canonical_sha256,B104_CANONICAL_SHA);
      writeFileSync(tempManifest,JSON.stringify(manifest,null,2)+'\n');
      rmSync(join(temp,b104PersistedPath),{force:true});
      reconstructed=loadCanonicalRunStore({root:tempRoot});
      assert.equal(reconstructed.report.current_run_id,B103_RUN_ID);
      assert.equal(reconstructed.report.canonical_sha256,B103_CANONICAL_SHA);
    }
    if(reconstructed.report.current_run_id===B103_RUN_ID){
      const manifest=JSON.parse(readFileSync(tempManifest,'utf8'));
      const b103Index=manifest.runs.findIndex(item=>item.run_id===B103_RUN_ID);
      assert.equal(b103Index,manifest.runs.length-1,'exact B103 must be the current manifest tip before reconstructing pre-B103 fixture');
      const [entry]=manifest.runs.splice(b103Index,1);
      assert.equal(entry.parent_run_id,B102_RUN_ID);
      assert.equal(entry.file_sha256,b103Auth.exact_candidate_file_sha256);
      assert.equal(entry.canonical_sha256,B103_CANONICAL_SHA);
      writeFileSync(tempManifest,JSON.stringify(manifest,null,2)+'\n');
      rmSync(join(temp,b103PersistedPath),{force:true});
      reconstructed=loadCanonicalRunStore({root:tempRoot});
      assert.equal(reconstructed.report.current_run_id,B102_RUN_ID);
      assert.equal(reconstructed.report.canonical_sha256,B102_CANONICAL_SHA);
    }
    assert.equal(reconstructed.report.current_run_id,B102_RUN_ID);
    const before=readFileSync(tempManifest,'utf8');
    assert.throws(()=>execFileSync(process.execPath,[`${root}/append-run.mjs`,candidatePath,'--write'],{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe']}),new RegExp(`Explicit append authorization required for unrecognized write run ${B103_RUN_ID}`));
    assert.equal(readFileSync(tempManifest,'utf8'),before);
    assert.equal(requireExists(join(temp,b103PersistedPath)),false);
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});

test('v4.6.06 workflow is same-repository PR-only and cannot merge or target main directly',()=>{
  assert.match(workflowRaw,/\bpull_request:/);
  assert.doesNotMatch(workflowRaw,/pull_request_target/);
  assert.match(workflowRaw,/head\.repo\.full_name == github\.repository/);
  assert.match(workflowRaw,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflowRaw,/contents: write/);
  assert.match(workflowRaw,/canonical-execution-requests\/\*\.json/);
  assert.doesNotMatch(workflowRaw,/merge_pull_request|gh pr merge|git push origin main/);
  assert.match(executorRaw,/Direct main execution is forbidden/);
  assert.match(executorRaw,/same-repository pull requests/);
  assert.match(executorRaw,/--write','--authorization/);
  assert.match(executorRaw,/validate-patch\.mjs/);
  assert.match(executorRaw,/HEAD:\$\{headRef\}/);
});

test('v4.6.14 reads raw porcelain status so leading-space modified paths stay intact',()=>{
  assert.match(executorRaw,/const statusPaths=\(\)=>gitRaw\(\['status','--porcelain=v1'\]\)\.split\('\\n'\)\.filter\(Boolean\)\.map\(line=>line\.slice\(3\)\);/);
  assert.doesNotMatch(executorRaw,/const statusPaths=\(\)=>git\(\['status','--porcelain=v1'\]\)/);
  const parse=line=>line.slice(3);
  assert.equal(parse(' M docs/engineer-osint/data/run-store-manifest.json'),'docs/engineer-osint/data/run-store-manifest.json');
  assert.equal(parse('?? docs/engineer-osint/data/runs/engineer-osint-20260902-B103.json'),'docs/engineer-osint/data/runs/engineer-osint-20260902-B103.json');
});

function requireExists(path){
  try{readFileSync(path);return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}
}
