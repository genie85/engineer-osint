import {createHash} from 'node:crypto';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {parseJsonStrict,translationMutationViolations,validatePublicUrls} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {
  isIntrinsicTranslationPath,LEGACY_FACTUAL_OVERLAY_MODULES,LOCALIZATION_DATA_MODULES,
  PUBLIC_RUNTIME_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES
} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const b97='engineer-osint-20260830-B97',b98='engineer-osint-20260830-B98';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';
const b98FileSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const b98Sha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';
const preRetirementPublicSha='3633ba18cc69e06bdc72ca574157d901da5b43644993b4c8760e6302b728460f';
const fail=message=>{throw new Error(`FIRST_THREE_RETIREMENT: ${message}`)};
const sha256=text=>createHash('sha256').update(text).digest('hex');
const readJson=path=>parseJsonStrict(readFileSync(join(src,path),'utf8'),{source:path});

const policy=readJson('V4530_FIRST_THREE_OVERLAY_RETIREMENT.json');
if(policy.schema_version!=='engineer-osint-first-three-overlay-retirement-v1'||policy.status!=='READY_FOR_RETIREMENT')fail('retirement policy inactive or schema drifted');
if(policy.historical_b98_run_id!==b98||policy.historical_b98_file_sha256!==b98FileSha||policy.historical_b98_canonical_sha256!==b98Sha)fail('retirement policy B98 anchor drift');
if(policy.pre_retirement_public_data_sha256!==preRetirementPublicSha)fail('pre-retirement public digest drift');
const auth=policy.authorization||{};
if(auth.remove_first_three_from_active_runtime!==true||auth.remove_first_three_from_active_legacy_baseline!==true||auth.retain_first_three_files_as_historical_migration_artifacts!==true||auth.keep_transition_guard_runtime_installed!==true||auth.keep_identity_fix_active!==true)fail('retirement authorization incomplete');
if(auth.allow_identity_fix_migration!==false||auth.allow_canonical_run_append!==false||auth.allow_run_store_manifest_edit!==false||auth.allow_canonical_data_edit!==false||auth.allow_other_runtime_module_removal!==false)fail('retirement authorization scope broadened');

const firstThree=policy.retired_modules.map(item=>item.file);
const firstThreeIds=policy.retired_modules.map(item=>item.runtime_id);
if(JSON.stringify(firstThree)!==JSON.stringify(['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js']))fail('retired module scope drift');
if(new Set(firstThree).size!==3||new Set(firstThreeIds).size!==3)fail('retired module scope is not exactly three');

const activeLegacyFiles=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file);
if(JSON.stringify(activeLegacyFiles)!==JSON.stringify(['data-integrity-identity-fixes.js']))fail(`active legacy runtime must contain identity-fix only, got ${activeLegacyFiles.join(',')}`);
if(TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.size!==0)fail('transition guarded-file set must be empty after retirement');
for(const file of firstThree)if(PUBLIC_RUNTIME_MODULES.some(([,candidate])=>candidate===file))fail(`retired overlay still active in public runtime: ${file}`);
if(!PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='overlay-transition-runtime-guard.js'))fail('transition guard runtime was removed in the retirement slice');
if(!PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='data-integrity-identity-fixes.js'))fail('identity-fix is no longer active');

for(const item of policy.retired_modules){
  const actual=sha256(readFileSync(join(src,item.file),'utf8'));
  if(actual!==item.archive_file_sha256)fail(`historical archive file hash drift: ${item.file}`);
}
const identityPolicy=policy.required_active_identity_fix;
if(identityPolicy.file!=='data-integrity-identity-fixes.js'||identityPolicy.runtime_id!=='engineer-data-integrity-identity-fixes-module')fail('identity-fix policy identity drift');
if(sha256(readFileSync(join(src,identityPolicy.file),'utf8'))!==identityPolicy.file_sha256)fail('identity-fix file hash drift');

const activeBaseline=readJson('legacy-runtime-overlay-baseline.json');
if(activeBaseline.version!==2||activeBaseline.status!=='IDENTITY_FIX_MIGRATION_DEBT_ONLY')fail('active legacy baseline retirement version/status invalid');
const baselineNames=Object.keys(activeBaseline.modules||{});
if(JSON.stringify(baselineNames)!==JSON.stringify(['data-integrity-identity-fixes.js']))fail(`active legacy baseline must contain identity-fix only, got ${baselineNames.join(',')}`);
if(activeBaseline.modules['data-integrity-identity-fixes.js']?.file_sha256!==identityPolicy.file_sha256)fail('identity-fix active baseline hash drift');
for(const file of firstThree)if(activeBaseline.modules?.[file])fail(`retired overlay remains in active baseline: ${file}`);

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b98Index=manifest.runs.findIndex(entry=>entry.run_id===b98);
if(b98Index<0||b98Index!==manifest.runs.findLastIndex(entry=>entry.run_id===b98))fail('exact unique historical B98 entry missing');
const currentIndex=manifest.runs.length-1,currentEntry=manifest.runs[currentIndex];
if(currentIndex<b98Index)fail('current canonical tip predates B98');
if(store.report.current_run_id!==currentEntry.run_id||store.report.canonical_sha256!==currentEntry.canonical_sha256)fail('current run-store tip/report mismatch');
const exactB98=store.report.current_run_id===b98;
const b98Entry=manifest.runs[b98Index];
if(b98Entry.parent_run_id!==b97||b98Entry.parent_canonical_sha256!==b97Sha||b98Entry.path!=='data/runs/engineer-osint-20260830-B98.json'||b98Entry.file_sha256!==b98FileSha||b98Entry.canonical_sha256!==b98Sha)fail('historical B98 manifest anchor drift');
const b98Raw=readFileSync(join(src,b98Entry.path),'utf8');
if(sha256(b98Raw)!==b98FileSha)fail('historical B98 raw file hash drift');

const gaps=Array.isArray(store.data.intelligence_gaps?.gaps)?store.data.intelligence_gaps.gaps:[];
for(let i=1;i<=15;i++){
  const id=`ENG-GAP-B97-OVL-${String(i).padStart(3,'0')}`;
  if(!gaps.some(item=>(item?.gap_id||item?.id)===id))fail(`native B97 gap missing after retirement ${id}`);
}
const assessments=Array.isArray(store.data.intelligence_assessments?.assessments)?store.data.intelligence_assessments.assessments:Array.isArray(store.data.assessments?.assessments)?store.data.assessments.assessments:[];
for(let i=1;i<=4;i++){
  const id=`ENG-ASMT-B98-OVL-${String(i).padStart(3,'0')}`;
  if(!assessments.some(item=>(item?.assessment_id||item?.id)===id))fail(`native B98 assessment missing after retirement ${id}`);
}
const evidenceBase=store.data.evidence?.evidence||store.data.evidence_registry?.evidence||store.data.evidence||[];
const evidence=Array.isArray(evidenceBase)?evidenceBase:[];
for(const id of ['ENG-EVID-0213','ENG-EVID-0214'])if(!evidence.some(item=>(item?.evidence_id||item?.id)===id))fail(`native B98 evidence missing after retirement ${id}`);

const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)fail('built ENGINEER_DATA marker missing');
for(const id of firstThreeIds)if(html.includes(`id="${id}"`))fail(`retired runtime script still injected: ${id}`);
if(!html.includes(`id="${identityPolicy.runtime_id}"`))fail('identity-fix runtime script missing from built artifact');
if(!html.includes('id="engineer-overlay-transition-runtime-guard-module"'))fail('transition guard runtime script unexpectedly missing');

const baseline=parseJsonStrict(html.slice(a+marker.length,b),{source:'built canonical ENGINEER_DATA'});
if(baseline.state_latest?.run_id!==store.report.current_run_id)fail('built canonical current run mismatch');
validatePublicUrls(baseline);
const context=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(baseline)},console});
vm.runInContext(readFileSync(join(src,'data-integrity-identity-fixes.js'),'utf8'),context,{filename:'data-integrity-identity-fixes.js',timeout:3000});
const beforeLocalization=structuredClone(context.window.__ENGINEER_DATA__);
for(const [,file] of LOCALIZATION_DATA_MODULES)vm.runInContext(readFileSync(join(src,file),'utf8'),context,{filename:file,timeout:3000});
const publicDataRaw=context.window.__ENGINEER_DATA__;
validatePublicUrls(publicDataRaw);
const localizationViolations=translationMutationViolations(beforeLocalization,publicDataRaw,{intrinsicPath:isIntrinsicTranslationPath});
if(localizationViolations.length)fail(`retired runtime localization escaped translation provenance: ${localizationViolations.slice(0,20).map(item=>item.path).join(',')}`);
const rawVmPublicDataSha=sha256(JSON.stringify(publicDataRaw));
const normalizedPublicData=structuredClone(publicDataRaw);
const publicDataSha=sha256(JSON.stringify(normalizedPublicData));
if(exactB98&&publicDataSha!==preRetirementPublicSha)fail(`public-data digest changed on exact B98 retirement after v4.5.29 normalization: ${publicDataSha}; raw-vm=${rawVmPublicDataSha}`);

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-first-three-overlay-retirement-audit-v1',
  mode:exactB98?'EXACT_B98_RETIREMENT':'POST_B98_DESCENDANT_RETIRED_RUNTIME',
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b98:{run_id:b98,parent_run_id:b97,file_sha256:b98FileSha,canonical_sha256:b98Sha,status:'PASS'},
  retired_modules:firstThree,retired_runtime_ids:firstThreeIds,retired_runtime_module_count:3,
  historical_files_retained:true,transition_guard_runtime_retained:true,transition_guarded_file_count:0,
  active_legacy_factual_modules:activeLegacyFiles,active_legacy_factual_module_count:1,
  identity_fix_active:true,identity_fix_in_scope:false,identity_fix_migration_authorized:false,
  active_baseline_module_count:baselineNames.length,active_baseline_identity_fix_only:true,
  native_historical_intelligence:{persistent_b97_gaps:15,b98_evidence:2,b98_assessments:4,status:'PASS'},
  pre_retirement_digest_applicable:exactB98,pre_retirement_public_data_sha256:preRetirementPublicSha,
  raw_vm_public_data_sha256:rawVmPublicDataSha,retired_public_data_sha256:publicDataSha,
  digest_normalization:'structuredClone-before-JSON-stringify-v4529-compatible',public_data_semantic_parity:exactB98?true:null,
  retired_runtime_scripts_absent:true,identity_fix_runtime_script_present:true,
  retirement_validated:true,canonical_write_performed:false,run_store_manifest_edit_performed:false
};
writeFileSync(join(dist,'first-three-overlay-retirement-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'first-three-overlay-retirement-audit.md'),`# ENGINEER OSINT v4.5.30 — first-three overlay retirement audit\n\nStatus: **PASS**\nMode: **${report.mode}**\nCurrent canonical run: **${report.current_run_id}**\n\n- Retired active factual overlays: **3**\n- Active legacy factual overlays: **1** (identity-fix only)\n- Guarded-file set: **0**\n- Historical retired files retained and hash-pinned: **PASS**\n- Historical B98 integrity: **PASS**\n- Native B97 gaps / B98 evidence / B98 assessments: **15 / 2 / 4**\n- Retired script IDs absent from built artifact: **PASS**\n- Identity-fix script remains active: **PASS**\n- Exact-B98 pre-retirement digest gate: **${exactB98?'PASS':'not applicable to descendant'}**\n- v4.5.29-compatible normalized public-data SHA-256: \`${publicDataSha}\`\n- Raw VM public-data SHA-256 (diagnostic only): \`${rawVmPublicDataSha}\`\n- Canonical writes: **0**\n\nIdentity-fix remains active and out of scope. The transition guard runtime remains installed but has no guarded files.\n`);
appendFileSync(join(dist,'health.txt'),`first_three_overlay_retirement=pass\nfirst_three_overlay_retirement_mode=${report.mode}\nfirst_three_overlay_retired=1\nfirst_three_overlay_retired_modules=3\nfirst_three_overlay_archive_hashes=pass\nfirst_three_overlay_runtime_scripts_absent=1\nfirst_three_overlay_active_legacy_modules=1\nfirst_three_overlay_active_identity_fix_only=1\nfirst_three_overlay_transition_guard_retained=1\nfirst_three_overlay_guarded_files=0\nfirst_three_overlay_pre_retirement_digest_applicable=${exactB98?1:0}\nfirst_three_overlay_public_data_sha=${publicDataSha}\nfirst_three_overlay_raw_vm_public_data_sha=${rawVmPublicDataSha}\nfirst_three_overlay_digest_normalization=v4529-structured-clone\nfirst_three_overlay_public_data_semantic_parity=${exactB98?1:'not-applicable-descendant'}\nfirst_three_overlay_identity_fix_active=1\nfirst_three_overlay_identity_fix_in_scope=0\nfirst_three_overlay_identity_fix_migration_authorized=0\nfirst_three_overlay_canonical_writes=0\nfirst_three_overlay_run_store_manifest_edits=0\n`);
console.log(`FIRST_THREE_RETIREMENT PASS: run=${report.current_run_id}; mode=${report.mode}; retired=3; active-legacy=identity-fix-only; normalized-public-data=${publicDataSha}; raw-vm=${rawVmPublicDataSha}`);
