import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4592-b100.json';
const manifestPath='docs/engineer-osint/data/run-store-manifest.json';

test('v4.5.93 materializes the exact reviewed B100 append in the ephemeral CI checkout',()=>{
  const stdout=execFileSync(process.execPath,['docs/engineer-osint/append-run.mjs',candidatePath,'--write'],{encoding:'utf8'});
  const plan=JSON.parse(stdout);
  assert.equal(plan.status,'APPENDED');
  assert.equal(plan.entry.run_id,'engineer-osint-20260902-B100');
  assert.equal(plan.entry.parent_run_id,'engineer-osint-20260830-B99');
  assert.equal(plan.entry.parent_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.equal(plan.entry.file_sha256,'ef6d592306a213d22fee36aa32e5eca2f0673dde8773eeda1c444eef55af7b92');
  assert.equal(plan.entry.canonical_sha256,'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141');
  const manifest=readFileSync(manifestPath,'utf8');
  console.log(`V4593_B100_MANIFEST_BASE64 ${Buffer.from(manifest,'utf8').toString('base64')}`);
});
