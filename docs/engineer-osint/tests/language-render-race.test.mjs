import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync(new URL('../i18n-runtime-switch-fix.js',import.meta.url),'utf8');

test('runtime switch repair has no competing MutationObserver',()=>{
  assert.doesNotMatch(src,/new\s+MutationObserver\s*\(/,'runtime switch repair must not own a MutationObserver');
  assert.match(src,/latest-language-wins-no-mutation-observer/);
});

test('runtime switch repair cancels stale scheduled language work',()=>{
  assert.match(src,/generation\s*=\s*0/);
  assert.match(src,/cancelPending\(\)/);
  assert.match(src,/token!==generation/);
  assert.match(src,/repair\(current\(\)\)/,'scheduled repair must resolve current language at execution time');
  assert.doesNotMatch(src,/schedule\(e\?\.detail\?\.lang/,'language event must not capture a stale language value');
});

test('observed Android mixed-language controls have explicit bidirectional fallback pairs',()=>{
  for(const s of ['Overview','Přehled','Capabilities','Schopnosti','All countries','Všechny země','All capabilities','Všechny schopnosti','All types','Všechny typy','All classifications','Všechny klasifikace'])assert.ok(src.includes(s),`missing language fallback ${s}`);
});
