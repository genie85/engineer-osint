import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const registry=readFileSync(new URL('i18n-enum-cs-safe-registry.js',root),'utf8');
const renderer=readFileSync(new URL('ui-v43-entity-detail.js',root),'utf8');
const formatter=renderer.match(/  const fmt=.*\n/)[0];
function render(language,key){const context={window:{},language,key};vm.runInNewContext(registry,context);return vm.runInNewContext(`const lang=()=>language;${formatter}\nfmt(key)`,context)}
test('DMZ detail displays qualified Czech status and confidence without changing tokens',()=>{
 assert.equal(render('cs','DATED_JCS_CONCLUSION_WITH_REPORTED_DENIAL'),'DATOVANÝ ZÁVĚR JCS S UVEDENÝM ODMÍTNUTÍM');
 assert.equal(render('cs','HIGH_FOR_ATTRIBUTED_STATEMENTS_NOT_INDEPENDENT_CAUSATION'),'VYSOKÁ PRO PŘIPSANÁ VYJÁDŘENÍ, NIKOLI NEZÁVISLÉ PROKÁZÁNÍ PŘÍČINY');
 assert.equal(render('cs','HIGH_FOR_ATTRIBUTED_REPORT_CONTENT'),'VYSOKÁ PRO OBSAH PŘIPSANÉ ZPRÁVY');
 assert.equal(render('cs','ATTRIBUTED_OFFICIAL_CONCLUSION_WITH_DISPUTED_RESPONSIBILITY'),'PŘIPSANÝ OFICIÁLNÍ ZÁVĚR SE SPORNOU ODPOVĚDNOSTÍ');
});
test('English and unknown-value fallback stay readable and null stays empty',()=>{
 assert.equal(render('en','DATED_JCS_CONCLUSION_WITH_REPORTED_DENIAL'),'DATED JCS CONCLUSION WITH REPORTED DENIAL');
 assert.equal(render('cs','UNREGISTERED_TEST_VALUE'),'UNREGISTERED TEST VALUE');
 assert.equal(render('en',null),'');
});
