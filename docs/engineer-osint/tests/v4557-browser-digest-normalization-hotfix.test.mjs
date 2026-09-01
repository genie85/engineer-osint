import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertV4557Applied,gitBlobSha,v4557,v4561,v4562,v4565} from './v4556-workflow-lifecycle-helper.mjs';

const workflow=readFileSync('.github/workflows/identity-fix-retirement-regression.yml','utf8');

test('v4.5.57 records the exact red-main browser failure and one semantic-equivalent label case drift',()=>{
  assert.equal(v4557.reviewed_main_sha,'418802da8c46e26588dfb9fc56cbdef95bc7c317');
  assert.equal(v4557.production_failure.workflow_run_id,33451532114);
  assert.equal(v4557.production_failure.prior_successful_workflow_run_id,33446496913);
  assert.equal(v4557.production_failure.expected_sha256,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
  assert.equal(v4557.production_failure.observed_sha256,'102875d1e93fefba527f68c426f7b328e87a1edfb32f4f592f4389a1827f10dc');
  assert.deepEqual(v4557.production_failure.isolated_normalized_dom_difference,{
    prior_text:'Informační mezery',
    failed_text:'INFORMAČNÍ MEZERY',
    declared_data_label_cs:'Informační mezery',
    declared_data_label_en:'Intelligence Gaps',
    other_normalized_dom_difference_count:0
  });
});

test('v4.5.57 exact browser-guard successor remains the pinned predecessor of the exact action-upgrade successor',()=>{
  assert.equal(v4557.target.historical_git_blob_sha,'272c85272137c256484b831be98f7340cbe6db8e');
  assert.equal(v4557.target.successor_git_blob_sha,'7e11d0d3c5b314c08ca9ea9ec36c5421d917fe44');
  const baseline=v4561.workflows.find(item=>item.file==='identity-fix-retirement-regression.yml');
  const successor=v4562.workflows.find(item=>item.file==='identity-fix-retirement-regression.yml');
  const actionSuccessor=v4565.workflow_successors.find(item=>item.file==='identity-fix-retirement-regression.yml');
  assert.ok(baseline);
  assert.ok(successor);
  assert.ok(actionSuccessor);
  assert.equal(baseline.git_blob_sha,v4557.target.successor_git_blob_sha);
  assert.equal(baseline.configured_node_major,20);
  assert.equal(successor.git_blob_sha,'d32f8f39d54c0e5ff07be7e616d4ea62cc8ade3d');
  assert.equal(successor.configured_node_major,24);
  assert.equal(actionSuccessor.v4562_git_blob_sha,successor.git_blob_sha);
  assert.equal(actionSuccessor.v4564_diagnostic_git_blob_sha,'6b93ce6ffe25b74a661f2326f20adb11d31a19f7');
  assert.equal(gitBlobSha(workflow),actionSuccessor.v4564_diagnostic_git_blob_sha);
  assertV4557Applied();
});

test('v4.5.57 keeps the historical expected digest and arbitrary drift fail-closed',()=>{
  assert.match(workflow,/text\.casefold\(\) in \{cs\.casefold\(\),en\.casefold\(\)\}/);
  assert.match(workflow,/expected='6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31'/);
  assert.equal(v4557.target.expected_browser_sha256_unchanged,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
  assert.equal(v4557.safety_boundary.arbitrary_text_drift_normalized,false);
  for(const value of Object.values(v4557.safety_boundary))assert.equal(value,false);
});

test('v4.5.57 preserves B99 and performs no canonical/runtime/history mutation',()=>{
  const u=v4557.required_unchanged_state;
  assert.equal(u.b99_run_id,'engineer-osint-20260830-B99');
  assert.equal(u.b99_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(u.b99_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(u.active_legacy_factual_overlay_count,0);
  assert.equal(u.active_legacy_baseline_module_count,0);
});
