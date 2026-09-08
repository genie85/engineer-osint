import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const src=fs.readFileSync(new URL('ui-v4-i18n-stability.js',root),'utf8');
const manifest=fs.readFileSync(new URL('runtime-modules.mjs',root),'utf8');

test('v4.6.99 stability module parses and runs after V4.1 canonical ownership is established',()=>{
  new vm.Script(src,{filename:'ui-v4-i18n-stability.js'});
  const v4=manifest.indexOf("['engineer-ui-v4-public-module','ui-v4-public.js']");
  const v41=manifest.indexOf("['engineer-ui-v41-intelligence-module','ui-v41-intelligence.js']");
  const stable=manifest.indexOf("['engineer-ui-v4-i18n-stability-module','ui-v4-i18n-stability.js']");
  const v42=manifest.indexOf("['engineer-ui-v42-situation-hubs-module','ui-v42-situation-hubs.js']");
  assert.ok(v4>=0&&v41>v4&&stable>v41&&v42>stable);
});

test('v4.6.99 is exact-B105-only and remains inert for historical B103/B104 browser proofs',()=>{
  assert.match(src,/engineer-osint-20260904-B105/);
  assert.match(src,/currentRun\(\)===exactRun/);
  assert.match(src,/dashboard_materialization\?\.current_run_id/);
  assert.match(src,/__ENGINEER_CANONICAL_DATA__/);
  assert.match(src,/__ENGINEER_DATA__/);
  assert.doesNotMatch(src,/__ENGINEER_(?:CANONICAL_)?DATA__\s*=/);
});

test('v4.6.99 strips only legacy i18n metadata from the V4.1-owned canonical gap heading',()=>{
  assert.match(src,/\[data-v4-public="1"\]/);
  assert.match(src,/section\[data-v41-canonical="1"\] > h2\[data-i18n-key\]/);
  assert.match(src,/Intelligence gaps/);
  assert.match(src,/Informační mezery/);
  assert.match(src,/removeAttribute\('data-i18n-key'\)/);
  assert.match(src,/attributeFilter:\['data-i18n-key'\]/);
  assert.doesNotMatch(src,/querySelectorAll\('\[data-i18n-key\]'\)/);
  assert.doesNotMatch(src,/textContent\s*=/);
  assert.doesNotMatch(src,/run-store|canonical_write|run_appended/i);
});

test('v4.6.99 survives later legacy decoration without competing for heading text ownership',()=>{
  assert.match(src,/engineer-language-changed/);
  assert.match(src,/MutationObserver/);
  assert.match(src,/childList:true/);
  assert.match(src,/attributes:true/);
  assert.match(src,/queueMicrotask\(stabilize\)/);
  assert.doesNotMatch(src,/currentLang|gapTitle/);
});
