import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const cleanupUrl=new URL('../ui-overview-delta-cleanup.js',import.meta.url);
const postprocessUrl=new URL('../postprocess-ui.mjs',import.meta.url);

test('overview cleanup hides internal enrichment planning from the public overview',()=>{
  const src=fs.readFileSync(cleanupUrl,'utf8');
  assert.match(src,/DALŠÍ OBOHACENÍ/);
  assert.match(src,/FURTHER ENRICHMENT/);
  assert.match(src,/ADDITIONAL ENRICHMENT/);
  assert.match(src,/NEXT ENRICHMENT/);
  assert.match(src,/removePatterns\.some\(re=>re\.test\(t\)\)/);
});

test('overview info controls implement touch/click popovers with accessible state',()=>{
  const src=fs.readFileSync(cleanupUrl,'utf8');
  new vm.Script(src,{filename:'ui-overview-delta-cleanup.js'});
  assert.match(src,/overview-info-popover/);
  assert.match(src,/button\.addEventListener\('click'/);
  assert.match(src,/aria-controls/);
  assert.match(src,/aria-expanded/);
  assert.match(src,/role','tooltip/);
  assert.match(src,/event\.key==='Escape'/);
});

test('overview popovers have touch target, focus and mobile styles',()=>{
  const src=fs.readFileSync(postprocessUrl,'utf8');
  assert.match(src,/min-width:36px/);
  assert.match(src,/min-height:36px/);
  assert.match(src,/touch-action:manipulation/);
  assert.match(src,/overview-info:focus-visible/);
  assert.match(src,/overview-info-popover/);
  assert.match(src,/overview_info_popover=enabled/);
  assert.match(src,/overview_internal_enrichment_hidden=enabled/);
});
