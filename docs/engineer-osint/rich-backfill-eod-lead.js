(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const leads=D.leads?.leads||[];
  const lead=leads.find(x=>x.id==='LEAD-001');
  if(!lead)return;
  lead.title=lead.title||'EOC standardization / annex-study-draft identification';
  lead.note=[lead.note,'68th NATO EOD WG public record states that EOC minimum standards of proficiency will be re-defined with support from the MILENG community; EOD COE also presented analysis of EOC tasks in NATO operations. Exact designation of the later annex / study draft remains unresolved in the checked public material.'].filter(Boolean).join(' ');
  lead.source_ids=[...new Set([...(lead.source_ids||[]),'RICH-SRC-013'])];
  lead.provenance_granularity='CLAIM_LEVEL';
  lead.claims=[...(lead.claims||[]),{text:'The 68th NATO EOD WG public record states that EOC minimum standards of proficiency will be re-defined with support of the MILENG community.',classification:'FACT',source_ids:['RICH-SRC-013']},{text:'The same public record states that EOD COE presented analysis regarding EOC tasks in NATO operations.',classification:'FACT',source_ids:['RICH-SRC-013']},{text:'The exact designation of the later EOC annex / study draft is not disclosed by the 68th WG public record.',classification:'INFERENCE',source_ids:['RICH-SRC-013']}];
  lead.rich_backfill_status='PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION';
})();