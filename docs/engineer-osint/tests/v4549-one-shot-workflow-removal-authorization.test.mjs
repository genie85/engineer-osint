import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4549_ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION.json`,'utf8'));
const audit=readFileSync(`${root}/audit-one-shot-workflow-removal-authorization.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const expectedTargets=['b96-one-shot-publish.yml','b97-one-shot-publish.yml','b98-one-shot-publish.yml','b99-one-shot-publish.yml'].sort();

test('v4.5.49 authorizes exactly one future removal slice for four B96-B99 one-shots',()=>{
  assert.equal(policy.schema_version,'engineer-osint-one-shot-workflow-removal-authorization-v1');
  assert.equal(policy.status,'READY_FOR_EXACT_FOUR_ONE_SHOT_REMOVAL_SLICE');
  assert.equal(policy.reviewed_main_sha,'c506c4c838d7967ac9445186529285cdddbd1992');
  assert.equal(policy.reviewed_classification_policy_git_blob_sha,'13f968a22a9c65b953a95246b32b704b7939dd6e');
  assert.equal(policy.authorization.one_removal_slice_only,true);
  assert.equal(policy.authorization.allow_delete_exact_four_one_shot_workflows,true);
  assert.deepEqual(policy.targets.map(x=>x.file).sort(),expectedTargets);
});

test('v4.5.49 forbids all broader workflow, canonical, run-store and runtime changes',()=>{
  for(const key of [
    'allow_edit_target_workflows_before_deletion','allow_delete_any_other_workflow','allow_edit_any_other_workflow',
    'allow_deactivate_historical_evidence_workflows','allow_edit_active_production_protection_workflows',
    'allow_canonical_data_edit','allow_run_store_manifest_edit','allow_run_append','allow_runtime_module_edit',
    'allow_historical_policy_or_audit_rewrite','allow_manual_hash_edit'
  ]) assert.equal(policy.authorization[key],false,key);
});

test('v4.5.49 pins exact B96-B99 historical run hashes and parent sequence',()=>{
  const expected=[
    ['engineer-osint-20260829-B96','3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1','4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5'],
    ['engineer-osint-20260830-B97','b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad','9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4'],
    ['engineer-osint-20260830-B98','ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79','4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201'],
    ['engineer-osint-20260830-B99','ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab','754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30']
  ];
  assert.deepEqual(policy.targets.map(x=>[x.historical_run_id,x.run_file_sha256,x.canonical_sha256]),expected);
});

test('v4.5.49 freezes the five active protections and two historical evidence workflows',()=>{
  assert.equal(policy.required_unchanged_active_protections.length,5);
  assert.equal(policy.required_unchanged_historical_evidence.length,2);
  assert.deepEqual(policy.required_unchanged_active_protections.map(x=>x.file).sort(),[
    'first-three-overlay-retirement-regression.yml','i18n-switch-regression.yml','identity-fix-retirement-regression.yml','pages.yml','runtime-audit-snapshot.yml'
  ].sort());
  assert.deepEqual(policy.required_unchanged_historical_evidence.map(x=>x.file).sort(),[
    'identity-fix-retirement-authorization.yml','identity-fix-retirement-readiness.yml'
  ].sort());
});

test('v4.5.49 authorization audit remains immutable and runs only before the authorized deletion',()=>{
  assert.doesNotMatch(audit,/writeFileSync|appendFileSync|rmSync|unlinkSync/);
  const targetPresence=expectedTargets.filter(file=>existsSync(`.github/workflows/${file}`)).length;
  assert.ok(targetPresence===0||targetPresence===4,`partial one-shot lifecycle state: ${targetPresence}/4 present`);
  if(targetPresence===4){
    const output=execFileSync(process.execPath,[`${root}/audit-one-shot-workflow-removal-authorization.mjs`],{encoding:'utf8'});
    assert.match(output,/ONE_SHOT_WORKFLOW_REMOVAL_AUTHORIZATION=PASS/);
    assert.match(output,/targets=4 references=0 active=5 historical=2 pre-inventory=18 post-expected=14/);
  }else{
    assert.equal(gitBlobSha(audit),'b01aeb1cc88a697d8757bc918b6c20e2cb9bed76');
    assert.ok(existsSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`));
    const removal=JSON.parse(readFileSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`,'utf8'));
    assert.equal(removal.status,'AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED');
    assert.equal(removal.authorization_policy_git_blob_sha,'8ef9ab22c1d92dd8caa29c5a71360df3d7888499');
    assert.equal(removal.historical_audits_retained.find(x=>x.file==='audit-one-shot-workflow-removal-authorization.mjs')?.git_blob_sha,'b01aeb1cc88a697d8757bc918b6c20e2cb9bed76');
  }
});

test('v4.5.49 next slice was deletion-only and retained full regression gates',()=>{
  const next=policy.required_next_slice;
  assert.match(next.goal,/Delete exactly the four authorized B96-B99 one-shot publish workflow files and nothing else/);
  assert.equal(next.expected_workflow_count_after,14);
  assert.equal(next.must_preserve_active_protection_count,5);
  assert.equal(next.must_preserve_historical_evidence_count,2);
  assert.equal(next.must_preserve_b96_b99_run_hashes,true);
  assert.equal(next.must_run_full_p0_p1,true);
  assert.equal(next.must_run_browser_regressions,true);
  assert.equal(next.must_verify_pages_after_merge,true);
});
