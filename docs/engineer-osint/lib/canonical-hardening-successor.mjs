// Exact current hardening state, with a historical projection for old contracts.
// This grants no execution, merge or deployment authority.
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {relative,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseJsonStrict,canonicalDigest} from './integrity.mjs';

const recordPath='docs/engineer-osint/CANONICAL_EXECUTOR_HARDENING_20260919.json';
const additionPath='docs/engineer-osint/GUARD_WORKFLOW_ADDITION_AUTHORIZATION_20260919.json';
const workflowPath='.github/workflows/authorized-canonical-executor.yml';
const guardPath='.github/workflows/safe-automerge-dry-run.yml';
const historicalInventorySources=new Map([
  [
    "docs/engineer-osint/tests/v4548-migration-workflow-classification.test.mjs",
    "cb8aae9e8d5ef3ab721a4c8c64784914313adf0f"
  ],
  [
    "docs/engineer-osint/tests/v4550-one-shot-workflow-removal.test.mjs",
    "3936d282fe60661e731e126459bcd6e16c16bc9e"
  ],
  [
    "docs/engineer-osint/tests/v4551-readonly-migration-workflow-disposition.test.mjs",
    "9839878689b21afcb36253d6d7fde4b8e50026ec"
  ],
  [
    "docs/engineer-osint/tests/v4552-readonly-workflow-removal-authorization.test.mjs",
    "889de4092ab2fdac22ed4a572745c562bc11e0b9"
  ],
  [
    "docs/engineer-osint/tests/v4553-readonly-workflow-removal.test.mjs",
    "e5319f4d2e67dd903ebc4b615b14695e62b846ba"
  ],
  [
    "docs/engineer-osint/tests/v4554-minimized-workflow-trigger-coverage.test.mjs",
    "cb2db6966905393a93c85f770fa1a741db6a5cde"
  ],
  [
    "docs/engineer-osint/tests/v4555-historical-trigger-manual-only-authorization.test.mjs",
    "09b5486358d6187979b7238b57eae9c29d37d59f"
  ],
  [
    "docs/engineer-osint/tests/v4556-historical-manual-only-execution.test.mjs",
    "1f40621bec38bda233c6e10a3d1afebd6ec9bd30"
  ]
]);
const closurePaths=[
  ...historicalInventorySources.keys(),
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
  const b106=assertB106GuardState(read);
  const actualBlob=path=>b106.projection.get(path)??blob(read(path));
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
    if(!/^[a-f0-9]{40}$/.test(item.gitBlob) || actualBlob(item.path)!==item.gitBlob ||
       (guardBlobs.has(item.path) && item.gitBlob!==guardBlobs.get(item.path))){
      throw Error(`guard artifact drift: ${item.path}`);
    }
  }
  const overrides=new Map();
  for(const item of addition.exactSuccessors){
    const previous=record.exactSuccessors.find(x=>x.path===item.path);
    if(item.sourceGitBlob!==(previous?.successorGitBlob??historicalInventorySources.get(item.path)) ||
       !/^[a-f0-9]{40}$/.test(item.successorGitBlob) ||
       item.successorGitBlob===item.sourceGitBlob){
      throw Error(`guard successor source drift: ${item.path}`);
    }
    if(actualBlob(item.path)!==item.successorGitBlob)throw Error(`guard successor target drift: ${item.path}`);
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
    if(actualBlob(item.path)!==expected)throw Error(`hardening successor drift: ${item.path}`);
  }
  for(const item of record.historicalAuthorizations){
    if(actualBlob(item.path)!==item.gitBlob)throw Error(`historical authorization drift: ${item.path}`);
  }
  if(blob(record.historicalWorkflow)!==record.exactSuccessors.find(x=>x.path===workflowPath).sourceGitBlob)throw Error('historical workflow drift');
  return {record,addition,b106};
}

export function assertHardeningState(read=readFileSync,list=readdirSync){
  return verifyState(read,list).record;
}

export function assertGuardWorkflowAddition(read=readFileSync,list=readdirSync){
  return verifyState(read,list).addition;
}

export function historicalBlob(path){
  const {record,b106}=verifyState(readFileSync,readdirSync);
  const normalized=relative(process.cwd(),resolve(path)).split('\\').join('/');
  const item=record.exactSuccessors.find(x=>x.path===normalized);
  // Projection is allowed only after every successor and historical record matched.
  // Unknown or partially applied successors never reach this branch.
  return item?.sourceGitBlob ?? historicalInventorySources.get(normalized) ?? b106.projection.get(normalized) ?? blob(readFileSync(path));
}

export function historicalWorkflow(){
  return assertHardeningState().historicalWorkflow;
}

// This projection is available only after exact validation of all nine live
// workflows, their bytes, the explicit test closure and every authority record.
export function historicalWorkflowNames(read=readFileSync,list=readdirSync){
  verifyState(read,list);
  return baseWorkflowNames.filter(name=>`.github/workflows/${name}`!==workflowPath).sort();
}

// B106 adds one finite implementation transition; this record grants no execution.
export const B106_GUARD_PATH='docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_20260920.json';
const B106_VECTOR=[
  {
    "path": "docs/engineer-osint/append-run.mjs",
    "sourceGitBlob": "376bdf810c47c3bf934d0cadeacff3b1f61e1115",
    "targetGitBlob": "db67f9508dcc5ba7554603bc6c822944419a549a",
    "targetSha256": "c4c0470b25ca3ded2d05330806984ee9cc9899763b85584a106be3ea8328cf8e"
  },
  {
    "path": "docs/engineer-osint/tests/b106-strict-dispatcher.test.mjs",
    "sourceGitBlob": "ABSENT",
    "targetGitBlob": "1b08e17dd77f4ba7cf94d05f46d18359d9d42a8e",
    "targetSha256": "7484f6fba1b3bb129634f2c9094de2faa9c028391191cb8f2cb3c66736c47a2e"
  },
  {
    "path": "docs/engineer-osint/tests/v4593-b100-append-authorization.test.mjs",
    "sourceGitBlob": "917aa10230d81de202f21e63c5e3ddd8eace510c",
    "targetGitBlob": "8b30ee354a4e5386a146ee7abdf698317e151418",
    "targetSha256": "4b8c13707d2a53178a5c6f8c32c8f2830e5919bb2a40b11cc96fb9c8353182cd"
  },
  {
    "path": "docs/engineer-osint/tests/v4594-b100-execution.test.mjs",
    "sourceGitBlob": "60d10d3a255ddc22600a2db85a3cb89212318b6f",
    "targetGitBlob": "3bfc4697d6cf57c701c974ca2fa10e2099e31515",
    "targetSha256": "09e07a54c446eb30cf268106f7d28f314cd0e8684540591cf4e970ed33d3787a"
  },
  {
    "path": "docs/engineer-osint/tests/v4596-b101-authorization-derivation.test.mjs",
    "sourceGitBlob": "8941fec2ce1a6bdcdcd12af2edf3a43fe0f014ee",
    "targetGitBlob": "865d11e77174d92cfe79fcd4e829f0ec78e2e607",
    "targetSha256": "574f868b1e473edf5242a7ce6d7770f7e3a2db53fe69965c8b09ac08303755d9"
  },
  {
    "path": "docs/engineer-osint/tests/v4597-b101-execution.test.mjs",
    "sourceGitBlob": "0ad2cef8827c11031210fed5088038f0f94378e9",
    "targetGitBlob": "dd65f3ee6f6b27000208c4dd7c4cf6bf427f352d",
    "targetSha256": "8ab0f54062c0fc80e4dc41839cd2c03e045e15e51082a90d5b605d1bfcc23a45"
  },
  {
    "path": "docs/engineer-osint/tests/v4599-b102-authorization-derivation.test.mjs",
    "sourceGitBlob": "b8600bd47e3fb0dfdf579bca24e48f2cb1a52918",
    "targetGitBlob": "7121ac6553019c0c0926d18fc6687703f29ea905",
    "targetSha256": "88c27f7a5f88e179d8d70a51cf0eb2ded9979338c6b2885578e57e4dd4ee0e98"
  },
  {
    "path": "docs/engineer-osint/tests/v4600-b102-execution.test.mjs",
    "sourceGitBlob": "c93ecce95fa927fd5fe47e5982c5dfafd46c4973",
    "targetGitBlob": "d2be6c460f021498dd628ff85a3c210b659f026a",
    "targetSha256": "6ca9f9514aafe4d32560abce7c9c505943428e7cb1c22b436a7048a26cf7605b"
  },
  {
    "path": "docs/engineer-osint/tests/v4604-b103-local-image-authorization.test.mjs",
    "sourceGitBlob": "b56aa561f2271c5feac39ceb0b463cacb927da84",
    "targetGitBlob": "c875c8e74230a8da783361883eeca30acf18f0b6",
    "targetSha256": "a9f65019e45b8479391abea3c100ded528171621b67378e077fb1a09d345d63f"
  },
  {
    "path": "docs/engineer-osint/tests/v4605-canonical-executor-authorization.test.mjs",
    "sourceGitBlob": "c12146e71a4af724748904739ac4ddaaf7abafdd",
    "targetGitBlob": "2bd9c943415fde579c6d5693a650af55a5677ced",
    "targetSha256": "9e75da4c66724aa974a01676b295c495d6c4e4fa4b4c15bda88b6df09e960dd2"
  },
  {
    "path": "docs/engineer-osint/tests/v4606-authorized-canonical-executor.test.mjs",
    "sourceGitBlob": "b5af004df50e680d433f3e949a9ce9f4f4346f97",
    "targetGitBlob": "dcfd0a4223ab64e86630b01df8c7c46e679839c3",
    "targetSha256": "329a1ee785ecb1ccf407b4f9127e8845d76db46ea6eaf6690e1956dee007c665"
  },
  {
    "path": "docs/engineer-osint/tests/v4619-b103-public-cz-authorization.test.mjs",
    "sourceGitBlob": "c51f6a756a2b4cd86de302a47a93b582e3b6996b",
    "targetGitBlob": "51614f53a431297a8f2d22cc6b3b69043cefde06",
    "targetSha256": "d5680cb0fb2aee991fb2b84a51bf60e3b9f0bb9ccab4340230fadc56eca1aa96"
  }
];
const B106_ANCHORS=[
  {
    "path": "docs/engineer-osint/CANONICAL_EXECUTOR_HARDENING_20260919.json",
    "gitBlob": "f9290c4a2a42652c3800ae99153ee9d37e424cb1",
    "sha256": "cefcb81bc4d436be23e4be54ea24e5ee24acbb9f220320794d4cf036eb640601"
  },
  {
    "path": "docs/engineer-osint/GUARD_WORKFLOW_ADDITION_AUTHORIZATION_20260919.json",
    "gitBlob": "f77f380f4fe3ba7b336e9a3fd3fd520c14299a02",
    "sha256": "be70cc2b35901a76c6a9a3b52b154eb4ce8a210117c7460db00777ae27e50715"
  },
  {
    "path": "docs/engineer-osint/B106_APPEND_READINESS_REVIEW_20260919.json",
    "gitBlob": "fb3a24998c99257b2e673b47e6b3edd818fd7807",
    "sha256": "9093e54d76b1ee3e3f45125294b4d17db1ff23c781ba52ed160493481490ee7e"
  },
  {
    "path": "docs/engineer-osint/B106_READINESS_REVIEW_20260919.md",
    "gitBlob": "94c58b0ddfa6da317cb00d09dac09235e2be637c",
    "sha256": "6b2cc8474e1c6cc417136c4958d413666e29f8bb331a2ef7ad75e54b43d78659"
  },
  {
    "path": "docs/engineer-osint/osint-publication-candidates/v4653-b106-wave3-v4588-local-images-public-cz.json",
    "gitBlob": "e578ed3ea06ed0e67dfec7a1b2b979a0b2c418b1",
    "sha256": "56b4896445fd48d201c38a6d807a6600f7fc407f5a1d880c969f579029b6fc76"
  }
];
const B106_PHASE_PATHS=[
  "docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_20260920.json",
  "docs/engineer-osint/lib/canonical-hardening-successor.mjs",
  "docs/engineer-osint/tests/b106-guard-successor.test.mjs",
  "docs/engineer-osint/audit-b106-readiness-20260919.mjs",
  "docs/engineer-osint/tests/b106-readiness-20260919.test.mjs"
];
const B106_BASE_INVENTORY='48f1e37c33d6b241ab51b6f29785e1a24340076f90e228b675a5ab488ce86bec';
const B106_VERIFIER_SOURCE='af5e5cebf1c96dc6368e1ee7f38c168d6c603e6c';
const B106_PHASE_SOURCES=["af5e5cebf1c96dc6368e1ee7f38c168d6c603e6c", "ABSENT", "7beee0bd4895ef3ea5b39f25ff4d4e84fcba19ee", "5a9e8985777b59392befb8ca3f4efc5a4fe984bf"];
const guardFail=label=>{throw Error('B106 guard drift: '+label);};
function equalGuard(value,expected,label){if(canonicalDigest(value)!==canonicalDigest(expected))guardFail(label);}
function closedGuard(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value))guardFail(label+' object');
 equalGuard(Object.keys(value).sort(),[...keys].sort(),label+' keys');
}
export function b106GitInventory(){
 const git=args=>execFileSync('git',args,{maxBuffer:4*1024*1024});
 return {tree:git(['ls-tree','-r','-z','HEAD']),changed:[...new Set([...git(['diff','--no-ext-diff','--name-only','HEAD']).toString().split('\n'),...git(['ls-files','--others','--exclude-standard']).toString().split('\n')].filter(Boolean))]};
}
function checkB106Inventory(inventory){
 const {tree,changed}=inventory;
 if(!Buffer.isBuffer(tree)||tree.at(-1)!==0||!Array.isArray(changed))guardFail('inventory type');
 const permitted=new Set([...B106_PHASE_PATHS,...B106_VECTOR.map(x=>x.path)]);
 if(changed.some(p=>!permitted.has(p)))guardFail('additional changed path');
 const seen=new Set(),rows=[];
 for(const row of tree.toString().slice(0,-1).split('\0')){
  const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t([^\0]+)$/.exec(row);if(!m||seen.has(m[4]))guardFail('tree entry');seen.add(m[4]);
  const [_,mode,type,id,path]=m;
  if(B106_PHASE_PATHS.includes(path)){if(mode!=='100644'||type!=='blob')guardFail('phase mode');continue;}
  const item=B106_VECTOR.find(x=>x.path===path);
  if(item){
   if(mode!=='100644'||type!=='blob'||![item.sourceGitBlob,item.targetGitBlob].includes(id))guardFail('vector tree blob');
   if(item.sourceGitBlob!=='ABSENT')rows.push(`100644 blob ${item.sourceGitBlob}\t${path}`);
  }else rows.push(row);
 }
 if(sha256(Buffer.from(rows.join('\0')+'\0'))!==B106_BASE_INVENTORY)guardFail('original inventory');
}
export function assertB106GuardState(read=readFileSync,inventory=b106GitInventory){
 if(read===readFileSync)read=path=>{
  const parts=path.split('/');
  for(let i=1;i<=parts.length;i++){const stat=lstatSync(parts.slice(0,i).join('/'));if(stat.isSymbolicLink()||(i<parts.length?!stat.isDirectory():!stat.isFile()||stat.nlink!==1))guardFail('aliased path '+path);}
  return readFileSync(path);
 };
 let a;try{const raw=read(B106_GUARD_PATH).toString();a=parseJsonStrict(raw,{source:'B106 guard',maxBytes:65536,maxDepth:30});if(raw!==JSON.stringify(a,null,2)+'\n')guardFail('canonical record bytes');}catch(error){throw Error('B106 guard drift: '+error.message);}
 closedGuard(a,['schemaVersion','basisRequest','reviewedBase','reviewedTree','status','grants','anchors','implementationVector','phaseOneArtifacts'],'record');
 equalGuard({schemaVersion:a.schemaVersion,basisRequest:a.basisRequest,reviewedBase:a.reviewedBase,reviewedTree:a.reviewedTree,status:a.status},{schemaVersion:'engineer.b106-guard-successor.v1',basisRequest:'20260920T034639Z-d27fa88a34',reviewedBase:'b9bc2e1c2b0a2038549f11dc4c3677bbb24388a0',reviewedTree:'e232906ba00eab6353107f22632429fe058d2043',status:'GUARD_REVIEWED_NO_EXECUTION'},'identity');
 equalGuard(a.grants,{append:false,write:false,execution:false,merge:false,deploy:false,publish:false,wildcard:false,currentState:false,bootstrap:false},'grants');
 equalGuard(a.anchors,B106_ANCHORS,'anchors schema/values');equalGuard(a.implementationVector,B106_VECTOR,'vector schema/values');
 for(const item of a.anchors){const raw=read(item.path);if(blob(raw)!==item.gitBlob||sha256(raw)!==item.sha256)guardFail('anchor '+item.path);}
 if(!Array.isArray(a.phaseOneArtifacts)||a.phaseOneArtifacts.length!==4)guardFail('phase artifact inventory');
 const projection=new Map();
 for(const [i,item] of a.phaseOneArtifacts.entries()){
  closedGuard(item,['path','sourceGitBlob','targetGitBlob','targetSha256'],'phase artifact');
  if(item.path!==B106_PHASE_PATHS[i+1]||item.sourceGitBlob!==B106_PHASE_SOURCES[i]||typeof item.targetGitBlob!=='string'||!/^([a-f0-9]{40})$/.test(item.targetGitBlob)||typeof item.targetSha256!=='string'||!/^[a-f0-9]{64}$/.test(item.targetSha256)||item.targetGitBlob===item.sourceGitBlob)guardFail('phase artifact values');
  const raw=read(item.path);if(blob(raw)!==item.targetGitBlob||sha256(raw)!==item.targetSha256)guardFail('phase artifact '+item.path);
  if(item.sourceGitBlob!=='ABSENT')projection.set(item.path,item.sourceGitBlob);
 }
 let source=true,successor=true;
 for(const item of a.implementationVector){
  let actual;try{const raw=read(item.path);actual=blob(raw);if(actual===item.targetGitBlob&&sha256(raw)!==item.targetSha256)guardFail('target raw hash');}catch(error){if(error.code!=='ENOENT')throw error;actual='ABSENT';}
  source&&=actual===item.sourceGitBlob;successor&&=actual===item.targetGitBlob;
  projection.set(item.path,item.sourceGitBlob);
 }
 if(source===successor)guardFail('partial/mixed/third implementation state');
 checkB106Inventory(inventory());
 return {record:a,mode:source?'SOURCE':'SUCCESSOR',projection};
}
export function historicalB106Blob(path){
 const state=assertB106GuardState();
 if(!B106_VECTOR.some(x=>x.path===path))guardFail('unknown historical path');
 return state.projection.get(path);
}
