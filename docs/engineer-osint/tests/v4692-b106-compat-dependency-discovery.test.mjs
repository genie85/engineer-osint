import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const helperPath='docs/engineer-osint/tests/v4556-workflow-lifecycle-helper.mjs';
const selfPath='docs/engineer-osint/tests/v4692-b106-compat-dependency-discovery.test.mjs';
const workflowSourceSha='0aded293ae69be3844c73f6613f0a70b05320156';
const helperSourceSha='c7527860a5f175000b634a25d170698d70569b53';

const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};

const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const path=join(dir,entry.name).replaceAll('\\','/');
  return entry.isDirectory()?walk(path):[path];
});

const candidatePaths=walk('docs/engineer-osint/tests')
  .filter(path=>path.endsWith('.mjs')&&path!==selfPath)
  .sort();
const texts=new Map(candidatePaths.map(path=>[path,readFileSync(path,'utf8')]));
const currentShas=new Map(candidatePaths.map(path=>[path,gitBlobSha(texts.get(path))]));

const roots=[
  {path:workflowPath,sha:workflowSourceSha,kind:'WORKFLOW_ROOT'},
  {path:helperPath,sha:helperSourceSha,kind:'HELPER_ROOT'}
];

const expectedDirectWorkflowDependents=[
  'docs/engineer-osint/tests/v4557-browser-digest-normalization-hotfix.test.mjs',
  'docs/engineer-osint/tests/v4562-active-node24-migration.test.mjs',
  'docs/engineer-osint/tests/v4563-action-node24-authorization.test.mjs',
  'docs/engineer-osint/tests/v4565-action-upgrade-lifecycle-authorization.test.mjs',
  'docs/engineer-osint/tests/v4619-b103-public-cz-authorization.test.mjs',
  'docs/engineer-osint/tests/v4643-b104-wave2-local-image-authorization.test.mjs',
  'docs/engineer-osint/tests/v4646-b104-cc0-authorization.test.mjs',
  'docs/engineer-osint/tests/v4647-b104-browser-digest-successor.test.mjs',
  'docs/engineer-osint/tests/v4658-b105-browser-workflow-successor-authorization.test.mjs',
  'docs/engineer-osint/tests/v4660-b105-workflow-postwrite-compatibility-authorization.test.mjs',
  'docs/engineer-osint/tests/v4665-b105-wave3-local-image-append-authorization.test.mjs'
];

function discoverExactHashClosure(){
  const nodes=new Map(roots.map(root=>[root.path,{...root,depth:0}]));
  const queue=[...roots.map(root=>root.path)];
  const edges=[];
  while(queue.length){
    const sourcePath=queue.shift();
    const source=nodes.get(sourcePath);
    for(const path of candidatePaths){
      if(path===sourcePath)continue;
      const text=texts.get(path);
      if(!text.includes(source.sha))continue;
      edges.push({from:sourcePath,from_sha:source.sha,to:path});
      if(nodes.has(path))continue;
      const sha=currentShas.get(path);
      nodes.set(path,{path,sha,kind:'TEST_HASH_DEPENDENT',depth:source.depth+1});
      queue.push(path);
    }
  }
  return {nodes:[...nodes.values()].sort((a,b)=>a.depth-b.depth||a.path.localeCompare(b.path)),edges:edges.sort((a,b)=>a.to.localeCompare(b.to)||a.from.localeCompare(b.from))};
}

test('v4.6.92 discovers B106 exact-hash compatibility closure read-only from the exact B105 source state',()=>{
  assert.equal(gitBlobSha(readFileSync(workflowPath)),workflowSourceSha,'identity workflow source drifted before B106 closure discovery');
  assert.equal(gitBlobSha(readFileSync(helperPath)),helperSourceSha,'workflow lifecycle helper source drifted before B106 closure discovery');

  const closure=discoverExactHashClosure();
  const workflowDirect=closure.edges.filter(edge=>edge.from===workflowPath).map(edge=>edge.to);
  for(const path of expectedDirectWorkflowDependents){
    assert.ok(workflowDirect.includes(path),`known exact workflow dependent missing from discovery: ${path}`);
  }

  const helperSemanticDependents=candidatePaths.filter(path=>texts.get(path).includes('v4556-workflow-lifecycle-helper.mjs')).sort();
  assert.ok(helperSemanticDependents.includes('docs/engineer-osint/tests/v4550-one-shot-workflow-removal.test.mjs'));
  assert.ok(helperSemanticDependents.includes('docs/engineer-osint/tests/v4556-historical-manual-only-execution.test.mjs'));

  const report={
    schema_version:'engineer-osint-v4692-b106-compat-dependency-discovery-v1',
    status:'PASS_READ_ONLY',
    reviewed_source:{workflow:{path:workflowPath,git_blob_sha:workflowSourceSha},helper:{path:helperPath,git_blob_sha:helperSourceSha}},
    exact_hash_closure:closure,
    helper_semantic_dependents:helperSemanticDependents,
    authoritative_write_performed:false,
    canonical_or_run_store_write_performed:false
  };
  console.log('V4692_B106_COMPAT_DEPENDENCY_DISCOVERY '+JSON.stringify(report));
});
