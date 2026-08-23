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
    this.textContent='';
    this.onclick=null;
  }
  appendChild(child){
    if(child.parentElement){
      child.parentElement.children=child.parentElement.children.filter(x=>x!==child);
    }
    child.parentElement=this;
    this.children.push(child);
    return child;
  }
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
}

function makeSwitch(){
  const sw=new FakeElement('div');sw.id='engineerLanguageSwitch';
  for(const [lang,label] of [['cs','CZ'],['en','EN']]){
    const b=new FakeElement('button');b.dataset.lang=lang;b.textContent=label;sw.appendChild(b);
  }
  return sw;
}

test('language switch is pinned outside body without a competing observer or click handler',()=>{
  const listeners=new Map();
  const html=new FakeElement('html');
  const body=new FakeElement('body');
  html.appendChild(body);
  const sw=makeSwitch();
  body.appendChild(sw);

  let language='cs';
  const calls=[];
  sw.onclick=event=>{const lang=event.target?.dataset?.lang;if(lang){language=lang;calls.push(lang)}};

  globalThis.window={};
  globalThis.document={
    body,documentElement:html,readyState:'complete',
    getElementById:id=>id==='engineerLanguageSwitch'?(html.children.includes(sw)||body.children.includes(sw)?sw:null):null,
    addEventListener:(name,fn)=>listeners.set(name,fn)
  };
  globalThis.requestAnimationFrame=fn=>{fn();return 1};
  globalThis.MutationObserver=class{constructor(){throw new Error('hardening must not create a MutationObserver')}};

  const src=fs.readFileSync(new URL('../i18n-language-switch-hardening.js',import.meta.url),'utf8');
  vm.runInThisContext(src,{filename:'i18n-language-switch-hardening.js'});

  assert.equal(sw.parentElement,html,'switch must be outside rerendered body subtree');
  assert.equal(sw.dataset.i18nPersistent,'1');
  assert.equal(window.ENGINEER_LANGUAGE_SWITCH_HARDENING.binding,'base-controller-persistent-root');
  assert.equal(window.ENGINEER_LANGUAGE_SWITCH_HARDENING.observer,'none');
  assert.equal(listeners.has('click'),false,'hardening must not intercept clicks owned by base controller');

  const en=sw.querySelector('button[data-lang="en"]');
  sw.onclick({target:en});
  assert.equal(language,'en');
  assert.deepEqual(calls,['en']);

  // Simulate a view renderer replacing all body content. The pinned control and
  // its original base-controller onclick handler must survive untouched.
  body.children=[];
  assert.equal(sw.parentElement,html);
  assert.equal(html.children.includes(sw),true);
  const cs=sw.querySelector('button[data-lang="cs"]');
  sw.onclick({target:cs});
  assert.equal(language,'cs');
  assert.deepEqual(calls,['en','cs']);
});

test('language-change event re-pins the same live controller-owned switch',()=>{
  const listeners=new Map();
  const html=new FakeElement('html');
  const body=new FakeElement('body');html.appendChild(body);
  const sw=makeSwitch();body.appendChild(sw);
  globalThis.window={};
  globalThis.document={body,documentElement:html,readyState:'complete',getElementById:id=>id==='engineerLanguageSwitch'?sw:null,addEventListener:(name,fn)=>listeners.set(name,fn)};
  globalThis.requestAnimationFrame=fn=>{fn();return 1};
  const src=fs.readFileSync(new URL('../i18n-language-switch-hardening.js',import.meta.url),'utf8');
  vm.runInThisContext(src,{filename:'i18n-language-switch-hardening.js'});
  body.appendChild(sw); // simulate accidental reattachment inside a rerendered view
  listeners.get('engineer-language-changed')?.({detail:{lang:'en'}});
  assert.equal(sw.parentElement,html);
});

test('runtime manifest keeps persistence module after the base i18n controller',()=>{
  const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
  const base=manifest.indexOf("['engineer-ui-phase6-i18n-module','ui-phase6-i18n.js']");
  const hardening=manifest.indexOf("['engineer-i18n-language-switch-hardening-module','i18n-language-switch-hardening.js']");
  const runtimeFix=manifest.indexOf("['engineer-i18n-runtime-switch-fix-module','i18n-runtime-switch-fix.js']");
  assert.ok(base>=0&&hardening>base&&runtimeFix>hardening,'persistence module must remain ordered after controller and before runtime repair');
});
