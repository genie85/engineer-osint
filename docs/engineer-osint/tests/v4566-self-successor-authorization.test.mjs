import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4566_SELF_SUCCESSOR_AUTHORIZATION.json`,'utf8'));
const v4565Text=readFileSync(`${root}/V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json`,'utf8');
const v4565TestText=readFileSync(`${root}/tests/v4565-action-upgrade-lifecycle-authorization.test.mjs`,'utf8');
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.66 is authorization-only and pinned to exact v4.5.65 main',()=>{
  assert.equal(policy.schema_version,'engineer-osint-self-successor-authorization-v1');
  assert.equal(policy.version,'v4.5.66');
  assert.equal(policy.status,'AUTHORIZED_EXACT_V4565_TEST_SELF_SUCCESSOR_NOT_EXECUTED');
  assert.equal(policy.reviewed_main_sha,'6f1b36ba60b258e42b193935248439c6f6d44fb2');
});

test('v4.5.66 pins immutable v4.5.65 policy and exact current v4.5.65 test',()=>{
  assert.equal(policy.v4565_policy.git_blob_sha,'1a04438e8a8541adc0ea426ee2d7c623446e9244');
  assert.equal(gitBlobSha(v4565Text),policy.v4565_policy.git_blob_sha);
  assert.equal(policy.authorized_test.historical_git_blob_sha,'bcc84c5536420fcc1be2b6fcf9060cca851e09b4');
  assert.equal(gitBlobSha(v4565TestText),policy.authorized_test.historical_git_blob_sha);
});

test('v4.5.66 authorizes only one self-successor test and no broader mutation',()=>{
  const b=policy.execution_boundary;
  assert.equal(b.v4565_test_self_successor_change_authorized,true);
  for(const key of [
    'other_test_file_change_authorized','historical_policy_edit_authorized','canonical_write_authorized',
    'append_only_write_authorized','runtime_change_authorized','ui_change_authorized',
    'browser_digest_change_authorized','trigger_change_authorized','permissions_change_authorized',
    'job_or_command_change_authorized','wildcard_or_current_state_acceptance_authorized'
  ])assert.equal(b[key],false,key);
  assert.equal(policy.required_unchanged.browser_digest,'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31');
});
