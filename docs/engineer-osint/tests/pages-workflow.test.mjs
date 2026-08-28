import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflowPath='.github/workflows/pages.yml';

test('Pages workflow selects and deploys one rerun-specific artifact',()=>{
  const workflow=readFileSync(workflowPath,'utf8');
  assert.match(workflow,/pages_artifact_name: \$\{\{ steps\.pages-artifact-name\.outputs\.name \}\}/);
  assert.match(workflow,/name=github-pages-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}/);
  assert.match(workflow,/name: \$\{\{ steps\.pages-artifact-name\.outputs\.name \}\}/);
  assert.match(workflow,/artifact_name: \$\{\{ needs\.build\.outputs\.pages_artifact_name \}\}/);
});
