(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=D.dashboard_patch_extras||{};
  const leads=[...(D.leads?.leads||[]),...(ex.leads||[]),...(ex.external_leads||[])];
  const setLeadAll=(id,p)=>{let hit=false;for(const x of leads)if((x.lead_id||x.id)===id){Object.assign(x,p);x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';hit=true;}return hit;};
  const translated=[];
  if(setLeadAll('LEAD-025',{note_cs:'Rozměry nosiče 07MSB oproti rozměrům rozvinutého mostu zůstávají otázkou sémantiky metadat.'}))translated.push('LEAD-025');
  if(setLeadAll('LEAD-032',{title_cs:'Northern Strike 26 — vyhodnocení a výsledky průlomu s využitím robotických prostředků po cvičení',topic_cs:'Northern Strike 26 — vyhodnocení a výsledky průlomu s využitím robotických prostředků po cvičení',note_cs:'Oficiální materiály před cvičením popisovaly plánované srovnávací hodnocení; B13 nenalezl veřejně vydané výsledky po cvičení.',next_action_cs:'Dohledat oficiální publikaci po cvičení od 75th USARIC, 412th nebo 416th TEC či Michigan National Guard s měřenými výsledky CEC-I pro tradiční versus robotizovaný průlom, zejména čas, potřebu personálu, spotřebu paliva a účinnost splnění úkolu.'}))translated.push('LEAD-032');
  if(setLeadAll('LEAD-037',{topic_cs:'NRTK Omich / Omich-2 — význam pro ženijní vojsko zůstává nevyřešen'}))translated.push('LEAD-037');
  if(setLeadAll('LEAD-038',{topic_cs:'AJP-3.18 — přesné aktuální vydání a stav vyhlášení'}))translated.push('LEAD-038');
  if(setLeadAll('LEAD-039',{topic_cs:'PM-55A — akviziční označení a vztah k mostním systémům PM-55 / MT-55A',next_action_cs:'Získat technickou specifikaci z akvizice nebo oficiální technický či příručkový zdroj AČR, který výslovně definuje PM-55A.'}))translated.push('LEAD-039');
  if(setLeadAll('LEAD-041',{title_cs:'Veřejný Ukrainian Engineer Paper v NLLP — úplná kontrola PDF',topic_cs:'NATO NLLP — ukrajinský ženijní dokument z Global Dimensions 2024'}))translated.push('LEAD-041');
  if(setLeadAll('LEAD-050',{topic_cs:'MKR-2 — skončení platnosti certifikátu a stav navazující certifikace'}))translated.push('LEAD-050');
  window.__ENGINEER_PUBLIC_CZ_2110__={translated};
})();
