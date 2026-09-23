import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const api=await import(pathToFileURL(process.cwd()+'/docs/engineer-osint/lib/b106-descendant-inspection.mjs'));
test('descendant API requires an exact closed full vector, never partial pair acceptance',()=>{
 assert.equal(typeof api.validateDescendantVector,'function');
 assert.throws(()=>api.validateDescendantVector(new Map(),'{}'));
});
test('descendant evidence never grants execution and retains B105 source view',()=>{
 const value=api.readDescendantEvidence('.github/workflows/identity-fix-retirement-regression.yml','utf8');
 assert.equal(value.includes("'engineer-osint-20260904-B106':"),false);
 assert.equal(value.includes("'engineer-osint-20260904-B105':"),true);
 assert.throws(()=>api.readDescendantEvidence('../unknown','utf8'));
});

const recordPath='docs/engineer-osint/B106_DESCENDANT_PROPOSAL_20260920.json';
const raw=readFileSync(recordPath,'utf8'),record=JSON.parse(raw);
const src=process.env.B106_EXTERNAL_SOURCE_FIXTURE_DIR;
const mapFor=dir=>new Map(record.vector.map(x=>[x.path,{mode:x.mode,type:x.type,raw:readFileSync(dir+x.path)}]));
test('complete source and successor vectors inspect; all single reversions and prefixes fail',()=>{
 const source=mapFor(src),target=mapFor(process.cwd()+'/');
 assert.equal(api.validateDescendantVector(source,raw).stage,'SOURCE');
 assert.equal(api.validateDescendantVector(target,raw).stage,'SUCCESSOR');
 const changed=record.vector.filter(x=>x.sourceBlob!==x.targetBlob);
 for(const x of changed){const m=new Map(target);m.set(x.path,source.get(x.path));assert.throws(()=>api.validateDescendantVector(m,raw),x.path);}
 for(let n=1;n<changed.length;n++){const m=new Map(target);for(const x of changed.slice(0,n))m.set(x.path,source.get(x.path));assert.throws(()=>api.validateDescendantVector(m,raw));}
 for(let seed=1;seed<=16;seed++){const m=new Map(target);changed.forEach((x,i)=>{if((i+seed)%3===0)m.set(x.path,source.get(x.path));});assert.throws(()=>api.validateDescendantVector(m,raw));}
});
test('missing extra wrong mode/type third bytes reject for every contract member',()=>{
 const target=mapFor(process.cwd()+'/');
 for(const x of record.vector){for(const patch of [{mode:'100755'},{type:'commit'},{raw:Buffer.from('third')}]){const m=new Map(target);m.set(x.path,{...m.get(x.path),...patch});assert.throws(()=>api.validateDescendantVector(m,raw),x.path);}const m=new Map(target);m.delete(x.path);assert.throws(()=>api.validateDescendantVector(m,raw));}
 const m=new Map(target);m.set('unknown',m.values().next().value);assert.throws(()=>api.validateDescendantVector(m,raw));
});
test('noncanonical duplicate stale approval/grant/replay and record confusion rejected',()=>{
 const m=mapFor(process.cwd()+'/');
 for(const x of [raw+' ',raw.replace('{','{"approved":true,'),raw.replace('{','{"\\u0061pproved":true,'),'{}'])assert.throws(()=>api.validateDescendantVector(m,x));
 for(const key of ['sourceCommit','sourceTree','sourceInventorySha256','approved','schema']){const x=structuredClone(record);x[key]=true;assert.throws(()=>api.validateDescendantVector(m,JSON.stringify(x,null,2)+'\n'));}
 for(const k of Object.keys(record.grants)){const x=structuredClone(record);x.grants[k]=true;assert.throws(()=>api.validateDescendantVector(m,JSON.stringify(x,null,2)+'\n'));}
});
