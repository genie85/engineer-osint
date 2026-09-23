// Reads already provisioned local Git objects/worktrees. Never fetches or writes Git.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,lstatSync,realpathSync,mkdtempSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyInspectionCarrier} from './carrier.mjs';
import {createRootInspection,installExternalRootInspection} from '../lib/canonical-hardening-successor.mjs';
const oid=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)&&x!=='0'.repeat(40);
const within=(a,b)=>{const r=relative(a,b);return !r||(!r.startsWith('..'+sep)&&r!=='..'&&!isAbsolute(r));};
export function gitReadEnvironment(env=process.env){
 const out=Object.fromEntries(Object.entries(env).filter(([k])=>!k.startsWith('GIT_')&&k!=='NODE_OPTIONS'));
 return {...out,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_SYSTEM:'/dev/null',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
}
export function readSnapshot(root){
 const files=new Map();let total=0;
 function visit(rel=''){
  for(const entry of readdirSync(join(root,rel),{withFileTypes:true})){
   if(!rel&&entry.name==='.git')continue;
   const p=rel+entry.name,full=join(root,p),s=lstatSync(full);
   assert.ok(!s.isSymbolicLink(),'aliased snapshot path');
   if(s.isDirectory()){visit(p+'/');continue;}
   assert.ok(s.isFile()&&s.nlink===1,'nonregular/aliased snapshot file');
   total+=s.size;assert.ok(total<=67108864&&files.size<5000,'snapshot resource limit');
   const raw=readFileSync(full),after=lstatSync(full);
   assert.ok(s.ino===after.ino&&s.dev===after.dev&&s.mtimeMs===after.mtimeMs&&s.ctimeMs===after.ctimeMs&&raw.length===s.size,'snapshot changed during read');
   files.set(p,{mode:s.mode&0o111?'100755':'100644',type:'blob',raw});
  }
 }
 visit();return files;
}
const ioDefault=Object.freeze({realpath:realpathSync,snapshot:readSnapshot,git:(cwd,args)=>execFileSync('git',['--no-replace-objects','-c','core.hooksPath=/dev/null','-C',cwd,...args],{env:gitReadEnvironment(),timeout:5000,maxBuffer:5242880,stdio:['ignore','pipe','pipe']})});
export function prepareInspection({approvedNotesCommit,checkedDir,sourceDir,io=ioDefault}){
 assert.ok(oid(approvedNotesCommit),'explicit independent pin required');
 assert.ok(typeof checkedDir==='string'&&typeof sourceDir==='string'&&isAbsolute(checkedDir)&&isAbsolute(sourceDir),'absolute checkout paths required');
 const target=io.realpath(checkedDir),source=io.realpath(sourceDir);
 assert.ok(!within(target,source)&&!within(source,target),'source and target must be disjoint');
 const git=(dir,args)=>io.git(dir,args),text=(dir,args)=>git(dir,args).toString('utf8').trim();
 for(const dir of [target,source])assert.equal(text(dir,['rev-parse','--show-toplevel']),dir,'actual Git worktree root mismatch');
 const fetchedNotesCommit=text(target,['rev-parse','refs/notes/b106-ci-fixture']);
 assert.equal(fetchedNotesCommit,approvedNotesCommit,'mutable/replaced notes ref');
 const checkedTree=text(target,['rev-parse','HEAD^{tree}']);
 const notesCommitRaw=git(target,['cat-file','commit',approvedNotesCommit]);
 const noteInventory=git(target,['ls-tree','-rz',approvedNotesCommit]);
 const sourceCheckout={commit:text(source,['rev-parse','HEAD']),tree:text(source,['rev-parse','HEAD^{tree}']),files:io.snapshot(source)};
 let raw;
 const receipt=verifyInspectionCarrier({mode:'inspection',approvedNotesCommit,fetchedNotesCommit,checkedTree,notesCommitRaw,noteInventory,
  readBlob:id=>{assert.ok(oid(id));raw=git(target,['cat-file','blob',id]);return raw;},sourceCheckout,checkedFiles:io.snapshot(target)});
 return Object.freeze({receipt,raw:Buffer.from(raw),sourceFiles:sourceCheckout.files,checkedDir:target,sourceDir:source});
}
export function activateInspection(options){
 const ready=prepareInspection(options),io=options.io??ioDefault;
 if(options.fixturePath){
  const p=realpathSync(options.fixturePath);
  assert.ok(!within(ready.checkedDir,p)&&!within(ready.sourceDir,p),'fixture must be outside checked snapshots');
  assert.ok(readFileSync(p).equals(ready.raw),'exported fixture differs from authenticated bytes');
 }
 const ctx=createRootInspection(ready.raw.toString('utf8'),ready.receipt.fixture_sha256,ready.sourceFiles);
 installExternalRootInspection(ctx,()=>io.snapshot(ready.checkedDir));
 return ready.receipt;
}
export function optionsFromEnvironment(){return {approvedNotesCommit:process.env.B106_CI_NOTES_COMMIT,checkedDir:process.cwd(),sourceDir:process.env.B106_EXTERNAL_SOURCE_FIXTURE_DIR};}
// CLI writes only an authenticated fixture into a new external temp directory.
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const ready=prepareInspection(optionsFromEnvironment());
 const temp=realpathSync(process.env.RUNNER_TEMP??'');
 assert.ok(!/[\r\n]/.test(temp)&&!within(ready.checkedDir,temp)&&!within(ready.sourceDir,temp),'external RUNNER_TEMP required');
 const dir=mkdtempSync(join(temp,'b106-fixture-')),fixturePath=join(dir,'fixture.json');
 writeFileSync(fixturePath,ready.raw,{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({fixturePath,sourceDir:ready.sourceDir+'/',...ready.receipt})+'\n');
}
