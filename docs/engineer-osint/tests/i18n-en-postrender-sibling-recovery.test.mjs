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
function installDom({globalNodes=[],boxes=[],attributes=[],managed=[]}={}){
  globalThis.NodeFilter={SHOW_TEXT:4};
  globalThis.document={
    body:{_nodes:globalNodes},documentElement:{},visibilityState:'visible',
    addEventListener:()=>{},getElementById:()=>null,
    querySelectorAll(selector){
      if(selector==='[data-i18n-key]')return managed;
      if(selector==='[data-open],article,.item')return boxes;
      if(selector==='input[placeholder],textarea[placeholder],[title],[aria-label]')return attributes;
      return[];
    },
    createTreeWalker(root){
      const nodes=root?._nodes||[];let i=-1;
      return{currentNode:null,nextNode(){i++;if(i>=nodes.length)return false;this.currentNode=nodes[i];return true}};
    }
  };
  globalThis.requestAnimationFrame=fn=>{fn();return 1};
  globalThis.setTimeout=fn=>{fn();return 1};
  globalThis.clearTimeout=()=>{};
  globalThis.localStorage={getItem:()=> 'en'};
}
function run(label='cleanup'){
  const src=fs.readFileSync(new URL('../i18n-en-postrender-cleanup.js',import.meta.url),'utf8');
  vm.runInThisContext(src,{filename:`i18n-en-postrender-${label}.js`});
}

test('EN cleanup uses immutable canonical pairs and restores mixed static UI attributes',()=>{
  const leadCs='Ověřit aktuálnost pro roky 2025–2026 a podrobné složení podřízených prvků.';
  const leadEn='Verify currentness for 2025–2026 and the detailed composition of subordinate elements.';
  const eventCs='Položka je užitečným aktuálním datovým bodem o překonávání vodních překážek.';
  const eventEn='The item is a useful current datapoint for wet-gap crossing.';
  const nodes=[textNode(leadCs),textNode(eventCs),textNode('100 % aktuálních canonical references materializováno')];
  const input=attributeElement('Hledat ID, techniku, jednotku, lead...');
  const managed={children:[],dataset:{i18nKey:'Overview'},textContent:'Přehled'};
  globalThis.window={
    __ENGINEER_DATA__:{
      records:{records:[{id:'ENG-EVT-0026',summary:eventCs,summary_cs:eventCs,summary_en:eventEn}]},
      leads:{leads:[{id:'LEAD-006',next_action:leadCs,next_action_cs:leadCs,next_action_en:leadEn}]},
      dashboard_patch_extras:{}
    },
    __ENGINEER_CANONICAL_DATA__:{
      records:{records:[{id:'ENG-EVT-0026',summary:eventEn,summary_cs:eventCs}]},
      leads:{leads:[{id:'LEAD-006',next_action:leadEn,next_action_cs:leadCs}]},
      dashboard_patch_extras:{}
    },
    __ENGINEER_I18N__:{ui:{cs:{Overview:'Přehled'}}},
    ENGINEER_I18N:{getLanguage:()=> 'en'}
  };
  installDom({globalNodes:nodes,attributes:[input],managed:[managed]});
  run('canonical-static');
  assert.equal(nodes[0].nodeValue,leadEn);
  assert.equal(nodes[1].nodeValue,eventEn);
  assert.equal(nodes[2].nodeValue,'100 % current canonical references materialized');
  assert.equal(input.value('placeholder'),'Search ID, equipment, unit, lead...');
  assert.equal(managed.textContent,'Overview');
});

test('EN canonical recovery refuses globally ambiguous Czech mappings',()=>{
  const cs='Stejný český prezentační text';
  const node=textNode(cs);
  globalThis.window={
    __ENGINEER_DATA__:{records:{records:[]},leads:{leads:[]},dashboard_patch_extras:{}},
    __ENGINEER_CANONICAL_DATA__:{
      records:{records:[]},
      leads:{leads:[
        {id:'LEAD-A',note:'English candidate A',note_cs:cs},
        {id:'LEAD-B',note:'English candidate B',note_cs:cs}
      ]},dashboard_patch_extras:{}
    },
    __ENGINEER_I18N__:{ui:{cs:{}}},ENGINEER_I18N:{getLanguage:()=> 'en'}
  };
  installDom({globalNodes:[node]});
  run('ambiguous-global');
  assert.equal(node.nodeValue,cs,'ambiguous global mapping must remain unchanged rather than guessed');
});

test('EN card recovery resolves a globally ambiguous Czech string by canonical entity ID',()=>{
  const cs='Sdílený český text';
  const enLead='English text for LEAD-002';
  const boxNode=textNode(cs);
  const box={dataset:{open:'LEAD-002'},textContent:`LEAD-002 ${cs}`,_nodes:[boxNode],querySelectorAll:()=>[]};
  globalThis.window={
    __ENGINEER_DATA__:{
      records:{records:[]},
      leads:{leads:[{id:'LEAD-002',note:cs,note_cs:cs,note_en:enLead}]},
      dashboard_patch_extras:{leads:[{id:'LEAD-002',note:cs,note_cs:cs,note_en:enLead}]}
    },
    __ENGINEER_CANONICAL_DATA__:{
      records:{records:[]},
      leads:{leads:[
        {id:'LEAD-002',note:enLead,note_cs:cs},
        {id:'LEAD-OTHER',note:'Different English text',note_cs:cs}
      ]},dashboard_patch_extras:{}
    },
    __ENGINEER_I18N__:{ui:{cs:{}}},ENGINEER_I18N:{getLanguage:()=> 'en'}
  };
  installDom({boxes:[box]});
  run('per-id');
  assert.equal(boxNode.nodeValue,enLead,'card-local canonical ID must disambiguate the English restoration');
});
