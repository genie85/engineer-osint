import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePinnedMultimediaStatus,validateMediaSweepExceptionRegistry} from '../lib/media-sweep-exceptions.mjs';

const root='docs/engineer-osint';
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const runRaw=readFileSync(`${root}/data/runs/engineer-osint-20260825-B72.json`,'utf8');
const patch=JSON.parse(runRaw);
const manifestEntry=manifest.runs.find(item=>item.run_id===patch.state.run_id);
const reportSnapshotRaw=readFileSync(`${root}/data/attestations/engineer-osint-20260825-B72-report.md`,'utf8');
const input=()=>({patch:structuredClone(patch),manifestEntry:structuredClone(manifestEntry),repositoryFileRaw:runRaw,reportSnapshotRaw,registry:structuredClone(registry)});

test('exact B72 zero-delta omission is accepted only as a transparent hash-pinned waiver',()=>{
  const result=resolvePinnedMultimediaStatus(input());
  assert.deepEqual(result,{status:'MISSING_WAIVED_PINNED_ZERO_DELTA',basis:'HASH_PINNED_REPORT_ATTESTATION',exception_id:'MEDIA-SWEEP-ATTEST-B72'});
});

test('an explicit multimedia status remains the standard path',()=>{
  const candidate=input();
  candidate.patch.qa.multimedia_status='COMPLETE_NO_CANONICAL_MEDIA_ADDITION';
  assert.deepEqual(resolvePinnedMultimediaStatus(candidate),{status:'COMPLETE_NO_CANONICAL_MEDIA_ADDITION',basis:'PATCH_EXPLICIT',exception_id:null});
});

test('explicit multimedia status rejects invalid types, unknown values and conflicts',()=>{
  for(const status of [{},42,' ','UNKNOWN_STATUS']){
    const candidate=input();candidate.patch.qa.multimedia_status=status;
    assert.throws(()=>resolvePinnedMultimediaStatus(candidate),/explicit multimedia status is not a supported enum value/);
  }
  const conflict=input();
  conflict.patch.qa.multimedia_status='COMPLETE_NO_CANONICAL_MEDIA_ADDITION';
  conflict.patch.qa.multimedia={status:'COMPLETE_WITH_CANONICAL_MEDIA_ADDITION'};
  assert.throws(()=>resolvePinnedMultimediaStatus(conflict),/conflicting explicit multimedia status values/);
});

test('pinned waiver fails closed on identity, byte, report and manifest changes',()=>{
  for(const mutate of [
    value=>{value.repositoryFileRaw+=' ';},
    value=>{value.reportSnapshotRaw+=' ';},
    value=>{value.repositoryFileRaw=value.repositoryFileRaw.replace(/\n$/,'');},
    value=>{value.patch.state.parent_run_id='engineer-osint-20260825-B70';},
    value=>{value.manifestEntry.file_sha256='0'.repeat(64);},
    value=>{value.manifestEntry.canonical_sha256='0'.repeat(64);}
  ]){
    const candidate=input();mutate(candidate);
    assert.throws(()=>resolvePinnedMultimediaStatus(candidate),/Invalid media-sweep exception/);
  }
});

test('pinned waiver rejects non-zero or malformed media-related content',()=>{
  for(const mutate of [
    value=>{value.patch.state.counts.NEW_MEDIA=1;},
    value=>{value.patch.media=[{media_id:'ENG-MEDIA-TEST'}];},
    value=>{value.patch.qa.worth_watching={};},
    value=>{value.patch.qa.worth_listening=['https://example.test/media'];},
    value=>{value.patch.extensions={operations_v1:{}};}
  ]){
    const candidate=input();mutate(candidate);
    assert.throws(()=>resolvePinnedMultimediaStatus(candidate),/Invalid media-sweep exception/);
  }
});

test('future runs and duplicate or broadened registry entries are rejected',()=>{
  const future=input();future.patch.state.run_id='engineer-osint-20260825-B73';future.patch.state.parent_run_id='engineer-osint-20260825-B72';
  assert.throws(()=>resolvePinnedMultimediaStatus(future),/no unique hash-pinned attestation/);

  const duplicate=structuredClone(registry);duplicate.exceptions.push({...duplicate.exceptions[0],exception_id:'MEDIA-SWEEP-ATTEST-B72-DUP'});
  assert.throws(()=>validateMediaSweepExceptionRegistry(duplicate),/duplicate exception identity/);

  const broadened=structuredClone(registry);broadened.exceptions[0].run_id='engineer-osint-20260825-B73';
  assert.throws(()=>validateMediaSweepExceptionRegistry(broadened),/not an approved one-run attestation/);

  const unknownRoot=structuredClone(registry);unknownRoot.default_allow=true;
  assert.throws(()=>validateMediaSweepExceptionRegistry(unknownRoot),/registry contains unsupported field/);
});
