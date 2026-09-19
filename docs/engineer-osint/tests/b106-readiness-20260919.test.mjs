import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdtempSync,readFileSync,readdirSync,rmSync,statfsSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadEvidence,validateReadiness,assertExecutionClosed,REVIEW_PATH,BASE,baseInventoryDigest} from '../audit-b106-readiness-20260919.mjs';
const auth=()=>JSON.parse(readFileSync(REVIEW_PATH,'utf8'));
const evidence=()=>loadEvidence();

test('B106 blocked readiness matches actual B105 tip, dry result, counts, IDs and assets',()=>{
 const a=auth(),e=evidence(),r=validateReadiness(a,e);
 assert.equal(a.status,'BLOCKED_PENDING_SEPARATE_EXECUTION_AUTHORIZATION');
 assert.equal(a.schema_version,'engineer-osint-b106-append-readiness-review-20260919-v1');
 assert.ok(Object.values(a.grants).every(value=>value===false));
 assert.equal(a.authorization,undefined);assert.equal(a.authorized_guard_successor_contract,undefined);assert.equal(a.reviewed_main_sha,BASE);
 assert.equal(r.resulting_canonical,'7dbaa365cadfd690278e5ce085092e99d53828175525ef8ee0779121b6836396');
 assert.equal(r.readiness_payload_valid,true);assert.equal(r.execution_allowed,false);
 assert.deepEqual(a.expected_card_ids,['ENG-TECH-0038','ENG-TECH-0041']);
 assert.deepEqual(a.expected_visual_ids,['ENG-VIS-LOCAL-0038','ENG-VIS-LOCAL-0041']);
 assert.equal(a.expected_counts.updated_records,2);assert.equal(a.expected_counts.visuals,2);
 assert.equal(a.local_files.length,2);
});

test('all readiness object fields are closed to missing, unknown, mistyped or altered values',()=>{
 const a=auth(),e=evidence();let rejected=0;
 const get=(x,path)=>path.reduce((o,k)=>o[k],x);
 function walk(node,path=[]){
  if(node&&typeof node==='object'&&!Array.isArray(node)){
   const bad=structuredClone(a);get(bad,path).unreviewed_grant=true;
   assert.throws(()=>validateReadiness(bad,e));rejected++;
   for(const key of Object.keys(node)){
    const bad=structuredClone(a);delete get(bad,path)[key];assert.throws(()=>validateReadiness(bad,e));rejected++;
   }
  }
  if(node&&typeof node==='object')for(const [key,value] of Object.entries(node))walk(value,[...path,key]);
  else for(const value of [null,true,false,0,1,NaN,Infinity,undefined,'*','current',[],{}]){
   if(Object.is(value,node))continue;
   const bad=structuredClone(a);get(bad,path.slice(0,-1))[path.at(-1)]=value;
   assert.throws(()=>validateReadiness(bad,e));rejected++;
  }
 }
 walk(a);assert.ok(rejected>300);console.log('AUTHORITY_MUTATIONS_REJECTED='+rejected);
});

test('stale base/parent, candidate self-authorization and unrelated paths reject',()=>{
 const a=auth(),e=evidence();
 for(const patch of [{base_inventory_sha256:'0'.repeat(64)},{parent_run_id:'engineer-osint-20260904-B104'},{parent_canonical_sha256:'0'.repeat(64)},{resulting_canonical:'0'.repeat(64)},{changed_paths:['docs/engineer-osint/index.html']},{candidate_raw:e.candidate_raw+' '}]){
  assert.throws(()=>validateReadiness(a,{...e,...patch}));
 }
 const candidate=JSON.parse(e.candidate_raw);candidate.continuity.canonical_write_authorized=true;
 assert.throws(()=>validateReadiness(a,{...e,candidate_raw:JSON.stringify(candidate)}));
 for(const name of Object.keys(e.pinned_raw)){
  assert.throws(()=>validateReadiness(a,{...e,pinned_raw:{...e.pinned_raw,[name]:Buffer.from('mutation')}}));
 }
});

test('old V4695 is not reusable and all execution remains separate and blocked by V4697',()=>{
 const old=JSON.parse(readFileSync('docs/engineer-osint/V4695_B106_BROWSER_COMPATIBILITY_AUTHORIZATION.json','utf8'));
 assert.throws(()=>validateReadiness(old,evidence()));
 for(const slice of ['authorization','readiness','execution'])assert.throws(()=>assertExecutionClosed(auth(),{slice,branch:'agent/codex/b106-authorization-20260919'}));
 assert.throws(()=>assertExecutionClosed(auth(),{slice:'execution',branch:'new-separate-branch'}));
});


test('readiness rejects an authorization-shaped replay without historical commit objects',()=>{
 assert.equal(existsSync('docs/engineer-osint/B106_APPEND_AUTHORIZATION_20260919.json'),false);
 // Embedded unsafe shape, not a git-show dependency on a local-only predecessor.
 const previous={...auth(),schema_version:'engineer-osint-b106-exact-append-authorization-20260919-v1',status:'READY_FOR_APPEND',authorization:{append_exact_candidate_only:true,standard_append_run_write_required:true,one_run_only:true},authorized_guard_successor_contract:{guarded_run_id:'engineer-osint-20260904-B106'}};
 assert.throws(()=>validateReadiness(previous,evidence()));
});

test('generic explicit append rejects readiness before any write in an isolated disposable copy',()=>{
 const source='docs/engineer-osint';
 const readinessPath=source+'/B106_APPEND_READINESS_REVIEW_20260919.json';
 const review=JSON.parse(readFileSync(readinessPath,'utf8'));
 const free=path=>{const s=statfsSync(path,{bigint:true});return s.bavail*s.bsize;};
 assert.ok(free(process.cwd())>=14000000000n,'worktree disk gate');
 assert.ok(free(tmpdir())>=14000000000n,'scratch disk gate');
 const temp=mkdtempSync(join(tmpdir(),'engineer-b106-readiness-'));
 const snapshot=dir=>{
  const entries={};
  function visit(at,prefix=''){
   for(const d of readdirSync(at,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const rel=prefix+d.name,path=join(at,d.name);
    assert.ok(!d.isSymbolicLink(),'fixture must not alias real files');
    if(d.isDirectory())visit(path,rel+'/');
    else {assert.ok(d.isFile());entries[rel]=createHash('sha256').update(readFileSync(path)).digest('hex');}
   }
  }
  visit(dir);return entries;
 };
 try{
  cpSync(source,join(temp,source),{recursive:true});
  for(const [label,change,reason] of [
   ['exact readiness',{},/Explicit append authorization is not READY_FOR_APPEND: BLOCKED_PENDING_SEPARATE_EXECUTION_AUTHORIZATION/],
   ['status promotion alone',{status:'READY_FOR_APPEND'},/Explicit append authorization guard successor contract mismatch/],
   ['status and schema promotion',{status:'READY_FOR_APPEND',schema_version:'engineer-osint-b106-exact-append-authorization-20260919-v1'},/Explicit append authorization guard successor contract mismatch/]
  ]){
   writeFileSync(join(temp,readinessPath),JSON.stringify({...review,...change},null,2)+'\n');
   const before=snapshot(temp);
   const result=spawnSync(process.execPath,[source+'/append-run.mjs',review.candidate_path,'--write','--authorization',readinessPath],{cwd:temp,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
   assert.equal(result.error,undefined,label);assert.equal(result.signal,null,label);
   assert.equal(result.status,1,label);assert.match(result.stderr,reason,label);
   assert.equal(existsSync(join(temp,source,'data/runs',review.candidate_run_id+'.json')),false,label);
   assert.deepEqual(snapshot(temp),before,label+' changed copied files or created run/manifest temp');
  }
 } finally {rmSync(temp,{recursive:true,force:true});}
});


test('current HEAD inventory binds all base content without branch or ancestor lookups',()=>{
 const a=auth();
 const raw=execFileSync('git',['ls-tree','-r','-z','HEAD']);
 assert.equal(baseInventoryDigest(raw),a.reviewed_git_inventory_sha256);
 const records=raw.toString('utf8').slice(0,-1).split('\0');
 const index=records.findIndex(entry=>entry.endsWith('\tREADME.md'));assert.ok(index>=0);
 for(const replacement of [records[index].replace(/[a-f0-9]{40}/,'0'.repeat(40)),records[index].replace(/^100644/,'100755'),records[index].replace('README.md','UNREVIEWED.md')]){
  const changed=[...records];changed[index]=replacement;
  assert.notEqual(baseInventoryDigest(Buffer.from(changed.join('\0')+'\0')),a.reviewed_git_inventory_sha256);
 }
 const removed=records.filter((_,i)=>i!==index);
 assert.notEqual(baseInventoryDigest(Buffer.from(removed.join('\0')+'\0')),a.reviewed_git_inventory_sha256);
 const added=Buffer.concat([raw,Buffer.from('100644 blob '+'0'.repeat(40)+'\tunrelated.txt\0')]);
 assert.notEqual(baseInventoryDigest(added),a.reviewed_git_inventory_sha256);
 assert.throws(()=>baseInventoryDigest(Buffer.from('malformed')));
});
