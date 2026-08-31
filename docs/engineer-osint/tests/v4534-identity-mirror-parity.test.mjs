import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4534_IDENTITY_MIRROR_PARITY_READINESS.json`,'utf8'));
const audit=readFileSync(`${root}/audit-identity-mirror-parity-readiness.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/identity-mirror-parity-readiness.yml','utf8');

test('v4.5.34 keeps exact B99 identity hashes and mirror target pinned',()=>{
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B99');
  assert.equal(policy.exact_candidate_file_sha256,'d58c874f5846f53f5eaa610f35d452b165282cf3f495cb8c7013cd392105e411');
  assert.equal(policy.expected_resulting_canonical_sha256,'029b533d88846cb4e14137dffe563771b5ad204e1df77568d64e20ee0f529cef');
  assert.equal(policy.legacy_mirror_path,'dashboard_patch_extras.updated_records[70]');
  assert.equal(policy.legacy_mirror_target_id,'ENG-TECH-0036');
});

test('v4.5.34 pins every non-overlay public consumer of updated_records',()=>{
  assert.deepEqual(policy.expected_non_overlay_public_runtime_updated_records_readers,[
    'i18n-content-cs-public-cz-backlog.js','ui-phase6-i18n.js','ui-overview-intro-stats.js','ui-v4-public.js',
    'i18n-runtime-switch-fix.js','i18n-en-postrender-cleanup.js','ui-v43-entity-detail.js','ui-v44-evidence-explorer.js','public-cz-ui-canary.js'
  ]);
  assert.match(audit,/sameSet\(nonOverlayReaders,policy\.expected_non_overlay_public_runtime_updated_records_readers\)/);
});

test('v4.5.34 requires mirror synchronization rather than mirror removal',()=>{
  assert.equal(policy.expected_overlay_residual_count_after_b99,18);
  assert.equal(policy.expected_authoritative_residual_count_after_b99,0);
  assert.equal(policy.expected_data_diff_after_exact_mirror_sync,0);
  assert.equal(policy.safety.legacy_mirror_removal_forbidden,true);
  assert.match(audit,/mirrorSynced\.dashboard_patch_extras\.updated_records\[70\]=structuredClone\(fixedMirror\)/);
  assert.match(audit,/legacy_mirror_removal_forbidden:true/);
});

test('v4.5.34 browser gate compares overlay-active B99 with synchronized mirror and no identity overlay',()=>{
  assert.match(workflow,/v4534-b99-identity-active\.html/);
  assert.match(workflow,/v4534-b99-mirror-synced-no-identity\.html/);
  assert.match(workflow,/HEADLESS_IDENTITY_MIRROR_PARITY=PASS/);
  assert.equal(policy.safety.canonical_write_performed,false);
  assert.equal(policy.safety.b99_append_authorized,false);
  assert.equal(policy.safety.legacy_mirror_sync_persisted,false);
  assert.equal(policy.safety.identity_fix_runtime_removal_authorized,false);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
});

test('v4.5.34 browser parity normalizes only an explicit bilingual label race',()=>{
  assert.ok(workflow.includes('bilingual=re.compile('));
  assert.ok(workflow.includes('data-label-cs='));
  assert.ok(workflow.includes('data-label-en='));
  assert.ok(workflow.includes("text=html.unescape(match.group('text')).strip()"));
  assert.ok(workflow.includes('if text not in {cs,en}:'));
  assert.ok(workflow.includes('return match.group(0)'));
  assert.ok(workflow.includes("return match.group('open')+match.group('cs')+match.group('close')"));
  assert.ok(workflow.includes('s=bilingual.sub(canonicalize_bilingual_label,s)'));
  assert.doesNotMatch(workflow,/s=re\.sub\([^\n]*data-label[^\n]*,''/);
});
