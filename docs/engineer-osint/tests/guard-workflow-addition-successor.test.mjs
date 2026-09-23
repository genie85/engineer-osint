import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as state from '../lib/canonical-hardening-successor.mjs';

const root='docs/engineer-osint/';
const recordPath=root+'GUARD_WORKFLOW_ADDITION_AUTHORIZATION_20260919.json';
const p0Path=root+'CANONICAL_EXECUTOR_HARDENING_20260919.json';
const base='ca19dee75b96a8360fd7457640ee793d6f7ee57f';
const workflow='.github/workflows/safe-automerge-dry-run.yml';
const sourceFixture=JSON.parse(readFileSync(root+'tests/fixtures/guard-workflow-addition-p0-sources.json'));
const blob=raw=>createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');
const sha256=raw=>createHash('sha256').update(raw).digest('hex');
const check=(read=readFileSync,list=readdirSync)=>{
  assert.equal(typeof state.assertGuardWorkflowAddition,'function');
  return state.assertGuardWorkflowAddition(read,list);
};
const altered=(path,raw)=>name=>name===path?Buffer.from(raw):readFileSync(name);

test('guard addition pins one exact ninth workflow and preserves the P0 record',()=>{
  const record=check();
  assert.equal(record.schemaVersion,'engineer.guard-workflow-addition.v2');
  assert.equal(sha256(readFileSync(recordPath)),'be70cc2b35901a76c6a9a3b52b154eb4ce8a210117c7460db00777ae27e50715');
  assert.equal(sha256(readFileSync(p0Path)),'cefcb81bc4d436be23e4be54ea24e5ee24acbb9f220320794d4cf036eb640601');
  assert.deepEqual(record.authorization,{canonicalExecution:false,mergeAuthorized:false,deployAuthorized:false,wildcardSuccessors:false});
  assert.equal(record.baseWorkflows.length,8);
  assert.equal(record.guardArtifacts.length,3);
  assert.deepEqual(record.exactSuccessors.map(x=>x.path).sort(),[
    root+'lib/canonical-hardening-successor.mjs',
    root+'tests/v4562-active-node24-migration.test.mjs',
    'docs/engineer-osint/tests/v4548-migration-workflow-classification.test.mjs',
    'docs/engineer-osint/tests/v4550-one-shot-workflow-removal.test.mjs',
    'docs/engineer-osint/tests/v4551-readonly-migration-workflow-disposition.test.mjs',
    'docs/engineer-osint/tests/v4552-readonly-workflow-removal-authorization.test.mjs',
    'docs/engineer-osint/tests/v4553-readonly-workflow-removal.test.mjs',
    'docs/engineer-osint/tests/v4554-minimized-workflow-trigger-coverage.test.mjs',
    'docs/engineer-osint/tests/v4555-historical-trigger-manual-only-authorization.test.mjs',
    'docs/engineer-osint/tests/v4556-historical-manual-only-execution.test.mjs',
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
    assert.equal(blob(state.readRootHistoricalEvidence(item.path)),item.gitBlob);
    assert.throws(()=>check(altered(item.path,'changed')),/drift/);
  }
});

test('partial helper or inventory successor is rejected without historical fallback',()=>{
  const record=JSON.parse(readFileSync(recordPath));
  const p0=JSON.parse(readFileSync(p0Path));
  assert.deepEqual(Object.keys(sourceFixture).sort(),[root+'lib/canonical-hardening-successor.mjs',root+'tests/v4562-active-node24-migration.test.mjs'].sort());
  for(const [path,text] of Object.entries(sourceFixture)){
    assert.equal(blob(text),p0.exactSuccessors.find(x=>x.path===path).successorGitBlob);
  }
  for(const item of record.exactSuccessors){
    const previous=sourceFixture[item.path];
    if(previous===undefined){
      // The eight inventory successors have immutable source pins in the helper.
      assert.throws(()=>check(altered(item.path,'partial successor')),/drift/);
      continue;
    }
    assert.equal(blob(previous),item.sourceGitBlob);
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
    r=>r.schemaVersion='engineer.guard-workflow-addition.v1',
  ];
  for(const mutate of mutations){
    const record=JSON.parse(readFileSync(recordPath));mutate(record);
    assert.throws(()=>check(altered(recordPath,JSON.stringify(record))),/drift/);
  }
});

test('P0 source pins and all historical authorization bytes remain immutable',()=>{
  const previous=readFileSync(p0Path);
  assert.equal(sha256(previous),'cefcb81bc4d436be23e4be54ea24e5ee24acbb9f220320794d4cf036eb640601');
  const p0=JSON.parse(previous);
  for(const item of p0.historicalAuthorizations){
    assert.equal(blob(readFileSync(item.path)),item.gitBlob);
  }
  assert.throws(()=>check(altered(p0Path,'{}')),/drift/);
  assert.equal(state.historicalBlob(root+'tests/v4562-active-node24-migration.test.mjs'),'c1611a3de4b54a17e7ceeb127ca7d3ab271af05f');
});

const grantKeys=['canonicalExecution','mergeAuthorized','deployAuthorized','wildcardSuccessors'];
const rejectMutation=mutate=>{
  const record=JSON.parse(readFileSync(recordPath));mutate(record);
  assert.throws(()=>check(altered(recordPath,JSON.stringify(record))),/drift/);
};

for(const key of grantKeys){
  test(`schema rejects misplaced ${key} true and false at every object level`,()=>{
    for(const value of [true,false]){
      rejectMutation(r=>r[key]=value);
      for(const collection of ['baseWorkflows','guardArtifacts','exactSuccessors']){
        rejectMutation(r=>r[collection][0][key]=value);
      }
    }
  });
}

test('schema rejects unknown root, authority aliases and unknown nested keys',()=>{
  for(const key of ['unknown','authority','permissions','merge_authorized','MergeAuthorized','authorizatio\u006eAlias','authorizatiоn','authorization ']){
    for(const select of [r=>r,r=>r.authorization,r=>r.baseWorkflows[0],r=>r.guardArtifacts[0],r=>r.exactSuccessors[0]]){
      rejectMutation(r=>select(r)[key]={mergeAuthorized:true});
    }
  }
});

test('schema rejects missing keys at each object level',()=>{
  const original=JSON.parse(readFileSync(recordPath));
  const selectors=[r=>r,r=>r.authorization,r=>r.baseWorkflows[0],r=>r.guardArtifacts[0],r=>r.exactSuccessors[0]];
  for(const select of selectors){
    for(const key of Object.keys(select(original)))rejectMutation(r=>delete select(r)[key]);
  }
});

test('schema rejects wrong root, collection, item, field and flag types',()=>{
  for(const raw of ['null','[]','false','1','"object"'])assert.throws(()=>check(altered(recordPath,raw)),/drift/);
  for(const wrong of [null,[],{},true,42,'false']){
    rejectMutation(r=>r.authorization=wrong);
    for(const key of grantKeys)rejectMutation(r=>r.authorization[key]=wrong);
    rejectMutation(r=>r.bootstrapSelfAuthorization=wrong);
    for(const collection of ['baseWorkflows','guardArtifacts','exactSuccessors']){
      rejectMutation(r=>r[collection]=wrong);
      rejectMutation(r=>r[collection][0]=wrong);
      rejectMutation(r=>r[collection][0].path=wrong);
      const hash=collection==='exactSuccessors'?'successorGitBlob':'gitBlob';
      rejectMutation(r=>r[collection][0][hash]=wrong);
    }
    for(const key of ['schemaVersion','basisRequest','reviewedBase','reviewedGuardHead','status']){
      rejectMutation(r=>r[key]=wrong);
    }
  }
});

test('schema rejects extra items, duplicate paths and changed expected paths or hashes',()=>{
  for(const collection of ['baseWorkflows','guardArtifacts','exactSuccessors']){
    rejectMutation(r=>r[collection].push({...r[collection][0]}));
    rejectMutation(r=>r[collection][1]={...r[collection][0]});
    rejectMutation(r=>r[collection][0].path='unexpected.yml');
    const hash=collection==='exactSuccessors'?'successorGitBlob':'gitBlob';
    rejectMutation(r=>r[collection][0][hash]='0'.repeat(40));
  }
});

test('schema rejects duplicate raw JSON keys including escaped-equivalent authority names',()=>{
  const raw=readFileSync(recordPath,'utf8');
  const cases=[
    raw.replace('"schemaVersion":','"schemaVersion":"conflicting", "schemaVersion":'),
    raw.replace('"authorization": {','"authorization":{"mergeAuthorized":true}, "authorization": {'),
    raw.replace('"mergeAuthorized": false','"mergeAuthorized":true, "mergeAuthorized": false'),
    raw.replace('"mergeAuthorized": false','"merge\\u0041uthorized":true, "mergeAuthorized": false'),
    raw.replace('"mergeAuthorized": false','"mergeAuthorized":false, "mergeAuthorized": false'),
    raw.replace('"path":','"path":"other", "path":'),
    raw.replace('"gitBlob":','"gitBlob":"wrong", "gitBlob":'),
    raw.replace('"successorGitBlob":','"successorGitBlob":"wrong", "successorGitBlob":'),
  ];
  for(const text of cases)assert.throws(()=>check(altered(recordPath,text)),/drift/);
});


test('historical inventory projection validates the complete current state before returning seven names',()=>{
  assert.equal(typeof state.historicalWorkflowNames,'function');
  assert.deepEqual(state.historicalWorkflowNames(),[
    'first-three-overlay-retirement-regression.yml','i18n-switch-regression.yml',
    'identity-fix-retirement-authorization.yml','identity-fix-retirement-readiness.yml',
    'identity-fix-retirement-regression.yml','pages.yml','runtime-audit-snapshot.yml',
  ]);
  const names=readdirSync('.github/workflows');
  for(const changed of [[...names,'unknown.yml'],names.filter(x=>x!=='safe-automerge-dry-run.yml')]){
    assert.throws(()=>state.historicalWorkflowNames(readFileSync,()=>changed),/drift/);
  }
  assert.throws(()=>state.historicalWorkflowNames(altered(workflow,'changed')),/drift/);
  for(const item of JSON.parse(readFileSync(recordPath)).exactSuccessors){
    assert.throws(()=>state.historicalWorkflowNames(altered(item.path,'changed')),/drift/);
  }
});
