import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4536_IDENTITY_FIX_B99_MIRROR_SYNC_READINESS.json`,'utf8'));
const builder=readFileSync(`${root}/build-identity-fix-b99-mirror-sync-candidate.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/identity-fix-b99-mirror-sync-readiness.yml','utf8');

const expectedFields=['record_role','title_cs','title_en','temporal_status','summary_cs','summary_en','source_ids','evidence_ids','timeline_events','confidence','event_date','date_precision','fact_cs','analysis_cs','mine_action_context','secondary_contexts','classification','translation_status'];

test('v4.5.36 pins exactly one reviewed ENG-TECH-0036 mirror sync request',()=>{
  assert.equal(policy.status,'EXACT_MIRROR_SYNC_CANDIDATE_PINNED_NO_WRITE');
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.legacy_mirror_sync_request_count,1);
  assert.equal(policy.legacy_mirror_sync_target_id,'ENG-TECH-0036');
  assert.deepEqual(policy.legacy_mirror_sync_fields,expectedFields);
  assert.equal(new Set(policy.legacy_mirror_sync_fields).size,18);
  for(const protectedField of ['id','first_seen_run','run_id','last_update_run'])assert.equal(policy.legacy_mirror_sync_fields.includes(protectedField),false);
});

test('v4.5.36 preserves the reviewed 36-operation identity scope and adds only explicit mirror sync',()=>{
  assert.equal(policy.expected_operation_count,36);
  assert.equal(policy.expected_replace_field_count,27);
  assert.equal(policy.expected_remove_field_count,9);
  assert.equal(policy.historical_v4533_candidate_file_sha256,'d58c874f5846f53f5eaa610f35d452b165282cf3f495cb8c7013cd392105e411');
  assert.match(builder,/build-identity-fix-b99-candidate\.mjs/);
  assert.match(builder,/legacy_mirror_sync_v1:\{updated_records:\[\{target_id:policy\.legacy_mirror_sync_target_id,fields\}\]\}/);
  assert.match(builder,/historical candidate unexpectedly contains mirror sync/);
});

test('v4.5.36 pins exact candidate and resulting canonical hashes discovered by standard dry-run',()=>{
  assert.equal(policy.exact_candidate_file_sha256,'3287950fb5ca93f542ca9aa4fa4c1de6e3a893c4f7e631e397730be3ea8da138');
  assert.equal(policy.expected_resulting_canonical_sha256,'f7741ab3cb8a3cbcec16ac2a476696f65313fa21af0d0f1c23f79410d426bd4a');
  assert.match(builder,/pinned v4\.5\.36 candidate file SHA drift/);
  assert.match(builder,/pinned v4\.5\.36 resulting canonical SHA drift/);
});

test('v4.5.36 requires identity overlay residuals to reach exact zero after candidate plus mirror sync',()=>{
  assert.equal(policy.expected_overlay_mutations_before,70);
  assert.equal(policy.expected_overlay_mutations_after,0);
  assert.equal(policy.expected_canonical_overlay_mutations_after,0);
  assert.equal(policy.expected_legacy_mirror_mutations_after,0);
  assert.match(builder,/residual\.length!==policy\.expected_overlay_mutations_after/);
  assert.match(builder,/legacyMirrorResidual\.length!==policy\.expected_legacy_mirror_mutations_after/);
  assert.match(builder,/canonicalResidual\.length!==policy\.expected_canonical_overlay_mutations_after/);
});

test('v4.5.36 remains review-only and does not authorize B99 append or identity overlay retirement',()=>{
  assert.equal(policy.safety.append_run_write_allowed,false);
  assert.equal(policy.safety.identity_fix_runtime_removal_authorized,false);
  assert.equal(policy.safety.legacy_mirror_removal_forbidden,true);
  assert.equal(policy.safety.identity_overlay_retirement_requires_separate_review,true);
  assert.match(builder,/safe_to_append:false/);
  assert.match(builder,/safe_to_retire_identity_fix_overlay:false/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
});

test('v4.5.36 workflow validates exact hashes only through a real standard dry-run',()=>{
  assert.match(workflow,/build-identity-fix-b99-mirror-sync-candidate\.mjs/);
  assert.match(workflow,/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/plan\.status!=='VALIDATED_DRY_RUN'/);
  assert.match(workflow,/IDENTITY_B99_MIRROR_SYNC_CANDIDATE_SHA/);
  assert.match(workflow,/IDENTITY_B99_MIRROR_SYNC_RESULT_SHA/);
});
