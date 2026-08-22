(function(){
  if(typeof document==='undefined')return;
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  const overviewActive=()=>/^(Přehled|Overview)$/i.test((document.getElementById('pageTitle')?.textContent||'').trim());
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const removePatterns=[
    /^(REGISTR VIZUÁLŮ|VISUAL REGISTRY)\s+\d+$/i,
    /^(TECHNOLOGICKÉ SIGNÁLY|TECH SIGNALS|TECHNOLOGY SIGNALS)\s+\d+$/i
  ];
  const leadPatterns=/^(LEADY|LEAD|LEADS)$/i;
  function replaceExactText(root,re,value){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
    while((n=w.nextNode())){if(re.test(norm(n.nodeValue)))n.nodeValue=value;}
  }
  function cleanup(){
    if(!overviewActive())return;
    const v=document.getElementById('view');if(!v)return;
    const candidates=[...v.querySelectorAll('.card,article,section')].filter(x=>!x.closest('#engineerOverviewIntro'));
    for(const el of candidates){
      const t=norm(el.textContent);
      if(removePatterns.some(re=>re.test(t))){el.remove();continue;}
      if(/^((LEADY|LEAD|LEADS)\s+\d+)$/i.test(t))replaceExactText(el,leadPatterns,lang()==='cs'?'NOVÉ LEADY':'NEW LEADS');
    }
  }
  let queued=false;const queue=()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;cleanup();},0)};
  queue();setTimeout(queue,150);setTimeout(queue,700);
  document.addEventListener('engineer-language-changed',queue);
  const v=document.getElementById('view');if(v)new MutationObserver(queue).observe(v,{childList:true,subtree:true});
  window.ENGINEER_OVERVIEW_DELTA_CLEANUP={cleanup};
})();