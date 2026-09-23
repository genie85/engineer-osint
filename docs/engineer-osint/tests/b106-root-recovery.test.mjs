import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as api from '../lib/canonical-hardening-successor.mjs';
const S=process.env.B106_EXTERNAL_SOURCE_FIXTURE_DIR;
assert.ok(S&&S.endsWith('/'),'explicit external source fixture directory required');
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const source=new Map(execFileSync('git',['ls-tree','-rz','HEAD'],{cwd:S}).toString().slice(0,-1).split('\0').map(row=>{const [meta,path]=row.split('\t');const [mode,type,id]=meta.split(' ');return [path,{mode,type,raw:readFileSync(S+path)}];}));
const rows=map=>[...map].sort(([a],[b])=>a<b?-1:1).map(([path,f])=>({path,mode:f.mode,type:f.type,blob:blob(f.raw),sha256:sha(f.raw)}));
const inventory=r=>Buffer.from(r.map(f=>`${f.mode} ${f.type} ${f.blob}\t${f.path}`).join('\0')+'\0');
function data(){
 assert.equal(typeof api.createRootInspection,'function','new exact external-fixture inspection API absent');
 const p1=new Map(source),p2=new Map(source);p1.set('docs/engineer-osint/new-root-probe.txt',{mode:'100644',type:'blob',raw:Buffer.from('PR1\n')});p2.set('docs/engineer-osint/new-root-probe.txt',{mode:'100644',type:'blob',raw:Buffer.from('PR2\n')});
 const src=rows(source),targets=[['PR1',p1],['PR2',p2]].map(([name,m])=>{const files=rows(m);return {name,tree:api.rootGitTree(files),inventorySha256:sha(inventory(files)),files};});
 const g={schema:'engineer.b106.external-root-fixture.v1',purpose:'OFFLINE_INSPECTION_ONLY',approved:true,sourceCommit:'1df9875a50d5ad47188d0ba4a262ea11e3e65693',sourceTree:'3537a52a3b291bbc069367a839249c770dc2cd9d',sourceInventorySha256:'99a12425f2550b62957fb031eb34e4905d2523819858e8812d8d96e22020f1c6',source:src,targets,grants:{execution:false,write:false,append:false,merge:false,deploy:false,publish:false}};
 return {g,p1,p2};
}
const encode=g=>JSON.stringify(g,null,2)+'\n';
function make(g){const raw=encode(g);return api.createRootInspection(raw,sha(raw),source);}
test('RED: exact externally granted source/PR1/PR2 inspect without execution authority',()=>{const {g,p1,p2}=data();const ctx=make(g);for(const [name,files] of [['SOURCE',source],['PR1',p1],['PR2',p2]])assert.equal(ctx.verify(files).stage,name);assert.equal(ctx.executionAllowed,false);});
test('missing/unapproved/operational/type-confused grant rejected before use',()=>{const {g}=data();assert.throws(()=>api.createRootInspection(null,null,source));for(const v of [false,0,1,'true',null]){const x=structuredClone(g);x.approved=v;assert.throws(()=>make(x));}for(const key of Object.keys(g.grants))for(const val of [true,1,'false',null]){const x=structuredClone(g);x.grants[key]=val;assert.throws(()=>make(x));}});
test('strict JSON duplicate escaped duplicate canonical schema and trusted pin gates',()=>{const {g}=data();const raw=encode(g);for(const bad of [raw+' ',JSON.stringify(g),raw.replace('{','{"approved":true,'),raw.replace('{','{"\\u0061pproved":true,'),raw+'{}','{'])assert.throws(()=>api.createRootInspection(bad,sha(bad),source));assert.throws(()=>api.createRootInspection(raw,'0'.repeat(64),source));const x={...g,unknown:0};assert.throws(()=>make(x));});
test('stale source commit tree inventory and malformed target tree reject',()=>{const {g}=data();for(const key of ['sourceCommit','sourceTree','sourceInventorySha256']){const x=structuredClone(g);x[key]='0'.repeat(g[key].length);assert.throws(()=>make(x));}const x=structuredClone(g);x.targets[0].tree='0'.repeat(40);assert.throws(()=>make(x));});
test('each byte/path/type/mode/third state/missing/extra and B106 replay rejects',()=>{const {g,p1}=data(),ctx=make(g),p='docs/engineer-osint/new-root-probe.txt';for(const patch of [{raw:Buffer.from('third')},{mode:'100755'},{type:'commit'}]){const m=new Map(p1);m.set(p,{...m.get(p),...patch});assert.throws(()=>ctx.verify(m));}const m=new Map(p1);m.delete('README.md');assert.throws(()=>ctx.verify(m));for(const p of ['unknown','docs/engineer-osint/.hidden-authorization.json','docs/engineer-osint/data/runs/engineer-osint-20260904-B106.json']){const m=new Map(p1);m.set(p,{mode:'100644',type:'blob',raw:Buffer.from('{}')});assert.throws(()=>ctx.verify(m));}});
test('frozen historical JSON cannot become target even with exact fixture digest',()=>{const {g}=data();const row=g.targets[0].files.find(x=>x.path.endsWith('V4697_B106_V4695_AUTHORIZATION_BLOCK.json'));row.sha256='0'.repeat(64);row.blob='0'.repeat(40);g.targets[0].tree=api.rootGitTree(g.targets[0].files);g.targets[0].inventorySha256=sha(inventory(g.targets[0].files));assert.throws(()=>make(g));});
