import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json`,'utf8'));
const v4563=JSON.parse(readFileSync(`${root}/V4563_ACTION_NODE24_AUTHORIZATION.json`,'utf8'));
const v4566=JSON.parse(readFileSync(`${root}/V4566_SELF_SUCCESSOR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

const expectedTests=new Map([
  ['docs/engineer-osint/tests/v4556-workflow-lifecycle-helper.mjs',{historical:'3501017e228ac37a59c2b1ec115786550fb014fb',successor:'3149bc399f3e6e8faa4ee26d372c64cfe61cfe36'}],
  ['docs/engineer-osint/tests/v4557-browser-digest-normalization-hotfix.test.mjs',{historical:'2999eecf4b6f45a98e674d7e4529da763a11837c',successor:'238303bc0e6db4f1371a0f65f036f28a174a58cd'}],
  ['docs/engineer-osint/tests/v4562-active-node24-migration.test.mjs',{historical:'8c8612c73f677064db2d59f013d3bfecd6dfbcfe',successor:'1f7770c3a7c1c7b912505012814841d1d06def1d'}],
  ['docs/engineer-osint/tests/v4563-action-node24-authorization.test.mjs',{historical:'459c52e39ad732508bd8df8fa03793521803f04e',successor:'ee0132955b4a74c939ef3e57487b44b891dd90e3'}]
]);

const expectedSuccessors=[
  ['first-three-overlay-retirement-regression.yml','9ca5ee4c483c81f0f9af2b938c2578c82510e1de','a0a1586824981f3154c78e24656d3cd19e1d7609'],
  ['i18n-switch-regression.yml','7eb80c13e7f72b4557a8a1cc451942c1bba38044','c616f37d870b93b428f652a284a3dc5de13df609'],
  ['identity-fix-retirement-regression.yml','d32f8f39d54c0e5ff07be7e616d4ea62cc8ade3d','6b93ce6ffe25b74a661f2326f20adb11d31a19f7'],
  ['pages.yml','eb677cdf7b775dff55449a911d08318b1e62989b','47102c7d9481beaeedbdf03532ffaad72675af43'],
  ['runtime-audit-snapshot.yml','61ab1b58bd3d476e8ef312e848d77481fd1090a3','9cffd58764aa5ed02aa11dcbe7745772077f06c7']
];

const currentTestShas=new Map([...expectedTests].map(([file])=>[file,gitBlobSha(readFileSync(file,'utf8'))]));
const baselineTestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.historical);
const successorTestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.successor);
const currentWorkflowShas=new Map(expectedSuccessors.map(([file])=>[file,gitBlobSha(readFileSync(`.github/workflows/${file}`,'utf8'))]));
const baselineWorkflowMode=expectedSuccessors.every(([file,baseline])=>currentWorkflowShas.get(file)===baseline);
const successorWorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===successor);

test('v4.5.65 is authorization-only and pinned to exact green v4.5.63 main',()=>{
  assert.equal(policy.schema_version,'engineer-osint-action-upgrade-lifecycle-authorization-v1');
  assert.equal(policy.version,'v4.5.65');
  assert.equal(policy.status,'AUTHORIZED_EXACT_ACTION_UPGRADE_LIFECYCLE_SUCCESSOR_HANDLING_NOT_EXECUTED');
  assert.equal(policy.reviewed_main_sha,'e2887b28600c8043452e67f582a5185d8d297727');
  assert.equal(policy.diagnostic_execution.pr_number,285);
  assert.equal(policy.diagnostic_execution.pr_state,'CLOSED_UNMERGED_DIAGNOSTIC');
  assert.equal(policy.diagnostic_execution.head_sha,'26f8aa62927d2d1f53686a6ca857bad51f8c285e');
  assert.equal(policy.diagnostic_execution.p0_p1_tests_total,420);
  assert.equal(policy.diagnostic_execution.p0_p1_tests_pass,406);
  assert.equal(policy.diagnostic_execution.p0_p1_tests_fail,11);
  assert.equal(policy.diagnostic_execution.p0_p1_tests_skip,3);
  assert.equal(policy.diagnostic_execution.i18n_workflow_success,true);
  assert.equal(policy.diagnostic_execution.action_download_and_setup_success,true);
});

test('v4.5.65 preserves four immutable baselines and accepts only their exact authorized successor blobs',()=>{
  assert.equal(policy.authorized_test_files.length,4);
  assert.equal(new Set(policy.authorized_test_files.map(x=>x.file)).size,4);
  for(const item of policy.authorized_test_files){
    const exact=expectedTests.get(item.file);
    assert.ok(exact,`${item.file}: missing exact lifecycle target`);
    assert.equal(exact.historical,item.historical_git_blob_sha,`${item.file}: authorization target mismatch`);
    assert.ok(item.allowed_change.length>40,`${item.file}: allowed change is not explicit`);
  }
  assert.ok(baselineTestMode||successorTestMode,'lifecycle tests are a mixed or unauthorized state');
  assert.equal(v4566.authorized_test.historical_git_blob_sha,'bcc84c5536420fcc1be2b6fcf9060cca851e09b4');
  assert.equal(v4566.execution_boundary.v4565_test_self_successor_change_authorized,true);
  assert.equal(v4566.execution_boundary.wildcard_or_current_state_acceptance_authorized,false);
});

test('v4.5.65 pins only exact v4.5.62 to diagnostic v4.5.64 workflow successors',()=>{
  assert.deepEqual(policy.workflow_successors.map(x=>[x.file,x.v4562_git_blob_sha,x.v4564_diagnostic_git_blob_sha]),expectedSuccessors);
  assert.ok(baselineWorkflowMode||successorWorkflowMode,'workflows are a mixed or unauthorized lifecycle state');
  assert.equal(baselineWorkflowMode,baselineTestMode,'workflow and lifecycle-test modes diverged');
  assert.equal(successorWorkflowMode,successorTestMode,'workflow and lifecycle-test successor modes diverged');
  const v4563Map=new Map(v4563.active_workflows.map(x=>[x.file,x.historical_git_blob_sha]));
  for(const [file,v4562Sha] of expectedSuccessors)assert.equal(v4563Map.get(file),v4562Sha,`${file}: v4.5.63 historical anchor drift`);
});

test('v4.5.65 preserves the exact v4.5.63 action substitution set',()=>{
  assert.deepEqual(policy.authorized_action_substitutions,[
    ['actions/checkout@v4','actions/checkout@v5'],
    ['actions/setup-node@v4','actions/setup-node@v5'],
    ['actions/upload-artifact@v4','actions/upload-artifact@v7'],
    ['actions/configure-pages@v5','actions/configure-pages@v6'],
    ['actions/upload-pages-artifact@v4','actions/upload-pages-artifact@v5'],
    ['actions/deploy-pages@v4','actions/deploy-pages@v5']
  ]);
  assert.equal(v4563.authorized_substitutions.length,6);
  assert.deepEqual(v4563.authorized_substitutions.map(x=>[x.from,x.to]),policy.authorized_action_substitutions);
});

test('v4.5.65 forbids wildcard lifecycle acceptance and every broader mutation',()=>{
  const b=policy.execution_boundary;
  assert.equal(b.test_file_change_authorized,true);
  assert.equal(b.authorized_test_file_count,4);
  assert.equal(b.workflow_action_upgrade_remains_authorized_by_v4563,true);
  for(const key of [
    'historical_policy_edit_authorized','canonical_write_authorized','append_only_write_authorized',
    'runtime_change_authorized','ui_change_authorized','browser_digest_change_authorized',
    'trigger_change_authorized','permissions_change_authorized','job_or_command_change_authorized',
    'wildcard_or_current_state_acceptance_authorized'
  ])assert.equal(b[key],false,key);
  assert.equal(policy.required_unchanged.browser_digest,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
});
