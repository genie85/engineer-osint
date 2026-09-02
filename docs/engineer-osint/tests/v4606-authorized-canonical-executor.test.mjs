import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';
import {validateAuthorizationContract} from '../authorized-canonical-executor.mjs';

const root='docs/engineer-osint';
const authPath=`${root}/V4605_CANONICAL_EXECUTOR_AUTHORIZATION.json`;
const b103AuthPath=`${root}/V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const candidatePath=`${root}/osint-publication-candidates/v4603-b103-local-images.json`;
const workflowPath='.github/workflows/authorized-canonical-executor.yml';
const appendRunPath=`${root}/append-run.mjs`;
const executorPath=`${root}/authorized-canonical-executor.mjs`;
const appendRunRaw=readFileSync(appendRunPath,'utf8');
const executorRaw=readFileSync(executorPath,'utf8');
const workflowRaw=readFileSync(workflowPath,'utf8');
const implementationAuth=JSON.parse(readFileSync(authPath,'utf8'));
const b103Auth=JSON.parse(readFileSync(b103AuthPath,'utf8'));
const candidateRaw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(candidateRaw);
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const IMPLEMENTED_APPEND_RUN_SHA='376bdf810c47c3bf934d0cadeacff3b1f61e1115';

test('v4.6.06 installs the exact authorized executor surface without canonical execution',()=>{
  assert.equal(implementationAuth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(implementationAuth.authorized_targets.workflow_path,workflowPath);
  assert.equal(implementationAuth.authorized_targets.executor_path,executorPath);
  assert.equal(implementationAuth.authorized_targets.append_run_path,appendRunPath);
  assert.equal(implementationAuth.implementation_authorization.allow_canonical_run_write,false);
  assert.equal(implementationAuth.implementation_authorization.allow_manifest_change,false);
  assert.equal(implementationAuth.implementation_authorization.allow_b103_execution_same_slice,false);
  assert.equal(gitBlobSha(appendRunRaw),IMPLEMENTED_APPEND_RUN_SHA);
  const store=loadCanonicalRunStore({root});
  assert.equal(store.report.current_run_id,'engineer-osint-20260902-B102');
  assert.equal(store.report.canonical_sha256,'5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91');
});

test('v4.6.06 validates the already-reviewed exact B103 authorization read-only',()=>{
  const store=loadCanonicalRunStore({root});
  const normalizedCandidate=JSON.stringify(candidate,null,2)+'\n';
  const result=validateAuthorizationContract({
    authorization:b103Auth,
    candidate,
    normalizedCandidate,
    store,
    authorizationPath:b103AuthPath,
    candidatePath,
    runId:b103Auth.candidate_run_id
  });
  assert.equal(result.resultingCanonical,b103Auth.expected_resulting_canonical_sha256);
});

test('v4.6.06 rejects an unrecognized canonical write without explicit authorization before any write',()=>{
  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4606-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    const tempManifest=join(temp,root,'data/run-store-manifest.json');
    const before=readFileSync(tempManifest,'utf8');
    assert.throws(()=>execFileSync(process.execPath,[
      `${root}/append-run.mjs`,
      `${root}/osint-publication-candidates/v4603-b103-local-images.json`,
      '--write'
    ],{cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe']}),/Explicit append authorization required for unrecognized write run engineer-osint-20260902-B103/);
    assert.equal(readFileSync(tempManifest,'utf8'),before);
    assert.equal(requireExists(join(temp,root,'data/runs/engineer-osint-20260902-B103.json')),false);
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

function requireExists(path){
  try{readFileSync(path);return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}
}
