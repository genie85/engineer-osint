import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const helperPath='docs/engineer-osint/tests/v4556-workflow-lifecycle-helper.mjs';
const workflowSourceSha='0aded293ae69be3844c73f6613f0a70b05320156';
const workflowSuccessorSha='e44cb9caf5fc61c83ad254f7b829977245abec49';
const helperSourceSha='c7527860a5f175000b634a25d170698d70569b53';
const helperSuccessorSha='8c029f4fcf2e969b02887b5d4d5e46a6625948bc';
const b106DomSha='52ab8b1d862de74128cd25e49b46f4cbb3d316cc8b8413850781a46aa6a8200c';
const reviewedMain='98e8b80e614defc5cd4f2a6ddcdd45032c4c2f6d';
const outRoot=process.env.V4694_OUT_ROOT||'/tmp/v4694-b106-compat-targets';

const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const path=join(dir,entry.name).replaceAll('\\','/');
  return entry.isDirectory()?walk(path):[path];
});
const replaceExact=(text,from,to,label)=>{
  assert.ok(text.includes(from),`missing exact ${label} source marker`);
  return text.replace(from,to);
};
function deriveWorkflowTarget(source){
  const b105="'engineer-osint-20260904-B105':'25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7'";
  let target=replaceExact(source,`              ${b105}\n`,`              ${b105},\n              'engineer-osint-20260904-B106':'${b106DomSha}'\n`,'Python B105 digest map');
  target=replaceExact(target,`            ${b105}\n`,`            ${b105},\n            'engineer-osint-20260904-B106':'${b106DomSha}'\n`,'Node B105 digest map');
  assert.equal(gitBlobSha(target),workflowSuccessorSha,'workflow successor mismatch');
  return target;
}
function deriveHelperTarget(source){
  let target=source;
  target=replaceExact(target,"const b105IdentityWorkflowSha='0aded293ae69be3844c73f6613f0a70b05320156';",`const b105IdentityWorkflowSha='${workflowSourceSha}';\nconst b106IdentityWorkflowSha='${workflowSuccessorSha}';`,'B105 helper workflow constant');
  target=replaceExact(target,'const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha];','const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha];','published workflow successor list');
  for(const [from,to,label] of [
    ['if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B101 descendants'],
    ['if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B102 descendants'],
    ['if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B103 descendants'],
    ['if([b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B104 descendants'],
    ['if(current===b105IdentityWorkflowSha)','if([b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B105 descendants']
  ]) target=replaceExact(target,from,to,label);
  const b105Assert="    if([b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260904-B105':'25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7'/,'B105 exact digest anchor missing');";
  target=replaceExact(target,b105Assert,`${b105Assert}\n    if(current===b106IdentityWorkflowSha)assert.match(text,/'engineer-osint-20260904-B106':'${b106DomSha}'/,'B106 exact digest anchor missing');`,'B105 helper digest assertion');
  assert.equal(gitBlobSha(target),helperSuccessorSha,'helper successor mismatch');
  assert.match(target,/no exact digest authorized for current run/,'unknown-run fail-closed guard missing');
  return target;
}
function fixedPoint(sourceTexts,roots){
  const paths=[...sourceTexts.keys()].sort();
  const sourceShas=new Map(paths.map(path=>[path,gitBlobSha(sourceTexts.get(path))]));
  let texts=new Map(paths.map(path=>[path,roots.get(path)??sourceTexts.get(path)]));
  let shas=new Map(paths.map(path=>[path,gitBlobSha(texts.get(path))]));
  let count=0;
  for(;count<64;count++){
    const next=new Map();
    for(const path of paths){
      if(roots.has(path)){next.set(path,roots.get(path));continue;}
      let text=sourceTexts.get(path);
      for(const dep of paths){
        const oldSha=sourceShas.get(dep),newSha=shas.get(dep);
        if(oldSha!==newSha&&text.includes(oldSha))text=text.replaceAll(oldSha,newSha);
      }
      next.set(path,text);
    }
    const nextShas=new Map(paths.map(path=>[path,gitBlobSha(next.get(path))]));
    const stable=paths.every(path=>nextShas.get(path)===shas.get(path));
    texts=next; shas=nextShas;
    if(stable)break;
  }
  assert.ok(count<64,'fixed point did not converge');
  return {paths,sourceShas,texts,shas,iterations:count+1};
}

const testPaths=walk('docs/engineer-osint/tests').filter(path=>path.endsWith('.mjs')).sort();
const sourceTexts=new Map([[workflowPath,readFileSync(workflowPath,'utf8')],...testPaths.map(path=>[path,readFileSync(path,'utf8')])]);
assert.equal(gitBlobSha(sourceTexts.get(workflowPath)),workflowSourceSha,'workflow source drift');
assert.equal(gitBlobSha(sourceTexts.get(helperPath)),helperSourceSha,'helper source drift');
const roots=new Map([[workflowPath,deriveWorkflowTarget(sourceTexts.get(workflowPath))],[helperPath,deriveHelperTarget(sourceTexts.get(helperPath))]]);
const fp=fixedPoint(sourceTexts,roots);
const changed=fp.paths.filter(path=>fp.sourceShas.get(path)!==fp.shas.get(path));
assert.equal(changed.length,35,`unexpected successor count ${changed.length}`);
assert.equal(fp.iterations,15,`unexpected fixed-point iteration count ${fp.iterations}`);
const nodes=changed.map(path=>({path,source_sha:fp.sourceShas.get(path),successor_sha:fp.shas.get(path),kind:roots.has(path)?'ROOT_SUCCESSOR':'TRANSITIVE_EXACT_HASH_SUCCESSOR'}));
for(const node of nodes){
  const text=fp.texts.get(node.path);
  assert.equal(gitBlobSha(text),node.successor_sha,`${node.path}: content/hash mismatch`);
  const out=join(outRoot,'tree',node.path);
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,text,'utf8');
}
const manifest={schema_version:'engineer-osint-v4694-b106-compat-target-materialization-v1',status:'PASS_NON_AUTHORITATIVE_TARGET_MATERIALIZATION',reviewed_main_sha:reviewedMain,b106_normalized_dom_sha256:b106DomSha,successor_count:nodes.length,fixed_point_iterations:fp.iterations,workflow_successor_sha:workflowSuccessorSha,helper_successor_sha:helperSuccessorSha,nodes,authoritative_write_performed:false,canonical_or_run_store_write_performed:false};
mkdirSync(outRoot,{recursive:true});
writeFileSync(join(outRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`V4694_B106_TARGET_MATERIALIZATION PASS successors=${nodes.length} iterations=${fp.iterations}`);
