import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertB106CiClosureState,historicalB106CiClosureBlob,B106_CI_CLOSURE_PATH,b106GitInventory,assertB106GuardState} from '../lib/canonical-hardening-successor.mjs';
const raw=()=>readFileSync(B106_CI_CLOSURE_PATH,'utf8');
const record=()=>JSON.parse(raw());
const altered=(path,value)=>name=>name===path?Buffer.from(value):readFileSync(name);
const reject=value=>assert.throws(()=>assertB106CiClosureState(altered(B106_CI_CLOSURE_PATH,value)),/drift/);
test('CI closure validates exactly 17 paths, frozen guard, and zero grants',()=>{
 const s=assertB106CiClosureState(),a=record();assert.ok(['SOURCE','SUCCESSOR'].includes(s.mode));
 assert.equal(a.implementationVector.length,17);assert.ok(Object.values(a.grants).every(x=>x===false));
 assert.equal(a.status,'CI_CLOSURE_REVIEWED_NO_EXECUTION');
 for(const item of a.implementationVector)assert.equal(historicalB106CiClosureBlob(item.path),item.sourceGitBlob);
 const legacy=JSON.parse(readFileSync('docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_20260920.json','utf8'));
 assert.equal(legacy.implementationVector.length,12);assert.equal(legacy.phaseOneArtifacts.length,4);
 assert.equal(assertB106GuardState().mode,s.mode);
 assert.throws(()=>historicalB106CiClosureBlob('README.md'),/unknown historical path/);
});
test('CI closure rejects mutation and removal of every bound file',()=>{
 const a=record();let n=0;
 for(const item of [...a.implementationVector,...a.anchors,...a.artifacts]){
  let original;try{original=readFileSync(item.path);}catch(e){if(e.code!=='ENOENT')throw e;original=Buffer.alloc(0);}
  assert.throws(()=>assertB106CiClosureState(altered(item.path,Buffer.concat([original,Buffer.from(' ')]))),/drift/);n++;
  if(item.sourceGitBlob!=='ABSENT'||assertB106CiClosureState().mode==='SUCCESSOR'){
   assert.throws(()=>assertB106CiClosureState(path=>{if(path===item.path){const e=Error('missing');e.code='ENOENT';throw e;}return readFileSync(path);}));n++;
  }
 }
 console.log('CI_FILE_MUTATIONS_REJECTED='+n);
});
test('CI closure rejects recursive missing unknown type and value mutations',()=>{
 const a=record();let n=0;const get=(x,p)=>p.reduce((v,k)=>v[k],x);
 const check=m=>{reject(JSON.stringify(m,null,2)+'\n');n++;};
 function walk(node,path=[]){
  if(node&&typeof node==='object'){
   if(!Array.isArray(node)){let m=structuredClone(a);get(m,path).unknown=false;check(m);for(const k of Object.keys(node)){m=structuredClone(a);delete get(m,path)[k];check(m);}}
   else {const m=structuredClone(a);get(m,path).push(node[0]??null);check(m);}
   for(const [k,v] of Object.entries(node))walk(v,[...path,k]);
  }else for(const value of [null,{},[],true,false,0,1,'*','current','ABSENT']){if(Object.is(value,node))continue;const m=structuredClone(a);get(m,path.slice(0,-1))[path.at(-1)]=value;check(m);}
 }walk(a);assert.ok(n>900);console.log('CI_SCHEMA_MUTATIONS_REJECTED='+n);
});
test('CI closure rejects duplicate escaped/nested keys overflow depth and trailing input',()=>{
 const t=raw();for(const bad of [t.replace('{','{"status":"bad",'),t.replace('{','{"\\u0073tatus":"bad",'),t.replace('"append": false','"append":false,"append":false'),t.replace('"append": false','"append":1e999'),t+' true','['.repeat(41)+'0'+']'.repeat(41),' '.repeat(65537)+t])reject(bad);
});
test('CI closure binds extra missing mode and unknown Git entries',()=>{
 const inv=b106GitInventory();
 for(const p of ['README.md','docs/engineer-osint/unknown.mjs','docs/engineer-osint/B106_CI_CLOSURE_2.json'])assert.throws(()=>assertB106CiClosureState(readFileSync,()=>({...inv,changed:[...inv.changed,p]})),/drift/);
 const rows=inv.tree.toString().slice(0,-1).split('\0');
 for(const tree of [Buffer.concat([inv.tree,Buffer.from('100644 blob '+'0'.repeat(40)+'\textra.txt\0')]),Buffer.from(rows.slice(1).join('\0')+'\0'),Buffer.from(inv.tree.toString().replace('100644','100755')),Buffer.from(inv.tree.toString().replace(/[a-f0-9]{40}/,'0'.repeat(40)))])assert.throws(()=>assertB106CiClosureState(readFileSync,()=>({...inv,tree})),/drift/);
});

// Preserve real complete live files; vary only the injected Git tree vector.
const vector=record().implementationVector;
const first=readFileSync(vector[0].path);
const firstBlob=createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${first.length}\0`),first])).digest('hex');
const liveMode=firstBlob===vector[0].sourceGitBlob?'SOURCE':'SUCCESSOR';
assert.equal(firstBlob,vector[0][liveMode==='SOURCE'?'sourceGitBlob':'targetGitBlob']);
function modeInventory(opposite=[]){
 const inv=b106GitInventory(),switched=new Set(opposite);
 const rows=new Map(inv.tree.toString().slice(0,-1).split('\0').map(row=>[row.split('\t')[1],row]));
 for(const [i,x] of vector.entries()){
  const useSource=(liveMode==='SOURCE')!==switched.has(i);
  const id=x[useSource?'sourceGitBlob':'targetGitBlob'];
  if(id==='ABSENT')rows.delete(x.path);
  else rows.set(x.path,`100644 blob ${id}\t${x.path}`);
 }
 return {...inv,tree:Buffer.from([...rows].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,row])=>row).join('\0')+'\0')};
}
test(`CI inventory live ${liveMode} accepts its exact complete tree`,()=>{
 const inv=modeInventory();assert.deepEqual(inv.tree,b106GitInventory().tree);
 assert.equal(assertB106CiClosureState(readFileSync,()=>inv).mode,liveMode);
});
for(let n=1;n<=17;n++)test(`CI inventory live ${liveMode} rejects opposite prefix ${n}`,()=>{
 assert.equal(assertB106CiClosureState().mode,liveMode);
 const inv=modeInventory(Array.from({length:n},(_,i)=>i));
 assert.throws(()=>assertB106CiClosureState(readFileSync,()=>inv),/CI tree (blob|presence)/);
});
test(`CI inventory live ${liveMode} rejects each opposite entry including ABSENT`,()=>{
 assert.equal(assertB106CiClosureState().mode,liveMode);
 for(let i=0;i<vector.length;i++){
  const inv=modeInventory([i]);
  assert.throws(()=>assertB106CiClosureState(readFileSync,()=>inv),/CI tree (blob|presence)/,vector[i].path);
 }
 console.log('CI_INVENTORY_SINGLE_ENTRY_REJECTIONS=17');
});
