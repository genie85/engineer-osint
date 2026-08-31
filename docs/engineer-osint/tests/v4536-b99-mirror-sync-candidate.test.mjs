import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS.json`,'utf8'));
const generator=readFileSync(`${root}/build-identity-fix-b99-mirror-sync-candidate.mjs`,'utf8');
const workflowPath='.github/workflows/identity-fix-b99-mirror-sync-candidate-readiness.yml';
const workflow=existsSync(workflowPath)?readFileSync(workflowPath,'utf8'):null;
const v4553=existsSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`)?JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8')):null;
const assertHistoricalWorkflow=()=>{
  assert.ok(v4553,'B99 mirror-sync workflow missing without v4.5.53 removal evidence');
  const removed=v4553.removed_targets.find(x=>x.file==='identity-fix-b99-mirror-sync-candidate-readiness.yml');
  assert.ok(removed);
  assert.equal(removed.git_blob_sha,'d5d48134fe707b2d07ebeccfe555b9790d3d2c0f');
};

test('v4.5.36 derives synchronized B99 only from the historical exact v4.5.33 candidate',()=>{
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.expected_parent_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(policy.historical_v4533_candidate_file_sha256,'d58c874f5846f53f5eaa610f35d452b165282cf3f495cb8c7013cd392105e411');
  assert.match(generator,/build-identity-fix-b99-candidate\.mjs/);
  assert.match(generator,/historicalSha!==policy\.historical_v4533_candidate_file_sha256/);
  assert.match(generator,/historical candidate unexpectedly contains mirror sync/);
});

test('v4.5.36 mirror sync scope is exactly the 18 reviewed residual top-level fields',()=>{
  assert.equal(policy.sync_target_id,'ENG-TECH-0036');
  assert.deepEqual(policy.sync_fields,[
    'record_role','title_cs','title_en','temporal_status','summary_cs','summary_en','source_ids','evidence_ids','timeline_events',
    'confidence','event_date','date_precision','fact_cs','analysis_cs','mine_action_context','secondary_contexts','classification','translation_status'
  ]);
  assert.equal(new Set(policy.sync_fields).size,18);
  assert.match(generator,/legacy_mirror_sync_v1=\{/);
  assert.match(generator,/target_id:policy\.sync_target_id,fields:\[\.\.\.policy\.sync_fields\]/);
});

test('v4.5.36 requires zero identity overlay residual after authoritative operations plus mirror sync',()=>{
  assert.equal(policy.expected_overlay_mutations_before,70);
  assert.equal(policy.expected_overlay_mutations_after,0);
  assert.equal(policy.expected_canonical_overlay_mutations_after,0);
  assert.equal(policy.expected_legacy_mirror_mutations_after,0);
  assert.match(generator,/if\(residual\.length!==policy\.expected_overlay_mutations_after/);
  assert.match(generator,/safe_to_append:false,safe_to_retire_identity_fix_overlay:false/);
});

test('v4.5.36 remains review-only and standard append validation is dry-run only',()=>{
  assert.equal(policy.safety.canonical_write_performed,false);
  assert.equal(policy.safety.append_run_write_allowed,false);
  assert.equal(policy.safety.identity_fix_runtime_removal_authorized,false);
  assert.equal(policy.safety.historical_v4533_candidate_preserved,true);
  if(workflow){
    assert.match(workflow,/append-run\.mjs \"\$candidate\" > \"\$plan\"/);
    assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
    assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
    assert.match(workflow,/overlay_mutations_after!==0/);
  }else assertHistoricalWorkflow();
});
