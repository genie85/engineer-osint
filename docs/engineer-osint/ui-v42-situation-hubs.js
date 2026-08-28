(function(){
  const D=window.__ENGINEER_CANONICAL_DATA__||window.__ENGINEER_DATA__;if(!D)return;
  const arr=v=>Array.isArray(v)?v:[];
  const flat=v=>arr(v).flatMap(x=>Array.isArray(x)?flat(x):[x]).filter(x=>x!==null&&x!==undefined&&x!=='');
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const cs=(a,b)=>lang()==='cs'?a:b;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pick=(r,k)=>lang()==='cs'?(r?.[k+'_cs']??r?.[k]??r?.[k+'_en']):(r?.[k+'_en']??r?.[k]??r?.[k+'_cs']);
  const records=()=>arr(D.records?.records);
  const evidence=()=>arr(D.evidence?.evidence);
  const leads=()=>arr(D.leads?.leads);
  const nativeAssessments=()=>arr(D.assessments?.assessments);
  const nativeGaps=()=>arr(D.intelligence_gaps?.gaps);
  const nativeContradictions=()=>arr(D.contradictions?.contradictions);
  const currentRun=()=>D.dashboard_materialization?.current_run_id||D.state_latest?.run_id||D.state?.run_id||'—';
  const idOf=r=>r?.id||r?.assessment_id||r?.gap_id||r?.contradiction_id||r?.evidence_id||r?.lead_id||'';
  const title=r=>pick(r,'title')||pick(r,'topic')||pick(r,'question')||idOf(r)||'—';
  const summary=r=>pick(r,'summary')||pick(r,'description')||pick(r,'fact')||'';
  const dateOf=r=>r?.last_verified_date||r?.last_evidence_date||r?.publication_date||r?.event_date||r?.evidence_date||r?.last_reviewed||r?.last_checked||r?.date_identified||r?.date||r?.event_time||'';
  const runOf=r=>r?.last_updated_run||r?.last_update_run||r?.first_seen_run||r?.run_id||'';
  const confidence=v=>String(v||cs('NEUVEDENA','UNSTATED')).replaceAll('_',' ');
  const toText=v=>flat(Array.isArray(v)?v:[v]).map(String).join(' ').toLowerCase();
  const geoCountryBlob=r=>toText([r?.country,r?.country_code,r?.countries,r?.nation,r?.actor_country,r?.location_country]);
  const geoScopeBlob=r=>toText([r?.geography,r?.geo_scope,r?.region,r?.theater,r?.topics,r?.tags,title(r),summary(r)]);
  const p1Re=/(?:^|[\s,/_-])(?:ukr|rus)(?:$|[\s,/_-])|ukrain|ukrajin|russia|rusk|russia[_ -]?ukraine/i;
  const p2Re=/(?:^|[\s,/_-])cze(?:$|[\s,/_-])|czech|česk|cesk/i;
  function matchGeo(r,key){
    const country=geoCountryBlob(r),scope=geoScopeBlob(r);
    const p1=p1Re.test(country)||(!country&&p1Re.test(scope));
    const p2=p2Re.test(country)||(!country&&p2Re.test(scope));
    if(key==='p1')return p1;
    if(key==='p2')return p2;
    return !p1&&!p2;
  }
  const geoRecords=key=>records().filter(r=>matchGeo(r,key));
  const sortRecent=xs=>[...xs].sort((a,b)=>String(dateOf(b)).localeCompare(String(dateOf(a)))||String(idOf(a)).localeCompare(String(idOf(b))));
  const currentRecords=xs=>xs.filter(r=>runOf(r)===currentRun()||r?.first_seen_run===currentRun());
  const relatedIds=x=>[...new Set([...arr(x?.related_ids),...arr(x?.related_record_ids),x?.record_id,x?.related_record_id,x?.target_id].filter(Boolean))];
  const intersects=(a,set)=>a.some(id=>set.has(id));
  const geoObject=(x,key,ids)=>intersects(relatedIds(x),ids)||matchGeo(x,key);
  const recordType=r=>String(r?.type||idOf(r).match(/^(ENG-(?:TECH|TREND|EVT|SIG|UNIT|DOC|TTP|LL))/)?.[1]||'OTHER').toUpperCase();
  const typeLabel=r=>({
    'ENG-TECH':cs('Technika','Technology'),'ENG-TREND':cs('Trend','Trend'),'ENG-EVT':cs('Událost','Event'),'ENG-SIG':cs('Signál','Signal'),
    'ENG-UNIT':cs('Jednotka','Unit'),'ENG-DOC':cs('Doktrína / dokument','Doctrine / document'),'ENG-TTP':'TTP','ENG-LL':cs('Poučení','Lesson')
  }[recordType(r)]||recordType(r).replace(/^ENG-/,''));
  const technologyRecords=xs=>sortRecent(xs.filter(r=>['ENG-TECH','ENG-TREND'].includes(recordType(r))));
  const developmentRecords=xs=>sortRecent(xs.filter(r=>['ENG-EVT','ENG-SIG','ENG-UNIT','ENG-DOC','ENG-TTP','ENG-LL'].includes(recordType(r))));
  const evidenceFor=(key,ids)=>sortRecent(evidence().filter(e=>intersects(relatedIds(e),ids)));
  const nativeFor=(items,key,ids)=>sortRecent(items.filter(x=>geoObject(x,key,ids)));
  const legacyAssessments=(key,xs)=>sortRecent(xs.filter(r=>pick(r,'analysis')||pick(r,'assessment'))).map(r=>({assessment_id:`LEGACY:${r.id}`,assessment:pick(r,'analysis')||pick(r,'assessment'),confidence:r.confidence||r.assessment_confidence||'UNKNOWN',related_ids:[r.id],legacy:true,last_reviewed:dateOf(r)}));
  const legacyGaps=(key,xs,ids)=>{
    const out=[];
    for(const r of xs){const raw=pick(r,'intelligence_gaps');for(const text of (Array.isArray(raw)?raw:(raw?[raw]:[])))out.push({gap_id:`LEGACY:${r.id}:${out.length+1}`,question:text,status:'OPEN',priority:'UNSPECIFIED',related_ids:[r.id],legacy:true,last_checked:dateOf(r)});}
    for(const l of leads().filter(x=>geoObject(x,key,ids))){const text=pick(l,'note')||pick(l,'summary')||pick(l,'next_action')||pick(l,'recommended_next_action')||pick(l,'topic');if(text)out.push({gap_id:`LEGACY:${l.lead_id||l.id}`,question:text,status:l.status||'OPEN',priority:l.priority||'UNSPECIFIED',related_ids:relatedIds(l),legacy:true,last_checked:dateOf(l)});}
    return out;
  };
  const legacyContradictions=(key,xs)=>{
    const out=[];
    for(const r of xs){const values=[...arr(r.contradictions),...(pick(r,'contradiction')?[pick(r,'contradiction')]:[])];if(/CONTRADICTION/i.test(String(r.classification||r.status||''))&&!values.length)values.push(summary(r)||title(r));for(const text of values)out.push({contradiction_id:`LEGACY:${r.id}:${out.length+1}`,topic:text,status:'OPEN',confidence:r.confidence||'UNKNOWN',related_ids:[r.id],legacy:true,date_identified:dateOf(r)});}
    return out;
  };
  const sectionMode=(nativeRows,legacyRows)=>nativeRows.length?{rows:nativeRows,canonical:true}:{rows:legacyRows,canonical:false};
  const labels={
    p1:{flag:'🇺🇦',cs:'Rusko–Ukrajina',en:'Russia–Ukraine'},
    p2:{flag:'🇨🇿',cs:'Česká republika',en:'Czech Republic'},
    p3:{flag:'🌍',cs:'Svět',en:'World'}
  };
  let activeKey=null;

  function injectStyle(){if(document.getElementById('engineer-v42-style'))return;const s=document.createElement('style');s.id='engineer-v42-style';s.textContent=`.v42-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.v42-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}.v42-mode{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;opacity:.8}.v42-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v42-record-meta{display:flex;gap:8px;flex-wrap:wrap;margin:.45rem 0}.v42-record-meta span{font-size:.74rem;border:1px solid rgba(120,160,200,.2);border-radius:999px;padding:3px 7px}.v42-claim{border-left:3px solid rgba(143,185,232,.55);padding-left:10px}.v42-empty{padding:12px 0;color:#93a6b8;font-style:italic}.v42-evidence-id{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.78rem}.v42-count{font-variant-numeric:tabular-nums}@media(max-width:900px){.v42-two{grid-template-columns:1fr}}`;document.head.appendChild(s)}
  function openButton(id,label){return id?`<button type="button" data-v42-open="${esc(id)}">${esc(label||cs('Detail','Detail'))}</button>`:''}
  function recordCard(r){return `<article class="v4-card"><div class="v4-label">${esc(typeLabel(r))}</div><h3>${esc(title(r))}</h3>${summary(r)?`<p>${esc(summary(r))}</p>`:''}<div class="v42-record-meta"><span>${esc(idOf(r))}</span>${dateOf(r)?`<span>${esc(dateOf(r))}</span>`:''}<span>${esc(confidence(r.confidence))}</span>${runOf(r)===currentRun()?`<span>${esc(cs('AKTUÁLNÍ BĚH','CURRENT RUN'))}</span>`:''}</div>${pick(r,'what_it_does_not_prove')?`<p class="v4-note"><b>${esc(cs('Co to neprokazuje','What it does not prove'))}:</b> ${esc(pick(r,'what_it_does_not_prove'))}</p>`:''}<div class="v4-actions">${openButton(r.id)}</div></article>`}
  function assessmentCard(a){return `<article class="v4-card"><div class="v4-label">${esc(a.legacy?'LEGACY ANALYSIS FIELD':'CANONICAL ASSESSMENT')} · ${esc(a.assessment_id||a.id||'')}</div><p>${esc(pick(a,'assessment')||a.assessment||'—')}</p><div class="v4-meta">${esc(cs('Míra jistoty','Confidence'))}: ${esc(confidence(a.confidence))}${a.last_reviewed?` · ${esc(cs('Kontrola','Reviewed'))}: ${esc(a.last_reviewed)}`:''}</div>${arr(a.supporting_evidence_ids).length?`<p><b>${esc(cs('Důkazy','Evidence'))}:</b> ${esc(a.supporting_evidence_ids.join(', '))}</p>`:''}${arr(a.source_ids).length?`<p><b>${esc(cs('Zdroje','Sources'))}:</b> ${esc(a.source_ids.join(', '))}</p>`:''}${pick(a,'limitations')?`<p class="v4-note"><b>${esc(cs('Limity','Limitations'))}:</b> ${esc(pick(a,'limitations'))}</p>`:''}<div class="v4-actions">${arr(a.related_ids).map(id=>openButton(id,cs('Související záznam','Related record'))).join('')}</div></article>`}
  function gapCard(g){return `<article class="v4-card"><div class="v4-label">${esc(g.legacy?'LEGACY GAP FIELD':'CANONICAL INTELLIGENCE GAP')} · ${esc(g.status||'OPEN')}</div><h3>${esc(pick(g,'question')||g.question||'—')}</h3><div class="v4-meta">${esc(cs('Priorita','Priority'))}: ${esc(g.priority||'UNSPECIFIED')}${g.last_checked?` · ${esc(cs('Poslední kontrola','Last checked'))}: ${esc(g.last_checked)}`:''}</div>${arr(g.sources_checked).length?`<p><b>${esc(cs('Prověřené zdroje','Sources checked'))}:</b> ${esc(g.sources_checked.join(', '))}</p>`:''}${pick(g,'required_evidence')?`<p><b>${esc(cs('Co by mezeru uzavřelo','Evidence needed'))}:</b> ${esc(pick(g,'required_evidence'))}</p>`:''}${pick(g,'next_action')?`<p><b>${esc(cs('Další krok','Next action'))}:</b> ${esc(pick(g,'next_action'))}</p>`:''}<div class="v4-actions">${arr(g.related_ids).map(id=>openButton(id,cs('Související záznam','Related record'))).join('')}</div></article>`}
  function contradictionCard(c){return `<article class="v4-card"><div class="v4-label">${esc(c.legacy?'LEGACY CONTRADICTION FIELD':'CANONICAL CONTRADICTION')} · ${esc(c.status||'OPEN')}</div><h3>${esc(pick(c,'topic')||c.topic||'—')}</h3>${c.legacy?'':`<div class="v42-two"><div class="v42-claim"><b>A</b><p>${esc(pick(c,'claim_a')||c.claim_a||'—')}</p><div class="v4-meta">${esc(arr(c.source_a_ids).join(', '))}</div></div><div class="v42-claim"><b>B</b><p>${esc(pick(c,'claim_b')||c.claim_b||'—')}</p><div class="v4-meta">${esc(arr(c.source_b_ids).join(', '))}</div></div></div>`}<div class="v4-meta">${esc(cs('Míra jistoty','Confidence'))}: ${esc(confidence(c.confidence))}${c.date_identified?` · ${esc(c.date_identified)}`:''}</div>${pick(c,'possible_explanations')?`<p><b>${esc(cs('Možná vysvětlení','Possible explanations'))}:</b> ${esc(pick(c,'possible_explanations'))}</p>`:''}${pick(c,'resolution')?`<p><b>${esc(cs('Řešení','Resolution'))}:</b> ${esc(pick(c,'resolution'))}</p>`:''}<div class="v4-actions">${arr(c.related_ids).map(id=>openButton(id,cs('Související záznam','Related record'))).join('')}</div></article>`}
  function evidenceCard(e){const supports=pick(e,'what_it_supports')||pick(e,'observation')||pick(e,'summary')||e.evidence_type||'';const related=relatedIds(e);return `<article class="v4-card"><div class="v4-label v42-evidence-id">${esc(e.evidence_id||e.id||'EVIDENCE')}</div>${supports?`<p>${esc(supports)}</p>`:''}<div class="v4-meta">${esc(e.evidence_type||'')}${dateOf(e)?` · ${esc(dateOf(e))}`:''}${e.confidence?` · ${esc(confidence(e.confidence))}`:''}</div>${pick(e,'what_it_does_not_prove')?`<p class="v4-note"><b>${esc(cs('Limit','Limit'))}:</b> ${esc(pick(e,'what_it_does_not_prove'))}</p>`:''}<div class="v4-actions">${related.slice(0,3).map(id=>openButton(id,cs('Související záznam','Related record'))).join('')}</div></article>`}
  function empty(textCs,textEn){return `<p class="v42-empty">${esc(cs(textCs,textEn))}</p>`}
  function modeBadge(canonical){return canonical?'CANONICAL INTELLIGENCE V1':cs('KOMPATIBILNÍ POHLED ZE STARŠÍCH POLÍ','LEGACY COMPATIBILITY VIEW')}
  function section(titleCs,titleEn,body,mode=null){return `<div class="v4-section"><div class="v42-section-head"><h2>${esc(cs(titleCs,titleEn))}</h2>${mode!==null?`<span class="v42-mode">${esc(modeBadge(mode))}</span>`:''}</div>${body}</div>`}
  function wire(root){root.querySelectorAll('[data-v42-open]').forEach(b=>b.onclick=()=>{const id=b.dataset.v42Open;if(id&&typeof window.openDetail==='function')window.openDetail(id);else window.ENGINEER_ENTITY_NAV?.open?.(id)})}

  function renderHub(key){
    if(!labels[key])return;
    activeKey=key;injectStyle();
    const v=document.getElementById('view'),pageTitle=document.getElementById('pageTitle');if(!v||!pageTitle)return;
    const xs=sortRecent(geoRecords(key)),ids=new Set(xs.map(r=>r.id).filter(Boolean));
    const current=currentRecords(xs),situationRows=(current.length?sortRecent(current):xs).slice(0,8);
    const tech=technologyRecords(xs).slice(0,8),developments=developmentRecords(xs).slice(0,8),linkedEvidence=evidenceFor(key,ids),ev=linkedEvidence.slice(0,8);
    const nativeA=nativeFor(nativeAssessments(),key,ids),nativeG=nativeFor(nativeGaps(),key,ids).filter(g=>!['RESOLVED','CLOSED'].includes(String(g.status||'').toUpperCase())),nativeC=nativeFor(nativeContradictions(),key,ids).filter(c=>!['RESOLVED','SUPERSEDED'].includes(String(c.status||'').toUpperCase()));
    const assessments=sectionMode(nativeA,legacyAssessments(key,xs)),gaps=sectionMode(nativeG,legacyGaps(key,xs,ids)),contradictions=sectionMode(nativeC,legacyContradictions(key,xs));
    const label=cs(labels[key].cs,labels[key].en),nativeCount=nativeA.length+nativeG.length+nativeC.length;
    pageTitle.textContent=label;v.dataset.i18nManaged='1';
    const situationNote=current.length?'':`<p class="v4-note">${esc(cs('Aktuální research run nemá pro tento geografický pohled samostatnou delta položku; níže jsou proto zobrazeny nejnovější známé canonical záznamy a jejich data.','The current research run has no separate delta item for this geographic view; the section therefore shows the latest known canonical records with their dates.'))}</p>`;
    v.innerHTML=`<section class="card section" data-v42-situation-hub="${esc(key)}"><div class="v42-head"><div><div class="v4-kicker">${esc(labels[key].flag)} ${esc(key.toUpperCase())} · ENGINEER OSINT V4.2</div><h2>${esc(label)}</h2></div><div class="v4-run"><span class="v4-pill">${esc(cs('Aktuální běh','Current run'))}: ${esc(currentRun())}</span><span class="v4-pill">${esc(cs('Geo režim','Geo mode'))}: ${esc(cs('odvozený filtr','derived filter'))}</span></div></div><p class="v4-note">${esc(cs('Tento tematický hub třídí a syntetizuje existující canonical záznamy podle geografických metadat a veřejného textu. Nevytváří ani nemění faktická tvrzení.','This thematic hub classifies and synthesizes existing canonical records using geographic metadata and public text. It does not create or alter factual claims.'))}</p><div class="v4-kpis"><div class="v4-kpi">${esc(cs('Canonical záznamy','Canonical records'))}<b class="v42-count">${xs.length}</b></div><div class="v4-kpi">${esc(cs('Delta aktuálního běhu','Current-run delta'))}<b class="v42-count">${current.length}</b></div><div class="v4-kpi">${esc(cs('Navázané důkazy','Linked evidence'))}<b class="v42-count">${linkedEvidence.length}</b></div><div class="v4-kpi">${esc(cs('Canonical intelligence','Canonical intelligence'))}<b class="v42-count">${nativeCount}</b></div></div>`+
      section('Aktuální situační obraz','Current Situation',situationNote+(situationRows.length?situationRows.map(recordCard).join(''):empty('Pro tento pohled nejsou canonical záznamy.','No canonical records are available for this view.')))+
      section('Ženijní vývoj','Engineering Developments',developments.length?developments.map(recordCard).join(''):empty('Nebyly nalezeny samostatné události, signály, jednotky, doktrína, TTP nebo lessons pro tento pohled.','No separate events, signals, units, doctrine, TTP or lessons were found for this view.'))+
      section('Technologie a trendy','Technology & Trends',tech.length?tech.map(recordCard).join(''):empty('Nebyly nalezeny samostatné technologické nebo trendové záznamy.','No separate technology or trend records were found.'))+
      section('Klíčová hodnocení','Key Assessments',assessments.rows.length?assessments.rows.slice(0,6).map(assessmentCard).join(''):empty('Pro tento pohled nejsou dostupná explicitní analytická hodnocení.','No explicit analytical assessments are available for this view.'),assessments.canonical)+
      section('Intelligence gaps','Intelligence Gaps',gaps.rows.length?gaps.rows.slice(0,8).map(gapCard).join(''):empty('Pro tento pohled nejsou explicitní otevřené informační mezery.','No explicit open intelligence gaps are available for this view.'),gaps.canonical)+
      section('Rozpory ve zdrojích','Source Contradictions',contradictions.rows.length?contradictions.rows.slice(0,6).map(contradictionCard).join(''):empty('V materializované vrstvě není pro tento pohled evidován explicitní rozpor.','No explicit contradiction is recorded for this view in the materialized layer.'),contradictions.canonical)+
      section('Důkazní vrstva','Evidence Layer',ev.length?ev.map(evidenceCard).join(''):empty('Pro tento geografický výběr nejsou dostupné přímo navázané evidence objekty.','No directly linked evidence objects are available for this geographic selection.'))+
      `</section>`;
    wire(v);
  }

  function rewireNav(){for(const [id,key] of [['engineerV4GeoP1','p1'],['engineerV4GeoP2','p2'],['engineerV4GeoP3','p3']]){const b=document.getElementById(id);if(b)b.onclick=()=>renderHub(key)}}
  function interceptGeoClick(e){const target=e.target?.closest?.('[data-v4-geo]');if(!target)return;const key=target.dataset.v4Geo;if(!labels[key])return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();renderHub(key)}
  function interceptGeoKey(e){const target=e.target?.closest?.('[data-v4-geo]');if(!target||target.tagName==='BUTTON'||!['Enter',' '].includes(e.key))return;const key=target.dataset.v4Geo;if(!labels[key])return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();renderHub(key)}

  injectStyle();rewireNav();
  document.addEventListener('click',interceptGeoClick,true);
  document.addEventListener('keydown',interceptGeoKey,true);
  const nav=document.getElementById('engineerCompactNav');if(nav)new MutationObserver(rewireNav).observe(nav,{childList:true,subtree:true});
  document.addEventListener('engineer-language-changed',()=>{rewireNav();if(activeKey)renderHub(activeKey)});
  if(window.ENGINEER_V4_PUBLIC)window.ENGINEER_V4_PUBLIC.renderGeo=renderHub;
  window.ENGINEER_V42_SITUATION={renderHub,geoRecords,matchGeo,evidenceFor,nativeAssessments,nativeGaps,nativeContradictions,currentRun};
})();
