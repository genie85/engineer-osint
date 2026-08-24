import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','audit-public-cz-ui-latest.mjs'),'utf8');

test('latest PUBLIC-CZ wrapper emits one explicit authoritative summary after final report rewrite',()=>{
  const writeIndex=src.lastIndexOf('writeFileSync(healthPath,health);');
  const finalIndex=src.lastIndexOf('PUBLIC_CZ_UI_LATEST_FINAL');
  assert.ok(writeIndex>=0,'final health report write must exist');
  assert.ok(finalIndex>writeIndex,'authoritative summary must be emitted only after final report reclassification and all writes');
  for(const token of [
    'FULLY_LOCALIZED_PUBLIC_ITEMS',
    'PARTIALLY_LOCALIZED_PUBLIC_ITEMS',
    'TRANSLATION_REVIEW_NEEDED',
    'PUBLIC_CZ_UI_BACKLOG_ITEMS',
    'PUBLIC_CZ_UI_BACKLOG_FIELDS',
    'I18N_RENDERING_FAILURE',
    'CS_CONTENT_QUALITY_REVIEW_FIELDS',
    'report.status'
  ])assert.ok(src.includes(token),`authoritative summary must expose ${token}`);
});

test('latest PUBLIC-CZ wrapper synchronizes public health metrics with the final reclassified report',()=>{
  for(const metric of [
    'public_cz_ui_audit',
    'public_cz_ui_backlog_items',
    'public_cz_ui_backlog_fields',
    'public_cz_ui_review_needed',
    'public_cz_ui_review_fields',
    'public_cz_ui_rendering_failures',
    'public_cz_ui_enum_mapped',
    'public_cz_ui_enum_review',
    'public_cz_ui_renderer_enum_mappings',
    'public_cz_ui_content_quality_review'
  ])assert.ok(src.includes(metric),`final health synchronization must include ${metric}`);
  assert.match(src,/health metric missing/,'health synchronization must fail closed when an expected canonical metric disappears');
  assert.match(src,/writeFileSync\(healthPath,health\)/,'final health values must be persisted after reclassification');
});

test('latest PUBLIC-CZ wrapper injects dedicated ENG-TECH-0022 current-card canary',()=>{
  assert.match(src,/ENG-TECH-0022-current-card/,'dedicated ENG-TECH-0022 canary key must be present');
  assert.match(src,/byId\.get\('ENG-TECH-0022'\)/,'canary must resolve the materialized entity by stable ID');
  assert.match(src,/hasCsText\(tech22,'title'\)/,'canary must require Czech title');
  assert.match(src,/hasCsText\(tech22,'summary'\)/,'canary must require Czech summary');
  assert.match(src,/PUBLIC_CZ_UI_LATEST: ENG-TECH-0022 canary anchor missing/,'wrapper must fail closed if the canonical audit anchor moves');
});
