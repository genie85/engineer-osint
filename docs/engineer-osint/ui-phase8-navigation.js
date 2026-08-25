(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const nav=document.querySelector('#sidebar nav'); if(!nav)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  const records=()=>D.records?.records||[];
  const pick=(r,key)=>{const l=lang();return(l==='cs'?(r?.[key+'_cs']??r?.[key]??r?.[key+'_en']):(r?.[key+'_en']??r?.__orig?.[key]??r?.[key]??r?.[key+'_cs']))||''};
  const title=r=>pick(r,'title')||r.id, summary=r=>pick(r,'summary')||pick(r,'description');
  const view=()=>document.getElementById('view');
  const setTitle=t=>{const p=document.getElementById('pageTitle');if(p)p.textContent=t};
  const close=()=>document.getElementById('sidebar')?.classList.remove('open');
  const closeGroups=except=>document.querySelectorAll('#engineerCompactNav>details').forEach(d=>{if(d!==except)d.open=false});
  const activate=b=>{document.querySelectorAll('#sidebar nav button,#sidebar nav a').forEach(x=>x.classList.remove('active'));b?.classList.add('active');close()};
  const open=id=>{if(typeof window.openDetail==='function')return window.openDetail(id);const r=records().find(x=>x.id===id),v=view();if(!r||!v)return;v.innerHTML='<section class="card section"><div class="mono">'+esc(r.id)+'</div><h2>'+esc(title(r))+'</h2><p>'+esc(summary(r)||'—')+'</p></section>'};
  const card=r=>'<article class="item" data-open="'+esc(r.id)+'" style="cursor:pointer"><div class="mono muted">'+esc(r.id)+' · '+esc(r.country||'')+'</div><strong>'+esc(title(r))+'</strong>'+(lang()==='cs'&&!r.title_cs&&!r.summary_cs?'<span class="translation-fallback-badge" style="font-size:8px;color:#e7ca84;margin-left:5px"> CHYBÍ ČEŠTINA · ZOBRAZENA ANGLIČTINA</span>':'')+(summary(r)?'<p>'+esc(summary(r))+'</p>':'')+'</article>';
  const wire=root=>root.querySelectorAll('[data-open]').forEach(e=>e.onclick=()=>open(e.dataset.open));

  /* The legacy global filter panel belongs to Overview only. Custom pages render their
     own scoped controls, so leaving the global panel visible there is misleading. */
  const globalFilterPanel=()=>{
    const input=document.getElementById('searchInput');
    return input?.closest('.card')||input?.parentElement||null;
  };
  const isOverviewTitle=()=>/^\s*(Přehled|Overview)\s*$/i.test(document.getElementById('pageTitle')?.textContent||'');
  const syncGlobalFilterVisibility=()=>{
    const panel=globalFilterPanel(); if(!panel)return;
    const show=isOverviewTitle();
    panel.hidden=!show;
    panel.style.display=show?'':'none';
    panel.setAttribute('aria-hidden',show?'false':'true');
  };

  function listPage(button,cs,en,pred){activate(button);const v=view();if(!v)return;const xs=records().filter(pred);setTitle(lang()==='cs'?cs:en);v.dataset.i18nManaged='1';v.innerHTML='<section class="card section" data-i18n-managed="1"><div class="entity-page-head"><div><h2>'+esc(lang()==='cs'?cs:en)+'</h2><div class="muted">'+xs.length+' '+(lang()==='cs'?'záznamů':'records')+'</div></div><input id="engineerEntityFilter" placeholder="'+esc(lang()==='cs'?'Hledat název nebo ENG-* ID':'Search title or ENG-* ID')+'"></div><div id="engineerEntityList">'+xs.map(card).join('')+'</div></section>';wire(v);const input=document.getElementById('engineerEntityFilter');if(input)input.oninput=()=>{const q=input.value.trim().toLowerCase();document.querySelectorAll('#engineerEntityList [data-open]').forEach(el=>el.style.display=!q||el.textContent.toLowerCase().includes(q)?'block':'none')};}

  const legacy=[...nav.children];
  const legacyOverview=legacy.find(x=>/^\s*(Přehled|Overview)\s*$/i.test(x.textContent||''));
  const defs=[
    ['Jednotky','Units',r=>/^ENG-UNIT-/.test(r.id||'')],['Technika','Technology',r=>/^ENG-TECH-/.test(r.id||'')],['Signály','Signals',r=>/^ENG-SIG-/.test(r.id||'')],['Události','Events',r=>/^ENG-EVT-/.test(r.id||'')],['Doktrína','Doctrine',r=>/^ENG-DOC-/.test(r.id||'')],['TTP','TTP',r=>/^ENG-TTP-/.test(r.id||'')]
  ];
  const root=document.createElement('div');root.id='engineerCompactNav';root.innerHTML=
    '<button id="engineerOverviewBtn" type="button"></button>'+
    '<details id="engineerDatabaseGroup"><summary></summary><div class="compact-subnav"></div></details>'+
    '<details id="engineerAnalysisGroup"><summary></summary><div class="compact-subnav"></div></details>'+
    '<details id="engineerMediaGroup"><summary></summary><div class="compact-subnav"></div></details>'+
    '<details id="engineerOsintGroup"><summary></summary><div class="compact-subnav"></div></details>'+
    '<details id="engineerMoreGroup"><summary></summary><div class="compact-subnav"></div></details>'+
    '<div id="engineerLegacyHidden" hidden></div>';
  nav.prepend(root);
  const db=root.querySelector('#engineerDatabaseGroup .compact-subnav');
  const analysis=root.querySelector('#engineerAnalysisGroup .compact-subnav');
  const media=root.querySelector('#engineerMediaGroup .compact-subnav');
  const osint=root.querySelector('#engineerOsintGroup .compact-subnav');
  const more=root.querySelector('#engineerMoreGroup .compact-subnav');
  const hidden=root.querySelector('#engineerLegacyHidden');

  const labels=()=>{
    root.querySelector('#engineerOverviewBtn').textContent=lang()==='cs'?'Přehled':'Overview';
    root.querySelector('#engineerDatabaseGroup summary').textContent=lang()==='cs'?'Databáze':'Database';
    root.querySelector('#engineerAnalysisGroup summary').textContent=lang()==='cs'?'Analýzy':'Analysis';
    root.querySelector('#engineerMediaGroup summary').textContent=lang()==='cs'?'Média':'Media';
    root.querySelector('#engineerOsintGroup summary').textContent='OSINT';
    root.querySelector('#engineerMoreGroup summary').textContent=lang()==='cs'?'Více':'More';
  };

  defs.forEach(([cs,en,pred])=>{const b=document.createElement('button');b.type='button';b.dataset.labelCs=cs;b.dataset.labelEn=en;b.textContent=lang()==='cs'?cs:en;b.onclick=()=>listPage(b,cs,en,pred);db.appendChild(b)});
  const all=document.createElement('button');all.type='button';all.dataset.labelCs='Všechny entity';all.dataset.labelEn='All entities';all.textContent=lang()==='cs'?all.dataset.labelCs:all.dataset.labelEn;all.onclick=()=>listPage(all,'Všechny entity','All entities',()=>true);db.appendChild(all);

  const timeline=document.createElement('button');timeline.type='button';timeline.dataset.labelCs='Časová osa';timeline.dataset.labelEn='Timeline';timeline.textContent=lang()==='cs'?timeline.dataset.labelCs:timeline.dataset.labelEn;timeline.onclick=e=>{activate(e.currentTarget);const v=view(),rows=[];for(const r of records())for(const o of(r.temporal_observations||r.timeline_events||[]))rows.push({r,o,date:o.event_date||o.event_date_from||o.date||(lang()==='cs'?'DATUM NEZNÁMÉ':'DATE UNKNOWN')});rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));setTitle(lang()==='cs'?'Časová osa':'Timeline');v.innerHTML='<section class="card section"><h2>'+esc(lang()==='cs'?'Časová osa vývoje':'Development timeline')+'</h2>'+rows.slice(0,250).map(x=>'<article class="item" data-open="'+esc(x.r.id)+'"><b>'+esc(x.date)+'</b> · '+esc(x.r.id)+' — '+esc(title(x.r))+'</article>').join('')+'</section>';wire(v)};analysis.appendChild(timeline);

  const audit=document.createElement('button');audit.type='button';audit.dataset.labelCs='Překlady / kontrola';audit.dataset.labelEn='Translations / audit';audit.textContent=lang()==='cs'?audit.dataset.labelCs:audit.dataset.labelEn;audit.onclick=()=>{activate(audit);const v=view(),xs=records(),full=xs.filter(r=>r.title_cs&&r.summary_cs).length,missing=xs.filter(r=>!r.title_cs&&!r.summary_cs);setTitle(lang()==='cs'?'Překlady / kontrola':'Translations / audit');v.innerHTML='<section class="card section"><h2>'+esc(lang()==='cs'?'Stav českých překladů':'Czech translation coverage')+'</h2><div class="item"><b>'+full+'</b> '+(lang()==='cs'?'plně česky':'fully CZ')+' · <b>'+missing.length+'</b> '+(lang()==='cs'?'bez české vrstvy':'without CZ layer')+'</div>'+['ENG-SIG-0006','ENG-UNIT-0019','ENG-UNIT-0011'].map(id=>xs.find(r=>r.id===id)).filter(Boolean).map(card).join('')+'</section>';wire(v)};more.appendChild(audit);

  function bucket(node){
    const t=(node.textContent||'').replace(/\s+/g,' ').trim();
    if(!t)return hidden;
    if(node===legacyOverview||/^Přehled$|^Overview$/i.test(t)||/^Technologie$|^Technology$|^Doktrína$|^Doctrine$/i.test(t))return hidden;
    if(/Vizuální OSINT|Visual OSINT|Galerie vizuálních|Visual evidence|Média \/ sledovat|Media \/ watch|poslouchat|listen/i.test(t))return media;
    if(/Activity Feed|Historie běhů|Run history|\bBěhy\b|\bRuns\b|Zdroje|Sources|Kvalita dat|Data quality|Watchlist|Leads/i.test(t))return osint;
    if(/Země|Countries|Schopnosti|Capabilities|Sledování trendů|Trend Watch|EOD\s*\/\s*C-IED|Czech Republic|Česká republika|Austrálie|Australia/i.test(t))return analysis;
    if(/Technologická vyspělost|Technology maturity|Matice OSINT pokrytí|Coverage matrix|Backlog obohacení|Enrichment backlog/i.test(t))return more;
    return more;
  }
  legacy.forEach(node=>bucket(node).appendChild(node));
  [analysis,media,osint,more].forEach(box=>{const seen=new Set();[...box.children].forEach(node=>{if(node===audit)return;const key=(node.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(!key)return;if(seen.has(key)){hidden.appendChild(node)}else seen.add(key)})});

  root.querySelector('#engineerOverviewBtn').onclick=()=>{closeGroups(null);if(legacyOverview)legacyOverview.click();else close();setTimeout(syncGlobalFilterVisibility,0)};
  root.querySelectorAll(':scope>details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)closeGroups(d)}));

  /* Phase 9 is loaded after this module and adds "Analytické nástroje" to More.
     Move that hub into Analysis automatically so the information architecture stays compact. */
  const moveIntelHub=()=>{[...more.querySelectorAll(':scope>button')].forEach(b=>{if(/Analytické nástroje|Intelligence tools/i.test((b.textContent||'')+' '+(b.dataset.labelCs||'')+' '+(b.dataset.labelEn||'')))analysis.appendChild(b)})};
  new MutationObserver(moveIntelHub).observe(more,{childList:true,subtree:false});

  /* rich-topic-australia-nato-eod installs on DOMContentLoaded, after this compact
     navigation has already collected legacy buttons. Catch that late button and keep
     it inside Analysis instead of leaving a browser-default standalone button. */
  const moveLateTopicButtons=()=>{
    const australia=document.getElementById('engineerAustraliaEodTopicBtn');
    if(australia&&australia.parentElement!==analysis)analysis.appendChild(australia);
  };
  new MutationObserver(moveLateTopicButtons).observe(nav,{childList:true,subtree:false});

  const pageTitle=document.getElementById('pageTitle');
  if(pageTitle)new MutationObserver(syncGlobalFilterVisibility).observe(pageTitle,{childList:true,subtree:true,characterData:true});

  labels();
  moveLateTopicButtons();
  syncGlobalFilterVisibility();
  setTimeout(()=>{moveLateTopicButtons();syncGlobalFilterVisibility()},0);
  document.addEventListener('engineer-language-changed',()=>{labels();root.querySelectorAll('[data-label-cs]').forEach(b=>b.textContent=lang()==='cs'?b.dataset.labelCs:b.dataset.labelEn);moveIntelHub();moveLateTopicButtons();syncGlobalFilterVisibility()});
  window.ENGINEER_ENTITY_NAV={open,listPage,syncGlobalFilterVisibility};
})();
