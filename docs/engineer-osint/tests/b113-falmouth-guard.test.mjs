import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {B113,assertRoute,validateStrictB113} from '../append-run.mjs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const authorization=readFileSync(B113.authorization,'utf8');
const candidate=readFileSync(B113.candidate,'utf8');
const store=loadCanonicalRunStore({root:'docs/engineer-osint'});

test('B113 guard accepts only the approved exact bytes and B112 parent',()=>{
 assert.deepEqual(validateStrictB113(authorization,{candidateRaw:candidate,store,resultingCanonical:B113.result_canonical}),{
  valid:true,run:B113.run,outputs:[...B113.outputs],execution_performed:false
 });
 assert.doesNotThrow(()=>assertRoute(B113.run,B113.candidate,B113.authorization));
});

test('B113 guard rejects changed candidate, authorization, parent and result',()=>{
 const input={candidateRaw:candidate,store,resultingCanonical:B113.result_canonical};
 assert.throws(()=>validateStrictB113(authorization.replace('Falmouth','FalmouthX'),input),/authorization bytes drift/);
 assert.throws(()=>validateStrictB113(authorization,{...input,candidateRaw:candidate.replace('Falmouth','FalmouthX')}),/candidate bytes drift/);
 assert.throws(()=>validateStrictB113(authorization,{...input,store:{report:{...store.report,current_run_id:'engineer-osint-20260926-B113'}}}),/parent\/result drift/);
 assert.throws(()=>validateStrictB113(authorization,{...input,resultingCanonical:'0'.repeat(64)}),/parent\/result drift/);
});

test('dispatcher rejects B114, alternate candidate and alternate authorization',()=>{
 assert.throws(()=>assertRoute('engineer-osint-20260929-B114',B113.candidate,B113.authorization),/unknown run\/path/);
 assert.throws(()=>assertRoute(B113.run,'docs/engineer-osint/candidates/other.json',B113.authorization),/rejects B113 path/);
 assert.throws(()=>assertRoute(B113.run,B113.candidate,'docs/engineer-osint/other.json'),/rejects B113 path/);
});
