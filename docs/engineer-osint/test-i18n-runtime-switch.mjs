import fs from 'node:fs';
import vm from 'node:vm';

const listeners=new Map();
function makeBox(id,title,body){
  const head={textContent:`${id} — ${title}`};
  const muted={textContent:body,children:[]};
  return {
    id,head,muted,dataset:{open:id},textContent:id,
    querySelector(sel){if(sel==='strong,h2,h3,h4')return head;if(sel==='.muted')return muted;return null;},
    querySelectorAll(){return [muted];}
  };
}
const evt=makeBox('ENG-EVT-0026','2nd Army Engineer Brigade — 240 m Euphrates floating bridge','The item is a useful current operational-support/wet-gap datapoint for Turkish engineer bridging capacity.');
const lead=makeBox('LEAD-003','Ukraine remote-mining company model — local vs force-wide','Ukraine Land Forces current public pages explicitly describe engineer UGVs performing mining, demining and barrier tasks; 110 OMBR recruiting material identifies a UGV company using systems for remote mining/demining among other roles. This strengthens the organizational/robotization trend but does not prove a single force-wide company template.');
const staticParent={closest:()=>null};
const staticNode={nodeValue:'Bootstrap coverage',parentElement:staticParent};

globalThis.window={
  __ENGINEER_DATA__:{
    records:{records:[{
      id:'ENG-EVT-0026',
      title:'2nd Army Engineer Brigade — 240 m Euphrates floating bridge',
      title_en:'2nd Army Engineer Brigade — 240 m Euphrates floating bridge',
      title_cs:'Ženijní brigáda 2. armády — 240m plovoucí most přes Eufrat',
      analysis:'The item is a useful current operational-support/wet-gap datapoint for Turkish engineer bridging capacity.',
      analysis_en:'The item is a useful current operational-support/wet-gap datapoint for Turkish engineer bridging capacity.',
      analysis_cs:'Položka je užitečným aktuálním datovým bodem o operační podpoře a překonávání vodních překážek pro schopnosti tureckého ženijního mostního vojska.'
    }]},
    leads:{leads:[{
      id:'LEAD-003',
      title:'Ukraine remote-mining company model — local vs force-wide',
      title_en:'Ukraine remote-mining company model — local vs force-wide',
      title_cs:'Ukrajinský model roty dálkového minování — místní, nebo platný napříč silami',
      note:'Ukraine Land Forces current public pages explicitly describe engineer UGVs performing mining, demining and barrier tasks; 110 OMBR recruiting material identifies a UGV company using systems for remote mining/demining among other roles. This strengthens the organizational/robotization trend but does not prove a single force-wide company template.',
      note_en:'Ukraine Land Forces current public pages explicitly describe engineer UGVs performing mining, demining and barrier tasks; 110 OMBR recruiting material identifies a UGV company using systems for remote mining/demining among other roles. This strengthens the organizational/robotization trend but does not prove a single force-wide company template.',
      note_cs:'Současné veřejné stránky Pozemních sil Ukrajiny výslovně popisují ženijní UGV používaná k minování, odminování a budování překážek; náborové materiály 110. OMBR uvádějí rotu UGV používající systémy mimo jiné k dálkovému minování a odminování. Posiluje to trend organizační robotizace, ale neprokazuje jednotnou šablonu roty platnou napříč celými silami.'
    }]},dashboard_patch_extras:{}
  },
  __ENGINEER_I18N__:{ui:{cs:{'Bootstrap coverage':'Pokrytí inicializačních dat'}}},
  ENGINEER_I18N:{getLanguage:()=>globalThis.__lang}
};
globalThis.__lang='en';
globalThis.localStorage={getItem:()=>globalThis.__lang};
globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.document={
  body:{},
  querySelectorAll:()=>[evt,lead],
  getElementById:()=>null,
  addEventListener:(name,fn)=>listeners.set(name,fn),
  createTreeWalker(){let done=false;return{currentNode:null,nextNode(){if(done)return false;done=true;this.currentNode=staticNode;return true;}}}
};
globalThis.MutationObserver=class{observe(){}};
globalThis.requestAnimationFrame=fn=>fn();
globalThis.setTimeout=fn=>{fn();return 0;};

const src=fs.readFileSync(new URL('./i18n-runtime-switch-fix.js',import.meta.url),'utf8');
vm.runInThisContext(src,{filename:'i18n-runtime-switch-fix.js'});
function change(lang){globalThis.__lang=lang;const fn=listeners.get('engineer-language-changed');if(!fn)throw new Error('language-change listener not registered');fn({detail:{lang}});}

const expected={
  evt:{enTitle:'ENG-EVT-0026 — 2nd Army Engineer Brigade — 240 m Euphrates floating bridge',csTitle:'ENG-EVT-0026 — Ženijní brigáda 2. armády — 240m plovoucí most přes Eufrat',enBody:'The item is a useful current operational-support/wet-gap datapoint for Turkish engineer bridging capacity.',csBody:'Položka je užitečným aktuálním datovým bodem o operační podpoře a překonávání vodních překážek pro schopnosti tureckého ženijního mostního vojska.'},
  lead:{enTitle:'LEAD-003 — Ukraine remote-mining company model — local vs force-wide',csTitle:'LEAD-003 — Ukrajinský model roty dálkového minování — místní, nebo platný napříč silami',enBody:'Ukraine Land Forces current public pages explicitly describe engineer UGVs performing mining, demining and barrier tasks; 110 OMBR recruiting material identifies a UGV company using systems for remote mining/demining among other roles. This strengthens the organizational/robotization trend but does not prove a single force-wide company template.',csBody:'Současné veřejné stránky Pozemních sil Ukrajiny výslovně popisují ženijní UGV používaná k minování, odminování a budování překážek; náborové materiály 110. OMBR uvádějí rotu UGV používající systémy mimo jiné k dálkovému minování a odminování. Posiluje to trend organizační robotizace, ale neprokazuje jednotnou šablonu roty platnou napříč celými silami.'}
};
function assertLang(lang){const suffix=lang==='cs'?'cs':'en';for(const [name,box] of Object.entries({evt,lead})){if(box.head.textContent!==expected[name][suffix+'Title'])throw new Error(`${name} ${lang} title failed: ${box.head.textContent}`);if(box.muted.textContent!==expected[name][suffix+'Body'])throw new Error(`${name} ${lang} body failed: ${box.muted.textContent}`)}}
assertLang('en');
change('cs');assertLang('cs');if(staticNode.nodeValue!=='Pokrytí inicializačních dat')throw new Error(`static EN→CZ repair failed: ${staticNode.nodeValue}`);
change('en');assertLang('en');if(staticNode.nodeValue!=='Bootstrap coverage')throw new Error(`static CZ→EN repair failed: ${staticNode.nodeValue}`);
change('cs');assertLang('cs');
console.log('CZ_EN_CZ_DYNAMIC_CONTENT_STATIC_UI_OVERVIEW_CARDS PASS');
