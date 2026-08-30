import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {LOCALIZATION_DATA_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const firstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];
const identity='data-integrity-identity-fixes.js';
const sha=value=>createHash('sha256').update(JSON.stringify(structuredClone(value))).digest('hex');
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('diagnostic built ENGINEER_DATA marker missing');
const baseline=parseJsonStrict(html.slice(a+marker.length,b),{source:'diagnostic baseline'});

const localize=(context,label)=>{
  for(const [,file] of LOCALIZATION_DATA_MODULES)vm.runInContext(readFileSync(join(src,file),'utf8'),context,{filename:`${label}:${file}`,timeout:3000});
  return structuredClone(context.window.__ENGINEER_DATA__);
};

const historicalContext=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(baseline)},console});
vm.runInContext(readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8'),historicalContext,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const guard=historicalContext.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;
const decisions=[];
for(const file of firstThree){
  const skip=guard.shouldShortCircuit(file,historicalContext.window.__ENGINEER_DATA__)===true;
  decisions.push([file,skip]);
  if(!skip)vm.runInContext(readFileSync(join(src,file),'utf8'),historicalContext,{filename:file,timeout:3000});
}
const histBeforeIdentity=structuredClone(historicalContext.window.__ENGINEER_DATA__);
vm.runInContext(readFileSync(join(src,identity),'utf8'),historicalContext,{filename:identity,timeout:3000});
const histAfterIdentity=structuredClone(historicalContext.window.__ENGINEER_DATA__);
const historicalLocalized=localize(historicalContext,'historical-v4529');

const retiredContext=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(baseline)},console});
const retiredBeforeIdentity=structuredClone(retiredContext.window.__ENGINEER_DATA__);
vm.runInContext(readFileSync(join(src,identity),'utf8'),retiredContext,{filename:identity,timeout:3000});
const retiredAfterIdentity=structuredClone(retiredContext.window.__ENGINEER_DATA__);
const retiredLocalized=localize(retiredContext,'retired-v4530');

const beforeIdentityDiff=deepDiff(histBeforeIdentity,retiredBeforeIdentity);
const afterIdentityDiff=deepDiff(histAfterIdentity,retiredAfterIdentity);
const finalDiff=deepDiff(historicalLocalized,retiredLocalized);
console.log(JSON.stringify({
  status:'DIAGNOSTIC_ONLY',
  guard_decisions:decisions,
  baseline_sha256:sha(baseline),
  historical_before_identity_sha256:sha(histBeforeIdentity),
  retired_before_identity_sha256:sha(retiredBeforeIdentity),
  before_identity_diff_count:beforeIdentityDiff.length,
  historical_after_identity_sha256:sha(histAfterIdentity),
  retired_after_identity_sha256:sha(retiredAfterIdentity),
  after_identity_diff_count:afterIdentityDiff.length,
  historical_final_sha256:sha(historicalLocalized),
  retired_final_sha256:sha(retiredLocalized),
  final_diff_count:finalDiff.length,
  first_diffs:finalDiff.slice(0,30).map(d=>({path:d.path,before:d.before,after:d.after}))
},null,2));
