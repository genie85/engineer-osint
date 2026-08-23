(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const C=window.__ENGINEER_CANONICAL_DATA__||null;
  const current=()=>{try{return window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs'}catch{return 'cs'}};
  const ex=()=>D.dashboard_patch_extras||{};
  const cx=()=>C?.dashboard_patch_extras||{};
  const liveObjects=()=>[...(D.records?.records||[]),...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().updated_records||[]),...(ex().external_leads||[])];
  const canonicalObjects=()=>C?[...(C.records?.records||[]),...(C.leads?.leads||[]),...(cx().leads||[]),...(cx().updated_records||[]),...(cx().external_leads||[])]:[];
  const idOf=x=>x?.id||x?.lead_id||null;
  const STATIC_EN_NORMALIZATION=new Map([
    ['Hledat ID, techniku, jednotku, lead...','Search ID, equipment, unit, lead...'],
    ['100 % aktuálních canonical references materializováno','100 % current canonical references materialized']
  ]);
  const text=v=>typeof v==='string'&&v.trim()?v.trim():'';
  const sameArray=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>String(v)===String(b[i]));
  const valuesEqual=(a,b)=>Array.isArray(a)&&Array.isArray(b)?sameArray(a,b):a===b;

  function pairCollector(){
    const map=new Map(),conflicts=new Set();
    const add=(cs,en)=>{
      cs=text(cs);en=text(en);if(!cs||!en||cs===en||conflicts.has(cs))return;
      const prev=map.get(cs);if(prev&&prev!==en){map.delete(cs);conflicts.add(cs);return}map.set(cs,en);
    };
    const invalidate=v=>{
      if(Array.isArray(v)){for(const item of v)invalidate(item);return}
      const s=text(v);if(!s)return;map.delete(s);conflicts.add(s);
    };
    const addValue=(cs,en)=>{
      if(Array.isArray(cs)&&Array.isArray(en)){for(let i=0;i<Math.min(cs.length,en.length);i++)add(cs[i],en[i]);return}
      add(cs,en);
    };
    return{map,conflicts,add,addValue,invalidate,entries:()=>[...map.entries()].sort((a,b)=>b[0].length-a[0].length)};
  }

  function walkPairs(root,collector){
    const seen=new WeakSet();
    const walk=x=>{
      if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);
      if(Array.isArray(x)){for(const v of x)walk(v);return}
      for(const [k,cs] of Object.entries(x)){
        if(!k.endsWith('_cs'))continue;
        const base=k.slice(0,-3);
        let en=x[base+'_en']??x.__orig?.[base]??x[base];
        if(base==='text')en=x.text_en??x.__orig_text??x.text;
        collector.addValue(cs,en);
      }
      for(const [k,v] of Object.entries(x))if(k!=='__orig')walk(v);
    };
    walk(root);
  }

  function buildPairs(){
    const c=pairCollector();
    walkPairs(C||D,c);
    const ui=window.__ENGINEER_I18N__?.ui?.cs||{};
    for(const [en,cs] of Object.entries(ui))c.add(cs,en);
    for(const [cs,en] of STATIC_EN_NORMALIZATION)c.add(cs,en);
    return c.entries();
  }

  function uniqueValues(xs){
    const out=[];
    for(const v of xs){
      if(v===undefined||v===null||v==='')continue;
      if(!out.some(u=>valuesEqual(u,v)))out.push(v);
    }
    return out;
  }

  function buildEntityPairs(id){
    if(!id)return[];
    const live=liveObjects().filter(x=>idOf(x)===id);
    const canon=canonicalObjects().filter(x=>idOf(x)===id);
    if(!live.length&&!canon.length)return[];
    const c=pairCollector(),bases=new Set();
    for(const obj of [...live,...canon])for(const k of Object.keys(obj||{}))if(k.endsWith('_cs'))bases.add(k.slice(0,-3));
    for(const base of bases){
      const csValues=[];
      for(const obj of [...live,...canon]){
        const v=obj?.[base+'_cs'];if(v!==undefined&&v!==null)csValues.push(v);
      }
      if(!csValues.length)continue;
      const scalarCs=new Set(csValues.flatMap(v=>Array.isArray(v)?v:[v]).map(text).filter(Boolean));
      const enCandidates=[];
      for(const obj of canon){
        const v=base==='text'?(obj?.text_en??obj?.text):(obj?.[base+'_en']??obj?.[base]);
        if(Array.isArray(v)){if(v.length&&!csValues.some(cs=>sameArray(cs,v)))enCandidates.push(v)}
        else{const s=text(v);if(s&&!scalarCs.has(s))enCandidates.push(s)}
      }
      if(!enCandidates.length)for(const obj of live){
        const v=base==='text'?obj?.text_en:obj?.[base+'_en'];
        if(Array.isArray(v)){if(v.length&&!csValues.some(cs=>sameArray(cs,v)))enCandidates.push(v)}
        else{const s=text(v);if(s&&!scalarCs.has(s))enCandidates.push(s)}
      }
      const unique=uniqueValues(enCandidates);
      if(unique.length!==1){for(const cs of csValues)c.invalidate(cs);continue}
      for(const cs of csValues)c.addValue(cs,unique[0]);
    }
    return c.entries();
  }

  function translateText(raw,pairs){
    const t=String(raw??''),trim=t.trim();if(!trim)return t;
    let out=trim;
    for(const [cs,en] of pairs){if(out===cs){out=en;break}if(out.includes(cs))out=out.split(cs).join(en)}
    if(out===trim)return t;
    const lead=t.match(/^\s*/)?.[0]||'',trail=t.match(/\s*$/)?.[0]||'';return lead+out+trail;
  }

  function repairAttributes(root,pairs){
    const nodes=root===document
      ?document.querySelectorAll('input[placeholder],textarea[placeholder],[title],[aria-label]')
      :(root?.querySelectorAll?.('input[placeholder],textarea[placeholder],[title],[aria-label]')||[]);
    for(const el of nodes)for(const attr of ['placeholder','title','aria-label'])if(el.hasAttribute?.(attr)){
      const raw=el.getAttribute(attr),next=STATIC_EN_NORMALIZATION.get(raw)||translateText(raw,pairs);if(next!==raw)el.setAttribute(attr,next);
    }
  }

  function entityId(box){
    return box?.dataset?.open||(box?.textContent||'').match(/(?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL)-\d+|LEAD-[A-Z0-9-]+)/i)?.[0]||null;
  }

  function repairEntityBox(box,globalPairs){
    const id=entityId(box),pairs=buildEntityPairs(id);if(!id||!pairs.length)return;
    const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode,p=n.parentElement;if(!p||p.closest?.('#engineerLanguageSwitch,script,style'))continue;
      const next=translateText(n.nodeValue,pairs);if(next!==n.nodeValue)n.nodeValue=next;
    }
    repairAttributes(box,[...pairs,...globalPairs]);
  }

  function repair(){
    if(current()!=='en')return;
    const pairs=buildPairs();
    for(const el of document.querySelectorAll('[data-i18n-key]')){
      if(el.children?.length)continue;
      const key=el.dataset?.i18nKey;if(typeof key==='string'&&key&&el.textContent!==key)el.textContent=key;
    }
    for(const box of document.querySelectorAll('[data-open],article,.item'))repairEntityBox(box,pairs);
    const detail=document.getElementById?.('detailContent');if(detail)repairEntityBox(detail,pairs);
    const root=document.body||document.documentElement;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode,p=n.parentElement;if(!p||p.closest?.('#engineerLanguageSwitch,script,style'))continue;
      const next=translateText(n.nodeValue,pairs);if(next!==n.nodeValue)n.nodeValue=next;
    }
    repairAttributes(document,pairs);
  }

  let gen=0,timers=[];
  function schedule(){
    const token=++gen;for(const id of timers)clearTimeout(id);timers=[];
    const run=()=>{if(token!==gen||current()!=='en')return;repair()};
    requestAnimationFrame(run);
    for(const delay of [80,220,500,900,1500,3000])timers.push(setTimeout(run,delay));
  }
  document.addEventListener('engineer-language-changed',schedule,false);
  document.addEventListener('click',schedule,false);
  document.addEventListener('change',schedule,false);
  document.addEventListener('input',e=>{if(e.target?.matches?.('select,input,textarea'))schedule()},false);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()},false);
  schedule();
  window.ENGINEER_I18N_EN_POSTRENDER_CLEANUP={status:'enabled',version:4,mode:'canonical-english-per-id-plus-static-attribute-invariant',repair,schedule,buildPairs,buildEntityPairs};
})();
