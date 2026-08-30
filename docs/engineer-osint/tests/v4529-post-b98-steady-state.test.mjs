import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const dispatcher=readFileSync(`${root}/audit-post-b98-steady-state.mjs`,'utf8');
const activeAudit=readFileSync(`${root}/audit-post-b98-steady-state-active.mjs`,'utf8');
const audit=dispatcher+'\n'+activeAudit;
const policy=readFileSync(`${root}/V4529_POST_B98_STEADY_STATE.md`,'utf8');
const pages=readFileSync('.github/workflows/pages.yml','utf8');
const b97=readFileSync('.github/workflows/b97-readiness.yml','utf8');
const b98=readFileSync('.github/workflows/b98-readiness.yml','utf8');
const b98Post=readFileSync('.github/workflows/b98-post-ci-readiness.yml','utf8');
const pagesVerify=readFileSync(`${root}/verify-pages-artifact.mjs`,'utf8');
const postB98Gate=readFileSync(`${root}/verify-post-b98-pages-readiness.mjs`,'utf8');

test('v4.5.29 historical steady-state proof remains pinned to immutable B98 ancestry and native Intelligence retention',()=>{
  assert.match(activeAudit,/engineer-osint-20260830-B98/);
  assert.match(activeAudit,/ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79/);
  assert.match(activeAudit,/4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201/);
  assert.match(activeAudit,/for\(let i=1;i<=15;i\+\+\)/);
  assert.match(activeAudit,/for\(let i=1;i<=4;i\+\+\)/);
  assert.match(activeAudit,/ENG-EVID-0213/);
  assert.match(activeAudit,/ENG-EVID-0214/);
});

test('v4.5.29 historical retirement-review scope remains exactly first three and excludes identity-fix',()=>{
  for(const file of ['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'])assert.match(audit,new RegExp(file.replaceAll('.','\\.')));
  assert.match(activeAudit,/orderedFirstThree\.length!==3/);
  assert.match(activeAudit,/identity-fix overlay entered first-three retirement scope/);
  assert.match(audit,/identity_fix_in_scope:false/);
  assert.match(audit,/identity_fix_migration_authorized:false/);
  assert.match(audit,/data-integrity-identity-fixes\.js/);
});

test('v4.5.29 historical proof requires 3\/3 guard and zero guarded-vs-retired semantic drift',()=>{
  assert.match(activeAudit,/guardShortCircuits!==3/);
  assert.match(activeAudit,/preLocalizationDiff\.length\)fail/);
  assert.match(activeAudit,/postLocalizationDiff\.length\)fail/);
  assert.match(activeAudit,/productionPublicDataSha!==retiredPublicDataSha/);
  assert.match(activeAudit,/guarded_first_three_factual_mutation_count:0/);
  assert.match(activeAudit,/public_data_semantic_parity:true/);
});

test('v4.5.29 audit remains review-only while dispatcher delegates retired current state to v4.5.30',()=>{
  for(const marker of [
    'retirement_authorized:false','runtime_module_removal_performed:false','baseline_manifest_cleanup_performed:false',
    'full_browser_retirement_regression_passed:false','full_browser_retirement_regression_required:true',
    'identity_fix_migration_authorized:false','canonical_write_performed:false'
  ])assert.match(audit,new RegExp(marker));
  assert.match(audit,/READY_FOR_SEPARATE_RETIREMENT_SLICE_REVIEW/);
  assert.match(dispatcher,/audit-first-three-overlay-retirement\.mjs/);
  assert.match(dispatcher,/POST_RETIREMENT_COMPATIBILITY/);
  assert.match(policy,/READ-ONLY REVIEW GATE — NO RETIREMENT AUTHORIZATION/);
  assert.match(policy,/full P0\/P1/);
  assert.match(policy,/PUBLIC-CZ/);
  assert.match(policy,/browser regression validation/);
});

test('v4.5.29 Pages accepts B98 descendants only after the historical B98 anchor exists',()=>{
  assert.match(pages,/b98Index>=0&&runs\.length-1>b98Index\)phase='POST_B98_STEADY'/);
  assert.match(pages,/Audit post-B98 steady state and first-three semantic parity/);
  assert.match(pages,/phase == 'POST_B98' \|\| steps\.migration-phase\.outputs\.phase == 'POST_B98_STEADY'/);
  assert.match(pagesVerify,/postB98Descendant=b98Index>=0&&currentIndex>b98Index/);
  assert.match(pagesVerify,/phase=POST_B98_STEADY/);
  assert.match(pagesVerify,/post-b98-steady-state-audit\.json/);
});

test('v4.5.29 historical B97/B98 workflows survive B99+ descendants without rerunning exact-tip audits',()=>{
  for(const workflow of [b97,b98,b98Post])assert.match(workflow,/POST_B98_STEADY/);
  assert.match(b97,/B98 in current ancestry/);
  assert.match(b98,/audit-post-b98-steady-state\.mjs/);
  assert.match(b98Post,/audit-post-b98-steady-state\.mjs/);
  assert.match(postB98Gate,/postB98Lineage=b98Index>=0&&currentIndex>=b98Index/);
  assert.match(postB98Gate,/post-b98-steady-state-audit\.json/);
});

test('v4.5.29 final Pages verifier retains compatibility safety gates after retirement',()=>{
  assert.match(pagesVerify,/if\(currentRun===b98\)\[/);
  assert.match(pagesVerify,/steady\.first_three_ready_for_retirement_review!==true/);
  assert.match(pagesVerify,/steady\.retirement_authorized!==false/);
  assert.match(pagesVerify,/steady\.full_browser_retirement_regression_passed!==false/);
  assert.match(pagesVerify,/steady\.identity_fix_in_scope!==false/);
  assert.match(pagesVerify,/steady\.canonical_write_performed!==false/);
});
