import fs from 'node:fs';
import vm from 'node:vm';

const listeners=new Map();
const head={textContent:'Ukrajinská jednotka — přestavba obrněného vozidla na bezosádkovou protiminovou platformu'};
const box={
  dataset:{open:'ENG-SIG-0001'},
  textContent:'ENG-SIG-0001 Ukraine',
  querySelector(sel){return sel==='strong,h2,h3,h4'?head:null;},
  querySelectorAll(){return [];}
};
const staticParent={closest:()=>null};
const staticNode={nodeValue:'Bootstrap coverage',parentElement:staticParent};

globalThis.window={
  __ENGINEER_DATA__:{
    records:{records:[{
      id:'ENG-SIG-0001',
      title:'Ukrainian unit — conversion of an armored vehicle into an unmanned mine-clearing platform',
      title_en:'Ukrainian unit — conversion of an armored vehicle into an unmanned mine-clearing platform',
      title_cs:'Ukrajinská jednotka — přestavba obrněného vozidla na bezosádkovou protiminovou platformu'
    }]},
    leads:{leads:[]},dashboard_patch_extras:{}
  },
  __ENGINEER_I18N__:{ui:{cs:{'Bootstrap coverage':'Pokrytí inicializačních dat'}}},
  ENGINEER_I18N:{getLanguage:()=>globalThis.__lang}
};
globalThis.__lang='en';
globalThis.localStorage={getItem:()=>globalThis.__lang};
globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.document={
  body:{},
  querySelectorAll:()=>[box],
  getElementById:()=>null,
  addEventListener:(name,fn)=>listeners.set(name,fn),
  createTreeWalker(){let done=false;return{currentNode:null,nextNode(){if(done)return false;done=true;this.currentNode=staticNode;return true;}}}
};
globalThis.MutationObserver=class{observe(){}};
globalThis.requestAnimationFrame=fn=>fn();
globalThis.setTimeout=fn=>{fn();return 0;};

const src=fs.readFileSync(new URL('./i18n-runtime-switch-fix.js',import.meta.url),'utf8');
vm.runInThisContext(src,{filename:'i18n-runtime-switch-fix.js'});

function change(lang){
  globalThis.__lang=lang;
  const fn=listeners.get('engineer-language-changed');
  if(!fn)throw new Error('language-change listener not registered');
  fn({detail:{lang}});
}

const EN='Ukrainian unit — conversion of an armored vehicle into an unmanned mine-clearing platform';
const CS='Ukrajinská jednotka — přestavba obrněného vozidla na bezosádkovou protiminovou platformu';
if(head.textContent!==EN)throw new Error(`initial EN repair failed: ${head.textContent}`);
if(staticNode.nodeValue!=='Bootstrap coverage')throw new Error(`initial static EN changed unexpectedly: ${staticNode.nodeValue}`);
change('cs');
if(head.textContent!==CS)throw new Error(`EN→CZ repair failed: ${head.textContent}`);
if(staticNode.nodeValue!=='Pokrytí inicializačních dat')throw new Error(`static EN→CZ repair failed: ${staticNode.nodeValue}`);
change('en');
if(head.textContent!==EN)throw new Error(`CZ→EN repair failed: ${head.textContent}`);
if(staticNode.nodeValue!=='Bootstrap coverage')throw new Error(`static CZ→EN repair failed: ${staticNode.nodeValue}`);
change('cs');
if(head.textContent!==CS)throw new Error(`second EN→CZ repair failed: ${head.textContent}`);
if(staticNode.nodeValue!=='Pokrytí inicializačních dat')throw new Error(`second static EN→CZ repair failed: ${staticNode.nodeValue}`);
console.log('CZ_EN_CZ_DYNAMIC_CONTENT_AND_STATIC_UI PASS');
