import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','i18n-en-postrender-cleanup.js'),'utf8');

test('EN post-render cleanup is latest-language aware and does not add a MutationObserver',()=>{
  assert.match(src,/getLanguage/);
  assert.match(src,/current\(\)!==['"]en['"]/);
  assert.doesNotMatch(src,/new\s+MutationObserver/);
  assert.match(src,/createTreeWalker\(box,NodeFilter\.SHOW_TEXT\)/);
  assert.match(src,/note/);
  assert.match(src,/summary/);
  assert.match(src,/#sidebar nav summary/);
});
