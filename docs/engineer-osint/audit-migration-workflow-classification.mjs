import {createHash} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const root='docs/engineer-osint';
const workflowRoot='.github/workflows';
const policyPath=join(root,'V4548_MIGRATION_WORKFLOW_CLASSIFICATION.json');
const fail=message=>{throw new Error(`MIGRATION_WORKFLOW_CLASSIFICATION: ${message}`)};
const read=path=>readFileSync(path,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const policy=JSON.parse(read(policyPath));
if(policy.schema_version!=='engineer-osint-migration-workflow-classification-v1')fail('schema drift');
if(policy.status!=='CLASSIFIED_NO_REMOVAL_AUTHORIZED')fail('status drift');
if(policy.reviewed_main_sha!=='8c8b527ec4642539bb9966fee6cc804cee61f36a')fail('reviewed main SHA drift');
if(policy.removal_authorized!==false||policy.workflow_deactivation_authorized!==false)fail('classification unexpectedly authorizes mutation');

const allowedClasses=new Set(['ACTIVE_PRODUCTION_PROTECTION','HISTORICAL_EVIDENCE_KEEP','REMOVABLE_CI_DEBT_CANDIDATE']);
const entries=policy.workflows||[];
if(entries.length!==policy.inventory_count)fail(`policy inventory count mismatch ${entries.length}`);
const names=entries.map(entry=>entry.file);
if(new Set(names).size!==names.length)fail('duplicate workflow classification entries');

const actual=readdirSync(workflowRoot).filter(name=>name.endsWith('.yml')).sort();
const classified=[...names].sort();
if(JSON.stringify(actual)!==JSON.stringify(classified)){
  const unclassified=actual.filter(name=>!classified.includes(name));
  const missing=classified.filter(name=>!actual.includes(name));
  fail(`workflow inventory drift unclassified=[${unclassified}] missing=[${missing}]`);
}

const counts={ACTIVE_PRODUCTION_PROTECTION:0,HISTORICAL_EVIDENCE_KEEP:0,REMOVABLE_CI_DEBT_CANDIDATE:0};
const oneShots=new Set(['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml']);
const activeSet=new Set(['first-three-overlay-retirement-regression.yml','i18n-switch-regression.yml','identity-fix-retirement-regression.yml','pages.yml','runtime-audit-snapshot.yml']);
const historicalSet=new Set(['identity-fix-retirement-readiness.yml','identity-fix-retirement-authorization.yml']);

for(const entry of entries){
  if(!allowedClasses.has(entry.classification))fail(`invalid classification for ${entry.file}`);
  counts[entry.classification]++;
  const path=join(workflowRoot,entry.file);
  const code=read(path);
  const blob=gitBlobSha(code);
  if(blob!==entry.git_blob_sha)fail(`${entry.file} blob drift expected=${entry.git_blob_sha} actual=${blob}`);
  const contentsWrite=/permissions:\s*[\s\S]*?contents:\s*write\b/.test(code);
  const contentsRead=/permissions:\s*[\s\S]*?contents:\s*read\b/.test(code);
  if(entry.write_capable===true&&!contentsWrite)fail(`${entry.file} expected contents:write`);
  if(entry.write_capable===false&&contentsWrite)fail(`${entry.file} unexpectedly has contents:write`);
  if(entry.write_capable===false&&!contentsRead)fail(`${entry.file} missing contents:read baseline`);

  if(entry.classification==='REMOVABLE_CI_DEBT_CANDIDATE'){
    if(entry.removal_authorized!==false)fail(`${entry.file} candidate removal authorization broadened`);
    if(!Array.isArray(entry.superseded_by)||entry.superseded_by.length===0)fail(`${entry.file} missing replacement coverage`);
    for(const replacement of entry.superseded_by)if(!activeSet.has(replacement))fail(`${entry.file} points to non-active replacement ${replacement}`);
  }
  if(entry.classification==='HISTORICAL_EVIDENCE_KEEP'){
    if(entry.workflow_deactivation_authorized!==false)fail(`${entry.file} historical trigger deactivation authorization broadened`);
    if(entry.future_action!=='RETAIN_FILE_DEACTIVATE_AUTOMATIC_TRIGGERS_IN_SEPARATE_SLICE')fail(`${entry.file} historical retention action drift`);
  }
  if(entry.classification==='ACTIVE_PRODUCTION_PROTECTION'&&entry.future_action!=='RETAIN_AND_MODERNIZE')fail(`${entry.file} active protection action drift`);
}

for(const [key,value] of Object.entries(policy.classification_counts||{}))if(counts[key]!==value)fail(`${key} count ${counts[key]} != ${value}`);
if(counts.ACTIVE_PRODUCTION_PROTECTION!==5||counts.HISTORICAL_EVIDENCE_KEEP!==2||counts.REMOVABLE_CI_DEBT_CANDIDATE!==11)fail('expected 5/2/11 classification split');

for(const file of oneShots){
  const entry=entries.find(item=>item.file===file);
  if(entry?.classification!=='REMOVABLE_CI_DEBT_CANDIDATE'||entry?.write_capable!==true||entry?.removal_authorized!==false)fail(`${file} one-shot classification drift`);
}
for(const file of activeSet)if(entries.find(item=>item.file===file)?.classification!=='ACTIVE_PRODUCTION_PROTECTION')fail(`${file} active replacement missing`);
for(const file of historicalSet)if(entries.find(item=>item.file===file)?.classification!=='HISTORICAL_EVIDENCE_KEEP')fail(`${file} historical evidence classification missing`);

const b96=read(join(workflowRoot,'b96-one-shot-publish.yml'));
const b97=read(join(workflowRoot,'b97-one-shot-publish.yml'));
const b98=read(join(workflowRoot,'b98-one-shot-publish.yml'));
const b99=read(join(workflowRoot,'b99-one-shot-publish.yml'));
if(!b96.includes('engineer-osint-20260826-B95')||!b96.includes('engineer-osint-20260829-B96'))fail('B96 one-shot lifecycle pins drift');
if(!b97.includes('engineer-osint-20260829-B96')||!b97.includes('engineer-osint-20260830-B97'))fail('B97 one-shot lifecycle pins drift');
if(!b98.includes('engineer-osint-20260830-B97')||!b98.includes('engineer-osint-20260830-B98'))fail('B98 one-shot lifecycle pins drift');
if(!b99.includes('engineer-osint-20260830-B98')||!b99.includes('engineer-osint-20260830-B99')||!b99.includes('workflow_dispatch:'))fail('B99 one-shot lifecycle/manual-dispatch pins drift');

const firstThree=read(join(workflowRoot,'first-three-overlay-retirement-regression.yml'));
const finalIdentity=read(join(workflowRoot,'identity-fix-retirement-regression.yml'));
if(!firstThree.includes('audit-post-b98-steady-state.mjs')||!firstThree.includes('validate-patch.mjs')||!firstThree.includes('Headless browser retirement regression'))fail('first-three replacement coverage drift');
if(!finalIdentity.includes('audit-persistent-b99-identity.mjs')||!finalIdentity.includes('audit-identity-fix-retirement.mjs')||!finalIdentity.includes('Headless browser exact retired DOM digest'))fail('final identity replacement coverage drift');

const next=policy.required_next_slice||{};
if(!String(next.goal||'').includes('four write-capable B96-B99 one-shot'))fail('next-slice scope drift');
if(!Array.isArray(next.must_prove)||next.must_prove.length<5)fail('next-slice proof requirements incomplete');

console.log(`MIGRATION_WORKFLOW_CLASSIFICATION=PASS inventory=${entries.length} active=${counts.ACTIVE_PRODUCTION_PROTECTION} historical=${counts.HISTORICAL_EVIDENCE_KEEP} removable=${counts.REMOVABLE_CI_DEBT_CANDIDATE} removal-authorized=0`);
