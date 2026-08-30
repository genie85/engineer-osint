import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const audit=fs.readFileSync(new URL('../audit-overlay-provenance.mjs',import.meta.url),'utf8');
const review=JSON.parse(fs.readFileSync(new URL('../V453_PROVENANCE_REVIEW.json',import.meta.url),'utf8'));
const policy=fs.readFileSync(new URL('../V45_OVERLAY_RETIREMENT_POLICY.md',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8');
const pagesVerifier=fs.readFileSync(new URL('../verify-pages-artifact.mjs',import.meta.url),'utf8');

test('v4.5.3 scopes provenance review to the three structurally equivalent rich overlays',()=>{
  assert.deepEqual(review.scope_modules,[
    'rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'
  ]);
  assert.doesNotMatch(JSON.stringify(review.scope_modules),/data-integrity-identity-fixes\.js/);
  assert.match(audit,/scopeSet\.has\(item\.module\)/);
  assert.match(audit,/scoped structural migration is incomplete/);
});

test('v4.5.3 requires every new RICH source definition to match its curated primary URL',()=>{
  assert.equal(Object.keys(review.source_reviews).length,15);
  assert.match(audit,/payload\?\.url!==curated\?\.expected_url/);
  assert.match(audit,/payload\?\.type!=='PRIMARY'\|\|payload\?\.tier!==1/);
  assert.match(audit,/curated source review has no strict append candidate/);
  assert.match(audit,/strict append candidate is not in curated source review/);
});

test('v4.5.3 distinguishes factual support from analytical, precision, absence and expanded-source review',()=>{
  for(const token of [
    'REVIEWED_SOURCE_BACKED','ANALYTICAL_ROUTE_REQUIRED','ADMINISTRATIVE_METADATA_REVIEW_REQUIRED',
    'PRECISION_REVIEW_REQUIRED','ABSENCE_REVIEW_REQUIRED','EXPANDED_SOURCE_REVIEW_REQUIRED',
    'UNCLASSIFIED_REVIEW_REQUIRED'
  ])assert.match(audit,new RegExp(token));
  assert.deepEqual(review.target_reviews['ENG-TECH-0011'].precision_review_fields,['weight']);
  assert.deepEqual(review.target_reviews['ENG-TECH-0014'].absence_review_fields,['weight']);
  assert.deepEqual(review.target_reviews['ENG-TECH-0013'].expanded_source_review_fields,['summary_cs','technical_profile']);
});

test('EOD COE standardization evidence retains attribution limitation instead of becoming NATO policy',()=>{
  const rule=review.special_rules.find(item=>item.rule_id==='EOC-WG-68');
  assert.ok(rule);
  assert.equal(rule.field,'eoc_standardization_evidence');
  assert.deepEqual(rule.source_ids,['RICH-SRC-013']);
  assert.match(rule.note,/not represented as binding NATO policy/i);
  assert.match(audit,/REVIEWED_SOURCE_BACKED_WITH_ATTRIBUTION_LIMIT/);
});

test('v4.5.3 fails closed on unclassified candidates or source-scope mismatches',()=>{
  assert.match(audit,/unclassified===0&&scopeMismatches===0&&locatorReview===0&&integrityErrors\.length===0/);
  assert.match(audit,/SOURCE_SCOPE_MISMATCH/);
  assert.match(audit,/source_locator_review_required/);
  assert.match(audit,/if\(!pass\)throw new Error/);
});

test('v4.5.3 remains read-only and never authorizes append or retirement',()=>{
  assert.match(audit,/canonical_write_performed:false/);
  assert.match(audit,/append_run_invoked:false/);
  assert.match(audit,/safe_to_append:false/);
  assert.match(audit,/safe_to_retire_overlays:false/);
  assert.doesNotMatch(audit,/append-run\.mjs/);
  assert.doesNotMatch(audit,/writeFileSync\(join\(src/);
  assert.match(policy,/read-only with respect to canonical data and persistence/i);
});

test('Pages runs and verifies the v4.5.3 provenance artifact before deployment through the final verifier',()=>{
  assert.match(workflow,/Audit overlay provenance readiness/);
  assert.match(workflow,/audit-overlay-provenance\.mjs/);
  assert.match(workflow,/verify-pages-artifact\.mjs/);
  assert.match(pagesVerifier,/overlay-provenance-audit\.json/);
  assert.match(pagesVerifier,/overlay-provenance-audit\.md/);
  assert.match(pagesVerifier,/overlay_provenance_audit=pass/);
  assert.match(pagesVerifier,/overlay_provenance_unclassified=0/);
  assert.match(pagesVerifier,/overlay_provenance_safe_to_append=0/);
});
