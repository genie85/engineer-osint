import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const helperPath='docs/engineer-osint/tests/v4556-workflow-lifecycle-helper.mjs';
const selfPath='docs/engineer-osint/tests/v4693-b106-compat-fixed-point-readout.test.mjs';
const workflowSourceSha='0aded293ae69be3844c73f6613f0a70b05320156';
const workflowSuccessorSha='e44cb9caf5fc61c83ad254f7b829977245abec49';
const helperSourceSha='c7527860a5f175000b634a25d170698d70569b53';
const b106DomSha='52ab8b1d862de74128cd25e49b46f4cbb3d316cc8b8413850781a46aa6a8200c';

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
  const pyFrom=`              ${b105}\n`;
  const pyTo=`              ${b105},\n              'engineer-osint-20260904-B106':'${b106DomSha}'\n`;
  const jsFrom=`            ${b105}\n`;
  const jsTo=`            ${b105},\n            'engineer-osint-20260904-B106':'${b106DomSha}'\n`;
  let target=replaceExact(source,pyFrom,pyTo,'Python B105 digest map');
  target=replaceExact(target,jsFrom,jsTo,'Node B105 digest map');
  assert.equal(gitBlobSha(target),workflowSuccessorSha,'B106 workflow target diverges from materialized PR #452 successor');
  return target;
}

function deriveHelperTarget(source){
  let target=source;
  target=replaceExact(target,
    "const b105IdentityWorkflowSha='0aded293ae69be3844c73f6613f0a70b05320156';",
    `const b105IdentityWorkflowSha='${workflowSourceSha}';\nconst b106IdentityWorkflowSha='${workflowSuccessorSha}';`,
    'B105 helper workflow constant');
  target=replaceExact(target,
    'const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha];',
    'const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha];',
    'published workflow successor list');
  for(const [from,to,label] of [
    ['if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B101 descendant set'],
    ['if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B102 descendant set'],
    ['if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B103 descendant set'],
    ['if([b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b104IdentityWorkflowSha,b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B104 descendant set'],
    ['if(current===b105IdentityWorkflowSha)','if([b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))','B105 descendant set']
  ]) target=replaceExact(target,from,to,label);
  const b105Assert="    if([b105IdentityWorkflowSha,b106IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260904-B105':'25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7'/,'B105 exact digest anchor missing');";
  target=replaceExact(target,b105Assert,
    `${b105Assert}\n    if(current===b106IdentityWorkflowSha)assert.match(text,/'engineer-osint-20260904-B106':'${b106DomSha}'/,'B106 exact digest anchor missing');`,
    'B105 helper digest assertion');
  assert.match(target,/no exact digest authorized for current run/,'helper unknown-run fail-closed guard missing');
  return target;
}

function stableFixedPoint(sourceTexts,rootTargets){
  const paths=[...sourceTexts.keys()].sort();
  const sourceShas=new Map(paths.map(path=>[path,gitBlobSha(sourceTexts.get(path))]));
  let targetTexts=new Map(paths.map(path=>[path,rootTargets.get(path)??sourceTexts.get(path)]));
  let targetShas=new Map(paths.map(path=>[path,gitBlobSha(targetTexts.get(path))]));
  let iterations=0;
  for(;iterations<64;iterations++){
    const nextTexts=new Map();
    for(const path of paths){
      if(rootTargets.has(path)){ nextTexts.set(path,rootTargets.get(path)); continue; }
      let text=sourceTexts.get(path);
      for(const dep of paths){
        const oldSha=sourceShas.get(dep),newSha=targetShas.get(dep);
        if(oldSha!==newSha && text.includes(oldSha))text=text.replaceAll(oldSha,newSha);
      }
      nextTexts.set(path,text);
    }
    const nextShas=new Map(paths.map(path=>[path,gitBlobSha(nextTexts.get(path))]));
    const stable=paths.every(path=>nextShas.get(path)===targetShas.get(path));
    targetTexts=nextTexts; targetShas=nextShas;
    if(stable)break;
  }
  assert.ok(iterations<64,'B106 compatibility fixed point did not converge');
  return {paths,sourceShas,targetTexts,targetShas,iterations:iterations+1};
}

test('v4.6.93 derives the exact B106 compatibility successor fixed point without repository writes',()=>{
  const candidatePaths=walk('docs/engineer-osint/tests').filter(path=>path.endsWith('.mjs')&&path!==selfPath).sort();
  const sourceTexts=new Map([[workflowPath,readFileSync(workflowPath,'utf8')],...candidatePaths.map(path=>[path,readFileSync(path,'utf8')])]);
  assert.equal(gitBlobSha(sourceTexts.get(workflowPath)),workflowSourceSha,'workflow source drifted');
  assert.equal(gitBlobSha(sourceTexts.get(helperPath)),helperSourceSha,'helper source drifted');

  const workflowTarget=deriveWorkflowTarget(sourceTexts.get(workflowPath));
  const helperTarget=deriveHelperTarget(sourceTexts.get(helperPath));
  const roots=new Map([[workflowPath,workflowTarget],[helperPath,helperTarget]]);
  const fp=stableFixedPoint(sourceTexts,roots);
  assert.equal(fp.targetShas.get(workflowPath),workflowSuccessorSha);
  const changed=fp.paths.filter(path=>fp.sourceShas.get(path)!==fp.targetShas.get(path));
  assert.equal(changed.length,35,`unexpected B106 compatibility successor count: ${changed.length}`);

  const nodes=changed.map(path=>{
    const replacements=roots.has(path)?[]:changed.filter(dep=>sourceTexts.get(path).includes(fp.sourceShas.get(dep))).map(dep=>({dependency_path:dep,source_sha:fp.sourceShas.get(dep),successor_sha:fp.targetShas.get(dep)}));
    if(!roots.has(path))assert.ok(replacements.length>0,`${path}: changed without exact predecessor dependency`);
    const target=fp.targetTexts.get(path);
    if(!roots.has(path))for(const replacement of replacements)assert.ok(!target.includes(replacement.source_sha),`${path}: stale predecessor SHA remains for ${replacement.dependency_path}`);
    return {path,kind:roots.has(path)?'ROOT_SUCCESSOR':'TRANSITIVE_EXACT_HASH_SUCCESSOR',source_sha:fp.sourceShas.get(path),successor_sha:fp.targetShas.get(path),replacements};
  });
  const report={schema_version:'engineer-osint-v4693-b106-compat-fixed-point-readout-v1',status:'PASS_READ_ONLY',reviewed_main_sha:'98e8b80e614defc5cd4f2a6ddcdd45032c4c2f6d',workflow_successor_sha:workflowSuccessorSha,helper_successor_sha:fp.targetShas.get(helperPath),b106_normalized_dom_sha256:b106DomSha,successor_count:changed.length,fixed_point_iterations:fp.iterations,nodes,authoritative_write_performed:false,canonical_or_run_store_write_performed:false};
  console.log(`::notice title=V4693_B106_FIXED_POINT::${JSON.stringify(report)}`);
  console.log(`V4693_B106_FIXED_POINT PASS successors=${changed.length} iterations=${fp.iterations} helper=${fp.targetShas.get(helperPath)}`);
});
