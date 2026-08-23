import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function parent(){return{closest:()=>null}}
function textNode(value){return{nodeValue:value,parentElement:parent()}}
function attributeElement(value){
  const attrs=new Map([['placeholder',value]]);
  return{
    hasAttribute:name=>attrs.has(name),
    getAttribute:name=>attrs.get(name),
    setAttribute:(name,v)=>attrs.set(name,v),
    value:name=>attrs.get(name)
  };
}

test('EN cleanup recovers Czech text from localized-only duplicate siblings and mixed base UI',()=>{
  const leadCs='Ověřit aktuálnost pro roky 2025–2026 a podrobné složení podřízených prvků.';
  const leadEn='Verify currentness for 2025–2026 and the detailed composition of subordinate elements.';
  const eventCs='Položka je užitečným aktuálním datovým bodem o překonávání vodních překážek.';
  const eventEn='The item is a useful current datapoint for wet-gap crossing.';
  const nodes=[
    textNode(leadCs),
    textNode(eventCs),
    textNode('100 % aktuálních canonical references materializováno')
  ];
  const input=attributeElement('Hledat ID, techniku, jednotku, lead...');
  const managed={children:[],dataset:{i18nKey:'Overview'},textContent:'Přehled'};

  globalThis.window={
    __ENGINEER_DATA__:{
      records:{records:[
        {id:'ENG-EVT-0026',summary:eventEn},
        {id:'ENG-TECH-0022',summary:'KUNDUZ/AACE protected engineer-earthmover profile.'}
      ]},
      leads:{leads:[{id:'LEAD-006',next_action:leadEn}]},
      dashboard_patch_extras:{
        leads:[{id:'LEAD-006',next_action_cs:leadCs,next_action:leadCs}],
        updated_records:[{id:'ENG-EVT-0026',summary_cs:eventCs,summary:eventCs}]
      }
    },
    __ENGINEER_I18N__:{ui:{cs:{Overview:'Přehled'}}},
    ENGINEER_I18N:{getLanguage:()=> 'en'}
  };
  globalThis.localStorage={getItem:()=> 'en'};
  globalThis.NodeFilter={SHOW_TEXT:4};
  globalThis.document={
    body:{},documentElement:{},
    addEventListener:()=>{},
    querySelectorAll:selector=>selector==='[data-i18n-key]'?[managed]:selector==='input[placeholder],textarea[placeholder],[title],[aria-label]'?[input]:[],
    createTreeWalker(){let i=-1;return{currentNode:null,nextNode(){i++;if(i>=nodes.length)return false;this.currentNode=nodes[i];return true}}}
  };
  globalThis.requestAnimationFrame=fn=>{fn();return 1};
  globalThis.setTimeout=fn=>{fn();return 1};
  globalThis.clearTimeout=()=>{};

  const src=fs.readFileSync(new URL('../i18n-en-postrender-cleanup.js',import.meta.url),'utf8');
  vm.runInThisContext(src,{filename:'i18n-en-postrender-cleanup.js'});

  assert.equal(nodes[0].nodeValue,leadEn,'LEAD-006 localized-only duplicate must recover English sibling text');
  assert.equal(nodes[1].nodeValue,eventEn,'ENG-EVT-0026 localized-only update duplicate must recover English sibling text');
  assert.equal(nodes[2].nodeValue,'100 % current canonical references materialized','mixed-language base statistic must normalize in EN');
  assert.equal(input.value('placeholder'),'Search ID, equipment, unit, lead...','search placeholder must normalize in EN');
  assert.equal(managed.textContent,'Overview','managed static label must restore its English i18n key');
});

test('EN sibling recovery refuses ambiguous English candidates',()=>{
  const cs='Stejný český prezentační text';
  const node=textNode(cs);
  globalThis.window={
    __ENGINEER_DATA__:{
      records:{records:[]},
      leads:{leads:[{id:'LEAD-X',note:'English candidate A'}]},
      dashboard_patch_extras:{leads:[{id:'LEAD-X',note:'English candidate B',note_cs:cs}]}
    },
    __ENGINEER_I18N__:{ui:{cs:{}}},
    ENGINEER_I18N:{getLanguage:()=> 'en'}
  };
  globalThis.localStorage={getItem:()=> 'en'};
  globalThis.NodeFilter={SHOW_TEXT:4};
  globalThis.document={
    body:{},documentElement:{},addEventListener:()=>{},querySelectorAll:()=>[],
    createTreeWalker(){let done=false;return{currentNode:null,nextNode(){if(done)return false;done=true;this.currentNode=node;return true}}}
  };
  globalThis.requestAnimationFrame=fn=>{fn();return 1};
  globalThis.setTimeout=fn=>{fn();return 1};
  globalThis.clearTimeout=()=>{};
  const src=fs.readFileSync(new URL('../i18n-en-postrender-cleanup.js',import.meta.url),'utf8');
  vm.runInThisContext(src,{filename:'i18n-en-postrender-cleanup-ambiguous.js'});
  assert.equal(node.nodeValue,cs,'ambiguous sibling mappings must remain unchanged rather than guessed');
});
