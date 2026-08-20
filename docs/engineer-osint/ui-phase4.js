(function(){
const D=window.__ENGINEER_DATA__;if(!D)return;
const R=D.records?.records||[],S=new Map((D.sources?.sources||[]).map(x=>[x.id,x])),V=D.visual_registry?.visuals||[];
const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs',cs=(a,b)=>lang()==='cs'?a:b;
const pick=(r,k)=>window.ENGINEER_I18N?.pick?.(r,k)??r?.[k]??'';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const classCs={FACT:'FAKT',INFERENCE:'ODVOZENÝ ZÁVĚR',ASSESSMENT:'HODNOCENÍ',CLAIM:'TVRZENÍ',CONFIRMATION:'POTVRZENÍ',CONTRADICTION:'ROZPOR',CORRECTION:'OPRAVA'};
const stageCs={CONCEPT:'KONCEPT',R_AND_D:'VÝZKUM A VÝVOJ',PROTOTYPE:'PROTOTYP',MILITARY_TESTING:'VOJENSKÉ ZKOUŠKY',LIMITED_FIELDING:'OMEZENÉ ZAVEDENÍ',OPERATIONAL:'OPERAČNÍ',WIDESPREAD:'ROZŠÍŘENÉ ZAVEDENÍ',UNKNOWN:'NEZNÁMÉ'};
const enumLabel=(v,map)=>lang()==='cs'?(map[String(v||'').toUpperCase()]||v):v;
function detail(){
  const d=document.getElementById('detailContent');if(!d||d.querySelector('.claim-source-map'))return;
  const id=(d.textContent||'').match(/ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG)-\d+/)?.[0],r=R.find(x=>x.id===id);if(!r)return;
  const claims=Array.isArray(r.claims)?r.claims:[];
  let h='<section class="claim-source-map card section"><h4>'+cs('MAPA TVRZENÍ / ZDROJŮ','CLAIM / SOURCE MAP')+'</h4>';
  if(claims.length)h+=claims.map(c=>'<div class="item"><b>'+esc(enumLabel(c.classification||'CLAIM',classCs))+'</b> '+esc((lang()==='cs'?(c.text_cs||c.text||c.text_en):(c.text_en||c.text||c.text_cs))||'')+'<div class="muted">'+(c.source_ids||[]).map(sid=>{const s=S.get(sid);return s?.url?'<a href="'+esc(s.url)+'" target="_blank">'+esc(sid)+'</a>':esc(sid)}).join(', ')+'</div></div>').join('');
  else h+='<div class="muted">'+cs('Pouze úroveň karty · jednotlivá tvrzení nejsou mapována na konkrétní zdroje.','CARD-LEVEL only · individual claims are not mapped to specific sources.')+'</div>';
  const related=(r.related_visuals||r.visual_ids||[]).map(id=>V.find(v=>(v.id||v.asset_id)===id)).filter(Boolean);
  if(related.length>1)h+='<h4>'+cs('POROVNAT SOUVISEJÍCÍ VIZUÁLY','COMPARE RELATED VISUALS')+'</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+related.slice(0,4).map(v=>'<div class="item"><b>'+esc(v.id||v.asset_id)+'</b><div class="muted">'+esc(lang()==='cs'?(v.title_cs||v.title||v.title_en||''):(v.title_en||v.title||v.title_cs||''))+'</div></div>').join('')+'</div>';
  if(r.type==='ENG-TECH'||r.type==='ENG-SIG')h+='<h4>'+cs('HISTORIE VYSPĚLOSTI','MATURITY HISTORY')+'</h4><div class="muted">'+esc(enumLabel(r.stage||r.maturity||'UNKNOWN',stageCs))+' — '+cs('pouze explicitní aktuální bod; mezistupně se nedomýšlejí.','explicit current point only; intermediate stages are not inferred.')+'</div>';
  h+='</section>';d.insertAdjacentHTML('beforeend',h)
}
new MutationObserver(detail).observe(document.getElementById('detailContent')||document.body,{childList:true,subtree:true});
const view=document.getElementById('view');if(view)new MutationObserver(()=>{view.querySelectorAll('.coverage-click:not([data-drill-ready])').forEach(e=>{e.dataset.drillReady='1';e.onclick=()=>{const co=e.dataset.country,ca=e.dataset.cap,m=R.filter(r=>r.country===co&&(r.capability||r.type||'Other')===ca);view.insertAdjacentHTML('beforeend','<section class="card section"><h2>'+esc(co)+' × '+esc(ca)+'</h2><p class="muted">'+cs('Podrobný rozpad OSINT pokrytí; nejde o hodnocení schopnosti.','OSINT coverage drill-down; not a capability assessment.')+'</p>'+m.map(r=>'<div class="item" data-open="'+esc(r.id)+'">'+esc(r.id)+' — '+esc(pick(r,'title')||r.id)+'</div>').join('')+'</section>');if(typeof window.openDetail==='function')view.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>window.openDetail(x.dataset.open))}})}, {childList:true,subtree:true});
})();
