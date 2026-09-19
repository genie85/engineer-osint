import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as state from '../lib/canonical-hardening-successor.mjs';

const root='docs/engineer-osint/';
const recordPath=root+'GUARD_WORKFLOW_ADDITION_AUTHORIZATION_20260919.json';
const p0Path=root+'CANONICAL_EXECUTOR_HARDENING_20260919.json';
const base='ca19dee75b96a8360fd7457640ee793d6f7ee57f';
const workflow='.github/workflows/safe-automerge-dry-run.yml';
const sha256=raw=>createHash('sha256').update(raw).digest('hex');
const check=(read=readFileSync,list=readdirSync)=>{
  assert.equal(typeof state.assertGuardWorkflowAddition,'function');
  return state.assertGuardWorkflowAddition(read,list);
};
const altered=(path,raw)=>name=>name===path?Buffer.from(raw):readFileSync(name);

test('guard addition pins one exact ninth workflow and preserves the P0 record',()=>{
  const record=check();
  assert.equal(sha256(readFileSync(recordPath)),'9830280f343186e6884399745505d68dc314588c518362ff62d7e5551bc69411');
  assert.equal(sha256(readFileSync(p0Path)),'cefcb81bc4d436be23e4be54ea24e5ee24acbb9f220320794d4cf036eb640601');
  assert.deepEqual(record.authorization,{canonicalExecution:false,mergeAuthorized:false,deployAuthorized:false,wildcardSuccessors:false});
  assert.equal(record.baseWorkflows.length,8);
  assert.equal(record.guardArtifacts.length,3);
  assert.deepEqual(record.exactSuccessors.map(x=>x.path).sort(),[
    root+'lib/canonical-hardening-successor.mjs',
    root+'tests/v4562-active-node24-migration.test.mjs',
  ].sort());
  assert.equal(record.reviewedBase,base);
  assert.equal(record.reviewedGuardHead,'1ab473e8373ee15288f64c823bba29926d2d055c');
});

test('unknown tenth workflow, renamed or missing ninth workflow is rejected',()=>{
  const names=readdirSync('.github/workflows');
  for(const modified of [
    [...names,'unknown.yml'],[...names,'UNKNOWN.YAML'],
    names.filter(x=>x!=='safe-automerge-dry-run.yml'),
    names.map(x=>x==='safe-automerge-dry-run.yml'?'renamed.yml':x),
  ])assert.throws(()=>check(readFileSync,()=>modified),/drift/);
});

test('one changed byte in the ninth workflow, helper or policy is rejected',()=>{
  for(const path of [workflow,'tools/safe_automerge.py','tools/safe-automerge-policy.json']){
    assert.throws(()=>check(altered(path,Buffer.concat([readFileSync(path),Buffer.from('\n')]))),/drift/);
  }
});

test('all eight base workflows retain their exact blobs',()=>{
  const record=JSON.parse(readFileSync(recordPath));
  for(const item of record.baseWorkflows){
    assert.deepEqual(readFileSync(item.path),execFileSync('git',['show',`${base}:${item.path}`]));
    assert.throws(()=>check(altered(item.path,'changed')),/drift/);
  }
});

test('partial helper or inventory successor is rejected without historical fallback',()=>{
  const record=JSON.parse(readFileSync(recordPath));
  for(const item of record.exactSuccessors){
    const previous=execFileSync('git',['show',`${base}:${item.path}`]);
    assert.throws(()=>check(altered(item.path,previous)),/drift/);
    assert.throws(()=>state.assertHardeningState(altered(item.path,previous)),/drift/);
  }
  assert.throws(()=>check(name=>{if(name===recordPath)throw Error('missing addition');return readFileSync(name);}),/missing addition/);
});

test('write permission and authorization escalation are rejected',()=>{
  const text=readFileSync(workflow,'utf8');
  assert.throws(()=>check(altered(workflow,text.replace('contents: read','contents: write'))),/drift/);
  for(const key of ['canonicalExecution','mergeAuthorized','deployAuthorized','wildcardSuccessors']){
    const record=JSON.parse(readFileSync(recordPath));record.authorization[key]=true;
    assert.throws(()=>check(altered(recordPath,JSON.stringify(record))),/drift/);
  }
});

test('unknown or missing successor, wrong source hash and changed scope fail closed',()=>{
  const mutations=[
    r=>r.exactSuccessors.push({...r.exactSuccessors[0],path:'tools/unknown.mjs'}),
    r=>r.exactSuccessors.pop(),
    r=>r.exactSuccessors[0].sourceGitBlob='0'.repeat(40),
    r=>r.guardArtifacts.pop(),
    r=>r.baseWorkflows.pop(),
    r=>r.reviewedBase='0'.repeat(40),
    r=>r.basisRequest='different-request',
    r=>r.bootstrapSelfAuthorization=true,
  ];
  for(const mutate of mutations){
    const record=JSON.parse(readFileSync(recordPath));mutate(record);
    assert.throws(()=>check(altered(recordPath,JSON.stringify(record))),/drift/);
  }
});

test('P0 source pins and all historical authorization bytes remain immutable',()=>{
  const previous=execFileSync('git',['show',`${base}:${p0Path}`]);
  assert.deepEqual(readFileSync(p0Path),previous);
  const p0=JSON.parse(previous);
  for(const item of p0.historicalAuthorizations){
    assert.deepEqual(readFileSync(item.path),execFileSync('git',['show',`${base}:${item.path}`]));
  }
  assert.throws(()=>check(altered(p0Path,'{}')),/drift/);
  assert.equal(state.historicalBlob(root+'tests/v4562-active-node24-migration.test.mjs'),'c1611a3de4b54a17e7ceeb127ca7d3ab271af05f');
});
