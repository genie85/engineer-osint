import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertB106GuardState,historicalB106Blob,B106_GUARD_PATH,b106GitInventory,assertHardeningState} from '../lib/canonical-hardening-successor.mjs';
const raw=()=>readFileSync(B106_GUARD_PATH,'utf8');
const record=()=>JSON.parse(raw());
const altered=(path,value)=>name=>name===path?Buffer.from(value):readFileSync(name);
const reject=value=>assert.throws(()=>assertB106GuardState(altered(B106_GUARD_PATH,value)),/drift/);
test('guard phase1 is exact nonexecuting SOURCE or complete validated SUCCESSOR',()=>{
 const state=assertB106GuardState(),a=record();assert.ok(['SOURCE','SUCCESSOR'].includes(state.mode));
 assert.equal(a.status,'GUARD_REVIEWED_NO_EXECUTION');assert.equal(a.implementationVector.length,12);assert.equal(a.phaseOneArtifacts.length,4);
 assert.ok(Object.values(a.grants).every(x=>x===false));assert.equal(a.implementationVector.filter(x=>x.sourceGitBlob==='ABSENT').length,1);
 for(const item of a.implementationVector)assert.equal(historicalB106Blob(item.path),item.sourceGitBlob);
 assert.equal(assertHardeningState().authorization.canonicalExecution,false);
});
test('missing record and unknown narrow historical path fail closed',()=>{
 assert.throws(()=>assertB106GuardState(path=>{if(path===B106_GUARD_PATH){const e=Error('absent');e.code='ENOENT';throw e;}return readFileSync(path);}),/drift/);
 assert.throws(()=>historicalB106Blob('docs/engineer-osint/unknown.mjs'),/unknown historical path/);
});
test('one byte mutation or missing file in every future and phase1 artifact rejects',()=>{
 const a=record();
 for(const item of [...a.implementationVector,...a.phaseOneArtifacts,...a.anchors]){
  let original;try{original=readFileSync(item.path);}catch(e){if(e.code!=='ENOENT')throw e;original=Buffer.alloc(0);}
  assert.throws(()=>assertB106GuardState(altered(item.path,Buffer.concat([original,Buffer.from(' ')]))),/drift/);
  if(item.sourceGitBlob!=='ABSENT'||assertB106GuardState().mode==='SUCCESSOR')assert.throws(()=>assertB106GuardState(path=>{if(path===item.path){const e=Error('missing');e.code='ENOENT';throw e;}return readFileSync(path);}));
 }
});
test('record rejects all recursive unknown missing type and value mutations',()=>{
 const a=record();let n=0;const get=(x,p)=>p.reduce((v,k)=>v[k],x);
 const check=m=>{reject(JSON.stringify(m,null,2)+'\n');n++;};
 function walk(node,path=[]){
  if(node&&typeof node==='object'){
   if(!Array.isArray(node)){let m=structuredClone(a);get(m,path).unknown=false;check(m);for(const k of Object.keys(node)){m=structuredClone(a);delete get(m,path)[k];check(m);}}
   else{const m=structuredClone(a);get(m,path).push(node[0]??null);check(m);}
   for(const [k,v] of Object.entries(node))walk(v,[...path,k]);
  }else for(const value of [null,{},[],true,false,0,1,'*','current','ABSENT']){if(Object.is(value,node))continue;const m=structuredClone(a);get(m,path.slice(0,-1))[path.at(-1)]=value;check(m);}
 }walk(a);assert.ok(n>500);console.log('GUARD_MUTATIONS_REJECTED='+n);
});
test('duplicate escaped duplicate nested duplicate overflow and trailing JSON reject',()=>{
 const text=raw();for(const bad of [text.replace('{','{"status":"bad",'),text.replace('{','{"\\u0073tatus":"bad",'),text.replace('"append": false','"append":false,"append":true'),text.replace('"append": false','"append":1e999'),text+' true']){assert.notEqual(bad,text);reject(bad);}
});
test('additional modified path, extra artifact/record and nineteenth tree entry reject',()=>{
 const inventory=b106GitInventory();
 for(const path of ['docs/engineer-osint/unknown.mjs','docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_3.json','README.md'])assert.throws(()=>assertB106GuardState(readFileSync,()=>({...inventory,changed:[...inventory.changed,path]})),/drift/);
 const tree=Buffer.concat([inventory.tree,Buffer.from('100644 blob '+'0'.repeat(40)+'\tdocs/engineer-osint/unknown.mjs\0')]);assert.throws(()=>assertB106GuardState(readFileSync,()=>({...inventory,tree})),/drift/);
});
