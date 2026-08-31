import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4548_MIGRATION_WORKFLOW_CLASSIFICATION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-migration-workflow-classification.mjs`,'utf8');

const byClass=name=>policy.workflows.filter(item=>item.classification===name);

test('v4.5.48 classifies the complete current workflow inventory without authorizing deletion',()=>{
  const actual=readdirSync('.github/workflows').filter(name=>name.endsWith('.yml')).sort();
  const classified=policy.workflows.map(item=>item.file).sort();
  assert.equal(policy.schema_version,'engineer-osint-migration-workflow-classification-v1');
  assert.equal(policy.status,'CLASSIFIED_NO_REMOVAL_AUTHORIZED');
  assert.equal(policy.reviewed_main_sha,'8c8b527ec4642539bb9966fee6cc804cee61f36a');
  assert.equal(policy.inventory_count,18);
  assert.deepEqual(classified,actual);
  assert.equal(policy.removal_authorized,false);
  assert.equal(policy.workflow_deactivation_authorized,false);
});

test('v4.5.48 has an exact 5 active / 2 historical / 11 removable split',()=>{
  assert.equal(byClass('ACTIVE_PRODUCTION_PROTECTION').length,5);
  assert.equal(byClass('HISTORICAL_EVIDENCE_KEEP').length,2);
  assert.equal(byClass('REMOVABLE_CI_DEBT_CANDIDATE').length,11);
  assert.deepEqual(policy.classification_counts,{
    ACTIVE_PRODUCTION_PROTECTION:5,
    HISTORICAL_EVIDENCE_KEEP:2,
    REMOVABLE_CI_DEBT_CANDIDATE:11
  });
});

test('v4.5.48 isolates all four repository-write one-shot workflows but does not authorize removal',()=>{
  const expected=['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml'].sort();
  const writeCapable=policy.workflows.filter(item=>item.write_capable===true).map(item=>item.file).sort();
  assert.deepEqual(writeCapable,expected);
  for(const file of expected){
    const item=policy.workflows.find(entry=>entry.file===file);
    assert.equal(item.classification,'REMOVABLE_CI_DEBT_CANDIDATE');
    assert.equal(item.removal_authorized,false);
  }
});

test('v4.5.48 preserves exact retirement readiness and authorization workflows as historical evidence',()=>{
  const historical=byClass('HISTORICAL_EVIDENCE_KEEP').map(item=>item.file).sort();
  assert.deepEqual(historical,['identity-fix-retirement-authorization.yml','identity-fix-retirement-readiness.yml']);
  for(const item of byClass('HISTORICAL_EVIDENCE_KEEP')){
    assert.equal(item.workflow_deactivation_authorized,false);
    assert.equal(item.future_action,'RETAIN_FILE_DEACTIVATE_AUTOMATIC_TRIGGERS_IN_SEPARATE_SLICE');
  }
});

test('v4.5.48 retains exactly the five current replacement protections',()=>{
  const active=byClass('ACTIVE_PRODUCTION_PROTECTION').map(item=>item.file).sort();
  assert.deepEqual(active,[
    'first-three-overlay-retirement-regression.yml',
    'i18n-switch-regression.yml',
    'identity-fix-retirement-regression.yml',
    'pages.yml',
    'runtime-audit-snapshot.yml'
  ].sort());
  for(const item of byClass('ACTIVE_PRODUCTION_PROTECTION'))assert.equal(item.future_action,'RETAIN_AND_MODERNIZE');
});

test('v4.5.48 fail-closed audit is read-only and passes against the exact inventory',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  assert.doesNotMatch(audit,/delete_file|update_file|create_file/);
  const output=execFileSync(process.execPath,[`${root}/audit-migration-workflow-classification.mjs`],{encoding:'utf8'});
  assert.match(output,/MIGRATION_WORKFLOW_CLASSIFICATION=PASS/);
  assert.match(output,/inventory=18 active=5 historical=2 removable=11 removal-authorized=0/);
});

test('v4.5.48 next slice is constrained to authorization/proof for four write-capable one-shots',()=>{
  assert.match(policy.required_next_slice.goal,/four write-capable B96-B99 one-shot/);
  assert.ok(policy.required_next_slice.must_prove.length>=5);
  assert.equal(policy.removal_authorized,false);
});
