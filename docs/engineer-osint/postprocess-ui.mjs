import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const out='docs/engineer-osint-dist';
const src='docs/engineer-osint';
const index=join(out,'index.html');
let html=readFileSync(index,'utf8');
const modules=[
  ['engineer-rich-backfill-module','rich-backfill.js'],
  ['engineer-rich-backfill-israel-turkiye-eod-module','rich-backfill-israel-turkiye-eod.js'],
  ['engineer-rich-backfill-eod-lead-module','rich-backfill-eod-lead.js'],
  ['engineer-rich-backfill-usa-rok-module','rich-backfill-usa-rok.js'],
  ['engineer-i18n-terminology-module','i18n-terminology.js'],
  ['engineer-i18n-content-cs-module','i18n-content-cs.js'],
  ['engineer-i18n-content-cs-usa-rok-module','i18n-content-cs-usa-rok.js'],
  ['engineer-i18n-content-cs-japan-australia-module','i18n-content-cs-japan-australia.js'],
  ['engineer-i18n-content-cs-france-germany-poland-module','i18n-content-cs-france-germany-poland.js'],
  ['engineer-ui-phase2-module','ui-phase2.js'],
  ['engineer-ui-phase3-module','ui-phase3.js'],
  ['engineer-ui-phase4-module','ui-phase4.js'],
  ['engineer-ui-phase5-module','ui-phase5.js'],
  ['engineer-ui-phase6-i18n-module','ui-phase6-i18n.js'],
  ['engineer-rich-topic-australia-nato-eod-module','rich-topic-australia-nato-eod.js'],
  ['engineer-topic-czech-engineers-eod-module','ui-topic-czech-engineers-eod.js'],
  ['engineer-ui-phase7-media-module','ui-phase7-media.js'],
  ['engineer-ui-phase8-navigation-module','ui-phase8-navigation.js']
];
for(const [id,file] of modules){const js=readFileSync(join(src,file),'utf8');if(!html.includes(id))html=html.replace('</body>',`<script id="${id}">${js}</script></body>`)}
writeFileSync(index,html,'utf8');
const health=join(out,'health.txt');let h='';try{h=readFileSync(health,'utf8')}catch{}
const flags=[
  'entity_timeline=enabled','watchlist_health=enabled','graph_search=enabled','temporal_intelligence=enabled','historical_backfill=enabled','temporal_status=enabled','current_state_vs_timeline=enabled','historical_coverage_backlog=enabled','current_confirmation_gap=enabled','temporal_audit=enabled',
  'technology_maturity=enabled','coverage_matrix=enabled','staff_training_relevance=enabled','claim_level_provenance=enabled','visual_gallery=enabled','claim_source_map=enabled','compare_related_visuals=enabled','coverage_drilldown=enabled','maturity_history=enabled','rich_entity_cards=enabled','card_completeness=enabled','information_age=enabled','entity_enrichment_backlog=enabled','topic_page_eod_cied_eoc_eor=enabled','topic_page_australia_nato_eod=enabled','topic_page_czech_engineers_eod=enabled','rich_content_backfill=enabled','rich_content_backfill_entities=11','rich_backfill_israel_turkiye_eod=enabled','rich_backfill_eoc_lead=enabled','rich_backfill_usa_rok=enabled','i18n=enabled','i18n_cs=enabled','i18n_en=enabled','terminology_registry=enabled','translation_fallback=enabled','i18n_usa_rok=enabled','i18n_japan_australia=enabled','i18n_france_germany_poland=enabled','i18n_observer_fix=enabled','translation_registry_version=1.3','czech_republic_priority=enabled','czech_historical_priority=enabled','visual_first_tech_cards=enabled','visual_gap_tracking=enabled','media_hub=enabled','worth_watching=enabled','worth_listening=enabled','media_registry_support=enabled',
  'entity_navigation=enabled','units_navigation=enabled','technology_signals_navigation=enabled','translation_audit_view=enabled','localized_entity_rendering=enabled','localized_claim_rendering=enabled','localized_rich_cards=enabled'
];
for(const f of flags)if(!h.includes(f))h+=f+'\n';writeFileSync(health,h,'utf8');console.log('ENGINEER OSINT bilingual visual-first multimedia temporal-intelligence navigation postprocess enabled');
