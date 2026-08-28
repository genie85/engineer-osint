# ENGINEER OSINT v4.2 — Situation Hubs

V4.2 replaces the simple GEO-P1/P2/P3 list renderer with thematic, data-derived public intelligence hubs.

The hubs are presentation-only. They do not create, modify, or canonicalize factual values.

Each hub separates:

1. Current Situation — current-run delta where present, otherwise the latest known canonical records with an explicit fallback notice.
2. Engineering Developments — events, signals, units, doctrine/documents, TTP and lessons.
3. Technology & Trends — technology and trend records.
4. Key Assessments — canonical Intelligence v1 objects when available; otherwise clearly labelled legacy analytical fields.
5. Intelligence Gaps — canonical Intelligence v1 gaps when available; otherwise clearly labelled legacy gap/lead fields.
6. Source Contradictions — canonical Intelligence v1 contradictions when available; otherwise clearly labelled legacy contradiction fields.
7. Evidence Layer — only evidence objects explicitly related to records in the selected GEO set.

## GEO semantics

GEO-P1 = Russia–Ukraine.
GEO-P2 = Czech Republic.
GEO-P3 = remainder of the dataset after P1/P2 matching.

The GEO classification is a derived public filter based on explicit country/geographic metadata and, only where explicit country metadata is absent, the public record text. It is not written back to canonical data.

## Evidence constraint

Evidence is included only when a canonical relationship (`record_id`, `related_record_id`, `target_id`, `related_ids`, or `related_record_ids`) connects it to a record in the selected GEO set. Text-only geographic matching is intentionally not used for the Evidence Layer.
