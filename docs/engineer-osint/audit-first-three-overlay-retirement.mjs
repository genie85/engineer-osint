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
const historicalAuth=policy.authorization||{};
if(historicalAuth.remove_first_three_from_active_runtime!==true||historicalAuth.remove_first_three_from_active_legacy_baseline!==true||historicalAuth.retain_first_three_files_as_historical_migration_artifacts!==true||historicalAuth.keep_transition_guard_runtime_installed!==true||historicalAuth.keep_identity_fix_active!==true)fail('historical v4.5.30 authorization incomplete');
if(historicalAuth.allow_identity_fix_migration!==false||historicalAuth.allow_canonical_run_append!==false||historicalAuth.allow_run_store_manifest_edit!==false||historicalAuth.allow_canonical_data_edit!==false||historicalAuth.allow_other_runtime_module_removal!==false)fail('historical v4.5.30 authorization scope broadened');

const firstThree=policy.retired_modules.map(item=>item.file);
const firstThreeIds=policy.retired_modules.map(item=>item.runtime_id);
if(JSON.stringify(firstThree)!==JSON.stringify(['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js']))fail('retired module scope drift');
if(new Set(firstThree).size!==3||new Set(firstThreeIds).size!==3)fail('retired module scope is not exactly three');

const identityFile='data-integrity-identity-fixes.js',identityRuntimeId='engineer-data-integrity-identity-fixes-module';
const activeLegacyFiles=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file);
const identityActive=JSON.stringify(activeLegacyFiles)===JSON.stringify([identityFile]);
const identityRetired=activeLegacyFiles.length===0;
if(!identityActive&&!identityRetired)fail(`active legacy runtime is inconsistent after first-three retirement: ${activeLegacyFiles.join(',')}`);
if(TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.size!==0)fail('transition guarded-file set must be empty after first-three retirement');
for(const file of firstThree)if(PUBLIC_RUNTIME_MODULES.some(([,candidate])=>candidate===file))fail(`retired overlay still active in public runtime: ${file}`);
if(!PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='overlay-transition-runtime-guard.js'))fail('transition guard runtime was removed');
const publicHasIdentity=PUBLIC_RUNTIME_MODULES.some(([id,file])=>id===identityRuntimeId&&file===identityFile);
if(identityActive&&!publicHasIdentity)fail('active identity-fix missing from public runtime');
if(identityRetired&&publicHasIdentity)fail('retired identity-fix remains in public runtime');

for(const item of policy.retired_modules){
  const actual=sha256(readFileSync(join(src,item.file),'utf8'));
  if(actual!==item.archive_file_sha256)fail(`historical archive file hash drift: ${item.file}`);
}
const identityPolicy=policy.required_active_identity_fix;
if(identityPolicy.file!==identityFile||identityPolicy.runtime_id!==identityRuntimeId)fail('identity-fix historical policy identity drift');
if(sha256(readFileSync(join(src,identityPolicy.file),'utf8'))!==identityPolicy.file_sha256)fail('identity-fix historical source file hash drift');

const activeBaseline=readJson('legacy-runtime-overlay-baseline.json');
let laterIdentityRetirementAuthorized=false;
if(identityActive){
  if(activeBaseline.version!==2||activeBaseline.status!=='IDENTITY_FIX_MIGRATION_DEBT_ONLY')fail('active legacy baseline version/status invalid');
  const baselineNames=Object.keys(activeBaseline.modules||{});
  if(JSON.stringify(baselineNames)!==JSON.stringify([identityFile]))fail(`active legacy baseline must contain identity-fix only, got ${baselineNames.join(',')}`);
  if(activeBaseline.modules[identityFile]?.file_sha256!==identityPolicy.file_sha256)fail('identity-fix active baseline hash drift');
}else{
  const laterAuth=readJson('V4545_IDENTITY_FIX_RETIREMENT_AUTHORIZATION.json');
  const laterRetirement=readJson('V4546_IDENTITY_FIX_RETIREMENT.json');
  if(laterAuth.status!=='READY_FOR_EXACT_IDENTITY_FIX_RETIREMENT_SLICE'||laterAuth.authorization?.allow_identity_fix_runtime_removal!==true||laterAuth.authorization?.allow_identity_overlay_retirement!==true)fail('later identity retirement lacks v4.5.45 authorization');
  if(laterAuth.authorization?.allow_identity_fix_file_deletion!==false||laterAuth.authorization?.allow_transition_guard_runtime_removal!==false)fail('later identity retirement authorization scope broadened');
  if(laterRetirement.status!=='AUTHORIZED_RETIREMENT_APPLIED'||laterRetirement.identity_fix?.file!==identityFile||laterRetirement.identity_fix?.historical_source_retained!==true)fail('v4.5.46 identity retirement contract drift');
  if(activeBaseline.version!==3||activeBaseline.status!=='NO_ACTIVE_LEGACY_FACTUAL_OVERLAY_DEBT'||Object.keys(activeBaseline.modules||{}).length!==0||activeBaseline.retired_identity_fix_at!=='v4.5.46')fail('retired active legacy baseline drift');
  laterIdentityRetirementAuthorized=true;
}
for(const file of firstThree)if(activeBaseline.modules?.[file])fail(`retired first-three overlay remains in active baseline: ${file}`);

const store=loadCanonicalRunStore({root:src});
const manifest=readJson('data/run-store-manifest.json');
const b98Index=manifest.runs.findIndex(entry=>entry.run_id===b98);
if(b98Index<0||b98Index!==manifest.runs.findLastIndex(entry=>entry.run_id===b98))fail('exact unique historical B98 entry missing');
const currentIndex=manifest.runs.length-1,currentEntry=manifest.runs[currentIndex];
if(currentIndex<b98Index)fail('current canonical tip predates B98');
if(store.report.current_run_id!==currentEntry.run_id||store.report.canonical_sha256!==currentEntry.canonical_sha256)fail('current run-store tip/report mismatch');
const exactB98=store.report.current_run_id===b98;
if(exactB98&&identityRetired)fail('identity retirement is not authorized on exact B98 lifecycle');
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
const marker='window.__ENGINEER_DATA__=',start=html.indexOf(marker),end=html.indexOf(';</script>',start);
if(start<0||end<0)fail('built ENGINEER_DATA marker missing');
for(const id of firstThreeIds)if(html.includes(`id="${id}"`))fail(`retired first-three runtime script still injected: ${id}`);
if(identityActive&&!html.includes(`id="${identityRuntimeId}"`))fail('active identity-fix runtime script missing from built artifact');
if(identityRetired&&html.includes(`id="${identityRuntimeId}"`))fail('retired identity-fix runtime script still injected');
if(!html.includes('id="engineer-overlay-transition-runtime-guard-module"'))fail('transition guard runtime script unexpectedly missing');

const baseline=parseJsonStrict(html.slice(start+marker.length,end),{source:'built canonical ENGINEER_DATA'});
if(baseline.state_latest?.run_id!==store.report.current_run_id)fail('built canonical current run mismatch');
validatePublicUrls(baseline);
const context=vm.createContext({window:{__ENGINEER_DATA__:structuredClone(baseline)},console});
if(identityActive)vm.runInContext(readFileSync(join(src,identityFile),'utf8'),context,{filename:identityFile,timeout:3000});
const beforeLocalization=structuredClone(context.window.__ENGINEER_DATA__);
for(const [,file] of LOCALIZATION_DATA_MODULES)vm.runInContext(readFileSync(join(src,file),'utf8'),context,{filename:file,timeout:3000});
const publicData=context.window.__ENGINEER_DATA__;
validatePublicUrls(publicData);
const localizationViolations=translationMutationViolations(beforeLocalization,publicData,{intrinsicPath:isIntrinsicTranslationPath});
if(localizationViolations.length)fail(`retired runtime localization escaped translation provenance: ${localizationViolations.slice(0,20).map(item=>item.path).join(',')}`);
const publicDataSha=sha256(JSON.stringify(publicData));
if(exactB98&&publicDataSha!==preRetirementPublicSha)fail(`public-data digest changed on exact B98 first-three retirement: ${publicDataSha}`);

const baselineNames=Object.keys(activeBaseline.modules||{});
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-first-three-overlay-retirement-audit-v2',
  mode:exactB98?'EXACT_B98_FIRST_THREE_RETIREMENT':`POST_B98_DESCENDANT_FIRST_THREE_RETIRED_${identityActive?'IDENTITY_ACTIVE':'IDENTITY_RETIRED_AUTHORIZED'}`,
  current_run_id:store.report.current_run_id,current_canonical_sha256:store.report.canonical_sha256,
  historical_b98:{run_id:b98,parent_run_id:b97,file_sha256:b98FileSha,canonical_sha256:b98Sha,status:'PASS'},
  retired_modules:firstThree,retired_runtime_ids:firstThreeIds,retired_runtime_module_count:3,
  historical_files_retained:true,transition_guard_runtime_retained:true,transition_guarded_file_count:0,
  active_legacy_factual_modules:activeLegacyFiles,active_legacy_factual_module_count:activeLegacyFiles.length,
  identity_fix_active:identityActive,identity_fix_retired:identityRetired,identity_fix_in_scope:false,identity_fix_migration_authorized:laterIdentityRetirementAuthorized,
  active_baseline_module_count:baselineNames.length,active_baseline_identity_fix_only:identityActive,
  native_historical_intelligence:{persistent_b97_gaps:15,b98_evidence:2,b98_assessments:4,status:'PASS'},
  pre_retirement_digest_applicable:exactB98,pre_retirement_public_data_sha256:preRetirementPublicSha,
  retired_public_data_sha256:publicDataSha,public_data_semantic_parity:exactB98?true:null,
  retired_runtime_scripts_absent:true,identity_fix_runtime_script_present:identityActive,identity_fix_runtime_script_absent:identityRetired,
  retirement_validated:true,canonical_write_performed:false,run_store_manifest_edit_performed:false
};
writeFileSync(join(dist,'first-three-overlay-retirement-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'first-three-overlay-retirement-audit.md'),`# ENGINEER OSINT — first-three overlay retirement audit\n\nStatus: **PASS**\nMode: **${report.mode}**\nCurrent canonical run: **${report.current_run_id}**\n\n- First-three retired overlays: **3**\n- Active legacy factual overlays now: **${activeLegacyFiles.length}**\n- Historical first-three files retained/hash-pinned: **PASS**\n- Historical B98 integrity: **PASS**\n- Transition guard retained: **PASS**\n- Identity-fix current state: **${identityActive?'active historical compatibility debt':'retired under v4.5.45/v4.5.46'}**\n- Canonical writes: **0**\n`);
appendFileSync(join(dist,'health.txt'),`first_three_overlay_retirement=pass\nfirst_three_overlay_retirement_mode=${report.mode}\nfirst_three_overlay_retired=1\nfirst_three_overlay_retired_modules=3\nfirst_three_overlay_runtime_scripts_absent=1\nfirst_three_overlay_active_legacy_modules=${activeLegacyFiles.length}\nfirst_three_overlay_transition_guard_retained=1\nfirst_three_overlay_guarded_files=0\nfirst_three_overlay_identity_fix_active=${identityActive?1:0}\nfirst_three_overlay_identity_fix_retired=${identityRetired?1:0}\nfirst_three_overlay_identity_fix_migration_authorized=${laterIdentityRetirementAuthorized?1:0}\nfirst_three_overlay_canonical_writes=0\nfirst_three_overlay_run_store_manifest_edits=0\n`);
console.log(`FIRST_THREE_RETIREMENT PASS: run=${report.current_run_id}; mode=${report.mode}; retired=3; active-legacy=${activeLegacyFiles.length}; identity=${identityActive?'active':'retired-authorized'}`);
