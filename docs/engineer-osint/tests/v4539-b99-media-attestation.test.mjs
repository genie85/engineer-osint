import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {validateMediaSweepExceptionRegistry} from '../lib/media-sweep-exceptions.mjs';

const root='docs/engineer-osint';
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const library=readFileSync(`${root}/lib/media-sweep-exceptions.mjs`,'utf8');
const policy=JSON.parse(readFileSync(`${root}/V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS.json`,'utf8'));
const reportRaw=readFileSync(`${root}/data/attestations/engineer-osint-20260830-B99-media-omission.md`,'utf8');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const b99=registry.exceptions.find(item=>item.run_id==='engineer-osint-20260830-B99');

test('v4.5.39 registers exactly one hash-pinned B99 identity-fix media omission attestation',()=>{
  assert.equal(registry.exceptions.filter(item=>item.run_id==='engineer-osint-20260830-B99').length,1);
  assert.ok(b99);
  assert.equal(b99.parent_run_id,'engineer-osint-20260830-B98');
  assert.equal(b99.attestation_basis,'REPOSITORY_REVIEWED_MIGRATION');
  assert.equal(b99.attestation_reference,'V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS+V4537_B99_LIFECYCLE+V4538_B99_PAGES_READINESS');
  assert.equal(b99.repository_file_sha256,policy.exact_candidate_file_sha256);
  assert.equal(b99.repository_canonical_sha256,policy.expected_resulting_canonical_sha256);
  assert.equal(b99.waiver_scope,'IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(b99.resolved_status,'MISSING_WAIVED_PINNED_IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(b99.omitted_field,'qa.multimedia_status');
  assert.equal(b99.report_snapshot_path,'data/attestations/engineer-osint-20260830-B99-media-omission.md');
  assert.equal(sha256(reportRaw),'f1a2ff54960074a532bcffa7411897bc0d8c3172cf96258e780b7205413c4965');
  assert.equal(b99.report_text_sha256,sha256(reportRaw));
  assert.doesNotThrow(()=>validateMediaSweepExceptionRegistry(registry));
});

test('v4.5.39 B99 waiver is a dedicated fail-closed identity migration contract',()=>{
  assert.match(library,/IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION:'MISSING_WAIVED_PINNED_IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION'/);
  assert.match(library,/engineer-osint-20260830-B99/);
  assert.match(library,/function ensureIdentityFixMigrationNoMediaAddition\(patch,item\)/);
  assert.match(library,/counts\.CORRECTION!==36/);
  assert.match(library,/REPLACE_FIELD'\)\.length!==27/);
  assert.match(library,/REMOVE_FIELD'\)\.length!==9/);
  assert.match(library,/ENG-TECH-0036/);
  assert.match(library,/expectedSyncFields=\['record_role','title_cs','title_en'/);
  assert.match(library,/legacy_mirror_sync_field_count!==18/);
  assert.match(library,/identity_fix_runtime_removal_authorized!==false/);
  assert.match(library,/waiver_scope==='IDENTITY_FIX_MIGRATION_NO_MEDIA_ADDITION'\)ensureIdentityFixMigrationNoMediaAddition/);
});

test('v4.5.39 attestation cannot be broadened to an ordinary or future run',()=>{
  const ordinary=structuredClone(registry);
  const item=ordinary.exceptions.find(entry=>entry.run_id==='engineer-osint-20260830-B99');
  item.run_id='engineer-osint-20260831-B100';
  assert.throws(()=>validateMediaSweepExceptionRegistry(ordinary),/not an approved one-run attestation/);

  const broadened=structuredClone(registry);
  broadened.exceptions.find(entry=>entry.run_id==='engineer-osint-20260830-B99').waiver_scope='NO_MEDIA_ADDITION';
  assert.throws(()=>validateMediaSweepExceptionRegistry(broadened),/unsupported resolved_status|not an approved one-run attestation/);
});

test('v4.5.39 report explicitly denies sweep, append and retirement authorization',()=>{
  assert.match(reportRaw,/does \*\*not\*\* claim that a new multimedia sweep was performed/);
  assert.match(reportRaw,/does not authorize B99 publication by itself/);
  assert.match(reportRaw,/does not authorize removal or retirement of the identity-fix runtime overlay/);
  assert.match(reportRaw,/identity-fix runtime must remain active/);
});
