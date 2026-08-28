(function(){
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const cs=(a,b)=>lang()==='cs'?a:b;
  let scheduled=false;

  function injectStyle(){
    if(document.getElementById('engineer-v422-visual-polish-style'))return;
    const s=document.createElement('style');
    s.id='engineer-v422-visual-polish-style';
    s.textContent=`
#view .v4-card button,#view .v4-actions button,#view [data-v42-situation-hub] button{appearance:none;-webkit-appearance:none;border:1px solid rgba(126,170,211,.34);border-radius:8px;background:rgba(29,62,94,.58);color:#e9f2f9;font:inherit;font-size:.82rem;font-weight:650;line-height:1.2;padding:7px 10px;cursor:pointer;box-shadow:none}
#view .v4-card button:hover,#view .v4-actions button:hover,#view [data-v42-situation-hub] button:hover,#view .v4-card button:focus-visible,#view .v4-actions button:focus-visible,#view [data-v42-situation-hub] button:focus-visible{background:rgba(54,96,137,.72);border-color:rgba(143,185,232,.58);outline:none}
#sidebar nav{scrollbar-width:none}
#sidebar nav::-webkit-scrollbar{width:0;height:0}
#engineerVersionStatus{box-sizing:border-box}
@media(min-width:901px){#engineerVersionStatus{margin-right:128px!important;max-width:calc(100% - 150px)!important}}
@media(max-width:900px){#engineerVersionStatus{max-width:100%!important}}
#engineerOverviewIntro~[data-v422-legacy-overview-hidden="1"]{display:none!important}
`;
    document.head.appendChild(s);
  }

  function normalizeNav(){
    const root=document.getElementById('engineerCompactNav');
    if(!root)return;
    const analysis=root.querySelector('#engineerAnalysisGroup .compact-subnav');
    const evidence=root.querySelector('#engineerMediaGroup .compact-subnav');
    const hidden=root.querySelector('#engineerLegacyHidden');

    const mappings=[
      [/^Activity Feed$/i,'Aktivity','Activity Feed'],
      [/^(?:Leads\s*\/\s*Watchlist|Watchlist\s*\/\s*Leads)$/i,'Leady / sledované položky','Leads / Watchlist'],
      [/^Intelligence Gaps$/i,'Informační mezery','Intelligence Gaps']
    ];
    for(const b of analysis?.querySelectorAll('button')||[]){
      const probe=[b.textContent,b.dataset.labelCs,b.dataset.labelEn].filter(Boolean).join(' | ');
      for(const [re,labelCs,labelEn] of mappings){
        if(!re.test(probe))continue;
        b.dataset.labelCs=labelCs;
        b.dataset.labelEn=labelEn;
        b.textContent=cs(labelCs,labelEn);
        break;
      }
    }

    const canonicalSources=document.getElementById('engineerV4Sources');
    if(canonicalSources&&evidence&&hidden){
      for(const b of [...evidence.querySelectorAll(':scope>button')]){
        if(b===canonicalSources)continue;
        const probe=[b.textContent,b.dataset.labelCs,b.dataset.labelEn].filter(Boolean).join(' | ');
        if(/(?:^|\|\s*)(?:Zdroje|Sources)(?:\s*\||$)/i.test(probe)){
          b.dataset.v422DuplicateSource='1';
          hidden.appendChild(b);
        }
      }
    }
  }

  function localizeVisibleUi(){
    const sidebar=document.getElementById('sidebar');
    if(sidebar){
      for(const el of sidebar.querySelectorAll('*')){
        if(el.children.length)continue;
        const t=(el.textContent||'').trim();
        if(t==='Canonical source'||t==='Kanonický zdroj'){
          el.textContent=cs('Kanonický zdroj','Canonical source');
          el.dataset.v422FooterLabel='1';
        }
      }
    }

    const overview=document.getElementById('engineerOverviewIntro');
    if(overview){
      for(const h of overview.querySelectorAll('.v4-section>h2')){
        const t=(h.textContent||'').trim();
        if(/^(?:Intelligence gaps|Informační mezery)$/i.test(t))h.textContent=cs('Informační mezery','Intelligence gaps');
      }
      for(const label of overview.querySelectorAll('.v4-label')){
        const t=(label.textContent||'').trim();
        if(t==='OPEN GAP'||t==='OTEVŘENÁ MEZERA')label.textContent=cs('OTEVŘENÁ MEZERA','OPEN GAP');
        if(t==='CONTRADICTION'||t==='ROZPOR')label.textContent=cs('ROZPOR','CONTRADICTION');
      }
    }
  }

  function syncLegacyOverview(){
    const view=document.getElementById('view');
    if(!view)return;
    const title=(document.getElementById('pageTitle')?.textContent||'').trim();
    const overview=document.getElementById('engineerOverviewIntro');
    const isOverview=!!overview&&/^(?:Přehled|Overview)$/i.test(title);
    for(const child of [...view.children]){
      if(child===overview)continue;
      if(isOverview){
        if(child.dataset.v422LegacyOverviewHidden!=='1')child.dataset.v422WasHidden=child.hidden?'1':'0';
        child.dataset.v422LegacyOverviewHidden='1';
        child.hidden=true;
        child.setAttribute('aria-hidden','true');
      }else if(child.dataset.v422LegacyOverviewHidden==='1'){
        child.hidden=child.dataset.v422WasHidden==='1';
        if(!child.hidden)child.removeAttribute('aria-hidden');
        delete child.dataset.v422LegacyOverviewHidden;
        delete child.dataset.v422WasHidden;
      }
    }
  }

  function apply(){
    scheduled=false;
    injectStyle();
    normalizeNav();
    localizeVisibleUi();
    syncLegacyOverview();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(apply,0);
  }

  function install(){
    apply();
    const view=document.getElementById('view');
    const nav=document.getElementById('engineerCompactNav');
    const pageTitle=document.getElementById('pageTitle');
    if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:false});
    if(nav)new MutationObserver(schedule).observe(nav,{childList:true,subtree:true});
    if(pageTitle)new MutationObserver(schedule).observe(pageTitle,{childList:true,subtree:true,characterData:true});
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
  document.addEventListener('engineer-language-changed',schedule);
  window.addEventListener('hashchange',schedule);
  window.ENGINEER_V422_VISUAL_POLISH={install,apply,normalizeNav,syncLegacyOverview};
})();
