import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','canonical-snapshot.js'),'utf8');

function run(data){
  const sandbox={window:{__ENGINEER_DATA__:data},structuredClone,JSON,Object};
  vm.runInNewContext(src,sandbox,{filename:'canonical-snapshot.js'});
  return sandbox.window;
}

test('canonical snapshot hydrates explicit English mirrors from restored originals',()=>{
  const data={records:{records:[{
    id:'ENG-TEST-0001',
    title:'Český runtime titul',
    title_cs:'Český runtime titul',
    summary:'České runtime shrnutí',
    summary_cs:'České runtime shrnutí',
    __i18n_public_orig:{title:'English title',summary:'English summary'}
  }]}};
  const w=run(data);
  const live=w.__ENGINEER_DATA__.records.records[0];
  const canonical=w.__ENGINEER_CANONICAL_DATA__.records.records[0];
  assert.equal(live.title,'Český runtime titul');
  assert.equal(live.title_en,'English title');
  assert.equal(live.summary_en,'English summary');
  assert.equal(canonical.title,'English title');
  assert.equal(canonical.summary,'English summary');
  assert.equal(Object.isFrozen(canonical),true);
});

test('hydration covers nested claim text and preserves an existing explicit English value',()=>{
  const data={records:{records:[{
    id:'ENG-TEST-0002',
    title:'English base',title_cs:'Český titul',title_en:'Explicit English title',
    claims:[{text:'České tvrzení',text_cs:'České tvrzení',__i18n_public_orig_text:'English claim'}]
  }]}};
  const w=run(data);
  const live=w.__ENGINEER_DATA__.records.records[0];
  assert.equal(live.title_en,'Explicit English title');
  assert.equal(live.claims[0].text_en,'English claim');
  assert.equal(w.__ENGINEER_CANONICAL_DATA__.records.records[0].claims[0].text,'English claim');
});
