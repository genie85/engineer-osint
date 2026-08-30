import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {validateMediaSweepExceptionRegistry} from '../lib/media-sweep-exceptions.mjs';

const root='docs/engineer-osint';
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const lib=readFileSync(`${root}/lib/media-sweep-exceptions.mjs`,'utf8');
const attestation=readFileSync(`${root}/data/attestations/engineer-osint-20260829-B96-media-omission.md`,'utf8');
const sha256=text=>createHash('sha256').update(text).digest('hex');
const b96=registry.exceptions.find(item=>item.run_id==='engineer-osint-20260829-B96');

test('v4.5.15 registers exactly one repository-reviewed B96 migration media attestation',()=>{
  validateMediaSweepExceptionRegistry(registry);
  assert.equal(registry.schema_version,'engineer-osint-media-sweep-exceptions-v2');
  assert.ok(b96);
  assert.equal(registry.exceptions.filter(item=>item.run_id==='engineer-osint-20260829-B96').length,1);
  assert.equal(b96.exception_id,'MEDIA-SWEEP-ATTEST-B96-MIGRATION');
  assert.equal(b96.parent_run_id,'engineer-osint-20260826-B95');
  assert.equal(b96.attestation_basis,'REPOSITORY_REVIEWED_MIGRATION');
  assert.equal(b96.attestation_reference,'V4511_B96_APPEND_AUTHORIZATION+V4513_B96_PUBLICATION');
  assert.equal(b96.waiver_scope,'MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(b96.resolved_status,'MISSING_WAIVED_PINNED_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(b96.repository_file_sha256,'3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1');
  assert.equal(b96.repository_canonical_sha256,'4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5');
  assert.equal(sha256(attestation),b96.report_text_sha256);
  assert.equal(b96.report_drive_id,undefined);
  assert.equal(b96.source_drive_raw_file_sha256,undefined);
  assert.equal(b96.source_transport_normalization,undefined);
});

test('B96 migration waiver is structurally narrower than ordinary no-media-addition waivers',()=>{
  assert.match(lib,/MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_MIGRATION_NO_MEDIA_ADDITION'/);
  assert.match(lib,/REPOSITORY_REVIEWED_MIGRATION/);
  assert.match(lib,/research_delta_performed!==false/);
  assert.match(lib,/FIRST_THREE_PINNED_LEGACY_FACTUAL_OVERLAYS_STAGE_A_ONLY/);
  assert.match(lib,/requires exact zero true_delta/);
  assert.match(lib,/counts\.CORRECTION!==104\|\|counts\.NEW_SOURCES!==15\|\|counts\.NEW_MEDIA!==0\|\|counts\.NEW_VISUALS!==0/);
  assert.match(lib,/operations\.length!==104/);
  assert.match(lib,/patch\.sources\.length!==15/);
  assert.match(lib,/cannot cover media or visual correction operations/);
});

test('B96 repository attestation fails closed if broadened or mixed with Drive provenance fields',()=>{
  const wrongRun=structuredClone(registry);
  const entry=wrongRun.exceptions.find(item=>item.exception_id==='MEDIA-SWEEP-ATTEST-B96-MIGRATION');
  entry.run_id='engineer-osint-20260830-B97';
  assert.throws(()=>validateMediaSweepExceptionRegistry(wrongRun),/not an approved one-run attestation/);

  const wrongScope=structuredClone(registry);
  wrongScope.exceptions.find(item=>item.exception_id==='MEDIA-SWEEP-ATTEST-B96-MIGRATION').waiver_scope='NO_MEDIA_ADDITION';
  assert.throws(()=>validateMediaSweepExceptionRegistry(wrongScope),/not an approved one-run attestation|unsupported resolved_status/);

  const mixedBasis=structuredClone(registry);
  mixedBasis.exceptions.find(item=>item.exception_id==='MEDIA-SWEEP-ATTEST-B96-MIGRATION').report_drive_id='NOT_A_DRIVE_ATTESTATION';
  assert.throws(()=>validateMediaSweepExceptionRegistry(mixedBasis),/repository attestation may not use report_drive_id/);
});
