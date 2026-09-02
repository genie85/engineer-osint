import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const candidatePath='docs/engineer-osint/osint-publication-candidates/v4595-b101.json';
const appendRunPath='docs/engineer-osint/append-run.mjs';
const raw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(raw);
const plan=JSON.parse(execFileSync(process.execPath,[appendRunPath,candidatePath],{encoding:'utf8'}));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.96 derives the exact B101 authorization inputs without writing canonical state',()=>{
  assert.equal(candidate.state.run_id,'engineer-osint-20260902-B101');
  assert.equal(candidate.state.parent_run_id,'engineer-osint-20260902-B100');
  assert.equal(candidate.continuity.publication_write_authorized,false);
  assert.equal(candidate.continuity.canonical_write_performed,false);
  assert.equal(plan.status,'VALIDATED_DRY_RUN');
  console.log('V4596_B101_DERIVATION '+JSON.stringify({candidate_git_blob_sha:gitBlobSha(raw),file_sha256:plan.entry.file_sha256,canonical_sha256:plan.entry.canonical_sha256,parent_canonical_sha256:plan.entry.parent_canonical_sha256}));
});
