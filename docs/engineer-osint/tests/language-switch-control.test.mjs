import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeElement{
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();
    this.id='';
    this.dataset={};
    this.children=[];
    this.parentElement=null;
    this.style={cssText:'',background:'',color:''};
    this.attributes={};
    this.textContent='';
  }
  appendChild(child){child.parentElement=this;this.children.push(child);return child}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  querySelectorAll(selector){
    const out=[];
    const visit=node=>{
      for(const child of node.children){
        if(selector==='button[data-lang]'&&child.tagName==='BUTTON'&&child.dataset.lang)out.push(child);
        const match=selector.match(/^button\[data-lang="(cs|en)"\]$/);
        if(match&&child.tagName==='BUTTON'&&child.dataset.lang===match[1])out.push(child);
        visit(child);
      }
    };
    visit(this);return out;
  }
  closest(selector){
    if(selector==='#engineerLanguageSwitch button[data-lang]'){
      let p=this;
      const isButton=this.tagName==='BUTTON'&&Boolean(this.dataset.lang);
      while(p){if(isButton&&p.id==='engineerLanguageSwitch')return this;p=p.parentElement}
    }
    return null;
  }
  setAttribute(name,value){this.attributes[name]=String(value)}
}

function makeSwitch(){
  const sw=new FakeElement('div');sw.id='engineerLanguageSwitch';
  for(const [lang,label] of [['cs','CZ'],['en','EN']]){const b=new FakeElement('button');b.dataset.lang=lang;b.textContent=label;sw.appendChild(b)}
  return sw;
}

test('delegated language switch survives DOM replacement and self-heals removal',()=>{
  const listeners=new Map();
  const addListener=(name,fn,capture=false)=>{const rows=listeners.get(name)||[];rows.push({fn,capture});listeners.set(name,rows)};
  const body=new FakeElement('body');
  let switchNode=null;
  const bodyAppend=body.appendChild.bind(body);
  body.appendChild=child=>{bodyAppend(child);if(child.id==='engineerLanguageSwitch')switchNode=child;return child};

  let language='cs';
  const calls=[];
  const local=new Map([['engineer_osint_language','cs']]);
  globalThis.window={ENGINEER_I18N:{getLanguage:()=>language,setLanguage:lang=>{language=lang;local.set('engineer_osint_language',lang);calls.push(lang)}}};
  globalThis.localStorage={getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,String(value))};
  globalThis.document={
    body,documentElement:{lang:'cs'},readyState:'complete',
    getElementById:id=>id==='engineerLanguageSwitch'?switchNode:null,
    createElement:tag=>new FakeElement(tag),
    addEventListener:addListener,
    dispatchEvent:()=>{}
  };
  let mutationCallback=null;
  globalThis.MutationObserver=class{constructor(fn){mutationCallback=fn}observe(){}};
  globalThis.requestAnimationFrame=fn=>{fn();return 1};

  const src=fs.readFileSync(new URL('../i18n-language-switch-hardening.js',import.meta.url),'utf8');
  vm.runInThisContext(src,{filename:'i18n-language-switch-hardening.js'});

  assert.ok(switchNode,'switch should be created when missing');
  const click=listeners.get('click')?.find(x=>x.capture===true)?.fn;
  assert.equal(typeof click,'function','document capture click handler must be installed');

  const en=switchNode.querySelector('button[data-lang="en"]');
  let prevented=0,stopped=0;
  click({target:en,preventDefault:()=>prevented++,stopPropagation:()=>stopped++});
  assert.equal(language,'en');
  assert.deepEqual(calls,['en']);
  assert.equal(prevented,1);assert.equal(stopped,1);
  assert.equal(en.attributes['aria-pressed'],'true');

  // Simulate a later renderer replacing the entire control with a fresh node
  // that has no direct onclick handler. Delegation must still work.
  switchNode=makeSwitch();
  const cs=switchNode.querySelector('button[data-lang="cs"]');
  click({target:cs,preventDefault(){},stopPropagation(){}});
  assert.equal(language,'cs');
  assert.deepEqual(calls,['en','cs']);

  // Simulate a renderer removing the control completely. Mutation recovery
  // must recreate a live switch without a page reload.
  switchNode=null;body.children=[];
  assert.equal(typeof mutationCallback,'function');
  mutationCallback();
  assert.ok(switchNode,'switch should be recreated after removal');
  assert.ok(switchNode.querySelector('button[data-lang="en"]'));
  assert.equal(window.ENGINEER_LANGUAGE_SWITCH_HARDENING.binding,'document-capture-delegated');
});

test('runtime manifest keeps hardening after the base i18n controller',()=>{
  const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
  const base=manifest.indexOf("['engineer-ui-phase6-i18n-module','ui-phase6-i18n.js']");
  const hardening=manifest.indexOf("['engineer-i18n-language-switch-hardening-module','i18n-language-switch-hardening.js']");
  const runtimeFix=manifest.indexOf("['engineer-i18n-runtime-switch-fix-module','i18n-runtime-switch-fix.js']");
  assert.ok(base>=0&&hardening>base&&runtimeFix>hardening,'language switch hardening must remain ordered after controller and before repair module');
});
