import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePinnedMultimediaStatus,validateMediaSweepExceptionRegistry} from '../lib/media-sweep-exceptions.mjs';

const root='docs/engineer-osint';
const runPath=`${root}/data/runs/engineer-osint-20260902-B100.json`;
const reportPath=`${root}/data/attestations/engineer-osint-20260902-B100-media-omission.md`;
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const repositoryFileRaw=readFileSync(runPath,'utf8');
const patch=JSON.parse(repositoryFileRaw);
const reportSnapshotRaw=readFileSync(reportPath,'utf8');
const manifestEntry=manifest.runs.find(item=>item.run_id===patch.state.run_id);

test('v4.5.94 B100 media omission is one-run, hash-pinned and publication-scoped',()=>{
  validateMediaSweepExceptionRegistry(registry);
  const item=registry.exceptions.find(entry=>entry.run_id==='engineer-osint-20260902-B100');
  assert.ok(item);
  assert.equal(item.exception_id,'MEDIA-SWEEP-ATTEST-B100-PHASE-F-PUBLICATION');
  assert.equal(item.attestation_basis,'REPOSITORY_REVIEWED_PUBLICATION');
  assert.equal(item.waiver_scope,'NO_MEDIA_ADDITION');
  assert.equal(item.repository_file_sha256,'ef6d592306a213d22fee36aa32e5eca2f0673dde8773eeda1c444eef55af7b92');
  assert.equal(item.repository_canonical_sha256,'518b497c7754666807b6d9ac47eca335457f3ef43ecd15b96c554f6c12c9d141');
  assert.equal(item.report_text_sha256,'9a546ca26312b53a67945f2f37cd8915eddf41b1878683fc4ad076a8c0c535c2');
  assert.equal(patch.state.counts.NEW_MEDIA,0);
  assert.deepEqual(patch.media,[]);
  assert.deepEqual(patch.visuals,[]);
});

test('v4.5.94 resolves only the exact frozen B100 bytes and report',()=>{
  const result=resolvePinnedMultimediaStatus({patch,manifestEntry,repositoryFileRaw,reportSnapshotRaw,registry});
  assert.deepEqual(result,{status:'MISSING_WAIVED_PINNED_NO_MEDIA_ADDITION',basis:'HASH_PINNED_REPORT_ATTESTATION',exception_id:'MEDIA-SWEEP-ATTEST-B100-PHASE-F-PUBLICATION'});
  assert.throws(()=>resolvePinnedMultimediaStatus({patch,manifestEntry,repositoryFileRaw,reportSnapshotRaw:`${reportSnapshotRaw}drift`,registry}),/report snapshot bytes mismatch/);
  const altered=structuredClone(patch);
  altered.state.counts.NEW_MEDIA=1;
  assert.throws(()=>resolvePinnedMultimediaStatus({patch:altered,manifestEntry,repositoryFileRaw,reportSnapshotRaw,registry}),/patch object does not match the pinned repository bytes/);
});
