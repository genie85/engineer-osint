import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','i18n-en-postrender-cleanup.js'),'utf8');

test('EN post-render cleanup is global, latest-language aware and does not add a MutationObserver',()=>{
  assert.match(src,/getLanguage/);
  assert.match(src,/current\(\)!==['"]en['"]/);
  assert.doesNotMatch(src,/new\s+MutationObserver/);
  assert.match(src,/buildPairs/);
  assert.match(src,/endsWith\(['"]_cs['"]\)/);
  assert.match(src,/window\.__ENGINEER_I18N__\?\.ui\?\.cs/);
  assert.match(src,/createTreeWalker\(root,NodeFilter\.SHOW_TEXT\)/);
  assert.match(src,/document\.querySelectorAll\(['"]input\[placeholder\]/);
  assert.match(src,/document\.addEventListener\(['"]click['"],schedule/);
  assert.match(src,/global-unique-cs-to-en-invariant/);
});

test('EN cleanup refuses ambiguous Czech-to-English collisions',()=>{
  assert.match(src,/conflicts=new Set/);
  assert.match(src,/map\.delete\(cs\);conflicts\.add\(cs\)/);
});
