(function(){
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const cs=(a,b)=>lang()==='cs'?a:b;
  let scheduled=false;

  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const fields=node=>[clean(node?.textContent),clean(node?.dataset?.labelCs),clean(node?.dataset?.labelEn)].filter(Boolean);
  const matches=(node,re)=>fields(node).some(value=>re.test(value));
  const setLabel=(node,labelCs,labelEn)=>{
    if(!node)return;
    if(node.dataset){
      if(node.dataset.labelCs!==labelCs)node.dataset.labelCs=labelCs;
      if(node.dataset.labelEn!==labelEn)node.dataset.labelEn=labelEn;
    }
    const next=cs(labelCs,labelEn);
    if(clean(node.textContent)!==next)node.textContent=next;
  };

  function injectStyle(){
    if(document.getElementById('engineer-v423-nav-cleanup-style'))return;
    const s=document.createElement('style');
    s.id='engineer-v423-nav-cleanup-style';
    s.textContent=`
#engineerAnalysisToolsGroup{margin-top:4px!important;border-top:1px solid rgba(120,160,200,.12)!important;padding-top:4px!important}
#engineerAnalysisToolsGroup>summary{font-size:.82rem!important;font-weight:600!important;color:#9fb2c5!important;padding-top:7px!important;padding-bottom:7px!important}
#engineerAnalysisToolsGroup .v423-subnav{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:2px!important;padding:2px 0 2px 10px!important}
#engineerAnalysisToolsGroup .v423-subnav>*{width:100%!important;margin:0!important;box-sizing:border-box!important}
#engineerAnalysisToolsGroup .v423-subnav button{font-size:.91em!important;color:#b8c8d8!important}
`;
    document.head.appendChild(s);
  }

  function normalizeAnalysis(){
    const root=document.getElementById('engineerCompactNav');
    const analysis=root?.querySelector('#engineerAnalysisGroup .compact-subnav');
    const hidden=root?.querySelector('#engineerLegacyHidden');
    if(!root||!analysis||!hidden)return;

    const labelRules=[
      [/^Activity Feed$/i,'Aktivity','Activity Feed'],
      [/^(?:Leads\s*\/\s*Watchlist|Watchlist\s*\/\s*Leads|Leady\s*\/\s*sledované položky)$/i,'Leady / sledované položky','Leads / Watchlist'],
      [/^(?:Intelligence Gaps|INFORMAČNÍ MEZERY|Informační mezery)$/i,'Informační mezery','Intelligence Gaps']
    ];
    for(const b of analysis.querySelectorAll('button')){
      for(const [re,labelCs,labelEn] of labelRules){
        if(!matches(b,re))continue;
        setLabel(b,labelCs,labelEn);
        break;
      }
    }

    for(const node of [...analysis.children]){
      if(node.id==='engineerAnalysisToolsGroup')continue;
      if(matches(node,/^(?:Země|Countries)$/i)||matches(node,/^(?:Téma:\s*Austrálie\s*\/\s*EOD|Topic:\s*Australia\s*\/\s*EOD)$/i)){
        node.dataset.v423LegacyAnalysis='1';
        hidden.appendChild(node);
      }
    }

    let tools=document.getElementById('engineerAnalysisToolsGroup');
    if(!tools){
      tools=document.createElement('details');
      tools.id='engineerAnalysisToolsGroup';
      tools.innerHTML='<summary></summary><div class="v423-subnav"></div>';
      analysis.appendChild(tools);
    }
    const summary=tools.querySelector('summary');
    const summaryLabel=cs('Sledování a nástroje','Monitoring & tools');
    if(summary&&clean(summary.textContent)!==summaryLabel)summary.textContent=summaryLabel;
    const box=tools.querySelector('.v423-subnav');
    const secondary=/^(?:Analytické nástroje|Intelligence tools|Vyspělost technologií|Technology maturity|Matice pokrytí|Coverage matrix|Activity Feed|Aktivity|Leads\s*\/\s*Watchlist|Leady\s*\/\s*sledované položky)$/i;
    for(const node of [...analysis.children]){
      if(node===tools)continue;
      if(matches(node,secondary))box.appendChild(node);
    }
    for(const node of [...box.children]){
      for(const [re,labelCs,labelEn] of labelRules){
        if(!matches(node,re))continue;
        setLabel(node,labelCs,labelEn);
        break;
      }
    }
  }

  function dedupeSources(){
    const root=document.getElementById('engineerCompactNav');
    const evidence=root?.querySelector('#engineerMediaGroup .compact-subnav');
    const hidden=root?.querySelector('#engineerLegacyHidden');
    if(!evidence||!hidden)return;
    const canonical=document.getElementById('engineerV4Sources');
    if(canonical&&canonical.parentElement!==evidence)evidence.appendChild(canonical);
    const candidates=[...evidence.children].filter(node=>matches(node,/^(?:Zdroje|Sources)$/i));
    const keep=canonical&&evidence.contains(canonical)?canonical:candidates[0];
    for(const node of candidates){
      if(node===keep)continue;
      node.dataset.v423DuplicateSource='1';
      hidden.appendChild(node);
    }
    if(keep)setLabel(keep,'Zdroje','Sources');
  }

  function normalizeFooter(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar)return;
    for(const el of sidebar.querySelectorAll('*')){
      if(el.children.length)continue;
      const t=clean(el.textContent);
      if(t==='Canonical source'||t==='Kanonický zdroj'){
        const next=cs('Kanonický zdroj','Canonical source');
        if(t!==next)el.textContent=next;
      }
    }
  }

  function apply(){
    scheduled=false;
    injectStyle();
    normalizeAnalysis();
    dedupeSources();
    normalizeFooter();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(apply,0);
  }

  function install(){
    apply();
    const nav=document.getElementById('engineerCompactNav');
    const sidebar=document.getElementById('sidebar');
    if(nav)new MutationObserver(schedule).observe(nav,{childList:true,subtree:true,characterData:true});
    if(sidebar)new MutationObserver(schedule).observe(sidebar,{childList:true,subtree:true,characterData:true});
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
  document.addEventListener('engineer-language-changed',schedule);
  window.addEventListener('hashchange',schedule);
  window.ENGINEER_V423_NAV_CLEANUP={install,apply,normalizeAnalysis,dedupeSources};
})();
