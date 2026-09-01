import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(here, '..');
const inventoryPath = path.join(projectDir, 'V4561_CI_NODE_RUNTIME_INVENTORY.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

const expectedFiles = [
  'first-three-overlay-retirement-regression.yml',
  'i18n-switch-regression.yml',
  'identity-fix-retirement-authorization.yml',
  'identity-fix-retirement-readiness.yml',
  'identity-fix-retirement-regression.yml',
  'pages.yml',
  'runtime-audit-snapshot.yml'
].sort();

const expectedBlobShas = {
  'first-three-overlay-retirement-regression.yml': '913520fdbae0b404628420d6bf8fe7f4170ac5d9',
  'i18n-switch-regression.yml': 'e07db7a6acb5aae7db64b3bb92e21d6250f78bbc',
  'identity-fix-retirement-authorization.yml': '3677ce503119901bdf763698e78884733c49daf0',
  'identity-fix-retirement-readiness.yml': '1eeb1dfbbef509b288aa0aaff703dcf91ecb4239',
  'identity-fix-retirement-regression.yml': '7e11d0d3c5b314c08ca9ea9ec36c5421d917fe44',
  'pages.yml': '49d8b2e2222848e370800d5dec20c8d8c572afad',
  'runtime-audit-snapshot.yml': '9a07eb9fcf949d1ff1984867e39bc0acbbb420c4'
};

test('v4.5.61 inventory remains an immutable read-only historical baseline', () => {
  assert.equal(inventory.schema_version, 'engineer-osint-ci-node-runtime-inventory-v1');
  assert.equal(inventory.version, 'v4.5.61');
  assert.equal(inventory.status, 'READ_ONLY_INVENTORY_NO_WORKFLOW_CHANGE');
  assert.equal(inventory.reviewed_main_sha, '2860625ab373f255bef0bfb81f40da25bb334f45');
  assert.equal(inventory.findings.workflow_trigger_change_performed, false);
  assert.equal(inventory.findings.workflow_job_change_performed, false);
  assert.equal(inventory.findings.canonical_data_edit_performed, false);
  assert.equal(inventory.findings.run_store_edit_performed, false);
  assert.equal(inventory.findings.runtime_module_edit_performed, false);
});

test('v4.5.61 frozen inventory preserves the exact seven-workflow baseline', () => {
  const inventoried = inventory.workflows.map((item) => item.file).sort();
  assert.deepEqual(inventoried, expectedFiles);
  assert.equal(inventory.workflow_count, 7);
  assert.equal(new Set(inventoried).size, 7);
  for (const item of inventory.workflows) {
    assert.equal(item.git_blob_sha, expectedBlobShas[item.file], `${item.file}: frozen v4.5.61 blob SHA drift`);
  }
});

test('v4.5.61 baseline permanently records the pre-migration Node 20 debt', () => {
  const configured20 = inventory.workflows.filter((item) => item.configured_node_major === 20);
  const configured24 = inventory.workflows.filter((item) => item.configured_node_major === 24);
  const active20 = configured20.filter((item) => item.role === 'ACTIVE_PRODUCTION_PROTECTION');
  const historical20 = configured20.filter((item) => item.role === 'HISTORICAL_EVIDENCE_KEEP');
  assert.equal(configured20.length, 7);
  assert.equal(configured24.length, 0);
  assert.equal(active20.length, 5);
  assert.equal(historical20.length, 2);
  assert.equal(inventory.configured_node20_workflow_count, 7);
  assert.equal(inventory.configured_node24_workflow_count, 0);
  assert.equal(inventory.findings.all_workflows_explicitly_configure_node20, true);
});

test('v4.5.61 keeps the Pages upstream runtime warning separate from repository configuration', () => {
  const evidence = inventory.current_pages_runtime_evidence;
  assert.equal(evidence.run_conclusion, 'success');
  assert.equal(evidence.deployment_success, true);
  assert.equal(evidence.deploy_action, 'actions/deploy-pages@v4');
  assert.match(evidence.deploy_action_runner_warning, /Node 20.*Node 24/i);
  assert.equal(evidence.pages_build_version, inventory.reviewed_main_sha);
});
