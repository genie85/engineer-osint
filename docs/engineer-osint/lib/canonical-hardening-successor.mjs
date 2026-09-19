// Exact current hardening state, with a historical projection for old contracts.
// This grants no execution, merge or deployment authority.
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {relative,resolve} from 'node:path';

const recordPath='docs/engineer-osint/CANONICAL_EXECUTOR_HARDENING_20260919.json';
const additionPath='docs/engineer-osint/GUARD_WORKFLOW_ADDITION_AUTHORIZATION_20260919.json';
const workflowPath='.github/workflows/authorized-canonical-executor.yml';
const guardPath='.github/workflows/safe-automerge-dry-run.yml';
const closurePaths=[
  'docs/engineer-osint/lib/canonical-hardening-successor.mjs',
  'docs/engineer-osint/tests/v4562-active-node24-migration.test.mjs',
];
const baseWorkflowNames=[
  'authorized-canonical-executor.yml',
  'first-three-overlay-retirement-regression.yml',
  'i18n-switch-regression.yml',
  'identity-fix-retirement-authorization.yml',
  'identity-fix-retirement-readiness.yml',
  'identity-fix-retirement-regression.yml',
  'pages.yml',
  'runtime-audit-snapshot.yml',
];
const guardBlobs=new Map([
  [guardPath,'748298da14649d68457f74cfd3037dc9a674ab14'],
  ['tools/safe_automerge.py','6c98d05067a1901fd7db697a524722fac47bda3a'],
  ['tools/safe-automerge-policy.json','2dd24c66c07591081f04170562d30a2124a64a82'],
]);
const blob=raw=>createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');
const sha256=raw=>createHash('sha256').update(raw).digest('hex');

function exactObject(value,keys,label){
  if(value===null || typeof value!=='object' || Array.isArray(value) ||
     JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort())){
    throw Error(`${label} schema drift`);
  }
}

function parseAddition(raw){
  let value;
  const text=String(raw);
  try{value=JSON.parse(text);}catch{throw Error('guard JSON syntax drift');}
  // JSON.parse alone silently accepts the last occurrence of a repeated key.
  // Grammar is already validated above; tokenized strings keep escaped quotes,
  // braces and colons inside values from being mistaken for object structure.
  const tokens=text.match(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]/g)??[];
  const stack=[];
  for(let i=0;i<tokens.length;i++){
    const token=tokens[i];
    if(token==='{')stack.push(new Set());
    else if(token==='[')stack.push(null);
    else if(token==='}' || token===']')stack.pop();
    else if(token.startsWith('"') && tokens[i+1]===':'){
      const key=JSON.parse(token); // Decodes equivalent spellings such as \\u0041.
      const keys=stack.at(-1);
      if(!(keys instanceof Set) || keys.has(key))throw Error('guard duplicate JSON key drift');
      keys.add(key);
    }
  }
  return value;
}

function validateAdditionSchema(addition){
  exactObject(addition,[
    'schemaVersion','basisRequest','reviewedBase','reviewedGuardHead','status',
    'bootstrapSelfAuthorization','authorization','baseWorkflows','guardArtifacts','exactSuccessors',
  ],'guard root');
  for(const key of ['schemaVersion','basisRequest','reviewedBase','reviewedGuardHead','status']){
    if(typeof addition[key]!=='string')throw Error(`guard ${key} type drift`);
  }
  if(typeof addition.bootstrapSelfAuthorization!=='boolean')throw Error('guard bootstrap type drift');
  exactObject(addition.authorization,[
    'canonicalExecution','mergeAuthorized','deployAuthorized','wildcardSuccessors',
  ],'guard authorization');
  for(const value of Object.values(addition.authorization)){
    if(typeof value!=='boolean')throw Error('guard authorization type drift');
  }
  for(const collection of ['baseWorkflows','guardArtifacts','exactSuccessors']){
    if(!Array.isArray(addition[collection]))throw Error(`guard ${collection} type drift`);
    const keys=collection==='exactSuccessors'?['path','sourceGitBlob','successorGitBlob']:['path','gitBlob'];
    for(const item of addition[collection]){
      exactObject(item,keys,`guard ${collection} item`);
      for(const key of keys){
        if(typeof item[key]!=='string')throw Error(`guard ${collection} ${key} type drift`);
        if(key!=='path' && !/^[a-f0-9]{40}$/.test(item[key]))throw Error(`guard ${collection} hash drift`);
      }
    }
  }
}

function exactPaths(items,paths,label){
  if(!Array.isArray(items) || items.length!==paths.length ||
     JSON.stringify(items.map(x=>x.path).sort())!==JSON.stringify([...paths].sort())){
    throw Error(`${label} inventory drift`);
  }
}

function verifyState(read,list){
  // This branch admits exactly one additive successor. Missing records or partial
  // application never silently fall back to the previous, eight-workflow state.
  const original=read(recordPath);
  if(sha256(original)!=='cefcb81bc4d436be23e4be54ea24e5ee24acbb9f220320794d4cf036eb640601'){
    throw Error('hardening record drift');
  }
  const record=JSON.parse(original);
  const addition=parseAddition(read(additionPath));
  validateAdditionSchema(addition);
  if(addition.schemaVersion!=='engineer.guard-workflow-addition.v2' ||
     addition.basisRequest!=='20260919T182642Z-bff9f7dde2' ||
     addition.reviewedBase!=='ca19dee75b96a8360fd7457640ee793d6f7ee57f' ||
     addition.reviewedGuardHead!=='1ab473e8373ee15288f64c823bba29926d2d055c' ||
     addition.status!=='LOCAL_PROPOSAL_NOT_ACTIVATED' ||
     addition.bootstrapSelfAuthorization!==false ||
     Object.values(addition.authorization).some(value=>value!==false)){
    throw Error('guard addition authorization drift');
  }
  exactPaths(addition.baseWorkflows,baseWorkflowNames.map(x=>`.github/workflows/${x}`),'base workflow');
  exactPaths(addition.guardArtifacts,[...guardBlobs.keys()],'guard artifact');
  exactPaths(addition.exactSuccessors,closurePaths,'guard closure');
  const names=list('.github/workflows').filter(x=>/\.ya?ml$/i.test(x)).sort();
  if(JSON.stringify(names)!==JSON.stringify([...baseWorkflowNames,'safe-automerge-dry-run.yml'].sort())){
    throw Error('guard workflow inventory drift');
  }
  for(const item of [...addition.baseWorkflows,...addition.guardArtifacts]){
    if(!/^[a-f0-9]{40}$/.test(item.gitBlob) || blob(read(item.path))!==item.gitBlob ||
       (guardBlobs.has(item.path) && item.gitBlob!==guardBlobs.get(item.path))){
      throw Error(`guard artifact drift: ${item.path}`);
    }
  }
  const overrides=new Map();
  for(const item of addition.exactSuccessors){
    const previous=record.exactSuccessors.find(x=>x.path===item.path);
    if(item.sourceGitBlob!==previous?.successorGitBlob ||
       !/^[a-f0-9]{40}$/.test(item.successorGitBlob) ||
       item.successorGitBlob===item.sourceGitBlob){
      throw Error(`guard successor source drift: ${item.path}`);
    }
    overrides.set(item.path,item.successorGitBlob);
  }

  if(record.schemaVersion!=='engineer.canonical-hardening.v1' ||
     record.authorization.canonicalExecution!==false || record.authorization.merge!==false ||
     record.authorization.deploy!==false || record.authorization.wildcardSuccessors!==false ||
     record.historicalAuthorityDisposition!=='historical-only-superseded-for-current-execution')throw Error('hardening authorization drift');
  const paths=record.exactSuccessors.map(x=>x.path);
  if(new Set(paths).size!==paths.length || !paths.includes(workflowPath))throw Error('hardening inventory drift');
  for(const item of record.exactSuccessors){
    const expected=overrides.get(item.path)??item.successorGitBlob;
    if(blob(read(item.path))!==expected)throw Error(`hardening successor drift: ${item.path}`);
  }
  for(const item of record.historicalAuthorizations){
    if(blob(read(item.path))!==item.gitBlob)throw Error(`historical authorization drift: ${item.path}`);
  }
  if(blob(record.historicalWorkflow)!==record.exactSuccessors.find(x=>x.path===workflowPath).sourceGitBlob)throw Error('historical workflow drift');
  return {record,addition};
}

export function assertHardeningState(read=readFileSync,list=readdirSync){
  return verifyState(read,list).record;
}

export function assertGuardWorkflowAddition(read=readFileSync,list=readdirSync){
  return verifyState(read,list).addition;
}

export function historicalBlob(path){
  const record=assertHardeningState();
  const normalized=relative(process.cwd(),resolve(path)).split('\\').join('/');
  const item=record.exactSuccessors.find(x=>x.path===normalized);
  // Projection is allowed only after every successor and historical record matched.
  // Unknown or partially applied successors never reach this branch.
  return item?.sourceGitBlob ?? blob(readFileSync(path));
}

export function historicalWorkflow(){
  return assertHardeningState().historicalWorkflow;
}
