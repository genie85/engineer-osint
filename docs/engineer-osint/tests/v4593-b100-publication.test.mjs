import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4592-b100.json';

test('v4.5.93 exposes the exact reviewed B100 append plan before persistence',()=>{
  const stdout=execFileSync(process.execPath,['docs/engineer-osint/append-run.mjs',candidatePath],{encoding:'utf8'});
  const plan=JSON.parse(stdout);
  assert.equal(plan.status,'VALIDATED_DRY_RUN');
  assert.equal(plan.entry.run_id,'engineer-osint-20260902-B100');
  assert.equal(plan.entry.parent_run_id,'engineer-osint-20260830-B99');
  assert.equal(plan.entry.parent_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.match(plan.entry.file_sha256,/^[a-f0-9]{64}$/);
  assert.match(plan.entry.canonical_sha256,/^[a-f0-9]{64}$/);
  console.log(`V4593_B100_APPEND_PLAN ${JSON.stringify(plan.entry)}`);
});
