import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4592-b100.json';
const raw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(raw);
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.93 derives the exact frozen B100 successor without writing canonical data',()=>{
  assert.equal(gitBlobSha(raw),'a2563118ce95c969c37acc45d666a2f8e419df3a');
  assert.equal(candidate.state.run_id,'engineer-osint-20260902-B100');
  assert.equal(candidate.state.parent_run_id,'engineer-osint-20260830-B99');
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  const stdout=execFileSync(process.execPath,['docs/engineer-osint/append-run.mjs',candidatePath],{encoding:'utf8'});
  const plan=JSON.parse(stdout);
  assert.equal(plan.status,'VALIDATED_DRY_RUN');
  assert.equal(plan.entry.parent_canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  assert.match(plan.entry.file_sha256,/^[a-f0-9]{64}$/);
  assert.match(plan.entry.canonical_sha256,/^[a-f0-9]{64}$/);
  console.log(`B100_AUTH_FILE_SHA256=${plan.entry.file_sha256}`);
  console.log(`B100_AUTH_CANONICAL_SHA256=${plan.entry.canonical_sha256}`);
});
