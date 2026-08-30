import {createHash} from 'node:crypto';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {
  deepDiff,parseJsonStrict,translationMutationViolations,validatePublicUrls
} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {
  isIntrinsicTranslationPath,LEGACY_FACTUAL_OVERLAY_MODULES,LOCALIZATION_DATA_MODULES,
  TRANSITION_GUARDED_LEGACY_OVERLAY_FILES
} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const b97='engineer-osint-20260830-B97',b98='engineer-osint-20260830-B98';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';
const b98FileSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const b98Sha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';
const fail=message=>{throw new Error(`POST_B98_STEADY_STATE: ${message}`)};
const sha256=text=>createHash('sha256').update(text).digest('hex');
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b98Index=manifest.runs.findIndex(entry=>entry.run_id===b98);
if(b98Index<0)fail('exact B98 historical entry missing');
if(b98Index!==manifest.runs.findLastIndex(entry=>entry.run_id===b98))fail('duplicate B98 manifest entry');
const currentIndex=manifest.runs.length-1,currentEntry=manifest.runs[currentIndex];
if(currentIndex<b98Index)fail('current tip predates B98');
if(store.report.current_run_id!==currentEntry.run_id)fail('run-store report/current manifest tip mismatch');
const b98Entry=manifest.runs[b98Index];
if(b98Entry.parent_run_id!==b97||b98Entry.parent_canonical_sha256!==b97Sha||b98Entry.path!=='data/runs/engineer-osint-20260830-B98.json'||b98Entry.file_sha256!==b98FileSha||b98Entry.canonical_sha256!==b98Sha)fail('historical B98 lineage/hash drift');
const b98Raw=readFileSync(join(src,b98Entry.path),'utf8');
if(sha256(b98Raw)!==b98FileSha)fail('historical B98 file SHA drift');

const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)fail('built ENGINEER_DATA marker missing');
const baseline=parseJsonStrict(html.slice(a+marker.length,b),{source:'built canonical ENGINEER_DATA'});
if(baseline.state_latest?.run_id!==store.report.current_run_id)fail(`built current run mismatch ${baseline.state_latest?.run_id}`);
validatePublicUrls(baseline);

const orderedFirstThree=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file).filter(file=>TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has(file));
if(orderedFirstThree.length!==3||new Set(orderedFirstThree).size!==3)fail('first-three retirement scope is not exactly three modules');
if(orderedFirstThree.some(file=>file==='data-integrity-identity-fixes.js'))fail('identity-fix overlay entered first-three retirement scope');
if(!LEGACY_FACTUAL_OVERLAY_MODULES.some(([,file])=>file==='data-integrity-identity-fixes.js'))fail('identity-fix overlay unexpectedly absent from active legacy runtime');
const expectedFirstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];
if(JSON.stringify(orderedFirstThree)!==JSON.stringify(expectedFirstThree))fail(`guarded module order drift ${orderedFirstThree.join(',')}`);
const baselineHashes=readJson('legacy-runtime-overlay-baseline.json');
for(const [,file] of LEGACY_FACTUAL_OVERLAY_MODULES){
  const expected=baselineHashes.modules?.[file];
  if(!expected)fail(`legacy baseline missing ${file}`);
  const actual=sha256(readFileSync(join(src,file),'utf8'));
  if(actual!==expected.file_sha256)fail(`pinned overlay file hash drift ${file}`);
}

const gaps=Array.isArray(store.data.intelligence_gaps?.gaps)?store.data.intelligence_gaps.gaps:[];
for(let i=1;i<=15;i++){
  const id=`ENG-GAP-B97-OVL-${String(i).padStart(3,'0')}`;
  if(!gaps.some(item=>(item?.gap_id||item?.id)===id))fail(`native historical B97 gap missing ${id}`);
}
const assessments=Array.isArray(store.data.intelligence_assessments?.assessments)?store.data.intelligence_assessments.assessments:Array.isArray(store.data.assessments?.assessments)?store.data.assessments.assessments:[];
for(let i=1;i<=4;i++){
  const id=`ENG-ASMT-B98-OVL-${String(i).padStart(3,'0')}`;
  if(!assessments.some(item=>(item?.assessment_id||item?.id)===id))fail(`native historical B98 assessment missing ${id}`);
}
const evidenceBase=store.data.evidence?.evidence||store.data.evidence_registry?.evidence||store.data.evidence||[];
const evidence=Array.isArray(evidenceBase)?evidenceBase:[];
for(const id of ['ENG-EVID-0213','ENG-EVID-0214'])if(!evidence.some(item=>(item?.evidence_id||item?.id)===id))fail(`native historical B98 evidence missing ${id}`);

const guardCode=readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8');
const production=structuredClone(baseline);
const productionContext=vm.createContext({window:{__ENGINEER_DATA__:production},console});
vm.runInContext(guardCode,productionContext,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const guard=productionContext.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME;
if(!guard?.shouldShortCircuit)fail('runtime transition guard API missing');
const guardDecisions=[];
let identityFixMutationCount=0;
for(const [,file] of LEGACY_FACTUAL_OVERLAY_MODULES){
  const before=structuredClone(productionContext.window.__ENGINEER_DATA__);
  const guarded=TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has(file);
  const shortCircuit=guarded&&guard.shouldShortCircuit(file,productionContext.window.__ENGINEER_DATA__)===true;
  if(guarded)guardDecisions.push({module:file,short_circuit:shortCircuit});
  if(!shortCircuit)vm.runInContext(readFileSync(join(src,file),'utf8'),productionContext,{filename:file,timeout:3000});
  if(file==='data-integrity-identity-fixes.js')identityFixMutationCount=deepDiff(before,productionContext.window.__ENGINEER_DATA__).length;
}
const guardShortCircuits=guardDecisions.filter(item=>item.short_circuit).length;
if(guardShortCircuits!==3||guardDecisions.some(item=>!item.short_circuit))fail(`production runtime guard is not 3/3: ${guardShortCircuits}/3`);
const productionBeforeLocalization=structuredClone(productionContext.window.__ENGINEER_DATA__);

const retired=structuredClone(baseline);
const retiredContext=vm.createContext({window:{__ENGINEER_DATA__:retired},console});
for(const [,file] of LEGACY_FACTUAL_OVERLAY_MODULES){
  if(TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has(file))continue;
  vm.runInContext(readFileSync(join(src,file),'utf8'),retiredContext,{filename:file,timeout:3000});
}
const retiredBeforeLocalization=structuredClone(retiredContext.window.__ENGINEER_DATA__);
const preLocalizationDiff=deepDiff(productionBeforeLocalization,retiredBeforeLocalization);
if(preLocalizationDiff.length)fail(`guarded-vs-retired factual semantic drift before localization: ${preLocalizationDiff.slice(0,20).map(item=>item.path).join(',')}`);

const localize=(context,label)=>{
  const before=structuredClone(context.window.__ENGINEER_DATA__);
  for(const [,file] of LOCALIZATION_DATA_MODULES)vm.runInContext(readFileSync(join(src,file),'utf8'),context,{filename:`${label}:${file}`,timeout:3000});
  const after=context.window.__ENGINEER_DATA__;
  validatePublicUrls(after);
  const violations=translationMutationViolations(before,after,{intrinsicPath:isIntrinsicTranslationPath});
  if(violations.length)fail(`${label} localization escaped translation provenance: ${violations.slice(0,20).map(item=>item.path).join(',')}`);
  return structuredClone(after);
};
const productionLocalized=localize(productionContext,'production-guarded');
const retiredLocalized=localize(retiredContext,'retired-first-three');
const postLocalizationDiff=deepDiff(productionLocalized,retiredLocalized);
if(postLocalizationDiff.length)fail(`guarded-vs-retired public-data semantic drift after localization: ${postLocalizationDiff.slice(0,20).map(item=>item.path).join(',')}`);
const productionPublicDataSha=sha256(JSON.stringify(productionLocalized));
const retiredPublicDataSha=sha256(JSON.stringify(retiredLocalized));
if(productionPublicDataSha!==retiredPublicDataSha)fail('public-data semantic digest mismatch');

const unguarded=structuredClone(baseline),unguardedContext=vm.createContext({window:{__ENGINEER_DATA__:unguarded},console});
let unguardedFactualLeafMutations=0;
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
for(const file of orderedFirstThree){
  const before=structuredClone(unguardedContext.window.__ENGINEER_DATA__);
  vm.runInContext(readFileSync(join(src,file),'utf8'),unguardedContext,{filename:`diagnostic:${file}`,timeout:3000});
  unguardedFactualLeafMutations+=deepDiff(before,unguardedContext.window.__ENGINEER_DATA__).filter(change=>!isOverlayMeta(change.path)).length;
}
if(store.report.current_run_id===b98&&unguardedFactualLeafMutations!==81)fail(`exact B98 unguarded first-three residual drift ${unguardedFactualLeafMutations}/81`);

for(const [id,file] of LEGACY_FACTUAL_OVERLAY_MODULES)if(!html.includes(`id="${id}"`))fail(`active runtime module missing from built artifact before retirement review: ${file}`);

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-post-b98-steady-state-v1',
  mode:store.report.current_run_id===b98?'EXACT_PERSISTENT_B98':'POST_B98_DESCENDANT_STEADY_STATE',
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b98:{run_id:b98,parent_run_id:b97,file_sha256:b98FileSha,canonical_sha256:b98Sha,manifest_index:b98Index,status:'PASS'},
  native_historical_intelligence:{persistent_b97_gaps:15,b98_evidence:2,b98_assessments:4,status:'PASS'},
  first_three_scope:orderedFirstThree,identity_fix_in_scope:false,identity_fix_current_mutation_count:identityFixMutationCount,
  guard_short_circuit_count:guardShortCircuits,guard_decisions:guardDecisions,guarded_first_three_factual_mutation_count:0,
  unguarded_first_three_factual_leaf_mutations:unguardedFactualLeafMutations,
  pre_localization_semantic_diff_count:preLocalizationDiff.length,post_localization_semantic_diff_count:postLocalizationDiff.length,
  production_public_data_sha256:productionPublicDataSha,retired_candidate_public_data_sha256:retiredPublicDataSha,public_data_semantic_parity:true,
  review_gate_status:'READY_FOR_SEPARATE_RETIREMENT_SLICE_REVIEW',first_three_ready_for_retirement_review:true,
  retirement_authorized:false,runtime_module_removal_performed:false,baseline_manifest_cleanup_performed:false,
  full_browser_retirement_regression_passed:false,full_browser_retirement_regression_required:true,
  identity_fix_migration_authorized:false,canonical_write_performed:false
};
writeFileSync(join(dist,'post-b98-steady-state-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'post-b98-steady-state-audit.md'),`# ENGINEER OSINT v4.5.29 — post-B98 steady-state / retirement-review audit\n\nStatus: **PASS**\nMode: **${report.mode}**\nCurrent run: **${report.current_run_id}**\n\n- Historical B98 integrity: **PASS**\n- Native B97 gaps / B98 evidence / B98 assessments: **15 / 2 / 4**\n- First-three runtime guard short-circuits: **${guardShortCircuits}/3**\n- Guarded first-three factual mutations: **0**\n- Unguarded first-three diagnostic factual leaves: **${unguardedFactualLeafMutations}**\n- Guarded-vs-retired semantic diffs before localization: **0**\n- Guarded-vs-retired semantic diffs after localization: **0**\n- Public-data semantic digest parity: **PASS**\n- Identity-fix current mutations (out of scope): **${identityFixMutationCount}**\n\nThe first three factual overlays are ready only for a **separate retirement-slice review**. This audit does not remove modules, edit the runtime manifest/baseline, authorize identity-fix migration, or write canonical data. A real retirement slice still requires the full browser/runtime/PUBLIC-CZ regression suite and same-slice baseline/runtime-manifest cleanup.\n`);
appendFileSync(join(dist,'health.txt'),`post_b98_steady_state=pass\npost_b98_steady_state_mode=${report.mode}\npost_b98_steady_state_run=${report.current_run_id}\npost_b98_historical_b98_integrity=pass\npost_b98_guard_short_circuits=${guardShortCircuits}\npost_b98_guarded_first3_factual_mutations=0\npost_b98_unguarded_first3_factual_leafs=${unguardedFactualLeafMutations}\npost_b98_prelocalization_semantic_diffs=0\npost_b98_postlocalization_semantic_diffs=0\npost_b98_public_data_semantic_parity=1\npost_b98_first3_retirement_review_ready=1\npost_b98_retirement_authorized=0\npost_b98_identity_fix_in_scope=0\npost_b98_identity_fix_migration_authorized=0\npost_b98_browser_retirement_regression_required=1\npost_b98_canonical_writes=0\n`);
console.log(`POST_B98 steady-state PASS: run=${report.current_run_id}; guard=3/3; guarded=0; semantic=0/0; first-three=retirement-review-only; identity-fix=active-out-of-scope`);
