import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const src=fs.readFileSync(new URL('ui-v4-i18n-stability.js',root),'utf8');
const manifest=fs.readFileSync(new URL('runtime-modules.mjs',root),'utf8');

test('v4.6.99 stability module parses and runs immediately after the V4 public renderer',()=>{
  new vm.Script(src,{filename:'ui-v4-i18n-stability.js'});
  const v4=manifest.indexOf("['engineer-ui-v4-public-module','ui-v4-public.js']");
  const stable=manifest.indexOf("['engineer-ui-v4-i18n-stability-module','ui-v4-i18n-stability.js']");
  const v41=manifest.indexOf("['engineer-ui-v41-intelligence-module','ui-v41-intelligence.js']");
  assert.ok(v4>=0&&stable>v4&&v41>stable);
});

test('v4.6.99 is exact-B105-only and remains inert for historical B103/B104 browser proofs',()=>{
  assert.match(src,/engineer-osint-20260904-B105/);
  assert.match(src,/currentRun\(\)===exactRun/);
  assert.match(src,/dashboard_materialization\?\.current_run_id/);
  assert.match(src,/__ENGINEER_CANONICAL_DATA__/);
  assert.match(src,/__ENGINEER_DATA__/);
  assert.doesNotMatch(src,/__ENGINEER_(?:CANONICAL_)?DATA__\s*=/);
});

test('v4.6.99 stabilizes only the existing V4-owned public DOM boundary',()=>{
  assert.match(src,/\[data-v4-public="1"\]/);
  assert.match(src,/querySelectorAll\('\[data-i18n-key\]'\)/);
  assert.match(src,/removeAttribute\('data-i18n-key'\)/);
  assert.match(src,/attributeFilter:\['data-i18n-key'\]/);
  assert.doesNotMatch(src,/run-store|canonical_write|run_appended/i);
});

test('v4.6.99 owns the observed bilingual Intelligence gaps heading and survives later legacy decoration',()=>{
  assert.match(src,/Intelligence gaps/);
  assert.match(src,/Informační mezery/);
  assert.match(src,/engineer-language-changed/);
  assert.match(src,/MutationObserver/);
  assert.match(src,/childList:true/);
  assert.match(src,/attributes:true/);
  assert.match(src,/queueMicrotask\(stabilize\)/);
});
