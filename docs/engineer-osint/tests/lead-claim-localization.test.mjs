import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('docs/engineer-osint/i18n-content-cs.js','utf8');
const translations=new Map([
  ['The 68th NATO EOD WG public record states that EOC minimum standards of proficiency will be re-defined with support of the MILENG community.','Veřejný záznam 68. NATO EOD WG uvádí, že minimální standardy odborné způsobilosti EOC budou znovu definovány s podporou komunity MILENG.'],
  ['The same public record states that EOD COE presented analysis regarding EOC tasks in NATO operations.','Tentýž veřejný záznam uvádí, že EOD COE prezentovalo analýzu týkající se úkolů EOC v operacích NATO.'],
  ['The exact designation of the later EOC annex / study draft is not disclosed by the 68th WG public record.','Přesné označení pozdějšího EOC annexu / study draftu není ve veřejném záznamu 68. EOD WG zveřejněno.']
]);

function localize(claims){
  const data={
    records:{records:[]},leads:{leads:[{id:'LEAD-001',claims}]},sources:{sources:[]},
    external_source_registry:{sources:[]}
  };
  vm.runInNewContext(source,{window:{__ENGINEER_DATA__:data}},{filename:'i18n-content-cs.js'});
  return data.leads.leads[0].claims;
}

test('legacy LEAD-001 claims are translated by exact English text, not array position',()=>{
  const input=[...translations.keys()].reverse().map((text,index)=>({claim_id:`LEAD-001-CLAIM-${index}`,text,classification:'FACT'}));
  const claims=localize(input);
  for(const claim of claims)assert.equal(claim.text_cs,translations.get(claim.text));
});

test('stable claim ID cannot reuse a stale translation after English wording changes',()=>{
  const [claim]=localize([{
    claim_id:'LEAD-001-CLAIM-EODCOE-ANALYSIS',
    text:'The public meeting record attributes an EOC analysis presentation to an EOD COE expert.',
    classification:'FACT'
  }]);
  assert.equal(claim.text_cs,undefined);
});

test('single canonical LEAD-001 delta receives its matching Czech text',()=>{
  const text='The same public record states that EOD COE presented analysis regarding EOC tasks in NATO operations.';
  const [claim]=localize([{text,classification:'FACT'}]);
  assert.equal(claim.text_cs,translations.get(text));
});

test('unknown LEAD-001 claim is not assigned an unrelated positional translation',()=>{
  const [claim]=localize([{text:'A future independently sourced claim.',classification:'FACT'}]);
  assert.equal(claim.text_cs,undefined);
});

test('prototype property names cannot become LEAD-001 translations',()=>{
  for(const text of ['constructor','toString','__proto__']){
    const [claim]=localize([{text,classification:'FACT'}]);
    assert.equal(claim.text_cs,undefined);
  }
});

test('canonical bilingual claim keeps its own Czech text even when a known stable ID is reused',()=>{
  const text_en='The public record attributes a separately worded analysis statement to the EOD COE expert.';
  const text_cs='Veřejný záznam připisuje samostatně formulované tvrzení o analýze expertovi EOD COE.';
  const [claim]=localize([{claim_id:'LEAD-001-CLAIM-EODCOE-ANALYSIS',text:text_en,text_en,text_cs,classification:'FACT'}]);
  assert.equal(claim.text_cs,text_cs);
});
