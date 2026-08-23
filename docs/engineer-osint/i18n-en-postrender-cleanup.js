(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const current=()=>{try{return window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs'}catch{return 'cs'}};

  function buildPairs(){
    const map=new Map(),conflicts=new Set(),seen=new WeakSet();
    const add=(cs,en)=>{
      if(typeof cs!=='string'||typeof en!=='string')return;
      cs=cs.trim();en=en.trim();if(!cs||!en||cs===en||conflicts.has(cs))return;
      const prev=map.get(cs);if(prev&&prev!==en){map.delete(cs);conflicts.add(cs);return}map.set(cs,en);
    };
    const walk=x=>{
      if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);
      if(Array.isArray(x)){for(const v of x)walk(v);return}
      for(const [k,cs] of Object.entries(x)){
        if(!k.endsWith('_cs'))continue;
        const base=k.slice(0,-3);
        let en=x[base+'_en']??x.__orig?.[base]??x[base];
        if(base==='text')en=x.text_en??x.__orig_text??x.text;
        if(Array.isArray(cs)&&Array.isArray(en))for(let i=0;i<Math.min(cs.length,en.length);i++)add(cs[i],en[i]);
        else add(cs,en);
      }
      for(const [k,v] of Object.entries(x))if(k!=='__orig')walk(v);
    };
    walk(D);
    const ui=window.__ENGINEER_I18N__?.ui?.cs||{};
    for(const [en,cs] of Object.entries(ui))add(cs,en);
    return [...map.entries()].sort((a,b)=>b[0].length-a[0].length);
  }

  function translateText(raw,pairs){
    const t=String(raw??''),trim=t.trim();if(!trim)return t;
    let out=trim;
    for(const [cs,en] of pairs){if(out===cs){out=en;break}if(out.includes(cs))out=out.split(cs).join(en)}
    if(out===trim)return t;
    const lead=t.match(/^\s*/)?.[0]||'',trail=t.match(/\s*$/)?.[0]||'';return lead+out+trail;
  }

  function repair(){
    if(current()!=='en')return;
    const pairs=buildPairs();if(!pairs.length)return;
    const root=document.body||document.documentElement;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode,p=n.parentElement;if(!p||p.closest('#engineerLanguageSwitch,script,style'))continue;
      const next=translateText(n.nodeValue,pairs);if(next!==n.nodeValue)n.nodeValue=next;
    }
    for(const el of document.querySelectorAll('input[placeholder],textarea[placeholder],[title],[aria-label]')){
      for(const attr of ['placeholder','title','aria-label'])if(el.hasAttribute(attr)){
        const raw=el.getAttribute(attr),next=translateText(raw,pairs);if(next!==raw)el.setAttribute(attr,next);
      }
    }
  }

  let gen=0,timers=[];
  function schedule(){
    const token=++gen;for(const id of timers)clearTimeout(id);timers=[];
    const run=()=>{if(token!==gen||current()!=='en')return;repair()};
    requestAnimationFrame(run);
    for(const delay of [80,220,500,900,1500])timers.push(setTimeout(run,delay));
  }
  document.addEventListener('engineer-language-changed',schedule,false);
  document.addEventListener('click',schedule,false);
  document.addEventListener('change',schedule,false);
  document.addEventListener('input',e=>{if(e.target?.matches?.('select,input,textarea'))schedule()},false);
  schedule();
  window.ENGINEER_I18N_EN_POSTRENDER_CLEANUP={status:'enabled',version:2,mode:'global-unique-cs-to-en-invariant',repair,schedule,buildPairs};
})();
