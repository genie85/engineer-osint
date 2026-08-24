(function(){
  if(typeof document==='undefined')return;
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  const overviewActive=()=>/^(Přehled|Overview)$/i.test((document.getElementById('pageTitle')?.textContent||'').trim());
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const removePatterns=[
    /^(REGISTR VIZUÁLŮ|VISUAL REGISTRY)\s+\d+$/i,
    /^(TECHNOLOGICKÉ SIGNÁLY|TECH SIGNALS|TECHNOLOGY SIGNALS)\s+\d+$/i
  ];
  const enrichmentHeading=/^(DALŠÍ OBOHACENÍ|DALŠÍ ENRICHMENT|FURTHER ENRICHMENT|ADDITIONAL ENRICHMENT|NEXT ENRICHMENT)$/i;
  const leadPatterns=/^(LEADY|LEAD|LEADS)$/i;
  function replaceExactText(root,re,value){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while((n=w.nextNode())){if(re.test(norm(n.nodeValue)))n.nodeValue=value;}
  }
  function isInternalEnrichmentCard(el){
    const heading=[...el.children].find(child=>/^H[1-6]$/.test(child.tagName));
    return Boolean(heading&&enrichmentHeading.test(norm(heading.textContent)));
  }
  function closeInfoPopovers(except){
    document.querySelectorAll('#engineerOverviewIntro .overview-info-popover:not([hidden])').forEach(pop=>{
      if(pop===except)return;
      pop.hidden=true;
      pop.closest('.overview-stat')?.querySelector('.overview-info')?.setAttribute('aria-expanded','false');
    });
  }
  function bindInfoButtons(){
    document.querySelectorAll('#engineerOverviewIntro .overview-info').forEach((button,index)=>{
      if(button.dataset.overviewInfoBound==='1')return;
      const card=button.closest('.overview-stat');
      if(!card)return;
      const fallback=norm(card.querySelector('.overview-stat-help')?.textContent);
      const text=norm(button.getAttribute('title'))||fallback;
      if(!text)return;
      let pop=card.querySelector('.overview-info-popover');
      if(!pop){
        pop=document.createElement('div');
        pop.className='overview-info-popover';
        pop.id='overviewInfoPopover'+index;
        pop.setAttribute('role','tooltip');
        pop.hidden=true;
        card.appendChild(pop);
      }
      pop.textContent=text;
      button.dataset.overviewInfoBound='1';
      button.setAttribute('aria-controls',pop.id);
      button.setAttribute('aria-expanded','false');
      button.removeAttribute('title');
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const opening=pop.hidden;
        closeInfoPopovers(pop);
        pop.hidden=!opening;
        button.setAttribute('aria-expanded',opening?'true':'false');
      });
    });
  }
  function cleanup(){
    if(!overviewActive())return;
    const v=document.getElementById('view');if(!v)return;
    const candidates=[...v.querySelectorAll('.card,article,section')].filter(x=>!x.closest('#engineerOverviewIntro'));
    for(const el of candidates){
      const t=norm(el.textContent);
      if(isInternalEnrichmentCard(el)||removePatterns.some(re=>re.test(t))){el.remove();continue;}
      if(/^((LEADY|LEAD|LEADS)\s+\d+)$/i.test(t))replaceExactText(el,leadPatterns,lang()==='cs'?'NOVÉ LEADY':'NEW LEADS');
    }
    bindInfoButtons();
  }
  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    if(event.target.closest('#engineerOverviewIntro .overview-info,#engineerOverviewIntro .overview-info-popover'))return;
    closeInfoPopovers();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeInfoPopovers();});
  let queued=false;const queue=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;cleanup();},0)};
  queue();setTimeout(queue,150);setTimeout(queue,700);
  document.addEventListener('engineer-language-changed',()=>{closeInfoPopovers();queue();});
  const v=document.getElementById('view');if(v)new MutationObserver(queue).observe(v,{childList:true,subtree:true});
  window.ENGINEER_OVERVIEW_DELTA_CLEANUP={cleanup,bindInfoButtons,closeInfoPopovers,isInternalEnrichmentCard};
})();