// Native transport/security regression: deliberately does not use historical evidence reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verifyInspectionCarrier} from '../ci/carrier.mjs';
import {readSnapshot,gitReadEnvironment} from '../ci/prepare-b106-fixture.mjs';
import {assertNoRootFixtureExecution} from '../lib/canonical-hardening-successor.mjs';
const raw=readFileSync(process.env.B106_EXTERNAL_INVENTORY_FIXTURE),fixture=JSON.parse(raw);
const files=readSnapshot(process.cwd()),source=readSnapshot(process.env.B106_EXTERNAL_SOURCE_FIXTURE_DIR);
const oid=(kind,b)=>createHash('sha1').update(`${kind} ${b.length}\0`).update(b).digest('hex');
const target=fixture.targets.find(t=>t.name==='PR2');
function input(bytes=raw){
 const blob=oid('blob',bytes),treeRaw=Buffer.concat([Buffer.from(`100644 ${target.tree}\0`),Buffer.from(blob,'hex')]);
 const commit=Buffer.from(`tree ${oid('tree',treeRaw)}\nauthor Synthetic Test <fixture@invalid> 1 +0000\ncommitter Synthetic Test <fixture@invalid> 1 +0000\n\nregression fixture only\n`),pin=oid('commit',commit);
 return {mode:'inspection',approvedNotesCommit:pin,fetchedNotesCommit:pin,checkedTree:target.tree,notesCommitRaw:commit,noteInventory:Buffer.from(`100644 blob ${blob}\t${target.tree}\0`),readBlob:()=>bytes,sourceCheckout:{commit:fixture.sourceCommit,tree:fixture.sourceTree,files:source},checkedFiles:files};
}
test('CI context and separately verified receipt never grant execution',()=>{
 assert.throws(()=>assertNoRootFixtureExecution(),/never execution authority/);
 const receipt=verifyInspectionCarrier(input());assert.equal(receipt.execution_allowed,false);assert.equal(receipt.fixture_only,true);
 assert.ok(Object.isFrozen(receipt)&&Object.isFrozen(receipt.grants));assert.ok(Object.values(receipt.grants).every(x=>x===false));
});
test('absent independent pin stops before blob access; ref/commit/inventory tampering fails',()=>{
 const missing=input();delete missing.approvedNotesCommit;missing.readBlob=()=>assert.fail('must not read');assert.throws(()=>verifyInspectionCarrier(missing),/independently approved/);
 const ref=input();ref.fetchedNotesCommit='f'.repeat(40);assert.throws(()=>verifyInspectionCarrier(ref),/mutable\/replaced/);
 const commit=input();commit.notesCommitRaw=Buffer.concat([commit.notesCommitRaw,Buffer.from('changed')]);assert.throws(()=>verifyInspectionCarrier(commit),/commit object/);
 const tree=input();tree.noteInventory=Buffer.from(`100644 blob ${'f'.repeat(40)}\t${target.tree}\0`);assert.throws(()=>verifyInspectionCarrier(tree),/tree object/);
});
test('changed blob, malformed schema and operational grants cannot pass a pinned transport',()=>{
 const x=input();x.readBlob=()=>Buffer.from('{}');assert.throws(()=>verifyInspectionCarrier(x),/modified fixture blob/);
 assert.throws(()=>verifyInspectionCarrier(input(Buffer.from('{}\n'))),/closed schema/);
 for(const key of Object.keys(fixture.grants)){const f=structuredClone(fixture);f.grants[key]=true;assert.throws(()=>verifyInspectionCarrier(input(Buffer.from(JSON.stringify(f,null,2)+'\n'))),/operational grant/);}
});
test('unknown checkout tree and changed current files are rejected',()=>{
 const wrong=input();wrong.checkedTree='f'.repeat(40);assert.throws(()=>verifyInspectionCarrier(wrong),/no note for exact/);
 const changed=input();changed.checkedFiles=new Map(files);changed.checkedFiles.set('untracked',{mode:'100644',type:'blob',raw:Buffer.from('unexpected')});assert.throws(()=>verifyInspectionCarrier(changed),/mixed\/third\/missing\/extra/);
});
test('native workflows confine test credentials/preload and preserve deploy-only writes',()=>{
 const names=['first-three-overlay-retirement-regression','pages','identity-fix-retirement-readiness','identity-fix-retirement-authorization','identity-fix-retirement-regression','runtime-audit-snapshot'];
 for(const name of names){
  const text=readFileSync(`.github/workflows/${name}.yml`,'utf8');
  const permission=[...text.matchAll(/^permissions:\n((?:  .+\n)+)/gm)];assert.equal(permission.length,1);assert.equal(permission[0][1],'  contents: read\n');
  assert.doesNotMatch(text,/pull_request_target:|NODE_OPTIONS\s*:|\$GITHUB_ENV|\$\{GITHUB_ENV\}/);
  const sections=text.split('\njobs:\n');assert.equal(sections.length,2);
  const jobs=sections[1].split(/\n(?=  [a-zA-Z0-9_-]+:\n)/),tests=jobs.filter(j=>j.includes('docs/engineer-osint/tests/*.test.mjs'));assert.equal(tests.length,1);
  assert.doesNotMatch(tests[0],/^      (?:pages|id-token|contents): write$/m);
  assert.match(tests[0],/env:\n          B106_CI_NOTES_COMMIT: \$\{\{ vars.B106_CI_NOTES_COMMIT \}\}/);
  assert.match(tests[0],/node --import \.\/docs\/engineer-osint\/ci\/b106-root-preload\.mjs --test/);
  assert.doesNotMatch(tests[0],/actions\/configure-pages/);
  if(name==='pages'){
   const deploy=jobs.find(j=>j.startsWith('  deploy:\n'));assert.ok(deploy);
   assert.match(deploy,/permissions:\n      contents: read\n      pages: write\n      id-token: write/);
   assert.match(deploy,/if: github.event_name != 'pull_request'/);assert.match(deploy,/needs: build/);
   assert.ok(deploy.indexOf('actions/configure-pages@v6')<deploy.indexOf('actions/deploy-pages@v5'));
  }
 }
});
test('large fixture mismatch has bounded diagnostic and blocks application startup',()=>{
 const dir=mkdtempSync(join(process.env.RUNNER_TEMP,'b106-reject-')),file=join(dir,'wrong.json');writeFileSync(file,'{}\n',{mode:0o600});
 const env={...process.env,B106_EXTERNAL_INVENTORY_FIXTURE:file};delete env.NODE_OPTIONS;
 const result=spawnSync(process.execPath,['--import','./docs/engineer-osint/ci/b106-root-preload.mjs','-e','process.stdout.write("APP_STARTED")'],{cwd:process.cwd(),env,encoding:'utf8',timeout:5000,maxBuffer:8192});
 assert.equal(result.error,undefined,'mismatch must fail quickly without large output');assert.notEqual(result.status,0);
 assert.match(result.stderr,/exported fixture differs/);assert.ok(result.stderr.length<4096);assert.equal(result.stdout.includes('APP_STARTED'),false);
});
test('Git read environment removes inherited overrides and global preload',()=>{
 const e=gitReadEnvironment({PATH:'/bin',GIT_DIR:'/wrong',GIT_WORK_TREE:'/wrong',GIT_CONFIG_COUNT:'1',GIT_SSH_COMMAND:'wrong',NODE_OPTIONS:'wrong'});
 assert.equal(e.PATH,'/bin');for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_CONFIG_COUNT','GIT_SSH_COMMAND','NODE_OPTIONS'])assert.equal(e[key],undefined);
 assert.equal(e.GIT_CONFIG_NOSYSTEM,'1');assert.equal(e.GIT_CONFIG_GLOBAL,'/dev/null');
});

// Append to b106-ci-transport.test.mjs; uses existing native fs/Git imports.
const historicalPr1Commit='58171850e92da3cc61a94a85f615eadbf6d9419c';
const historicalPr1Tree='1baffdf744fe0bf07f7db0ac859013c253190ef8';
function exactPr1Block(text){
 const start=`pr1_commit=${historicalPr1Commit}\n`,last='git ls-tree -rz "$pr1_tree" >/dev/null\n';
 const script=text.split('\n').map(x=>x.startsWith('          ')?x.slice(10):x).join('\n');
 assert.equal(script.split(start).length,2,'one exact PR1 commit');
 const from=script.indexOf(start),end=script.indexOf(last,from);assert.ok(end>from,'PR1 tree must be checked before tests');
 const block=script.slice(from,end+last.length);
 assert.equal(block,`${start}pr1_tree=${historicalPr1Tree}\ntimeout 30s git fetch --no-tags --depth=1 origin "$pr1_commit"\n[[ "$(git rev-parse "$pr1_commit^{tree}")" == "$pr1_tree" ]] || exit 1\n${last}`);
 assert.ok(end<script.indexOf('fixture_receipt=')&&end<script.indexOf('node --import'));
 return block;
}
test('every CI workflow provisions only the pinned historical PR1 before fixture preparation',()=>{
 for(const name of ['first-three-overlay-retirement-regression','pages','identity-fix-retirement-readiness','identity-fix-retirement-authorization','identity-fix-retirement-regression','runtime-audit-snapshot']){
  exactPr1Block(readFileSync(`.github/workflows/${name}.yml`,'utf8'));
 }
});
test('isolated shallow object store requires PR1 fetch and rejects missing/wrong identities',{timeout:15000},()=>{
 const block=exactPr1Block(readFileSync('.github/workflows/pages.yml','utf8'));
 const temp=mkdtempSync(join(process.env.RUNNER_TEMP,'b106-pr1-fetch-'));
 const env=gitReadEnvironment();delete env.B106_EXTERNAL_INVENTORY_FIXTURE;
 const git=(cwd,args,input)=>{
  const r=spawnSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd,env,input,encoding:'utf8',timeout:3000,maxBuffer:65536});
  assert.equal(r.error,undefined);assert.equal(r.status,0,r.stderr);return r.stdout.trim();
 };
 const remote=join(temp,'remote.git');git(temp,['init','--bare',remote]);
 const obj=raw=>git(remote,['hash-object','-w','--stdin'],raw);
 const tree=b=>git(remote,['mktree'],`100644 blob ${obj(b)}\tfixture\n`);
 const commit=t=>git(remote,['-c','user.name=Synthetic','-c','user.email=fixture@invalid','commit-tree',t], 'offline fixture\n');
 const sourceTree=tree('source\n'),sourceCommit=commit(sourceTree),targetTree=tree('target\n'),targetCommit=commit(targetTree),pr1Tree=tree('pr1\n'),pr1Commit=commit(pr1Tree);
 for(const [name,id] of [['source',sourceCommit],['target',targetCommit],['pr1',pr1Commit]])git(remote,['update-ref',`refs/heads/${name}`,id]);
 for(const kind of ['valid','wrong-commit','wrong-tree','unavailable']){
  const client=join(temp,kind+'.git');git(temp,['init','--bare',client]);git(client,['remote','add','origin','file://'+remote]);
  for(const id of [sourceCommit,targetCommit])git(client,['fetch','--no-tags','--depth=1','origin',id]);
  const before=spawnSync('git',['ls-tree','-rz',pr1Tree],{cwd:client,env,encoding:'utf8',timeout:3000});assert.notEqual(before.status,0);assert.match(before.stderr,/not a tree object/);
  const requested=kind==='wrong-commit'?targetCommit:kind==='unavailable'?'f'.repeat(40):pr1Commit;
  const expected=kind==='wrong-tree'?sourceTree:pr1Tree;
  const script='set -euo pipefail\n'+block.replace(historicalPr1Commit,requested).replace(historicalPr1Tree,expected)+'printf TEST_STARTED\n';
  const result=spawnSync('bash',['-c',script],{cwd:client,env,encoding:'utf8',timeout:5000,maxBuffer:65536});assert.equal(result.error,undefined);
  if(kind==='valid'){
   assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,'TEST_STARTED');
   assert.equal(git(client,['ls-tree','-rz',pr1Tree]),git(remote,['ls-tree','-rz',pr1Tree]));
  }else{assert.notEqual(result.status,0);assert.equal(result.stdout.includes('TEST_STARTED'),false);}
 }
});
