import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(here, '..');
const repoRoot = path.resolve(here, '../../..');
const workflowsDir = path.join(repoRoot, '.github', 'workflows');
const migrationPath = path.join(projectDir, 'V4562_ACTIVE_NODE24_MIGRATION.json');
const baselinePath = path.join(projectDir, 'V4561_CI_NODE_RUNTIME_INVENTORY.json');
const successorPath = path.join(projectDir, 'V4565_ACTION_UPGRADE_LIFECYCLE_AUTHORIZATION.json');
const migration = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));
const successorPolicy = JSON.parse(fs.readFileSync(successorPath, 'utf8'));
const b100IdentityWorkflowSha='1113c9388e69abea0b9b14a029b68a906befdb31';

function gitBlobSha(content) {
  const bytes = Buffer.from(content, 'utf8');
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
}

function actionUses(content) {
  return [...content.matchAll(/\buses:\s*([^\s,}\]#]+)/g)].map((match) => match[1]);
}

function configuredNodeMajor(content) {
  const match = content.match(/^\s*node-version:\s*['"]?(\d+)['"]?\s*$/m);
  return match ? Number(match[1]) : null;
}

const substitutionMap = new Map(successorPolicy.authorized_action_substitutions);
const workflowSuccessors = new Map(successorPolicy.workflow_successors.map((item) => [item.file, item]));

test('v4.5.62 migration scope is Node-runtime-only and fail-closed', () => {
  assert.equal(migration.schema_version, 'engineer-osint-active-node24-migration-v1');
  assert.equal(migration.version, 'v4.5.62');
  assert.equal(migration.status, 'ACTIVE_WORKFLOWS_NODE24_HISTORICAL_NODE20_RETAINED');
  assert.equal(migration.findings.workflow_trigger_change_performed, false);
  assert.equal(migration.findings.workflow_job_change_performed, false);
  assert.equal(migration.findings.action_version_change_performed, false);
  assert.equal(migration.findings.historical_workflows_modified, false);
  assert.equal(migration.findings.canonical_data_edit_performed, false);
  assert.equal(migration.findings.run_store_edit_performed, false);
  assert.equal(migration.findings.runtime_module_edit_performed, false);
  assert.equal(migration.findings.ui_edit_performed, false);
});

test('v4.5.62 contract covers every current workflow exactly once', () => {
  const actual = fs.readdirSync(workflowsDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();
  const contracted = migration.workflows.map((item) => item.file).sort();
  assert.deepEqual(contracted, actual);
  assert.equal(actual.length, migration.workflow_count);
  assert.equal(new Set(contracted).size, contracted.length);
  assert.equal(actual.length, 7);
});

test('v4.5.62 exact workflow history permits v4.5.65 successors plus the exact B100 identity browser successor', () => {
  for (const item of migration.workflows) {
    const workflowPath = path.join(workflowsDir, item.file);
    const content = fs.readFileSync(workflowPath, 'utf8');
    const currentSha = gitBlobSha(content);
    assert.equal(configuredNodeMajor(content), item.configured_node_major, `${item.file}: Node major drift`);
    if (item.role === 'ACTIVE_PRODUCTION_PROTECTION') {
      const successor = workflowSuccessors.get(item.file);
      assert.ok(successor, `${item.file}: missing exact action successor`);
      assert.equal(successor.v4562_git_blob_sha, item.git_blob_sha, `${item.file}: v4.5.62 historical anchor drift`);
      if(item.file==='identity-fix-retirement-regression.yml'){
        assert.ok([successor.v4564_diagnostic_git_blob_sha,b100IdentityWorkflowSha].includes(currentSha),`${item.file}: unauthorized action/B100 successor blob`);
        if(currentSha===b100IdentityWorkflowSha){
          assert.match(content,/'engineer-osint-20260830-B99':'6c9b0c027e77f8063d6fc56f7bcecedf7f197479b777a399f741427094c27b31'/);
          assert.match(content,/'engineer-osint-20260902-B100':'58f9d08fa884fd49638f0f57a52dde993c3a22fafc5233c13e4e14d90e30e85d'/);
          assert.match(content,/no exact digest authorized for current run/);
        }
      }else assert.equal(currentSha, successor.v4564_diagnostic_git_blob_sha, `${item.file}: unauthorized action successor blob`);
      assert.deepEqual(actionUses(content), item.actions.map((ref) => substitutionMap.get(ref) || ref), `${item.file}: action successor reference drift`);
    } else {
      assert.equal(currentSha, item.git_blob_sha, `${item.file}: historical workflow blob drift`);
      assert.deepEqual(actionUses(content), item.actions, `${item.file}: historical action reference drift`);
    }
  }
  assert.equal(successorPolicy.execution_boundary.wildcard_or_current_state_acceptance_authorized, false);
});

test('v4.5.62 removes active Node 20 debt while preserving two historical manual-only workflows', () => {
  const active = migration.workflows.filter((item) => item.role === 'ACTIVE_PRODUCTION_PROTECTION');
  const historical = migration.workflows.filter((item) => item.role === 'HISTORICAL_EVIDENCE_KEEP');
  const active20 = active.filter((item) => item.configured_node_major === 20);
  const active24 = active.filter((item) => item.configured_node_major === 24);
  const historical20 = historical.filter((item) => item.configured_node_major === 20);
  const historical24 = historical.filter((item) => item.configured_node_major === 24);
  assert.equal(active.length, 5);
  assert.equal(historical.length, 2);
  assert.equal(active20.length, 0);
  assert.equal(active24.length, 5);
  assert.equal(historical20.length, 2);
  assert.equal(historical24.length, 0);
  assert.equal(migration.configured_node20_workflow_count, 2);
  assert.equal(migration.configured_node24_workflow_count, 5);
  assert.equal(migration.findings.active_node20_remaining, 0);
});

test('v4.5.62 preserves the exact v4.5.61 historical baseline artifact', () => {
  const baselineContent = fs.readFileSync(baselinePath, 'utf8');
  assert.equal(gitBlobSha(baselineContent), migration.historical_baseline.git_blob_sha);
  const baseline = JSON.parse(baselineContent);
  assert.equal(baseline.version, 'v4.5.61');
  assert.equal(baseline.configured_node20_workflow_count, 7);
  assert.equal(baseline.configured_node24_workflow_count, 0);
});

test('v4.5.62 keeps the upstream Pages deploy action warning as historical evidence only', () => {
  const pages = migration.workflows.find((item) => item.file === 'pages.yml');
  assert.ok(pages);
  assert.equal(pages.configured_node_major, 24);
  assert.ok(pages.actions.includes('actions/deploy-pages@v4'));
  assert.equal(migration.findings.pages_deploy_action_upstream_node20_warning_expected_to_remain, true);
  const successor = workflowSuccessors.get('pages.yml');
  assert.ok(successor);
  assert.equal(successor.v4562_git_blob_sha, pages.git_blob_sha);
});
