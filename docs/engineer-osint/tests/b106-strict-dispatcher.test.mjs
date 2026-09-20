import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,symlinkSync,linkSync,renameSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {B106,strictB106Expectation,validateStrictB106,parseAppendCli,strictRepoPath,readStableFile,assertUnchanged} from '../append-run.mjs';
import {loadCanonicalRunStore,applyStrictPatchToCanonicalData} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';
const root='docs/engineer-osint';
const snapshot=dir=>{
 const out={};function visit(at,prefix=''){for(const e of readdirSync(at,{withFileTypes:true})){const p=join(at,e.name),rel=prefix+e.name;if(e.isDirectory())visit(p,rel+'/');else if(e.isFile())out[rel]=createHash('sha256').update(readFileSync(p)).digest('hex');else throw Error('unexpected fixture alias');}}visit(dir);return out;
};
test('attacker B106 authorization and unknown future run reject before staging, real helper',()=>{
 const sourceBefore=snapshot(root),temp=mkdtempSync(join(tmpdir(),'strict-b106-'));
 try{
  const manifest=JSON.parse(readFileSync(root+'/data/run-store-manifest.json','utf8'));
  for(const path of [root+'/append-run.mjs',root+'/lib/integrity.mjs',root+'/lib/run-store.mjs',root+'/lib/canonical-hardening-successor.mjs',root+'/schemas/patch-v1.schema.json',root+'/data/run-store-manifest.json',root+'/'+manifest.snapshot.path,...manifest.runs.map(x=>root+'/'+x.path),B106.candidate]){const dest=join(temp,path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(path,dest);}
  const attackerPath=root+'/attacker.json';writeFileSync(join(temp,attackerPath),JSON.stringify(strictB106Expectation('attacker')));
  for(const future of [false,true]){
   if(future){const c=JSON.parse(readFileSync(join(temp,B106.candidate)));c.state.run_id='engineer-osint-20260905-B107';writeFileSync(join(temp,B106.candidate),JSON.stringify(c));}
   const before=snapshot(temp);
   const r=spawnSync(process.execPath,[root+'/append-run.mjs',B106.candidate,'--write','--authorization',attackerPath],{cwd:temp,encoding:'utf8',timeout:90000});
   assert.equal(r.error,undefined);assert.equal(r.status,1);assert.match(r.stderr,/Strict append dispatcher rejects/);assert.deepEqual(snapshot(temp),before);
  }
 }finally{try{assert.deepEqual(snapshot(root),sourceBefore);}finally{rmSync(temp,{recursive:true,force:true});}}
});
let cached;
const evidence=()=>cached??=(()=>{const candidateRaw=readFileSync(B106.candidate,'utf8'),store=loadCanonicalRunStore();return {candidateRaw,store,readinessRaw:readFileSync(B106.readiness,'utf8'),guardRaw:readFileSync(B106.guard,'utf8'),resultingCanonical:canonicalDigest(applyStrictPatchToCanonicalData(store.data,JSON.parse(candidateRaw)))};})();
test('synthetic exact B106 authorization validates without creating any authorization or run',()=>{
 const before=snapshot(root),e=evidence(),a=strictB106Expectation(e.guardRaw);
 assert.deepEqual(validateStrictB106(JSON.stringify(a),e),{valid:true,run:B106.run,outputs:B106.outputs,execution_performed:false});assert.deepEqual(snapshot(root),before);
});
test('strict authorization rejects recursive unknown missing type and value mutations',()=>{
 const e=evidence(),a=strictB106Expectation(e.guardRaw);let count=0;
 const at=(x,p)=>p.reduce((o,k)=>o[k],x);
 const reject=x=>{assert.throws(()=>validateStrictB106(JSON.stringify(x),e));count++;};
 function walk(node,path=[]){
  if(node&&typeof node==='object'){
   if(!Array.isArray(node)){let m=structuredClone(a);at(m,path).unknown=false;reject(m);for(const k of Object.keys(node)){m=structuredClone(a);delete at(m,path)[k];reject(m);}}
   else {const m=structuredClone(a);at(m,path).push(null);reject(m);}
   for(const [k,v] of Object.entries(node))walk(v,[...path,k]);
  }else for(const v of [null,true,false,0,1,{},[],'*','current']){if(Object.is(v,node))continue;const m=structuredClone(a);at(m,path.slice(0,-1))[path.at(-1)]=v;reject(m);}
 }walk(a);assert.ok(count>300);console.log('STRICT_AUTH_MUTATIONS='+count);
});
test('raw duplicate escaped duplicate overflow and stale/replay inputs reject',()=>{
 const e=evidence(),raw=JSON.stringify(strictB106Expectation(e.guardRaw));
 for(const bad of [raw.replace('{','{"status":"bad",'),raw.replace('{','{"\\u0073tatus":"bad",'),raw.replace('"new_records":0','"new_records":1e999'),raw.replace('"allow_merge":false','"allow_merge":false,"allow_merge":true')]){assert.notEqual(raw,bad);assert.throws(()=>validateStrictB106(bad,e));}
 for(const patch of [{candidateRaw:e.candidateRaw+' '},{readinessRaw:e.readinessRaw+' '},{resultingCanonical:'0'.repeat(64)},{store:{report:{current_run_id:B106.run,canonical_sha256:B106.result_canonical}}}])assert.throws(()=>validateStrictB106(raw,{...e,...patch}));
});
test('CLI and repository path aliases are closed',()=>{
 assert.deepEqual(parseAppendCli([B106.candidate,'--write','--authorization',B106.authorization]),{input:B106.candidate,write:true,authorization:B106.authorization});
 for(const args of [[],[B106.candidate,'--write','--write'],[B106.candidate,'--authorization'],[B106.candidate,'--write','--authorization',B106.authorization,'--authorization',B106.authorization],[B106.candidate,'--unknown'],[B106.candidate,'--authorization',B106.authorization]])assert.throws(()=>parseAppendCli(args));
 for(const path of ['/abs','../x','./x','a//b','a/../b','a\\b','a/','a\0b'])assert.throws(()=>strictRepoPath(path));
});
test('candidate/auth file identity rejects symlink hardlink parent symlink and path swap',()=>{
 const cwd=process.cwd(),temp=mkdtempSync(join(tmpdir(),'strict-identity-'));
 try{
  process.chdir(temp);mkdirSync('docs');writeFileSync('docs/source','one');symlinkSync('source','docs/link');assert.throws(()=>readStableFile('docs/link'));
  linkSync('docs/source','docs/hard');assert.throws(()=>readStableFile('docs/hard'));rmSync('docs/hard');
  symlinkSync('docs','alias');assert.throws(()=>readStableFile('alias/source'));
  const original=readStableFile('docs/source');writeFileSync('docs/replacement','one');renameSync('docs/replacement','docs/source');assert.throws(()=>assertUnchanged(original));
 }finally{process.chdir(cwd);rmSync(temp,{recursive:true,force:true});}
});
