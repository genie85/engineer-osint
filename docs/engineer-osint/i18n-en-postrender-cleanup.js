(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const current=()=>{try{return window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs'}catch{return 'cs'}};
  const ex=()=>D.dashboard_patch_extras||{};
  const entityObjects=()=>[...(D.records?.records||[]),...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().updated_records||[]),...(ex().external_leads||[])];
  const idOf=x=>x?.id||x?.lead_id||null;
  const STATIC_EN_NORMALIZATION=new Map([
    ['Hledat ID, techniku, jednotku, lead...','Search ID, equipment, unit, lead...'],
    ['100 % aktuálních canonical references materializováno','100 % current canonical references materialized']
  ]);

  const text=v=>typeof v==='string'&&v.trim()?v.trim():'';
  const sameArray=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>String(v)===String(b[i]));

  function buildPairs(){
    const map=new Map(),conflicts=new Set(),seen=new WeakSet();
    const add=(cs,en)=>{
      cs=text(cs);en=text(en);if(!cs||!en||cs===en||conflicts.has(cs))return;
      const prev=map.get(cs);if(prev&&prev!==en){map.delete(cs);conflicts.add(cs);return}map.set(cs,en);
    };
    const addValue=(cs,en)=>{
      if(Array.isArray(cs)&&Array.isArray(en)){for(let i=0;i<Math.min(cs.length,en.length);i++)add(cs[i],en[i]);return}
      add(cs,en);
    };
    const walk=x=>{
      if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);
      if(Array.isArray(x)){for(const v of x)walk(v);return}
      for(const [k,cs] of Object.entries(x)){
        if(!k.endsWith('_cs'))continue;
        const base=k.slice(0,-3);
        let en=x[base+'_en']??x.__orig?.[base]??x[base];
        if(base==='text')en=x.text_en??x.__orig_text??x.text;
        addValue(cs,en);
      }
      for(const [k,v] of Object.entries(x))if(k!=='__orig')walk(v);
    };
    walk(D);

    // ui-phase6 mutates presentation base fields while changing language. Some
    // duplicate lead/update objects contain only *_cs on one copy and English on
    // another. Pair those siblings by stable ID without inventing a translation.
    const buckets=new Map();
    for(const obj of entityObjects()){
      const id=idOf(obj);if(!id)continue;
      if(!buckets.has(id))buckets.set(id,[]);buckets.get(id).push(obj);
    }
    for(const siblings of buckets.values()){
      const bases=new Set();
      for(const obj of siblings)for(const k of Object.keys(obj||{}))if(k.endsWith('_cs'))bases.add(k.slice(0,-3));
      for(const base of bases){
        const csValues=[];
        for(const obj of siblings){const v=obj?.[base+'_cs'];if(v!==undefined&&v!==null)csValues.push(v)}
        if(!csValues.length)continue;
        const scalarCs=new Set(csValues.flatMap(v=>Array.isArray(v)?v:[v]).map(text).filter(Boolean));
        const candidates=[];
        const pushCandidate=v=>{
          if(Array.isArray(v)){
            if(v.length&&!csValues.some(cs=>sameArray(cs,v)))candidates.push(v);
            return;
          }
          const s=text(v);if(s&&!scalarCs.has(s))candidates.push(s);
        };
        for(const obj of siblings){
          pushCandidate(obj?.[base+'_en']);
          pushCandidate(obj?.__orig?.[base]);
          pushCandidate(obj?.[base]);
        }
        const unique=[];
        for(const v of candidates){
          const exists=unique.some(u=>Array.isArray(u)&&Array.isArray(v)?sameArray(u,v):u===v);
          if(!exists)unique.push(v);
        }
        if(unique.length!==1)continue;
        for(const cs of csValues)addValue(cs,unique[0]);
      }
    }

    const ui=window.__ENGINEER_I18N__?.ui?.cs||{};
    for(const [en,cs] of Object.entries(ui))add(cs,en);
    for(const [cs,en] of STATIC_EN_NORMALIZATION)add(cs,en);
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
    for(const el of document.querySelectorAll('[data-i18n-key]')){
      if(el.children?.length)continue;
      const key=el.dataset?.i18nKey;if(typeof key==='string'&&key){const next=translateText(key,pairs);if(el.textContent!==next)el.textContent=next}
    }
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
  window.ENGINEER_I18N_EN_POSTRENDER_CLEANUP={status:'enabled',version:3,mode:'global-unique-cs-to-en-plus-id-sibling-recovery',repair,schedule,buildPairs};
})();
