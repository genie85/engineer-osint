// Exact current hardening state, with a historical projection for old contracts.
// This grants no execution, merge or deployment authority.
import {readFileSync as nativeRootReadFileSync,readdirSync,lstatSync} from 'node:fs';
const readFileSync=(...args)=>rootReadFileSync(...args);
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
  // Preserve injected-reader mutation rejection, then project the same proven live reads.
  if(rootSession&&read!==readFileSync)read=rootSession.ctx.projectRead(read);
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
 if(rootSession){verifyRootInspection();return rootSession.ctx.projectedInventory();}
 const git=args=>execFileSync('git',args,{maxBuffer:4*1024*1024});
 return {tree:git(['ls-tree','-r','-z','HEAD']),changed:[...new Set([...git(['diff','--no-ext-diff','--name-only','HEAD']).toString().split('\n'),...git(['ls-files','--others','--exclude-standard']).toString().split('\n')].filter(Boolean))]};
}
// The immutable old record remains evidence. This additive layer validates all
// current bytes before deriving an explicit compatibility view for unchanged R2.
// No execution authority or partial-state/live-blob fallback is granted.
export const B106_CI_CLOSURE_PATH="docs/engineer-osint/B106_CI_CLOSURE_SUCCESSOR_AUTHORIZATION_20260920.json";
const CI_IDENTITY={
  "schemaVersion": "engineer.b106-ci-closure-successor.v1",
  "basisRequest": "20260920T052658Z-8aa03f8352",
  "reviewedBase": "85fe7f2aa337a22e546665204f36f9c1c3cb5f8e",
  "reviewedTree": "329d7f22f2257534ea968df85d9a613de84629f1",
  "status": "CI_CLOSURE_REVIEWED_NO_EXECUTION"
};
const CI_VECTOR=[
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
    "path": "docs/engineer-osint/tests/v4618-b103-preauthorization-simulation.test.mjs",
    "sourceGitBlob": "abfc216575e1a372faa5ebc0982ee7f4bb52ae30",
    "targetGitBlob": "b6dde5469afecee1dd900751ea3f6d8006d78d56",
    "targetSha256": "1563bbb32c5d81fdfe14484a7084ba56100e8829665f1c56f04805122b1ef13c"
  },
  {
    "path": "docs/engineer-osint/tests/v4619-b103-public-cz-authorization.test.mjs",
    "sourceGitBlob": "c51f6a756a2b4cd86de302a47a93b582e3b6996b",
    "targetGitBlob": "03fd480878e00068c0d34afe4e5d6658aec13deb",
    "targetSha256": "e9947c46d01bc99fb1609a1a9ab9e0cd0247eeb18b19163bc62a083a9ca80305"
  },
  {
    "path": "docs/engineer-osint/tests/v4620-b103-browser-digest-discovery.test.mjs",
    "sourceGitBlob": "97637327b84932cfa3debcb7eb8f819cdf2ed392",
    "targetGitBlob": "6650428805a4a72000f708ad0724cfc5420efdc1",
    "targetSha256": "ba8acce2be66f8b514dcfac480111188310b13189fbb2a1443aab7b2a1220a55"
  },
  {
    "path": "docs/engineer-osint/tests/v4642-b104-browser-digest-discovery.test.mjs",
    "sourceGitBlob": "558bee8f3c599ff4afa5bb1f58e009b69b43903f",
    "targetGitBlob": "fb472c4100c5e15aa6e3e3f527b1b2f6ac23c581",
    "targetSha256": "64a4ac15f961e1653fe9e4376ecc35a8c9812d7b2fb386cd35e341d25e981dc5"
  },
  {
    "path": "docs/engineer-osint/tests/v4642-b104-wave2-local-image-discovery.test.mjs",
    "sourceGitBlob": "238caca505c322d3641021293466b1e309b80a39",
    "targetGitBlob": "9a611021f0b59f1a90d8f8ef0593cd63831bc3d1",
    "targetSha256": "0bf319867eae2fcfd5aa6e539bd0c31f47c4c47b8d7030121d47345d0cf46194"
  },
  {
    "path": "docs/engineer-osint/tests/v4643-b104-wave2-local-image-authorization.test.mjs",
    "sourceGitBlob": "7cfb8fa3fc9995baeba38d2692bb49c215202c13",
    "targetGitBlob": "198daaabb652b361ba0da51caa52b7fef2dec6c3",
    "targetSha256": "86071627b222957369cb95572db7049c336eff9e19b47beae41915160a3af811"
  }
];
const CI_ANCHORS=[
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
  },
  {
    "path": "docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_20260920.json",
    "gitBlob": "974435975ffa7a38f4d6c7c959701c0f67e83752",
    "sha256": "8188aeedb55ce611596b2d4fc1f7281e0abff5e800076b49295aed4fe4369dcb"
  },
  {
    "path": "docs/engineer-osint/tests/b106-guard-successor.test.mjs",
    "gitBlob": "b4154d93273a87ef7cee56074142a3026f103722",
    "sha256": "af1c8e3b2486dd892f885e70037d0b6e51879f531d42de1ebf5d5936be0c804d"
  },
  {
    "path": "docs/engineer-osint/audit-b106-readiness-20260919.mjs",
    "gitBlob": "b6c59578d479d50acf70ff634e592a1f24f4c080",
    "sha256": "6ebc59b185e66a84c5b4208eeb538906a6da2652ddd055ed5e986be58efea5b1"
  },
  {
    "path": "docs/engineer-osint/tests/b106-readiness-20260919.test.mjs",
    "gitBlob": "cf23dedc82aa8fd2904262ffc0ff572ec8d994b9",
    "sha256": "49ff5497d4b412cf0fbaaa9aed34421d3573574a2cfbbb8b82a1c5ab66211dc0"
  }
];
const CI_ARTIFACT_SOURCES=[
  {
    "path": "docs/engineer-osint/lib/canonical-hardening-successor.mjs",
    "sourceGitBlob": "528134e1c8832a62e7add35bb76f76829e97a948",
    "sourceSha256": "a20794eb20b62b6f1c865ab3a8206bd2811daa9df089ae063b1c742c7813e399"
  },
  {
    "path": "docs/engineer-osint/tests/b106-ci-closure-successor.test.mjs",
    "sourceGitBlob": "ABSENT",
    "sourceSha256": "ABSENT"
  }
];
const CI_BASE_INVENTORY="29ea00a7f4bec3012a1285de1e3d68a44efa9347bc163cbc6ace69d720065fa9";
function ciInventory(inventory,a,liveMode){
 const {tree,changed}=inventory;
 if(!Buffer.isBuffer(tree)||tree.at(-1)!==0||!Array.isArray(changed))guardFail('CI inventory type');
 const allowed=new Set([B106_CI_CLOSURE_PATH,...a.artifacts.map(x=>x.path),...CI_VECTOR.map(x=>x.path)]);
 if(changed.some(p=>!allowed.has(p)))guardFail('CI additional changed path');
 const seen=new Set(),rows=[];
 for(const row of tree.toString().slice(0,-1).split('\0')){
  const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t([^\0]+)$/.exec(row);
  if(!m||seen.has(m[4]))guardFail('CI tree entry');seen.add(m[4]);
  const [_,mode,type,id,path]=m;
  if(path===B106_CI_CLOSURE_PATH){
   if(mode!=='100644'||type!=='blob'||id!==blob(JSON.stringify(a,null,2)+'\n'))guardFail('CI record tree');
   continue;
  }
  const vectorItem=CI_VECTOR.find(x=>x.path===path);
  const item=vectorItem??a.artifacts.find(x=>x.path===path);
  if(item){
   const permitted=vectorItem?[item[liveMode==='SOURCE'?'sourceGitBlob':'targetGitBlob']]:[item.sourceGitBlob,item.targetGitBlob];
   if(mode!=='100644'||type!=='blob'||!permitted.includes(id))guardFail('CI tree blob');
   if(item.sourceGitBlob!=='ABSENT')rows.push(`100644 blob ${item.sourceGitBlob}\t${path}`);
  }else rows.push(row);
 }
 // ABSENT entries normalize away, so the live mode must also bind presence.
 for(const x of CI_VECTOR)if(seen.has(x.path)!==(x[liveMode==='SOURCE'?'sourceGitBlob':'targetGitBlob']!=='ABSENT'))guardFail('CI tree presence');
 if(sha256(Buffer.from(rows.join('\0')+'\0'))!==CI_BASE_INVENTORY)guardFail('CI base inventory');
}
export function assertB106CiClosureState(read=readFileSync,inventory=b106GitInventory){
 if(rootSession){verifyRootInspection();if(read!==readFileSync)read=rootSession.ctx.projectRead(read);}
 if(read===readFileSync)read=path=>{
  const parts=path.split('/');
  for(let i=1;i<=parts.length;i++){
   const s=lstatSync(parts.slice(0,i).join('/'));
   if(s.isSymbolicLink()||(i<parts.length?!s.isDirectory():!s.isFile()||s.nlink!==1))guardFail('CI aliased path '+path);
  }
  return readFileSync(path);
 };
 try{
 const raw=read(B106_CI_CLOSURE_PATH).toString();
 const a=parseJsonStrict(raw,{source:'B106 CI closure',maxBytes:65536,maxDepth:30});
 if(raw!==JSON.stringify(a,null,2)+'\n')guardFail('CI canonical bytes');
 closedGuard(a,[...Object.keys(CI_IDENTITY),'grants','anchors','implementationVector','artifacts'],'CI record');
 equalGuard(Object.fromEntries(Object.keys(CI_IDENTITY).map(k=>[k,a[k]])),CI_IDENTITY,'CI identity');
 equalGuard(a.grants,{append:false,write:false,execution:false,merge:false,deploy:false,publish:false,wildcard:false,currentState:false,bootstrap:false},'CI grants');
 equalGuard(a.anchors,CI_ANCHORS,'CI anchors');equalGuard(a.implementationVector,CI_VECTOR,'CI vector');
 for(const x of a.anchors){const b=read(x.path);if(blob(b)!==x.gitBlob||sha256(b)!==x.sha256)guardFail('CI anchor '+x.path);}
 if(!Array.isArray(a.artifacts)||a.artifacts.length!==2)guardFail('CI artifacts length');
 for(const [i,x] of a.artifacts.entries()){
  closedGuard(x,['path','sourceGitBlob','sourceSha256','targetGitBlob','targetSha256'],'CI artifact');
  const s=CI_ARTIFACT_SOURCES[i];
  if(x.path!==s.path||x.sourceGitBlob!==s.sourceGitBlob||x.sourceSha256!==s.sourceSha256||typeof x.targetGitBlob!=='string'||!/^[a-f0-9]{40}$/.test(x.targetGitBlob)||typeof x.targetSha256!=='string'||!/^[a-f0-9]{64}$/.test(x.targetSha256)||x.targetGitBlob===x.sourceGitBlob)guardFail('CI artifact values');
  const b=read(x.path);if(blob(b)!==x.targetGitBlob||sha256(b)!==x.targetSha256)guardFail('CI artifact '+x.path);
 }
 let source=true,successor=true;
 const projection=new Map();
 for(const x of CI_VECTOR){
  let actual;try{const b=read(x.path);actual=blob(b);if(actual===x.targetGitBlob&&sha256(b)!==x.targetSha256)guardFail('CI raw hash');}catch(e){if(e.code!=='ENOENT')throw e;actual='ABSENT';}
  source&&=actual===x.sourceGitBlob;successor&&=actual===x.targetGitBlob;
  projection.set(x.path,x.sourceGitBlob);
 }
 if(source===successor)guardFail('CI partial/mixed/third state');
 const mode=source?'SOURCE':'SUCCESSOR';
 ciInventory(inventory(),a,mode);
 return {record:a,mode,projection};
 }catch(e){throw Error('B106 CI closure drift: '+e.message);}
}
export function assertB106GuardState(read=readFileSync,inventory=b106GitInventory){
 const ci=assertB106CiClosureState(read,inventory);
 // This returned record is a derived compatibility view, NOT rewritten historical
// authorization bytes. Inputs are already pinned by the complete CI closure.
 const old=parseJsonStrict(read(B106_GUARD_PATH).toString());
 const phase=old.phaseOneArtifacts.map(x=>({...x}));
 const verifier=ci.record.artifacts[0];
 Object.assign(phase[0],{targetGitBlob:verifier.targetGitBlob,targetSha256:verifier.targetSha256});
 const fresh=ci.record.artifacts[1];phase.push({path:fresh.path,sourceGitBlob:'ABSENT',targetGitBlob:fresh.targetGitBlob,targetSha256:fresh.targetSha256});
 const raw=read(B106_CI_CLOSURE_PATH);
 phase.push({path:B106_CI_CLOSURE_PATH,sourceGitBlob:'ABSENT',targetGitBlob:blob(raw),targetSha256:sha256(raw)});
 const record={...old,implementationVector:ci.record.implementationVector,phaseOneArtifacts:phase};
 const projection=new Map(ci.projection);
 for(const x of phase)if(x.sourceGitBlob!=='ABSENT')projection.set(x.path,x.sourceGitBlob);
 return {record,mode:ci.mode,projection,historicalRecord:old,ciClosureRecord:ci.record};
}
export function historicalB106CiClosureBlob(path){
 const s=assertB106CiClosureState();
 if(!CI_VECTOR.some(x=>x.path===path))guardFail('unknown historical path');
 return s.projection.get(path);
}
export function historicalB106Blob(path){
 const s=assertB106GuardState();
 if(!B106_VECTOR.some(x=>x.path===path))guardFail('unknown historical path');
 return s.projection.get(path);
}

// B106 v2: explicit external *inspection fixture*. No fixture lives in this repo,
// no fixture self-authorizes, and no execution grant is accepted by this layer.
const ROOT_BASE='1df9875a50d5ad47188d0ba4a262ea11e3e65693';
const ROOT_TREE='3537a52a3b291bbc069367a839249c770dc2cd9d';
const ROOT_INVENTORY='99a12425f2550b62957fb031eb34e4905d2523819858e8812d8d96e22020f1c6';
const rootFail=label=>{throw Error('B106 external root drift: '+label);};
const rootSha=raw=>createHash('sha256').update(raw).digest('hex');
const rootBlob=raw=>createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
const rootKeys=(x,keys)=>{
 if(!x||typeof x!=='object'||Array.isArray(x)||JSON.stringify(Object.keys(x).sort())!==JSON.stringify([...keys].sort()))rootFail('closed schema');
};
const rootInventory=rows=>Buffer.from(rows.map(x=>`${x.mode} ${x.type} ${x.blob}\t${x.path}`).join('\0')+'\0');
function rootRows(rows){
 if(!Array.isArray(rows)||rows.length===0)rootFail('rows');let prior='';
 for(const x of rows){
  rootKeys(x,['path','mode','type','blob','sha256']);
  if(typeof x.path!=='string'||x.path<=prior||x.path.startsWith('/')||x.path.includes('\\')||/[\x00-\x1f]/.test(x.path)||x.path.split('/').some(p=>!p||p==='.'||p==='..')||!['100644','100755'].includes(x.mode)||x.type!=='blob'||typeof x.blob!=='string'||!/^[0-9a-f]{40}$/.test(x.blob)||typeof x.sha256!=='string'||!/^[0-9a-f]{64}$/.test(x.sha256))rootFail('path/mode/type/hash');
  prior=x.path;
 }
}
export function rootGitTree(rows){
 rootRows(rows);const root=new Map();
 for(const row of rows){const parts=row.path.split('/');let at=root;for(const p of parts.slice(0,-1)){if(!at.has(p))at.set(p,new Map());at=at.get(p);if(!(at instanceof Map))rootFail('file/directory collision');}if(at.has(parts.at(-1)))rootFail('duplicate tree path');at.set(parts.at(-1),row);}
 const tree=map=>{
  const chunks=[...map].sort(([a,x],[b,y])=>Buffer.compare(Buffer.from(a+(x instanceof Map?'/':'')),Buffer.from(b+(y instanceof Map?'/':'')))).map(([name,x])=>Buffer.concat([Buffer.from(`${x instanceof Map?'40000':x.mode} ${name}\0`),Buffer.from(x instanceof Map?tree(x):x.blob,'hex')]));
  const raw=Buffer.concat(chunks);return createHash('sha1').update(`tree ${raw.length}\0`).update(raw).digest('hex');
 };return tree(root);
}
function rootMatch(rows,map){
 if(!(map instanceof Map)||map.size!==rows.length)return false;
 for(const row of rows){const f=map.get(row.path);if(!f||f.mode!==row.mode||f.type!==row.type||!Buffer.isBuffer(f.raw)||rootSha(f.raw)!==row.sha256||rootBlob(f.raw)!==row.blob)return false;}
 return true;
}
const rootBrands=new WeakSet();
let rootSession=null;
export function createRootInspection(raw,trustedSha256,sourceFiles){
 if(typeof raw!=='string'||typeof trustedSha256!=='string'||!/^[a-f0-9]{64}$/.test(trustedSha256)||rootSha(raw)!==trustedSha256)rootFail('missing/external trust pin');
 const grant=parseJsonStrict(raw,{maxBytes:4194304,maxDepth:30});
 if(raw!==JSON.stringify(grant,null,2)+'\n')rootFail('canonical grant bytes');
 rootKeys(grant,['schema','purpose','approved','sourceCommit','sourceTree','sourceInventorySha256','source','targets','grants']);
 if(grant.schema!=='engineer.b106.external-root-fixture.v1'||grant.purpose!=='OFFLINE_INSPECTION_ONLY'||grant.approved!==true||grant.sourceCommit!==ROOT_BASE||grant.sourceTree!==ROOT_TREE||grant.sourceInventorySha256!==ROOT_INVENTORY)rootFail('unapproved/stale fixture');
 rootKeys(grant.grants,['execution','write','append','merge','deploy','publish']);
 if(Object.values(grant.grants).some(v=>v!==false))rootFail('operational grant');
 rootRows(grant.source);
 if(rootSha(rootInventory(grant.source))!==ROOT_INVENTORY||rootGitTree(grant.source)!==ROOT_TREE||!rootMatch(grant.source,sourceFiles))rootFail('source inventory/bytes');
 const immutable=p=>p.endsWith('.json')||p.startsWith('docs/engineer-osint/data/')||p.startsWith('docs/engineer-osint/assets/photos/')||p.startsWith('docs/engineer-osint/photo-');
 if(!Array.isArray(grant.targets)||grant.targets.length!==2)rootFail('target stages');
 for(const [i,t] of grant.targets.entries()){
  rootKeys(t,['name','tree','inventorySha256','files']);rootRows(t.files);
  if(t.name!==['PR1','PR2'][i]||rootGitTree(t.files)!==t.tree||rootSha(rootInventory(t.files))!==t.inventorySha256||t.tree===ROOT_TREE)rootFail('target tree/inventory');
  const m=new Map(t.files.map(x=>[x.path,x]));
  for(const row of grant.source)if(immutable(row.path)&&JSON.stringify(m.get(row.path))!==JSON.stringify(row))rootFail('frozen history '+row.path);
  if(m.has('docs/engineer-osint/data/runs/engineer-osint-20260904-B106.json')||m.has('docs/engineer-osint/B106_STRICT_APPEND_AUTHORIZATION_20260920.json'))rootFail('execution/replay artifact');
 }
 if(grant.targets[0].tree===grant.targets[1].tree)rootFail('ambiguous stages');
 // Private canonical inventories are bound by the verified external fixture,
 // including this verifier and every proposal. Never infer a target from HEAD.
 const inventories=[rootInventory(grant.source),...grant.targets.map(t=>rootInventory(t.files))];
 const sourceCopy=new Map([...sourceFiles].map(([p,x])=>[p,{...x,raw:Buffer.from(x.raw)}]));let live=null,stage=null;
 const ctx=Object.freeze({
  executionAllowed:false,
  verify(files){
   if(live&&files instanceof Map&&files.size===live.size&&[...live].every(([p,x])=>{const y=files.get(p);return y&&y.mode===x.mode&&y.type===x.type&&Buffer.isBuffer(y.raw)&&y.raw.equals(x.raw);}))return {stage,execution_allowed:false,fixture_only:true};
   const modes=[{name:'SOURCE',files:grant.source},...grant.targets].filter(t=>rootMatch(t.files,files));
   if(modes.length!==1)rootFail('mixed/third/missing/extra state');
   // Freeze private evidence copies; caller mutation cannot alter a projection.
   live=new Map([...files].map(([p,x])=>[p,{...x,raw:Buffer.from(x.raw)}]));stage=modes[0].name;
   return {stage,execution_allowed:false,fixture_only:true};
  },
  projectedInventory(){if(!live)rootFail('unverified inspection');return {tree:Buffer.from(rootInventory(grant.source)),changed:[]};},
  projectInventory(raw){
   if(!live)rootFail('unverified inspection');
   if(!Buffer.isBuffer(raw)||!inventories.some(exact=>exact.equals(raw)))rootFail('unknown complete candidate inventory');
   return Buffer.from(inventories[0]);
  },
  projectRead(reader){return (path,...args)=>{
   if(!live)rootFail('unverified read');
   const value=reader(path,...args),buf=Buffer.isBuffer(value)?value:Buffer.from(value);
   if(!live.has(path)||!buf.equals(live.get(path).raw))rootFail('bound read '+path);
   const out=Buffer.from((sourceCopy.get(path)??live.get(path)).raw);
   return typeof value==='string'?out.toString('utf8'):out;
  };},
  rejectExecution(){rootFail('fixture is never execution authority');}
 });rootBrands.add(ctx);return ctx;
}
export function installExternalRootInspection(ctx,snapshotter){
 if(rootSession||!rootBrands.has(ctx)||typeof snapshotter!=='function')rootFail('invalid/replayed installation');
 ctx.verify(snapshotter());rootSession={ctx,snapshotter};
}
function verifyRootInspection(){if(rootSession)rootSession.ctx.verify(rootSession.snapshotter());}
export function assertNoRootFixtureExecution(){if(rootSession)rootSession.ctx.rejectExecution();}
function rootReadFileSync(path,...args){return rootSession?rootSession.ctx.projectRead(nativeRootReadFileSync)(path,...args):nativeRootReadFileSync(path,...args);}

// Explicit historical evidence API: every read revalidates the complete external fixture.
// Outside that inspection context it is exactly the native read, without a fallback grant.
export function readRootHistoricalEvidence(path,...args){verifyRootInspection();return rootReadFileSync(path,...args);}

// Exact candidate inventory must pass before any historical projection. Native
// historical guards remain authoritative when no external inspection is installed.
export function projectRootHistoricalInventory(raw){
 if(!rootSession)return raw;
 verifyRootInspection();return rootSession.ctx.projectInventory(raw);
}
