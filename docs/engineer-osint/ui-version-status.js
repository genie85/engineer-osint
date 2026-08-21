(function(){
  const D=window.__ENGINEER_DATA__||{};
  const st=D.state_latest||{};
  const run=String(st.run_id||'').trim();
  const ver=(run.match(/-B(\d+)$/)||[])[1];
  const raw=st.window_to||st.completed_at||st.updated_at||null;
  const promptVer=st.master_prompt_version||st.master_prompt?.version||null;
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';

  function formatPrague(value,l=lang()){
    if(!value)return l==='cs'?'neuvedeno':'not specified';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return String(value);
    try{
      return new Intl.DateTimeFormat(l==='cs'?'cs-CZ':'en-GB',{
        timeZone:'Europe/Prague',day:'2-digit',month:'2-digit',year:'numeric',
        hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'short'
      }).format(d).replace(',', '');
    }catch{return String(value)}
  }

  function renderBadge(badge){
    const cs=lang()==='cs';
    badge.setAttribute('aria-label',cs?'Verze a poslední aktualizace ENGINEER OSINT':'ENGINEER OSINT version and last update');
    badge.innerHTML=`<span class="evs-label">${cs?'Verze dat':'Data version'}</span><strong>${ver?'B'+ver:(run||'—')}</strong><span class="evs-sep">·</span><span class="evs-label">${cs?'Aktualizováno':'Updated'}</span><strong>${formatPrague(raw,cs?'cs':'en')}</strong>`;
    badge.title=`${cs?'Kanonický běh':'Canonical run'}: ${run||(cs?'neuveden':'not specified')}${promptVer?`\n${cs?'Hlavní prompt':'Master prompt'}: v${promptVer}`:''}`;
  }

  function install(){
    let badge=document.getElementById('engineerVersionStatus');
    if(!badge){
      badge=document.createElement('div');
      badge.id='engineerVersionStatus';
      badge.setAttribute('role','status');
      const candidates=[
        document.querySelector('header'),
        document.querySelector('.topbar'),
        document.querySelector('.header'),
        document.querySelector('.page-header'),
        document.querySelector('main h1')?.parentElement,
        document.querySelector('.main'),
        document.querySelector('main'),
        document.body
      ].filter(Boolean);
      const host=candidates[0]||document.body;
      host.appendChild(badge);
    }
    renderBadge(badge);
  }

  const css=document.createElement('style');
  css.id='engineer-version-status-style';
  css.textContent=`
#engineerVersionStatus{display:flex;align-items:center;gap:6px;flex-wrap:wrap;width:max-content;max-width:100%;margin:8px 12px 8px auto;padding:7px 10px;border:1px solid rgba(120,155,190,.28);border-radius:999px;background:rgba(8,20,34,.78);color:#dce8f3;font-size:12px;line-height:1.25;box-shadow:0 2px 12px rgba(0,0,0,.12);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#engineerVersionStatus .evs-label{color:#8fa6bb;font-weight:500}#engineerVersionStatus strong{font-weight:700;color:#f3f8fc}#engineerVersionStatus .evs-sep{color:#60788e;margin:0 1px}
@media(max-width:700px){#engineerVersionStatus{margin:8px 10px;padding:6px 9px;font-size:11px;border-radius:10px;width:auto}.evs-sep{display:none}#engineerVersionStatus .evs-label:nth-of-type(2){margin-left:4px}}
`;
  if(!document.getElementById(css.id))document.head.appendChild(css);
  document.addEventListener('engineer-language-changed',()=>{const badge=document.getElementById('engineerVersionStatus');if(badge)renderBadge(badge)});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();