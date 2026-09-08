import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4678A_V4669A_SUCCESSOR_MATERIALIZATION_CORRECTION_AUTHORIZATION.json`,'utf8'));
const repair=JSON.parse(readFileSync(`${root}/V4686A_B105_POSTWRITE_FIXTURE_REPAIR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=value=>{
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
};
const correctedB105V4670Successor='4761fa6a89494c18b5d297ed9c728508050efdcb';
const correctedB105V4669aSuccessor='5b5e323951608a6a92fa058fa02f8282e4134c09';
const correctedPostwriteV4670Successor='0057f57722486cb7e82c23d6acc9fdbfc58ef874';
const correctedPostwriteV4669aSuccessor='a0bc5d5be5ad84dc70420abb6209eb4e3bf98355';

test('v4.6.78a pins immutable upstream and two pre-materialized replacement successors',()=>{
  assert.equal(auth.schema_version,'engineer-osint-v4669a-successor-materialization-correction-authorization-v1');
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_main_sha,'b944d1946b0e0b0c7650ca709c367d31a0e52029');
  assert.equal(gitBlobSha(readFileSync(auth.upstream_authorization.path)),auth.upstream_authorization.git_blob_sha);
  assert.equal(auth.upstream_authorization.git_blob_sha,'5ab11a756d1e1636cf79f7b9eac348067e538013');
  assert.equal(auth.correction_reason.unavailable_successor_git_blob_sha,'4396d5e87af72ddeb90ca080ea0b105411076cad');
  assert.equal(auth.materialization_evidence.v4670_lifecycle_successor.git_blob_sha,'8d5b111911b39f7fee30e00f6f833b262561e701');
  assert.equal(auth.materialization_evidence.v4669a_replacement_successor.git_blob_sha,'58d5281ad101f3da6920399659f3d6222483a429');
  for(const evidence of Object.values(auth.materialization_evidence)){
    assert.equal(evidence.materialized,true);
    assert.equal(evidence.read_back_verified,true);
  }
});

test('v4.6.78a remains lifecycle-compatible with each ordered exact transition, corrected-B105 descendants and authorized postwrite-repair states',()=>{
  const v4670=auth.authorized_targets.v4670_test;
  const v4669a=auth.authorized_targets.v4669a_test;
  const repairV4670=repair.exact_repair_targets.find(item=>item.path===v4670.path);
  const repairV4669a=repair.exact_repair_targets.find(item=>item.path===v4669a.path);
  assert.ok(repairV4670&&repairV4669a,'postwrite repair must pin V4670 and V4669A targets');
  assert.ok([v4670.source_git_blob_sha,v4670.replacement_successor_git_blob_sha,correctedB105V4670Successor,repairV4670.successor_git_blob_sha,correctedPostwriteV4670Successor].includes(gitBlobSha(readFileSync(v4670.path))));
  assert.ok([v4669a.source_git_blob_sha,v4669a.replacement_successor_git_blob_sha,correctedB105V4669aSuccessor,repairV4669a.successor_git_blob_sha,correctedPostwriteV4669aSuccessor].includes(gitBlobSha(readFileSync(v4669a.path))));
  assert.equal(v4670.source_git_blob_sha,'0e17237a65876cabe8ee14a9b333ddc28d053447');
  assert.equal(v4670.replacement_successor_git_blob_sha,'8d5b111911b39f7fee30e00f6f833b262561e701');
  assert.equal(v4669a.source_git_blob_sha,'616405eaa413ec5552099dfec419f298c47a9440');
  assert.equal(v4669a.unavailable_successor_git_blob_sha,'4396d5e87af72ddeb90ca080ea0b105411076cad');
  assert.equal(v4669a.replacement_successor_git_blob_sha,'58d5281ad101f3da6920399659f3d6222483a429');
});

test('v4.6.78a enforces separate ordered implementation and preserves B105/B106 safety boundaries',()=>{
  assert.deepEqual(auth.implementation_sequence,[
    'step_1_change_only_v4670_test_to_exact_materialized_replacement_successor',
    'step_2_after_step_1_is_merged_and_green_change_only_v4669a_test_to_exact_materialized_replacement_successor',
    'step_3_only_after_step_2_is_merged_and_green_retry_the_original_two_guard_implementation_as_a_separate_slice'
  ]);
  assert.equal(auth.implementation_requirements.separate_ordered_implementation_slices,true);
  for(const value of Object.values(auth.forbidden))assert.equal(value,true);
  assert.equal(auth.authorization.ordered_materialized_successor_correction_permitted,true);
  assert.equal(auth.authorization.canonical_execution_permitted,false);
  assert.equal(auth.authorization.b106_permitted,false);
});