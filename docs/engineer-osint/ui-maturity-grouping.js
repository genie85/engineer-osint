(function(){
  if(typeof document==='undefined')return;
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const labels={
    cs:{intro:'Zobrazený stupeň vychází pouze z doložených údajů. Pokud jej zdroje neurčují jednoznačně, uvádíme stav jako neznámý nebo rozporný.',development:'VÝVOJ',fielding:'ZAVEDENÍ',other:'OSTATNÍ STAVY',experimental:'EXPERIMENTÁLNÍ PŘECHOD',discrepancy:'ROZPOR ZDROJŮ',unknown:'NEZNÁMÉ'},
    en:{intro:'The displayed maturity stage is based only on documented data. If sources do not determine it unambiguously, the status is shown as unknown or conflicting.',development:'DEVELOPMENT',fielding:'FIELDING',other:'OTHER STATES',experimental:'EXPERIMENTAL TRANSITION',discrepancy:'SOURCE DISCREPANCY',unknown:'UNKNOWN'}
  };
  const groups=[
    {key:'development',stages:['CONCEPT','R_AND_D','PROTOTYPE','MILITARY_TESTING']},
    {key:'fielding',stages:['LIMITED_FIELDING','OPERATIONAL','WIDESPREAD']},
    {key:'other',stages:['DEMONSTRATED_EXPERIMENTAL_TRANSITION','STATUS_DISCREPANCY_EDA_IN_PREPARATION_VS_RMA_ACTIVE','UNKNOWN']}
  ];
  const stageAliases={
    CONCEPT:['KONCEPT','CONCEPT'],R_AND_D:['VÝZKUM A VÝVOJ','R_AND_D','R & D'],PROTOTYPE:['PROTOTYP','PROTOTYPE'],MILITARY_TESTING:['VOJENSKÉ ZKOUŠKY','MILITARY_TESTING','MILITARY TESTING'],LIMITED_FIELDING:['OMEZENÉ ZAVEDENÍ','LIMITED_FIELDING','LIMITED FIELDING'],OPERATIONAL:['OPERAČNÍ','OPERATIONAL'],WIDESPREAD:['ROZŠÍŘENÉ ZAVEDENÍ','WIDESPREAD'],DEMONSTRATED_EXPERIMENTAL_TRANSITION:['DEMONSTROVANÝ EXPERIMENTÁLNÍ PŘECHOD','DEMONSTRATED_EXPERIMENTAL_TRANSITION','DEMONSTRATED EXPERIMENTAL TRANSITION'],STATUS_DISCREPANCY_EDA_IN_PREPARATION_VS_RMA_ACTIVE:['ROZPOR STAVU: EDA „V PŘÍPRAVĚ“ VS. RMA „AKTIVNÍ“','STATUS_DISCREPANCY_EDA_IN_PREPARATION_VS_RMA_ACTIVE'],UNKNOWN:['NEZNÁMÉ','UNKNOWN']
  };
  function stageKey(el){const t=norm(el.querySelector('strong')?.textContent).toUpperCase();return Object.keys(stageAliases).find(k=>stageAliases[k].some(a=>t===a.toUpperCase()))||null}
  function apply(){
    const title=norm(document.getElementById('pageTitle')?.textContent);if(!/^(Vyspělost technologií|Technology Maturity)$/i.test(title))return;
    const section=document.querySelector('#view section.card');if(!section||section.dataset.maturityGrouped==='1')return;
    const items=[...section.children].filter(x=>x.classList?.contains('item')).map(el=>({el,key:stageKey(el)})).filter(x=>x.key);
    if(items.length<7)return;
    const p=section.querySelector('p.muted');if(p)p.textContent=labels[lang()].intro;
    const byKey=new Map(items.map(x=>[x.key,x.el]));
    const frag=document.createDocumentFragment();
    for(const g of groups){const wrap=document.createElement('section');wrap.className='maturity-group';const h=document.createElement('h3');h.className='maturity-group-title';h.textContent=labels[lang()][g.key];wrap.appendChild(h);const grid=document.createElement('div');grid.className='maturity-stage-grid';for(const key of g.stages){const el=byKey.get(key);if(!el)continue;el.classList.add('maturity-stage');if(key==='DEMONSTRATED_EXPERIMENTAL_TRANSITION')el.querySelector('strong').textContent=labels[lang()].experimental;if(key==='STATUS_DISCREPANCY_EDA_IN_PREPARATION_VS_RMA_ACTIVE')el.querySelector('strong').textContent=labels[lang()].discrepancy;if(key==='UNKNOWN')el.querySelector('strong').textContent=labels[lang()].unknown;grid.appendChild(el)}wrap.appendChild(grid);frag.appendChild(wrap)}
    section.appendChild(frag);section.dataset.maturityGrouped='1';
  }
  let queued=false;const queue=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;apply()},0)};
  queue();document.addEventListener('click',queue);document.addEventListener('engineer-language-changed',()=>setTimeout(()=>{const s=document.querySelector('#view section.card[data-maturity-grouped]');if(s)s.dataset.maturityGrouped='0';queue()},0));
  const v=document.getElementById('view');if(v)new MutationObserver(queue).observe(v,{childList:true,subtree:true});
})();
