import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const audit=readFileSync(`${root}/audit-post-b98-steady-state.mjs`,'utf8');
const policy=readFileSync(`${root}/V4529_POST_B98_STEADY_STATE.md`,'utf8');
const pages=readFileSync('.github/workflows/pages.yml','utf8');
const b97=readFileSync('.github/workflows/b97-readiness.yml','utf8');
const b98=readFileSync('.github/workflows/b98-readiness.yml','utf8');
const b98Post=readFileSync('.github/workflows/b98-post-ci-readiness.yml','utf8');
const pagesVerify=readFileSync(`${root}/verify-pages-artifact.mjs`,'utf8');
const postB98Gate=readFileSync(`${root}/verify-post-b98-pages-readiness.mjs`,'utf8');

test('v4.5.29 steady-state audit pins immutable B98 ancestry and native Intelligence retention',()=>{
  assert.match(audit,/engineer-osint-20260830-B98/);
  assert.match(audit,/ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79/);
  assert.match(audit,/4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201/);
  assert.match(audit,/for\(let i=1;i<=15;i\+\+\)/);
  assert.match(audit,/for\(let i=1;i<=4;i\+\+\)/);
  assert.match(audit,/ENG-EVID-0213/);
  assert.match(audit,/ENG-EVID-0214/);
});

test('v4.5.29 retirement-review scope is exactly the first three guarded overlays and excludes identity-fix',()=>{
  for(const file of ['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'])assert.match(audit,new RegExp(file.replaceAll('.','\\.')));
  assert.match(audit,/orderedFirstThree\.length!==3/);
  assert.match(audit,/identity-fix overlay entered first-three retirement scope/);
  assert.match(audit,/identity_fix_in_scope:false/);
  assert.match(audit,/identity_fix_migration_authorized:false/);
  assert.match(audit,/data-integrity-identity-fixes\.js/);
});

test('v4.5.29 requires 3\/3 guard short-circuit and zero guarded-vs-retired semantic drift',()=>{
  assert.match(audit,/guardShortCircuits!==3/);
  assert.match(audit,/preLocalizationDiff\.length\)fail/);
  assert.match(audit,/postLocalizationDiff\.length\)fail/);
  assert.match(audit,/productionPublicDataSha!==retiredPublicDataSha/);
  assert.match(audit,/guarded_first_three_factual_mutation_count:0/);
  assert.match(audit,/public_data_semantic_parity:true/);
});

test('v4.5.29 remains review-only and fail-closed for actual retirement',()=>{
  for(const marker of [
    'retirement_authorized:false','runtime_module_removal_performed:false','baseline_manifest_cleanup_performed:false',
    'full_browser_retirement_regression_passed:false','full_browser_retirement_regression_required:true',
    'identity_fix_migration_authorized:false','canonical_write_performed:false'
  ])assert.match(audit,new RegExp(marker));
  assert.match(audit,/READY_FOR_SEPARATE_RETIREMENT_SLICE_REVIEW/);
  assert.match(policy,/READ-ONLY REVIEW GATE — NO RETIREMENT AUTHORIZATION/);
  assert.match(policy,/full browser\/runtime\/PUBLIC-CZ regression suite/);
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
  for(const workflow of [b97,b98,b98Post]){
    assert.match(workflow,/POST_B98_STEADY/);
    assert.match(workflow,/audit-post-b98-steady-state\.mjs/);
  }
  assert.match(b97,/B98 in current ancestry/);
  assert.match(postB98Gate,/postB98Lineage=b98Index>=0&&currentIndex>=b98Index/);
  assert.match(postB98Gate,/post-b98-steady-state-audit\.json/);
});

test('v4.5.29 final Pages verifier keeps exact B98 and descendant safety states distinct',()=>{
  assert.match(pagesVerify,/if\(currentRun===b98\)\[/);
  assert.match(pagesVerify,/steady\.first_three_ready_for_retirement_review!==true/);
  assert.match(pagesVerify,/steady\.retirement_authorized!==false/);
  assert.match(pagesVerify,/steady\.full_browser_retirement_regression_passed!==false/);
  assert.match(pagesVerify,/steady\.identity_fix_in_scope!==false/);
  assert.match(pagesVerify,/steady\.canonical_write_performed!==false/);
});
