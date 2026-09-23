import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const api=await import(pathToFileURL(process.cwd()+'/docs/engineer-osint/audit-b106-readiness-20260919.mjs'));
test('readiness consumes fully verified bootstrap inventory and retains zero execution',()=>{
 const a=api.parseReadiness(readFileSync(api.REVIEW_PATH,'utf8'));
 const result=api.validateReadiness(a,api.loadEvidence());
 assert.equal(result.execution_allowed,false);assert.equal(result.B106_EXECUTION_PERFORMED,false);
});

// Actual materialized candidate trees, never HEAD. Fixture is external test input,
// not execution authority; its raw trust pin is enforced by the installed harness.
import {execFileSync} from 'node:child_process';
const inventoryApi=await import(pathToFileURL(process.cwd()+'/docs/engineer-osint/lib/canonical-hardening-successor.mjs'));
const fixturePath=process.env.B106_EXTERNAL_INVENTORY_FIXTURE;
assert.ok(fixturePath,'explicit external inventory fixture required');
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
const inventory=rows=>Buffer.from(rows.map(x=>`${x.mode} ${x.type} ${x.blob}\t${x.path}`).join('\0')+'\0');
test('exact SOURCE/PR1/PR2 git tree inventories validate before historical projection',()=>{
 const expected=api.parseReadiness(readFileSync(api.REVIEW_PATH,'utf8')).reviewed_git_inventory_sha256;
 for(const tree of [fixture.sourceTree,...fixture.targets.map(t=>t.tree)]){
  const raw=execFileSync('git',['ls-tree','-rz',tree]);
  assert.equal(api.baseInventoryDigest(raw),expected,tree);
 }
});
test('candidate inventory rejects each reversion, third blob, mode, type, missing, extra, ordering and mixed vector',()=>{
 const source=new Map(fixture.source.map(x=>[x.path,x]));
 const allowed=[inventory(fixture.source),...fixture.targets.map(t=>inventory(t.files))];
 const rejects=rows=>{const raw=inventory(rows);if(allowed.some(x=>x.equals(raw)))return;assert.throws(()=>inventoryApi.projectRootHistoricalInventory(raw));};
 let rejected=0;
 for(const t of fixture.targets){
  const changed=t.files.filter(x=>JSON.stringify(x)!==JSON.stringify(source.get(x.path))).map(x=>x.path);
  const revert=(paths)=>t.files.flatMap(x=>!paths.includes(x.path)?[x]:source.has(x.path)?[source.get(x.path)]:[]);
  for(const p of changed){rejects(revert([p]));rejected++;
   for(const patch of [{blob:'0'.repeat(40)},{mode:'100755'},{type:'commit'}]){rejects(t.files.map(x=>x.path===p?{...x,...patch}:x));rejected++;}
  }
  for(let n=1;n<changed.length;n++){rejects(revert(changed.slice(0,n)));rejected++;}
  let seed=173;for(let n=0;n<24;n++){const chosen=changed.filter(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%3===0;});rejects(revert(chosen));rejected++;}
  // Check every missing row, not just changed members.
  for(let n=0;n<t.files.length;n++){rejects(t.files.filter((_,i)=>i!==n));rejected++;}
  for(const path of ['unknown','docs/engineer-osint/B106_STRICT_APPEND_AUTHORIZATION_20260920.json','docs/engineer-osint/data/runs/engineer-osint-20260904-B106.json']){rejects([...t.files,{...t.files[0],path}]);rejected++;}
  rejects([...t.files].reverse());rejects([...t.files,t.files[0]]);rejected+=2;
 }
 for(const raw of [null,'HEAD','current','*',Buffer.from(''),Buffer.from('malformed\0'),Buffer.concat([allowed[0],Buffer.from('\0')]),allowed[0].subarray(0,-1)]){assert.throws(()=>inventoryApi.projectRootHistoricalInventory(raw));rejected++;}
 console.log('INVENTORY_COUNTEREXAMPLES='+rejected);
});
