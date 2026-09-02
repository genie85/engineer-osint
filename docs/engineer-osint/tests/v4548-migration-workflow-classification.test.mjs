import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4548_MIGRATION_WORKFLOW_CLASSIFICATION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-migration-workflow-classification.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const removedOneShots=['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml'];
const removedReadOnly=['b97-readiness.yml','b98-readiness.yml','b98-post-ci-readiness.yml','identity-fix-b99-candidate-readiness.yml','identity-fix-b99-mirror-sync-candidate-readiness.yml','identity-fix-readiness.yml','identity-mirror-parity-readiness.yml'];
const laterAuthorizedWorkflow='authorized-canonical-executor.yml';
const historicalWorkflowSurface=()=>readdirSync('.github/workflows').filter(name=>name.endsWith('.yml')&&name!==laterAuthorizedWorkflow).sort();
const byClass=name=>policy.workflows.filter(item=>item.classification===name);

test('v4.5.48 preserves its exact 18-workflow historical classification across authorized v4.5.50/v4.5.53 lifecycle',()=>{
  const actual=historicalWorkflowSurface();
  const classified=policy.workflows.map(item=>item.file).sort();
  assert.equal(policy.schema_version,'engineer-osint-migration-workflow-classification-v1');
  assert.equal(policy.status,'CLASSIFIED_NO_REMOVAL_AUTHORIZED');
  assert.equal(policy.reviewed_main_sha,'8c8b527ec4642539bb9966fee6cc804cee61f36a');
  assert.equal(policy.inventory_count,18);
  assert.equal(policy.removal_authorized,false);
  assert.equal(policy.workflow_deactivation_authorized,false);
  if(existsSync(`.github/workflows/${laterAuthorizedWorkflow}`)){
    const v4605=JSON.parse(readFileSync(`${root}/V4605_CANONICAL_EXECUTOR_AUTHORIZATION.json`,'utf8'));
    assert.equal(v4605.status,'READY_FOR_IMPLEMENTATION');
    assert.equal(v4605.authorized_targets.workflow_path,`.github/workflows/${laterAuthorizedWorkflow}`);
  }
  if(actual.length===18){
    assert.deepEqual(classified,actual);
    return;
  }
  assert.ok(existsSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`));
  const v4550=JSON.parse(readFileSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`,'utf8'));
  assert.equal(v4550.status,'AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED');
  if(actual.length===14){
    assert.deepEqual(actual,classified.filter(file=>!removedOneShots.includes(file)));
    for(const file of removedOneShots)assert.equal(existsSync(`.github/workflows/${file}`),false,file);
    return;
  }
  assert.equal(actual.length,7);
  assert.ok(existsSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`));
  const v4553=JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8'));
  assert.equal(v4553.status,'AUTHORIZED_EXACT_SEVEN_READONLY_WORKFLOWS_REMOVED');
  assert.deepEqual(actual,classified.filter(file=>![...removedOneShots,...removedReadOnly].includes(file)));
  assert.deepEqual(v4553.removed_targets.map(x=>x.file).sort(),[...removedReadOnly].sort());
  for(const file of [...removedOneShots,...removedReadOnly])assert.equal(existsSync(`.github/workflows/${file}`),false,file);
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

test('v4.5.48 historically isolates all four repository-write one-shot workflows without authorizing their removal',()=>{
  const expected=[...removedOneShots].sort();
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

test('v4.5.48 fail-closed audit remains immutable; it runs only in its exact pre-removal lifecycle',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  assert.doesNotMatch(audit,/delete_file|update_file|create_file/);
  const targetPresence=removedOneShots.filter(file=>existsSync(`.github/workflows/${file}`)).length;
  assert.ok(targetPresence===0||targetPresence===4,`partial one-shot lifecycle state: ${targetPresence}/4 present`);
  if(targetPresence===4){
    const output=execFileSync(process.execPath,[`${root}/audit-migration-workflow-classification.mjs`],{encoding:'utf8'});
    assert.match(output,/MIGRATION_WORKFLOW_CLASSIFICATION=PASS/);
    assert.match(output,/inventory=18 active=5 historical=2 removable=11 removal-authorized=0/);
  }else{
    assert.equal(gitBlobSha(audit),'36abc4b74a3d360833d7e1b2f6e30795bb91f26d');
    const removal=JSON.parse(readFileSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`,'utf8'));
    assert.equal(removal.status,'AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED');
    assert.equal(removal.historical_audits_retained.find(x=>x.file==='audit-migration-workflow-classification.mjs')?.git_blob_sha,'36abc4b74a3d360833d7e1b2f6e30795bb91f26d');
  }
});

test('v4.5.48 next slice remained constrained to authorization/proof for four write-capable one-shots',()=>{
  assert.match(policy.required_next_slice.goal,/four write-capable B96-B99 one-shot/);
  assert.ok(policy.required_next_slice.must_prove.length>=5);
  assert.equal(policy.removal_authorized,false);
});
