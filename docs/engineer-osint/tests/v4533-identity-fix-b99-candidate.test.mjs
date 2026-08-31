import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4533_IDENTITY_FIX_CANDIDATE_READINESS.json`,'utf8'));
const generator=readFileSync(`${root}/build-identity-fix-b99-candidate.mjs`,'utf8');
const workflowPath='.github/workflows/identity-fix-b99-candidate-readiness.yml';
const workflow=existsSync(workflowPath)?readFileSync(workflowPath,'utf8'):null;
const v4553=existsSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`)?JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8')):null;
const assertHistoricalWorkflow=()=>{
  assert.ok(v4553,'B99 candidate workflow missing without v4.5.53 removal evidence');
  const removed=v4553.removed_targets.find(x=>x.file==='identity-fix-b99-candidate-readiness.yml');
  assert.ok(removed);
  assert.equal(removed.git_blob_sha,'947f4f7ee65a2677e107e6662d315bac5de3eaf0');
};

test('v4.5.33 pins exact B99 identity candidate to persistent B98',()=>{
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260830-B98');
  assert.equal(policy.expected_parent_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(policy.exact_candidate_file_sha256,'d58c874f5846f53f5eaa610f35d452b165282cf3f495cb8c7013cd392105e411');
  assert.equal(policy.expected_resulting_canonical_sha256,'029b533d88846cb4e14137dffe563771b5ad204e1df77568d64e20ee0f529cef');
});

test('v4.5.33 scope is exactly 36 reviewed operations with nine explicit removals',()=>{
  assert.equal(policy.expected_operation_count,36);
  assert.equal(policy.expected_replace_field_count,27);
  assert.equal(policy.expected_remove_field_count,9);
  assert.equal(policy.expected_replace_field_count+policy.expected_remove_field_count,policy.expected_operation_count);
  assert.deepEqual(policy.expected_changed_ids,['ENG-EVID-0113','ENG-TECH-0032','ENG-TECH-0036','ENG-VIS-0054']);
  assert.match(generator,/op:'REMOVE_FIELD'/);
  assert.match(generator,/op:'REPLACE_FIELD'/);
});

test('v4.5.33 requires zero authoritative residual and isolates exact legacy mirror debt',()=>{
  assert.equal(policy.expected_overlay_mutations_before,70);
  assert.equal(policy.expected_overlay_mutations_after,18);
  assert.equal(policy.expected_canonical_overlay_mutations_after,0);
  assert.equal(policy.expected_legacy_mirror_mutations_after,18);
  assert.equal(policy.allowed_legacy_mirror_prefix,'dashboard_patch_extras.updated_records[70].');
  assert.match(generator,/canonicalResidual=residual\.filter/);
  assert.match(generator,/legacyMirrorResidual=residual\.filter/);
});

test('v4.5.33 uses standard append dry-run and does not authorize publication or retirement',()=>{
  if(workflow){
    assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
    assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  }else assertHistoricalWorkflow();
  assert.equal(policy.safety.canonical_write_performed,false);
  assert.equal(policy.safety.append_run_write_allowed,false);
  assert.equal(policy.safety.identity_fix_runtime_removal_authorized,false);
  assert.equal(policy.safety.legacy_mirror_cleanup_required_before_identity_fix_retirement,true);
  assert.match(generator,/safe_to_append:false/);
  assert.match(generator,/safe_to_retire_identity_fix_overlay:false/);
});
