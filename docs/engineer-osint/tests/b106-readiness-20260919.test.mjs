import test from 'node:test';
import {assertB106GuardState} from '../lib/canonical-hardening-successor.mjs';
import assert from 'node:assert/strict';
import {copyFileSync,existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,statfsSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {loadEvidence,validateReadiness,assertExecutionClosed,REVIEW_PATH,BASE,baseInventoryDigest,parseReadiness} from '../audit-b106-readiness-20260919.mjs';
const auth=()=>parseReadiness(readFileSync(REVIEW_PATH,'utf8'));
let cachedEvidence;const evidence=()=>cachedEvidence??=loadEvidence();

// Run the subprocess fixture before caching the materialized store in this process.
// Keeping both copies alive at once causes memory pressure on the constrained host.
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
 const sourceBefore=snapshot(source);
 const future=assertB106GuardState().mode==='SUCCESSOR';
 try{
  // Real helper/imports plus the exact complete manifest-backed B105 chain.
  // Exclude UI, assets and unrelated research/tests; never mock or link source files.
  const manifest=JSON.parse(readFileSync(source+'/data/run-store-manifest.json','utf8'));
  const paths=[source+'/append-run.mjs',source+'/lib/integrity.mjs',source+'/lib/run-store.mjs',source+'/lib/canonical-hardening-successor.mjs',
   source+'/schemas/patch-v1.schema.json',source+'/data/run-store-manifest.json',source+'/'+manifest.snapshot.path,
   ...manifest.runs.map(run=>source+'/'+run.path),review.candidate_path,readinessPath];
  for(const path of paths){
   assert.ok(path.startsWith(source+'/')&&!path.split('/').includes('..'),'fixture path must stay in source');
   const original=lstatSync(path);assert.ok(original.isFile()&&!original.isSymbolicLink());
   const destination=join(temp,path);mkdirSync(dirname(destination),{recursive:true});copyFileSync(path,destination);
   const copied=lstatSync(destination);assert.equal(copied.nlink,1);
   assert.ok(copied.dev!==original.dev||copied.ino!==original.ino,'copy must not alias source inode');
   assert.equal(createHash('sha256').update(readFileSync(destination)).digest('hex'),sourceBefore[path.slice(source.length+1)]);
  }
  for(const [label,change,reason] of [
   ['exact readiness',{},/Explicit append authorization is not READY_FOR_APPEND: BLOCKED_PENDING_STRICT_EXECUTION_AUTHORIZATION_AND_FINAL_QA/],
   ['status promotion alone',{status:'READY_FOR_APPEND'},/Explicit append authorization guard successor contract mismatch/],
   ['status and schema promotion',{status:'READY_FOR_APPEND',schema_version:'engineer-osint-b106-exact-append-authorization-20260919-v1'},/Explicit append authorization guard successor contract mismatch/]
  ]){
   writeFileSync(join(temp,readinessPath),JSON.stringify({...review,...change},null,2)+'\n');
   const before=snapshot(temp);
   const result=spawnSync(process.execPath,[source+'/append-run.mjs',review.candidate_path,'--write','--authorization',readinessPath],{cwd:temp,encoding:'utf8',timeout:90000,maxBuffer:1024*1024});
   assert.equal(result.error,undefined,label);assert.equal(result.signal,null,label);
   assert.equal(result.status,1,label);assert.match(result.stderr,future?/Strict append dispatcher rejects/:reason,label);
   assert.equal(existsSync(join(temp,source,'data/runs',review.candidate_run_id+'.json')),false,label);
   assert.deepEqual(snapshot(temp),before,label+' changed copied files or created run/manifest temp');
  }
 } finally {
  try{assert.deepEqual(snapshot(source),sourceBefore,'append fixtures must not mutate source files');}
  finally{rmSync(temp,{recursive:true,force:true});}
 }
});

test('B106 blocked readiness matches actual B105 tip, dry result, counts, IDs and assets',()=>{
 const a=auth(),e=evidence(),r=validateReadiness(a,e);
 assert.equal(a.status,'BLOCKED_PENDING_STRICT_EXECUTION_AUTHORIZATION_AND_FINAL_QA');
 assert.equal(a.schema_version,'engineer-osint-b106-append-readiness-review-20260920-r2-v1');
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
  if(Array.isArray(node)){
   const bad=structuredClone(a);get(bad,path).push(null);assert.throws(()=>validateReadiness(bad,e));rejected++;
   if(node.length){const bad=structuredClone(a);get(bad,path).pop();assert.throws(()=>validateReadiness(bad,e));rejected++;}
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
 for(const patch of [{base_inventory_sha256:'0'.repeat(64)},{parent_run_id:'engineer-osint-20260904-B104'},{parent_canonical_sha256:'0'.repeat(64)},{resulting_canonical:'0'.repeat(64)},{changed_paths:['docs/engineer-osint/index.html']},{changed_paths:['docs/engineer-osint/B106_APPEND_READINESS_REVIEW_2_20260919.json']},{candidate_raw:e.candidate_raw+' '}]){
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


test('successor records frozen R1 and evidence-only recovery without granting execution',()=>{
 const a=auth();
 assert.equal(a.schema_version,'engineer-osint-b106-append-readiness-review-20260920-r2-v1');
 assert.equal(a.status,'BLOCKED_PENDING_STRICT_EXECUTION_AUTHORIZATION_AND_FINAL_QA');
 assert.equal(a.frozen_predecessor.main_sha,'950d96cfbe4be2979f1dc3a0f30051dd6ed68e6d');
 assert.equal(a.frozen_predecessor.tree_sha,'4ca795c63134c4ee2875ecf921df6e70c9c93977');
 assert.equal(a.frozen_predecessor.reviewed_head_sha,'68a3dab4e97e38a664175d0fdbf6882b7f559703');
 assert.deepEqual(a.frozen_predecessor.files,[
  {
    "path": "docs/engineer-osint/B106_APPEND_READINESS_REVIEW_20260919.json",
    "mode": "100644",
    "git_blob_sha": "6ff88fe46f92a0c1aa907f4120b720691bb17068",
    "sha256": "9f639246a437cc0fa21e39480b994071907430d799935374e6c1c7f6d027689d"
  },
  {
    "path": "docs/engineer-osint/B106_READINESS_REVIEW_20260919.md",
    "mode": "100644",
    "git_blob_sha": "766261d912295d4e5068a622f1e52493804eadcd",
    "sha256": "3c8902f705417705beadebeb8b8888d36318f3ef152a1e2bc010fd65ba169f01"
  },
  {
    "path": "docs/engineer-osint/audit-b106-readiness-20260919.mjs",
    "mode": "100644",
    "git_blob_sha": "e6848904f88fb37e71f0bd1020e3afc1c7e8becb",
    "sha256": "b6951447cd60bbb6d2e55a8b64ca6bbc2e10ac4c3dae9ba5e81bef1677fd7123"
  },
  {
    "path": "docs/engineer-osint/tests/b106-readiness-20260919.test.mjs",
    "mode": "100644",
    "git_blob_sha": "977e3a8ff0ff8a5f4d7efee29aff1f413ec7c72f",
    "sha256": "73ba17d972e21709e73c4301aa09d09bd73b3e3942e00ba62fc49cfd7c526b3c"
  }
]);
 assert.equal(a.r1_reviews.length,2);
 assert.equal(new Set(a.r1_reviews.map(r=>r.delegation_id+":"+r.task_id)).size,2);
 assert.deepEqual(a.r1_green_runs.map(r=>r.id),[35476668327,35476669628,35476669731,35476669779,35476669846]);
 assert.ok(Object.values(a.grants).every(v=>v===false));
 assert.ok(Object.values(a.execution_state).every(v=>v===false));
 assert.equal(a.recovery.old_v4695_grant_usable,false);
 assert.equal(a.recovery.r1_shallow_ci_blocker,'CLOSED_BY_MERGED_R1');
 assert.equal(a.recovery.strict_dispatcher_and_authorization,'SEPARATE_MERGE_REQUIRED');
});

test('successor strict parser rejects recursive duplicates overflow and type confusion',()=>{
 const text=readFileSync(REVIEW_PATH,'utf8');
 for(const bad of [
  text.replace('{','{"status":"BLOCKED_PENDING_STRICT_EXECUTION_AUTHORIZATION_AND_FINAL_QA",'),
  text.replace('{','{"\\u0073tatus":"BLOCKED_PENDING_STRICT_EXECUTION_AUTHORIZATION_AND_FINAL_QA",'),
  text.replace('"grants": {','"grants": {"append":false,"append":false,'),
  text.replace('"mode": "100644"','"mode": "100644","mode": "100644"'),
  text.replace('"task_id": 0','"task_id": 0,"task_id": 0'),
  text.replace('"task_id": 0','"task_id": 1e999'),
  text.replace('"task_id": 0','"task_id": "0"')
 ]){assert.notEqual(bad,text);assert.throws(()=>parseReadiness(bad));}
 assert.throws(()=>parseReadiness(text+' true'));
 assert.throws(()=>parseReadiness(' '.repeat(65537)+text));
});


test('R2 remains blocked under the exact nonexecuting guard slice; a sixth path rejects',()=>{
 const a=auth(),e=evidence();assert.ok(Object.values(e.guard_state.record.grants).every(v=>v===false));
 assert.equal(validateReadiness(a,{...e,changed_paths:['docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_20260920.json']}).execution_allowed,false);
 for(const path of ['docs/engineer-osint/B106_READINESS_REVIEW_20260919.md','docs/engineer-osint/data/run-store-manifest.json','docs/engineer-osint/sixth.mjs'])assert.throws(()=>validateReadiness(a,{...e,changed_paths:[path]}),/unrelated change/);
});
