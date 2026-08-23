import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','audit-public-cz-ui-latest.mjs'),'utf8');

test('latest PUBLIC-CZ wrapper emits one explicit authoritative summary after final report rewrite',()=>{
  const writeIndex=src.lastIndexOf('writeFileSync(mdPath,md);');
  const finalIndex=src.lastIndexOf('PUBLIC_CZ_UI_LATEST_FINAL');
  assert.ok(writeIndex>=0,'final markdown report write must exist');
  assert.ok(finalIndex>writeIndex,'authoritative summary must be emitted only after final report reclassification and writes');
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
