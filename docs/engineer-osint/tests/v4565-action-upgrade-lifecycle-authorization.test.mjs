import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json`,'utf8'));
const v4563=JSON.parse(readFileSync(`${root}/V4563_ACTION_NODE24_AUTHORIZATION.json`,'utf8'));
const v4566=JSON.parse(readFileSync(`${root}/V4566_SELF_SUCCESSOR_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const b100IdentityWorkflowSha='1113c9388e69abea0b9b14a029b68a906befdb31';
const b101IdentityWorkflowSha='744daab32ba9e55c1546b38ab2dd049562777906';
const b102IdentityWorkflowSha='3a14efd69c46d464c50543431565b57b4517ae39';
const b103IdentityWorkflowSha='ba0517693b06a0360e1254f47e8b9004942bba0f';
const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';

const expectedTests=new Map([
  ['docs/engineer-osint/tests/v4556-workflow-lifecycle-helper.mjs',{historical:'3501017e228ac37a59c2b1ec115786550fb014fb',successor:'3149bc399f3e6e8faa4ee26d372c64cfe61cfe36',b100:'ff0c3db08ec48bebb352fdcd7c288d2481bc3528',b101:'5ad0a2ded7984574ecc558f3cbaee6fff956896f',b102:'62e117a71d6efcc6fad3bf9e1dafbbd62e797ddb',executor:'62e117a71d6efcc6fad3bf9e1dafbbd62e797ddb',b103:'f51afbbb9ed9a0be245115edfaab149073f68ea2',b104:'7e9480f421cdd811c2660033e4539f926ce5ad7b'}],
  ['docs/engineer-osint/tests/v4557-browser-digest-normalization-hotfix.test.mjs',{historical:'2999eecf4b6f45a98e674d7e4529da763a11837c',successor:'238303bc0e6db4f1371a0f65f036f28a174a58cd',b100:'129d9162065b9c6aabcd4612b16656485783237e',b101:'67153092b32919d6dc3989f7c790860f0651ddf0',b102:'f4a69aaa12c82914a0906ab4f530fb923f153bf4',executor:'f4a69aaa12c82914a0906ab4f530fb923f153bf4',b103:'265d5deb6af810555f1c6da5faa8886eb07c352d',b104:'9939fbcbf9c7f09f61a9a5c82c795873bddd0a61'}],
  ['docs/engineer-osint/tests/v4562-active-node24-migration.test.mjs',{historical:'8c8612c73f677064db2d59f013d3bfecd6dfbcfe',successor:'1f7770c3a7c1c7b912505012814841d1d06def1d',b100:'f0b0a62b569ed293391f53a786dbbb9e17df57d9',b101:'2a895ff2f26e1b6ec7c52360b3dfadc67031f5f9',b102:'d59614a0e959ccdfa39192c4f3234b7ff285fd1b',executor:'63fe546792e209be1b7308492fa24e3bb1990e35',b103:'ff9f671072de2fe9309036c5825a84accab5a0c0',b104:'c61540fa8c9be9cb21129e46fe488391502102dd'}],
  ['docs/engineer-osint/tests/v4563-action-node24-authorization.test.mjs',{historical:'459c52e39ad732508bd8df8fa03793521803f04e',successor:'ee0132955b4a74c939ef3e57487b44b891dd90e3',b100:'9639e6040d9304c8659f2359e91d87eb11b7a310',b101:'a11d350f80efa8fdf223dcca2fb881ac049d21d1',b102:'ba98543175b4fa7527db20542acf988e1b272353',executor:'ba98543175b4fa7527db20542acf988e1b272353',b103:'322e8bde71cd7d5e38dd6254f8b29297071ebf00',b104:'558b54212ff856a01be7c1a5dedfaa871e5c820c'}]
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
const b100TestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.b100);
const b101TestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.b101);
const b102TestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.b102);
const executorTestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.executor);
const b103TestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.b103);
const b104TestMode=[...expectedTests].every(([file,sha])=>currentTestShas.get(file)===sha.b104);
const currentWorkflowShas=new Map(expectedSuccessors.map(([file])=>[file,gitBlobSha(readFileSync(`.github/workflows/${file}`,'utf8'))]));
const baselineWorkflowMode=expectedSuccessors.every(([file,baseline])=>currentWorkflowShas.get(file)===baseline);
const successorWorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===successor);
const b100WorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===(file==='identity-fix-retirement-regression.yml'?b100IdentityWorkflowSha:successor));
const b101WorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===(file==='identity-fix-retirement-regression.yml'?b101IdentityWorkflowSha:successor));
const b102WorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===(file==='identity-fix-retirement-regression.yml'?b102IdentityWorkflowSha:successor));
const b103WorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===(file==='identity-fix-retirement-regression.yml'?b103IdentityWorkflowSha:successor));
const b104WorkflowMode=expectedSuccessors.every(([file,,successor])=>currentWorkflowShas.get(file)===(file==='identity-fix-retirement-regression.yml'?b104IdentityWorkflowSha:successor));

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

test('v4.5.65 preserves immutable baselines and recognizes only pinned historical/action/B100/B101/B102/executor/B103/B104 test successors',()=>{
  assert.equal(policy.authorized_test_files.length,4);
  assert.equal(new Set(policy.authorized_test_files.map(x=>x.file)).size,4);
  for(const item of policy.authorized_test_files){
    const exact=expectedTests.get(item.file);
    assert.ok(exact,`${item.file}: missing exact lifecycle target`);
    assert.equal(exact.historical,item.historical_git_blob_sha,`${item.file}: authorization target mismatch`);
    assert.ok(item.allowed_change.length>40,`${item.file}: allowed change is not explicit`);
  }
  assert.ok(baselineTestMode||successorTestMode||b100TestMode||b101TestMode||b102TestMode||executorTestMode||b103TestMode||b104TestMode,'lifecycle tests are a mixed or unauthorized state');
  assert.equal(v4566.authorized_test.historical_git_blob_sha,'bcc84c5536420fcc1be2b6fcf9060cca851e09b4');
  assert.equal(v4566.execution_boundary.v4565_test_self_successor_change_authorized,true);
  assert.equal(v4566.execution_boundary.wildcard_or_current_state_acceptance_authorized,false);
});

test('v4.5.65 keeps historical workflow successors immutable and permits only exact B100/B101/B102/B103/B104 browser successors',()=>{
  assert.deepEqual(policy.workflow_successors.map(x=>[x.file,x.v4562_git_blob_sha,x.v4564_diagnostic_git_blob_sha]),expectedSuccessors);
  assert.ok(baselineWorkflowMode||successorWorkflowMode||b100WorkflowMode||b101WorkflowMode||b102WorkflowMode||b103WorkflowMode||b104WorkflowMode,'workflows are a mixed or unauthorized lifecycle state');
  if(baselineWorkflowMode)assert.equal(baselineTestMode,true,'baseline workflow/test modes diverged');
  if(successorWorkflowMode)assert.equal(successorTestMode,true,'action workflow/test successor modes diverged');
  if(b100WorkflowMode)assert.equal(b100TestMode,true,'B100 workflow/test successor modes diverged');
  if(b101WorkflowMode)assert.equal(b101TestMode,true,'B101 workflow/test successor modes diverged');
  if(b102WorkflowMode)assert.equal(b102TestMode||executorTestMode||b103TestMode||b104TestMode,true,'B102 workflow/test compatibility modes diverged');
  if(b103WorkflowMode)assert.equal(b103TestMode||b104TestMode,true,'B103 workflow/test successor modes diverged');
  if(b104WorkflowMode)assert.equal(b104TestMode,true,'B104 workflow/test successor modes diverged');
  const v4563Map=new Map(v4563.active_workflows.map(x=>[x.file,x.historical_git_blob_sha]));
  for(const [file,v4562Sha] of expectedSuccessors)assert.equal(v4563Map.get(file),v4562Sha,`${file}: v4.5.63 historical anchor drift`);
  if(b100WorkflowMode||b101WorkflowMode||b102WorkflowMode||b103WorkflowMode||b104WorkflowMode){
    const text=readFileSync('.github/workflows/identity-fix-retirement-regression.yml','utf8');
    assert.match(text,/'engineer-osint-20260830-B99':'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31'/);
    assert.match(text,/'engineer-osint-20260902-B100':'58f9d08fa884fd49638f0f57a52dde993c3a22fafc5233c13e4e14d90e30e85d'/);
    if(b101WorkflowMode||b102WorkflowMode||b103WorkflowMode||b104WorkflowMode)assert.match(text,/'engineer-osint-20260902-B101':'c8c134daff25a15b3825680f5e033d83a833f87910e2c94421adf634ee7a7acd'/);
    if(b102WorkflowMode||b103WorkflowMode||b104WorkflowMode)assert.match(text,/'engineer-osint-20260902-B102':'5122d347541c53638a59c8f3c855c417db8ae2ea5a04b002948d655d91b5e6d7'/);
    if(b103WorkflowMode||b104WorkflowMode)assert.match(text,/'engineer-osint-20260902-B103':'68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a'/);
    if(b104WorkflowMode)assert.match(text,/'engineer-osint-20260903-B104':'5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c'/);
    assert.match(text,/no exact digest authorized for current run/);
  }
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