(function(){
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const cs=(a,b)=>lang()==='cs'?a:b;

  function injectStyle(){
    if(document.getElementById('engineer-v421-cleanup-style'))return;
    const s=document.createElement('style');
    s.id='engineer-v421-cleanup-style';
    s.textContent=`
#engineerCompactNav{display:grid;width:100%;gap:4px}
#engineerCompactNav>button,#engineerCompactNav>details{width:100%;margin:0}
#engineerCompactNav button{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:100%;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;line-height:1.25;padding:8px 10px;cursor:pointer;white-space:normal;overflow-wrap:anywhere}
#engineerCompactNav button:hover,#engineerCompactNav button:focus-visible{background:rgba(120,160,200,.10);border-color:rgba(120,160,200,.18);outline:none}
#engineerCompactNav button.active{background:rgba(91,145,205,.18);border-color:rgba(120,170,220,.30);color:#f3f8fc}
#engineerCompactNav details{border:0;background:transparent}
#engineerCompactNav details>summary{box-sizing:border-box;width:100%;padding:8px 10px;border-radius:8px;cursor:pointer;font-weight:650;list-style:none;display:flex;align-items:center;gap:7px;color:inherit}
#engineerCompactNav details>summary::-webkit-details-marker{display:none}
#engineerCompactNav details>summary::before{content:'▸';display:inline-block;width:10px;flex:0 0 10px;opacity:.8;transform-origin:center;transition:transform .12s ease}
#engineerCompactNav details[open]>summary::before{transform:rotate(90deg)}
#engineerCompactNav details>summary:hover,#engineerCompactNav details>summary:focus-visible{background:rgba(120,160,200,.08);outline:none}
#engineerCompactNav .compact-subnav{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:2px!important;width:100%!important;padding:2px 0 5px 17px!important;box-sizing:border-box!important}
#engineerCompactNav .compact-subnav>*{display:block!important;width:100%!important;max-width:100%!important;margin:0!important;box-sizing:border-box!important}
#engineerCompactNav .compact-subnav button{padding:7px 10px;font-size:.94em;color:#cbd8e6}
#sidebar nav{overflow-x:hidden}
#sidebar #engineerMenuClose{appearance:none!important;-webkit-appearance:none!important;border:1px solid rgba(120,160,200,.28)!important;border-radius:10px!important;background:rgba(10,23,36,.92)!important;color:#eaf2f8!important;display:grid!important;place-items:center!important;line-height:1!important;padding:0!important;cursor:pointer!important}
#sidebar #engineerMenuClose:hover,#sidebar #engineerMenuClose:focus-visible{background:rgba(120,160,200,.14)!important;outline:none!important}
[data-v42-situation-hub] .v42-head h2{display:none!important}
[data-v42-situation-hub] .v42-head{min-width:0}
[data-v42-situation-hub] .v42-head>div{min-width:0}
[data-v42-situation-hub] .v42-head .v4-run{display:flex;flex:1 1 420px;justify-content:flex-end;min-width:0;max-width:100%}
[data-v42-situation-hub] .v4-pill{max-width:100%;white-space:normal;overflow-wrap:anywhere}
[data-v42-situation-hub] .v4-kpis{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))!important}
[data-v42-situation-hub] .v4-card,[data-v42-situation-hub] .v42-two{min-width:0}
[data-v42-situation-hub] p,[data-v42-situation-hub] h3,[data-v42-situation-hub] .v4-meta{overflow-wrap:anywhere}
#pageTitle{line-height:1.08;overflow-wrap:normal}
@media(min-width:901px){#pageTitle{white-space:nowrap;font-size:clamp(1.9rem,2.5vw,2.55rem)}}
@media(max-width:900px){[data-v42-situation-hub] .v42-head .v4-run{justify-content:flex-start;flex-basis:100%}#engineerCompactNav .compact-subnav{padding-left:14px!important}}
@media(max-width:620px){#engineerCompactNav button,#engineerCompactNav details>summary{padding-top:9px;padding-bottom:9px}[data-v42-situation-hub] .v4-kpis{grid-template-columns:1fr!important}#pageTitle{white-space:normal;font-size:1.8rem}}
`;
    document.head.appendChild(s);
  }

  function updateBrand(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar)return;
    const leaves=[...sidebar.querySelectorAll('*')].filter(el=>el.children.length===0);
    for(const el of leaves){
      const t=(el.textContent||'').trim();
      if(/^Analytical Dashboard V3(?:\.|\b)/i.test(t)){
        el.textContent=cs('Veřejný analytický produkt V4.2','Public Intelligence V4.2');
        el.dataset.v421Brand='product';
      }else if(/^Full History$/i.test(t)){
        el.textContent=cs('Kanonická historie','Canonical history');
        el.dataset.v421Brand='history';
      }
    }
  }

  function markCurrentHub(){
    const hub=document.querySelector('[data-v42-situation-hub]');
    if(!hub)return;
    hub.dataset.v421UiClean='1';
  }

  function install(){
    injectStyle();
    updateBrand();
    markCurrentHub();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
  document.addEventListener('engineer-language-changed',()=>setTimeout(()=>{updateBrand();markCurrentHub()},0));
  window.addEventListener('hashchange',()=>setTimeout(markCurrentHub,0));
  window.ENGINEER_V421_CLEANUP={install,updateBrand,markCurrentHub};
})();
