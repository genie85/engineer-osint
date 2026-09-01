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
const inventoryPath = path.join(projectDir, 'V4561_CI_NODE_RUNTIME_INVENTORY.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

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

test('v4.5.61 inventory is explicitly read-only', () => {
  assert.equal(inventory.schema_version, 'engineer-osint-ci-node-runtime-inventory-v1');
  assert.equal(inventory.status, 'READ_ONLY_INVENTORY_NO_WORKFLOW_CHANGE');
  assert.equal(inventory.findings.workflow_trigger_change_performed, false);
  assert.equal(inventory.findings.workflow_job_change_performed, false);
  assert.equal(inventory.findings.canonical_data_edit_performed, false);
  assert.equal(inventory.findings.run_store_edit_performed, false);
  assert.equal(inventory.findings.runtime_module_edit_performed, false);
});

test('v4.5.61 inventory covers every current workflow exactly once', () => {
  const actual = fs.readdirSync(workflowsDir)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort();
  const inventoried = inventory.workflows.map((item) => item.file).sort();
  assert.deepEqual(inventoried, actual);
  assert.equal(actual.length, inventory.workflow_count);
  assert.equal(new Set(inventoried).size, inventoried.length);
});

test('v4.5.61 workflow blobs, configured Node versions and action references match inventory', () => {
  for (const item of inventory.workflows) {
    const workflowPath = path.join(workflowsDir, item.file);
    const content = fs.readFileSync(workflowPath, 'utf8');
    assert.equal(gitBlobSha(content), item.git_blob_sha, `${item.file}: git blob SHA drift`);
    assert.equal(configuredNodeMajor(content), item.configured_node_major, `${item.file}: Node major drift`);
    assert.deepEqual(actionUses(content), item.actions, `${item.file}: action reference drift`);
  }
});

test('v4.5.61 baseline proves Node 20 debt across all seven workflows', () => {
  const configured20 = inventory.workflows.filter((item) => item.configured_node_major === 20);
  const configured24 = inventory.workflows.filter((item) => item.configured_node_major === 24);
  const active20 = configured20.filter((item) => item.role === 'ACTIVE_PRODUCTION_PROTECTION');
  const historical20 = configured20.filter((item) => item.role === 'HISTORICAL_EVIDENCE_KEEP');
  assert.equal(configured20.length, inventory.configured_node20_workflow_count);
  assert.equal(configured24.length, inventory.configured_node24_workflow_count);
  assert.equal(configured20.length, 7);
  assert.equal(active20.length, 5);
  assert.equal(historical20.length, 2);
  assert.equal(inventory.findings.all_workflows_explicitly_configure_node20, true);
});

test('v4.5.61 keeps Pages upstream runtime warning separate from repository Node configuration', () => {
  const evidence = inventory.current_pages_runtime_evidence;
  assert.equal(evidence.run_conclusion, 'success');
  assert.equal(evidence.deployment_success, true);
  assert.equal(evidence.deploy_action, 'actions/deploy-pages@v4');
  assert.match(evidence.deploy_action_runner_warning, /Node 20.*Node 24/i);
  assert.equal(evidence.pages_build_version, inventory.reviewed_main_sha);
});
