# ENGINEER OSINT — Architecture Contract v3.7.1

This file mirrors the architectural consolidation approved for the canonical Google Drive master prompt. The Google Drive master prompt remains authoritative if this file and the canonical document ever differ.

## Canonical data flow

`Google Drive canonical state/registries → b11-patch/dashboard materialization → build → renderer/UI → GitHub Pages`

The public dashboard is not an independent source of factual truth.

## Priority namespaces

- `GEO-P1` — Russia–Ukraine conflict
- `GEO-P2` — Czech Republic
- `GEO-P3` — rest of world
- `TG-P1/TG-P2/TG-P3` — Telegram watchlist priority only
- `DASH-P0/DASH-P1/...` — dashboard roadmap priority only
- `RECORD-P1/RECORD-P2/RECORD-P3` or explicit `record_priority` — entity/lead/proposal processing priority

Do not use an unqualified `P1/P2/P3` in new structures where the namespace could be ambiguous.

## Presentation-layer rule

Renderer, navigation and analytical UI modules may:

- render canonical data;
- filter/search/sort;
- localize labels;
- calculate clearly labelled presentation derivatives;
- create visual summaries from canonical data.

They must not permanently create or silently change factual entity values, claims, source mappings, temporal observations, relation/evidence objects or intelligence gaps that are absent from the persistent canonical/publishing data layer.

## Legacy presentation enrichment migration

Current legacy modules such as `rich-backfill*.js` and translation runtime overlays are considered a migration backlog where they mutate factual or translated entity fields at runtime.

Every affected item should eventually be classified as:

- `CANONICALIZED`
- `REJECTED`
- `DEFERRED`

After canonicalization/rejection, the matching runtime factual mutation should be removed. A module that remains presentation-only may stay if it only renders or transforms already persistent data without changing factual meaning.

## Translation persistence

CZ/EN translations should be persisted in the data layer consumed by dashboard materialization, with translation provenance/status and original-language fields retained. Runtime translation overlays are temporary migration/recovery mechanisms, not the target architecture.

## Publication path

ENGINEER OSINT public publication uses GitHub Pages from `genie85/engineer-osint/main`.

Netlify is not part of the ENGINEER OSINT publication chain.

Expected status layers remain separate:

- canonical research run
- dashboard data
- dashboard build
- static regression
- browser regression
- public deploy
- public read-back

## Geographic reporting order

Human-readable reports and high-level dashboard emphasis should follow:

1. `GEO-P1` Russia–Ukraine
2. `GEO-P2` Czech Republic
3. `GEO-P3` rest of world

The Czech Republic remains a mandatory separate section even when the result is `NO MATERIAL UPDATE`.

## Temporal model

Regular collection is not delta-only. The intended model is:

`CURRENT DELTA + HISTORICAL BACKFILL + ENTITY/TOPIC ENRICHMENT`

Historical information must remain visible in timeline context and must not be presented as current without current confirmation.

## QA invariant

QA should flag `PRESENTATION_FACT_OVERLAY_GAP` whenever the public build still depends on a runtime module that mutates factual fields outside the canonical/persistent data flow. Such a finding is a migration/architecture issue unless the canonical data itself is incorrect.
