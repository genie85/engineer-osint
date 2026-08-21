(function(){
  const nav=document.querySelector('#sidebar nav');
  if(!nav||document.getElementById('engineerCzechTopicBtn'))return;
  const btn=document.createElement('button');
  btn.id='engineerCzechTopicBtn';
  btn.type='button';
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const setBtnLabel=()=>{btn.textContent=lang()==='cs'?'Téma: Česká republika / ženisté a EOD':'Topic: Czech Republic / Engineers & EOD'};
  setBtnLabel();
  btn.style.cssText='display:block;width:100%;text-align:left;border:0;background:transparent;color:#91a3b8;padding:10px 12px';
  btn.onclick=()=>{
    const v=document.getElementById('view'); if(!v)return;
    const cs=lang()==='cs';
    const title=cs?'Česká republika — ženijní síly a EOD':'Czech Republic — Engineers & EOD';
    document.getElementById('pageTitle').textContent=title;
    const blocks=[
      {
        h:cs?'15. ženijní pluk — aktuální veřejná struktura':'15th Engineer Regiment — current public structure',
        p:cs?'AČR 18. 12. 2025 uvedla, že 15. ženijní pluk tvoří 151., 152. a 153. ženijní prapor. Pluk je určen k ženijní podpoře AČR se zvláštním důrazem na 4. a 7. brigádní úkolové uskupení, operace NATO a podporu IZS. Od 1. 1. 2026 pluku velí plk. Jiří Machoň.':'The Czech Armed Forces stated on 18 Dec 2025 that the 15th Engineer Regiment comprises the 151st, 152nd and 153rd Engineer Battalions. The regiment supports Czech Armed Forces engineering tasks with emphasis on the 4th and 7th brigade task forces, NATO operations and support to the Integrated Rescue System. Col. Jiří Machoň assumed command on 1 Jan 2026.',
        url:'https://acr.mo.gov.cz/informacni-servis/zpravodajstvi/zenijni-pluk-povede-od-ledna-plukovnik-jiri-machon-261733/'
      },
      {
        h:cs?'151. ženijní prapor — EOD a ženijní podpora':'151st Engineer Battalion — EOD and engineer support',
        p:cs?'Oficiální náborový profil AČR uvádí, že 151. ženijní prapor je předurčen k posílení úkolových uskupení při ženijní podpoře, EOD podpoře a stavbě mostních provizorií. Veřejný profil současně uvádí likvidaci konvenční i nekonvenční munice (EOD) a IED jako jednu z deklarovaných činností.':'The official Czech Armed Forces recruitment profile states that the 151st Engineer Battalion is intended to reinforce task forces for engineer support, EOD support and temporary bridge construction. The public profile also lists disposal of conventional and unconventional ordnance (EOD) and IEDs among declared tasks.',
        url:'https://doarmady.mo.gov.cz/o-armade/poznejte-armadu/utvary-a-posadky/151-zenijni-prapor'
      },
      {
        h:cs?'EOD v českém a zahraničním prostředí':'EOD in domestic and deployed environments',
        p:cs?'Pozemní síly AČR 21. 6. 2026 popsaly rozdíl mezi domácím a zahraničním prostředím EOD. V ČR se specialisté setkávají zejména s historickou municí a podporou výcviku; v zahraničních operacích se přidává bojové prostředí, tlak na mobilitu a hrozba IED.':'Czech Land Forces described on 21 Jun 2026 the difference between domestic and deployed EOD contexts. In the Czech Republic, specialists commonly deal with legacy ordnance and training support; deployed operations add combat conditions, mobility pressure and IED threats.',
        url:'https://vepozs.mo.gov.cz/aktuality/eod-doma-i-v-zahranici-stejna-odbornost-jine-prostredi'
      },
      {
        h:cs?'Personální a specializační stopa':'Personnel and specialization signal',
        p:cs?'AČR v březnu 2025 veřejně uváděla nábor pyrotechniků, potápěčů a průzkumníků pro 15. ženijní pluk. Jde o personální signál existence těchto specializací v rámci pluku; z veřejného článku nelze odvodit úplný personální model ani tabulkové počty.':'In March 2025 the Czech Armed Forces publicly advertised recruitment of EOD technicians, divers and reconnaissance specialists for the 15th Engineer Regiment. This supports the existence of these specializations within the regiment, but the public article does not establish a complete personnel model or authorized strength.',
        url:'https://acr.mo.gov.cz/informacni-servis/zpravodajstvi/do-bechyne-nove-s-naborakem--shani-i-pyrotechniky--potapece-ci-pruzkumniky-256943/'
      }
    ];
    v.innerHTML='<section class="card section"><div class="mono">'+(cs?'PREZENTAČNÍ OBOHACENÍ ČEKAJÍCÍ NA KANONIKALIZACI':'PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION')+'</div><h2>'+title+'</h2><p class="muted">'+(cs?'Syntetický pohled nad ověřenými veřejnými zdroji AČR/MO. Není to náhrada kanonických ENG záznamů ani úplné TO&E.':'Synthetic view over verified public Czech Armed Forces / MoD sources. It is not a replacement for canonical ENG records and is not a complete TO&E.')+'</p>'+
      blocks.map(b=>'<article class="item"><h3>'+b.h+'</h3><p>'+b.p+'</p><div><b>'+(cs?'ZDROJ':'SOURCE')+':</b><br><a href="'+b.url+'" target="_blank" rel="noopener">'+b.url+'</a></div></article>').join('')+
      '<article class="item"><h3>'+(cs?'Co z toho nelze tvrdit':'What this does not establish')+'</h3><p>'+(cs?'Veřejné zdroje samy o sobě nedávají úplné současné TO&E, přesný počet EOD týmů, úplný C2 model, certifikační stupně ani přesné mapování 1:1 českých národních kvalifikací na NATO EOD/EOC/EOR. Tyto oblasti zůstávají informačními mezerami pro další OSINT.':'The public sources do not by themselves provide a complete current TO&E, exact number of EOD teams, full C2 model, certification levels, or a one-to-one mapping of Czech national qualifications to NATO EOD/EOC/EOR. These remain intelligence gaps for further OSINT.')+'</p></article></section>';
  };
  document.addEventListener('engineer-language-changed',setBtnLabel);
  nav.appendChild(btn);
})();
