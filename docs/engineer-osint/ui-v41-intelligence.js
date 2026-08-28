(function(){
  const D=window.__ENGINEER_CANONICAL_DATA__||window.__ENGINEER_DATA__;if(!D)return;
  const arr=v=>Array.isArray(v)?v:[];
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const cs=(a,b)=>lang()==='cs'?a:b;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pick=(r,k)=>lang()==='cs'?(r?.[k+'_cs']??r?.[k]??r?.[k+'_en']):(r?.[k+'_en']??r?.[k]??r?.[k+'_cs']);
  const records=()=>arr(D.records?.records);
  const leads=()=>arr(D.leads?.leads);
  const nativeAssessments=()=>arr(D.assessments?.assessments);
  const nativeGaps=()=>arr(D.intelligence_gaps?.gaps);
  const nativeContradictions=()=>arr(D.contradictions?.contradictions);
  const byId=()=>new Map(records().map(r=>[r.id,r]));
  const recordTitle=id=>{const r=byId().get(id);return r?(pick(r,'title')||r.id):id};
  const confidence=v=>String(v||cs('NEUVEDENA','UNSTATED')).replaceAll('_',' ');
  const materialized=()=>D.intelligence_materialization?.schema_version==='engineer-osint-intelligence-v1';
  let activePage=null;

  const legacyAssessments=()=>records().filter(r=>pick(r,'analysis')||pick(r,'assessment')).map(r=>({
    assessment_id:`LEGACY:${r.id}`,assessment:pick(r,'analysis')||pick(r,'assessment'),confidence:r.confidence||r.assessment_confidence||'UNKNOWN',related_ids:[r.id],legacy:true
  }));
  const legacyGaps=()=>{
    const out=[];
    for(const r of records())for(const text of (Array.isArray(pick(r,'intelligence_gaps'))?pick(r,'intelligence_gaps'):(pick(r,'intelligence_gaps')?[pick(r,'intelligence_gaps')]:[])))out.push({gap_id:`LEGACY:${r.id}:${out.length+1}`,question:text,status:'OPEN',priority:'UNSPECIFIED',related_ids:[r.id],legacy:true});
    for(const l of leads())out.push({gap_id:`LEGACY:${l.lead_id||l.id}`,question:pick(l,'note')||pick(l,'summary')||pick(l,'topic')||l.lead_id||l.id,status:l.status||'OPEN',priority:l.priority||'UNSPECIFIED',related_ids:arr(l.related_ids),legacy:true});
    return out;
  };
  const legacyContradictions=()=>{
    const out=[];
    for(const r of records()){
      const values=[...arr(r.contradictions),...(pick(r,'contradiction')?[pick(r,'contradiction')]:[])];
      if(/CONTRADICTION/i.test(String(r.classification||r.status||''))&&!values.length)values.push(pick(r,'summary')||pick(r,'title')||r.id);
      for(const text of values)out.push({contradiction_id:`LEGACY:${r.id}:${out.length+1}`,topic:text,status:'OPEN',confidence:r.confidence||'UNKNOWN',related_ids:[r.id],legacy:true});
    }
    return out;
  };
  const assessments=()=>nativeAssessments().length?nativeAssessments():legacyAssessments();
  const gaps=()=>nativeGaps().length?nativeGaps():legacyGaps();
  const contradictions=()=>nativeContradictions().length?nativeContradictions():legacyContradictions();
  const modeBadge=items=>items.some(x=>x.legacy)?cs('KOMPATIBILNÍ POHLED ZE STARŠÍCH POLÍ','LEGACY COMPATIBILITY VIEW'):'CANONICAL INTELLIGENCE V1';

  function openRelated(id){if(!id)return;if(typeof window.openDetail==='function')window.openDetail(id);else window.ENGINEER_ENTITY_NAV?.open?.(id)}
  function relatedButtons(ids){return arr(ids).filter(Boolean).map(id=>`<button type="button" data-v41-open="${esc(id)}">${esc(recordTitle(id))}</button>`).join(' ')}
  function wire(root){root.querySelectorAll('[data-v41-open]').forEach(b=>b.onclick=()=>openRelated(b.dataset.v41Open))}
  function setTitle(t){const p=document.getElementById('pageTitle');if(p)p.textContent=t}
  function view(){return document.getElementById('view')}
  function shell(kicker,title,body){const v=view();if(!v)return;v.innerHTML=`<section class="card section v41-intelligence"><div class="v4-kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}</section>`;wire(v)}

  function assessmentText(a){return pick(a,'assessment')||a.assessment||'—'}
  function gapText(g){return pick(g,'question')||g.question||'—'}
  function contradictionTopic(c){return pick(c,'topic')||c.topic||'—'}
  function claimText(c,key){return pick(c,key)||c[key]||'—'}

  function assessmentPage(){activePage='assessments';const xs=assessments();setTitle(cs('Klíčová hodnocení','Key Assessments'));shell(modeBadge(xs),cs('Klíčová analytická hodnocení','Key Assessments'),
    `<p class="v4-note">${esc(cs('Canonical hodnocení je samostatný, verzovaný analytický objekt. Jeho text není fakt; musí být navázán na důkazy a zdroje a má vlastní míru jistoty.','A canonical assessment is a separate versioned analytical object. Its text is not a fact; it must be linked to evidence and sources and carries its own confidence.'))}</p>`+
    (xs.length?xs.map(a=>`<article class="v4-card"><div class="v4-label">${esc(a.assessment_id||a.id||'ASSESSMENT')}</div><p>${esc(assessmentText(a))}</p><div class="v4-meta">${esc(cs('Míra jistoty','Confidence'))}: ${esc(confidence(a.confidence))}${a.last_reviewed?` · ${esc(cs('Kontrola','Reviewed'))}: ${esc(a.last_reviewed)}`:''}</div>${arr(a.supporting_evidence_ids).length?`<div><b>${esc(cs('Důkazy','Evidence'))}:</b> ${esc(a.supporting_evidence_ids.join(', '))}</div>`:''}${arr(a.source_ids).length?`<div><b>${esc(cs('Zdroje','Sources'))}:</b> ${esc(a.source_ids.join(', '))}</div>`:''}${arr(a.related_ids).length?`<div class="v4-actions">${relatedButtons(a.related_ids)}</div>`:''}${pick(a,'limitations')?`<p class="v4-note"><b>${esc(cs('Limity','Limitations'))}:</b> ${esc(pick(a,'limitations'))}</p>`:''}${pick(a,'what_could_change_assessment')?`<p><b>${esc(cs('Co může hodnocení změnit','What could change the assessment'))}:</b> ${esc(pick(a,'what_could_change_assessment'))}</p>`:''}</article>`).join(''):`<p class="v4-empty">${esc(cs('Zatím nejsou materializována samostatná canonical hodnocení.','No standalone canonical assessments are materialized yet.'))}</p>`));}

  function gapPage(){activePage='gaps';const xs=gaps();setTitle('Intelligence Gaps');shell(modeBadge(xs),'Intelligence Gaps',
    `<p class="v4-note">${esc(cs('Informační mezera říká, co veřejná evidence zatím nedokáže zodpovědět. OPEN neznamená, že tvrzení je nepravdivé; znamená, že chybí dostatečný veřejný podklad.','An intelligence gap states what public evidence cannot yet answer. OPEN does not mean a claim is false; it means sufficient public support is missing.'))}</p>`+
    (xs.length?xs.map(g=>`<article class="v4-card"><div class="v4-label">${esc(g.gap_id||g.id||'GAP')} · ${esc(String(g.status||'OPEN'))}</div><h3>${esc(gapText(g))}</h3><div class="v4-meta">${esc(cs('Priorita','Priority'))}: ${esc(g.priority||'UNSPECIFIED')}${g.last_checked?` · ${esc(cs('Poslední kontrola','Last checked'))}: ${esc(g.last_checked)}`:''}</div>${arr(g.sources_checked).length?`<div><b>${esc(cs('Prověřené zdroje','Sources checked'))}:</b> ${esc(g.sources_checked.join(', '))}</div>`:''}${pick(g,'required_evidence')?`<p><b>${esc(cs('Co by mezeru uzavřelo','Evidence needed'))}:</b> ${esc(pick(g,'required_evidence'))}</p>`:''}${pick(g,'next_action')?`<p><b>${esc(cs('Další krok','Next action'))}:</b> ${esc(pick(g,'next_action'))}</p>`:''}${arr(g.related_ids).length?`<div class="v4-actions">${relatedButtons(g.related_ids)}</div>`:''}</article>`).join(''):`<p class="v4-empty">${esc(cs('Zatím nejsou materializovány samostatné canonical intelligence gaps.','No standalone canonical intelligence gaps are materialized yet.'))}</p>`));}

  function contradictionPage(){activePage='contradictions';const xs=contradictions();setTitle(cs('Rozpory','Contradictions'));shell(modeBadge(xs),cs('Rozpory ve zdrojích','Source Contradictions'),
    `<p class="v4-note">${esc(cs('Rozpor je evidován jako samostatný objekt. Systém nemá rozpor automaticky rozhodnout; uchovává obě strany, jejich zdroje a stav řešení.','A contradiction is stored as a separate object. The system must not resolve it automatically; it preserves both sides, their sources and resolution status.'))}</p>`+
    (xs.length?xs.map(c=>`<article class="v4-card"><div class="v4-label">${esc(c.contradiction_id||c.id||'CONTRADICTION')} · ${esc(String(c.status||'OPEN'))}</div><h3>${esc(contradictionTopic(c))}</h3>${!c.legacy?`<div class="v4-grid"><div class="v4-card"><b>A</b><p>${esc(claimText(c,'claim_a'))}</p><div class="v4-meta">${esc(arr(c.source_a_ids).join(', '))}</div></div><div class="v4-card"><b>B</b><p>${esc(claimText(c,'claim_b'))}</p><div class="v4-meta">${esc(arr(c.source_b_ids).join(', '))}</div></div></div>`:''}<div class="v4-meta">${esc(cs('Míra jistoty','Confidence'))}: ${esc(confidence(c.confidence))}${c.date_identified?` · ${esc(c.date_identified)}`:''}</div>${pick(c,'possible_explanations')?`<p><b>${esc(cs('Možná vysvětlení','Possible explanations'))}:</b> ${esc(pick(c,'possible_explanations'))}</p>`:''}${pick(c,'resolution')?`<p><b>${esc(cs('Řešení','Resolution'))}:</b> ${esc(pick(c,'resolution'))}</p>`:''}${arr(c.related_ids).length?`<div class="v4-actions">${relatedButtons(c.related_ids)}</div>`:''}</article>`).join(''):`<p class="v4-empty">${esc(cs('Nejsou evidovány žádné samostatné rozpory.','No standalone contradictions are recorded.'))}</p>`));}

  function addButton(box,id,csLabel,enLabel,fn){if(!box)return;let b=document.getElementById(id);if(!b){b=document.createElement('button');b.id=id;b.type='button';b.dataset.labelCs=csLabel;b.dataset.labelEn=enLabel;b.onclick=fn;box.appendChild(b)}b.textContent=cs(csLabel,enLabel)}
  function setupNav(){const box=document.querySelector('#engineerAnalysisGroup .compact-subnav');if(!box)return false;addButton(box,'engineerV41Assessments','Klíčová hodnocení','Key Assessments',assessmentPage);addButton(box,'engineerV41Gaps','Intelligence Gaps','Intelligence Gaps',gapPage);addButton(box,'engineerV41Contradictions','Rozpory','Contradictions',contradictionPage);return true}

  function nativeAssessmentCard(a){return `<article class="v4-card"><div class="v4-label">CANONICAL · ${esc(a.assessment_id||a.id||'')}</div><p>${esc(assessmentText(a))}</p><div class="v4-meta">${esc(cs('Míra jistoty','Confidence'))}: ${esc(confidence(a.confidence))}</div>${arr(a.related_ids).length?`<div class="v4-actions">${relatedButtons(a.related_ids)}</div>`:''}</article>`}
  function nativeGapCard(g){return `<article class="v4-card"><div class="v4-label">CANONICAL · ${esc(g.gap_id||g.id||'')} · ${esc(g.status||'OPEN')}</div><p>${esc(gapText(g))}</p>${arr(g.related_ids).length?`<div class="v4-actions">${relatedButtons(g.related_ids)}</div>`:''}</article>`}
  function nativeContradictionCard(c){return `<article class="v4-card"><div class="v4-label">CANONICAL · ${esc(c.contradiction_id||c.id||'')} · ${esc(c.status||'OPEN')}</div><p>${esc(contradictionTopic(c))}</p>${arr(c.related_ids).length?`<div class="v4-actions">${relatedButtons(c.related_ids)}</div>`:''}</article>`}
  function replaceOverviewSection(pattern,items,renderer){const root=document.getElementById('engineerOverviewIntro');if(!root||!items.length)return;const section=[...root.querySelectorAll('.v4-section')].find(s=>pattern.test((s.querySelector('h2')?.textContent||'').trim()));if(!section||section.dataset.v41Canonical==='1')return;const h=section.querySelector('h2')?.outerHTML||'';section.innerHTML=h+`<div class="v4-label">CANONICAL INTELLIGENCE V1</div>`+items.slice(0,5).map(renderer).join('');section.dataset.v41Canonical='1';wire(section)}
  function upgradeOverview(){if(!materialized())return;replaceOverviewSection(/Klíčová analytická hodnocení|Key assessments/i,nativeAssessments(),nativeAssessmentCard);replaceOverviewSection(/Intelligence gaps/i,nativeGaps().filter(g=>!['RESOLVED','CLOSED'].includes(String(g.status||'').toUpperCase())),nativeGapCard);replaceOverviewSection(/Rozpory a nejasnosti|Contradictions and unresolved/i,nativeContradictions().filter(c=>!['RESOLVED','SUPERSEDED'].includes(String(c.status||'').toUpperCase())),nativeContradictionCard)}

  function enrichDetail(){const d=document.getElementById('detailContent');if(!d||d.querySelector('.v41-detail-intelligence'))return;const id=(d.textContent||'').match(/ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL|TREND)-[A-Za-z0-9._-]+/)?.[0];if(!id)return;const aa=nativeAssessments().filter(x=>arr(x.related_ids).includes(id)),gg=nativeGaps().filter(x=>arr(x.related_ids).includes(id)),cc=nativeContradictions().filter(x=>arr(x.related_ids).includes(id));if(!aa.length&&!gg.length&&!cc.length)return;d.insertAdjacentHTML('beforeend',`<section class="card section v41-detail-intelligence"><div class="v4-kicker">CANONICAL INTELLIGENCE V1</div><h4>${esc(cs('Analytická vrstva','Intelligence layer'))}</h4>${aa.map(nativeAssessmentCard).join('')}${gg.map(nativeGapCard).join('')}${cc.map(nativeContradictionCard).join('')}</section>`);wire(d)}

  function refresh(){setupNav();upgradeOverview();enrichDetail()}
  setupNav();refresh();
  const root=document.getElementById('view');if(root)new MutationObserver(refresh).observe(root,{childList:true,subtree:true});
  const detail=document.getElementById('detailContent');if(detail)new MutationObserver(enrichDetail).observe(detail,{childList:true,subtree:true});
  document.addEventListener('engineer-language-changed',()=>{setupNav();if(activePage==='assessments')assessmentPage();else if(activePage==='gaps')gapPage();else if(activePage==='contradictions')contradictionPage();else upgradeOverview()});
  window.ENGINEER_V41_INTELLIGENCE={assessmentPage,gapPage,contradictionPage,upgradeOverview,enrichDetail,nativeAssessments,nativeGaps,nativeContradictions};
})();
