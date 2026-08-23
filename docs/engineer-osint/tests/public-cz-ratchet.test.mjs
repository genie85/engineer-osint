import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePublicCzRatchet} from '../validate-public-cz-regression.mjs';

const baseline={
  max_i18n_rendering_failures:0,
  max_cs_content_quality_review_fields:0,
  known_missing_fields:[
    {group:'record',id:'LEGACY-1',field:'title'},
    {group:'source',id:'LEGACY-2',field:'title'}
  ]
};

const report=(items,extra={})=>({
  items,
  PUBLIC_CZ_UI_BACKLOG_ITEMS:items.filter(x=>(x.missing_fields||[]).length).length,
  PUBLIC_CZ_UI_BACKLOG_FIELDS:items.reduce((n,x)=>n+(x.missing_fields||[]).length,0),
  I18N_RENDERING_FAILURE:0,
  CS_CONTENT_QUALITY_REVIEW_FIELDS:0,
  ...extra
});

test('PUBLIC-CZ ratchet permits unchanged grandfathered legacy debt',()=>{
  const r=evaluatePublicCzRatchet({report:report([
    {group:'record',id:'LEGACY-1',missing_fields:['title']},
    {group:'source',id:'LEGACY-2',missing_fields:['title']}
  ]),baseline});
  assert.equal(r.pass,true);
  assert.equal(r.status,'PUBLIC_CZ_RATCHET_PASS');
  assert.equal(r.new_missing_fields.length,0);
});

test('PUBLIC-CZ ratchet permits legacy debt to shrink',()=>{
  const r=evaluatePublicCzRatchet({report:report([
    {group:'record',id:'LEGACY-1',missing_fields:['title']}
  ]),baseline});
  assert.equal(r.pass,true);
  assert.deepEqual(r.resolved_baseline_fields,[{group:'source',id:'LEGACY-2',field:'title'}]);
});

test('PUBLIC-CZ ratchet rejects a new ordinary missing field',()=>{
  const r=evaluatePublicCzRatchet({report:report([
    {group:'record',id:'LEGACY-1',missing_fields:['title']},
    {group:'record',id:'NEW-1',missing_fields:['summary']}
  ]),baseline});
  assert.equal(r.pass,false);
  assert.ok(r.failures.includes('NEW_ORDINARY_PUBLIC_CZ_MISSING_FIELDS'));
});

test('PUBLIC-CZ ratchet rejects baseline expansion against parent baseline',()=>{
  const expanded={...baseline,known_missing_fields:[...baseline.known_missing_fields,{group:'record',id:'NEW-1',field:'summary'}]};
  const r=evaluatePublicCzRatchet({report:report([]),baseline:expanded,parentBaseline:baseline});
  assert.equal(r.pass,false);
  assert.ok(r.failures.includes('BASELINE_EXPANSION_FORBIDDEN'));
});

test('PUBLIC-CZ ratchet rejects renderer or content-quality regression',()=>{
  const r=evaluatePublicCzRatchet({report:report([],{I18N_RENDERING_FAILURE:1,CS_CONTENT_QUALITY_REVIEW_FIELDS:1}),baseline});
  assert.equal(r.pass,false);
  assert.ok(r.failures.includes('I18N_RENDERING_FAILURE_REGRESSION'));
  assert.ok(r.failures.includes('CS_CONTENT_QUALITY_REGRESSION'));
});

test('PUBLIC-CZ ratchet rejects inconsistent audit counts',()=>{
  const r=evaluatePublicCzRatchet({report:report([{group:'record',id:'LEGACY-1',missing_fields:['title']}],{PUBLIC_CZ_UI_BACKLOG_FIELDS:99}),baseline});
  assert.equal(r.pass,false);
  assert.ok(r.failures.includes('PUBLIC_CZ_AUDIT_COUNT_MISMATCH'));
});
