# ENGINEER OSINT — legacy factual overlay migration inventory

Status: **EO-P2 inventory; first slice prepared, awaiting Drive-backed canonical run**

Version: **1.1**

Baseline: **`main` `5a63a2ed86b03cbe11ec79f802e537c121c1d6fb`, public run B74**
Generated: **2026-08-25**

## Purpose

This document is the item-level migration inventory for the five modules pinned
by `legacy-runtime-overlay-baseline.json`. It separates migration severity from
migration complexity and defines the smallest rollback-safe first slice.

The inventory was produced by executing each module in its declared runtime
order against a structured clone of the B70 canonical run-store materialization
and comparing the complete object graph before and after each module. File
SHA-256 values still match the pinned baseline.

This is not permission to copy the runtime values into canonical data. Every
factual field and source mapping still requires evidence review, strict patch
validation and the normal append-only publication path.

## Summary

| Module | B61 pinned mutations | B70 observed mutations | Factual targets | Added runtime sources | Preliminary disposition |
|---|---:|---:|---:|---:|---|
| `rich-backfill.js` | 77 | 77 | 5 records | 6 | `REVIEW_CANONICALIZE_ITEMWISE` |
| `rich-backfill-israel-turkiye-eod.js` | 88 | 89 | 9 records | 7 | `DEFER_SPLIT_DYNAMIC_EOC_FROM_ENTITY_ENRICHMENT` |
| `rich-backfill-eod-lead.js` | 5 | 5 | 1 lead | 0, depends on `RICH-SRC-013` | `FIRST_SLICE_REJECT_SUPERSEDED_OR_CANONICALIZE_DELTA_ONLY` |
| `rich-backfill-usa-rok.js` | 23 | 23 | 1 record + 1 visual | 2 | `REVIEW_CANONICALIZE_AFTER_SOURCE_MAPPING` |
| `data-integrity-identity-fixes.js` | 55 | 70 | 2 records + 1 evidence + 1 visual, including mirrors | 0 | `CRITICAL_CANONICAL_CORRECTION` |
| **Total** | **248** | **264** | **21 unique factual/lead/visual/evidence IDs** | **15 runtime source IDs** | |

The B70 count increase is not a file change. The Israel/Türkiye module now adds
one metadata mutation, and the identity module reaches duplicated
materialized/mirror copies in `dashboard_patch_extras`. Mutation counts are
diagnostics, not a claim that every changed path is an independent fact.

## Source alias inventory

Exact normalized URL comparison against canonical `ENG-SRC-*` entries:

| Runtime source | Exact canonical URL match | Decision needed |
|---|---|---|
| `RICH-SRC-001` | `ENG-SRC-0203`, `ENG-SRC-0417` | choose canonical owner; do not create another source |
| `RICH-SRC-002` | `ENG-SRC-0204` | map alias |
| `RICH-SRC-003` | `ENG-SRC-0206` | map alias |
| `RICH-SRC-004` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-005` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-006` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-007` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-008` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-009` | none | validate deep link and mobile/canonical URL identity |
| `RICH-SRC-010` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-011` | none | validate deep link, then create/reuse canonical source |
| `RICH-SRC-012` | `ENG-SRC-0100` | map alias |
| `RICH-SRC-013` | `ENG-SRC-0137`, `ENG-SRC-0230`, `ENG-SRC-0261`, `ENG-SRC-0464` | resolve duplicate canonical ownership; LEAD-001 already uses `ENG-SRC-0261` |
| `RICH-SRC-014` | `ENG-SRC-0431` | map alias |
| `RICH-SRC-015` | none | validate whether it is distinct from later DVIDS/Army media URLs |

No migration may preserve a `RICH-SRC-*` reference in the canonical run store.
No exact URL match is not proof that a source is absent: title, redirect and
publisher reconciliation must still run before a new `ENG-SRC-*` is created.

## Module 1 — `rich-backfill.js`

File SHA-256:
`ab586191861c2eaaa910b1bf612782fad202157ef9fc9d47944e6e5950cd1c80`

The helper replaces/assigns factual fields and then merges its runtime source
IDs. Current target inventory:

| ID | B70 changes | Changed field groups | Source dependency | Initial decision |
|---|---:|---|---|---|
| `ENG-TECH-0011` | 15 | `summary_cs`, manufacturer, remote control, weight, engineering equipment, operational evidence, intelligence gaps, claims, provenance, sources | `RICH-SRC-001` | compare field-by-field with newer B13 canonical data; map to `ENG-SRC-0203` or resolved duplicate owner |
| `ENG-TECH-0012` | 17 | `summary_cs`, manufacturer, technical/operational profile, intelligence gaps, evidence date, claims, provenance, sources | `RICH-SRC-002` | do not overwrite newer SYFRALL milestones; delta-only review with `ENG-SRC-0204` |
| `ENG-TECH-0014` | 18 | `summary_cs`, manufacturer, crew, weight, equipment, technical/operational profile, intelligence gaps, claims, sources | `RICH-SRC-003` | delta-only review with `ENG-SRC-0206` |
| `ENG-TECH-0015` | 10 | `summary_cs`, manufacturer, technical/operational profile, intelligence gaps, verification date, claims, provenance, sources | `RICH-SRC-004` | source validation required before canonicalization |
| `ENG-SIG-0007` | 11 | `summary_cs`, maturity, technical/operational profile, intelligence gaps, claims, provenance, sources | `RICH-SRC-005/006` | source validation and bilingual claim review required |
| `RICH-SRC-001..006` | 6 whole-object additions | source registry entries | URLs above | map three aliases; review/create three sources |

Risk: full-object copying would overwrite newer canonical values. Migrate one
record/source group per run and preserve only verified missing deltas.

## Module 2 — `rich-backfill-israel-turkiye-eod.js`

File SHA-256:
`f5a68655b2fbef6e5db049c708ff503cdf86fb4ed8a3363a9ae960b17386cb30`

The module combines explicit entity enrichment with a dynamic regex-selected
EOC fan-out. These concerns must be split before migration.

### Explicit entity targets

| ID | B70 changes | Changed field groups | Source dependency | Initial decision |
|---|---:|---|---|---|
| `ENG-UNIT-0012` | 14 | mission, organization, equipment, operational evidence, gaps, dates, claims, provenance, `summary_cs`, sources | `RICH-SRC-007..009` | validate IDF sources; do not infer NATO EOD/EOC equivalence |
| `ENG-TECH-0013` | 12 | manufacturer, technical/operational profile, gaps, dates, claims, provenance, `summary_cs`, sources | `RICH-SRC-010/011` | generic Namer evidence must not prove a specific engineering configuration |
| `ENG-UNIT-0013` | 10 | mission, operational evidence, gaps, dates, claims, provenance, `summary_cs`, sources | `RICH-SRC-012` | map source to `ENG-SRC-0100`; delta-only review |
| `ENG-EVT-0021` | 14 | location, date, participants, capability, evidence, limits, gaps, claims, provenance, `summary_cs`, sources | `RICH-SRC-012` | map source to `ENG-SRC-0100`; preserve explicit unknown bridge model/MLC |

### Dynamic EOC targets

| ID | B70 changes | Changed field groups | Risk |
|---|---:|---|---|
| `CZECH_EOD_FORCE_DESIGN_BASELINE` | 9 | EOC evidence, gaps, verification date, sources | replaces five newer canonical sources with one old runtime alias |
| `ENG-DOC-0051` | 5 | EOC evidence, gaps, verification date, sources | canonical B41 already uses stronger `ENG-SRC-0464` + evidence |
| `ENG-DOC-0053` | 7 | EOC evidence, gaps, verification date, sources | overwrites three newer source mappings |
| `ENG-EVT-0002` | 5 | EOC evidence, gaps, verification date, sources | regex-selected denormalized copy |
| `ENG-EVT-0020` | 5 | EOC evidence, gaps, verification date, sources | regex-selected denormalized copy |

The dynamic EOC text must not be copied into all targets. Reconstruct explicit
source/evidence relations and keep shared interpretation in one canonical
document/evidence object where possible.

## Module 3 — `rich-backfill-eod-lead.js`

File SHA-256:
`66b7c68dcdbfc9d96d89b8b07557fc308e6c09ae3ad69fadf32928530092bc3b`

| ID | B70 changes | Changed fields | Current canonical evidence | Initial decision |
|---|---:|---|---|---|
| `LEAD-001` | 5 | appended `note`, `source_ids`, provenance, three claims, migration marker | B51 lead already uses `ENG-SRC-0260/0261`, includes the 68th/69th WG conclusion and preserves the unresolved identifier | first slice; reject superseded text or canonicalize only a proven unique delta |

The module is order-dependent and non-idempotent: it assumes `RICH-SRC-013`
was created by Module 2 and appends note/claim content. `RICH-SRC-013` is a URL
duplicate of the already linked `ENG-SRC-0261`.

Proposed first-slice decision:

1. classify `RICH-SRC-013 → ENG-SRC-0261` as a duplicate alias for this lead;
2. preserve current lead status, next action, unresolved conclusion and
   `ENG-SRC-0260/0261` mapping;
3. compare the three overlay claims with the current source and retain only a
   genuinely missing, bilingual, source-supported delta;
4. remove the module from runtime and its baseline entry after semantic
   before/after comparison;
5. do not delete the archived module file without separate approval.

Implementation status at B74: the positional-translation hazard has been
removed and a semantic regression test added. The exact reviewed factual
handoff is recorded in `LEAD_001_CANONICALIZATION_HANDOFF.md`. The runtime
overlay remains active until the same claims exist in a full Drive-backed
SUCCESS and can be retired atomically during its GitHub publication. A
repository-only run is forbidden because it would place `PUBLISHED_TIP` ahead
of `FACTUAL_SUCCESS_TIP` and collide with the next factual run ID.

## Module 4 — `rich-backfill-usa-rok.js`

File SHA-256:
`6b3542e58469e0eba6c12152c3ae815e676254b279d55b4691e91bce3688d877`

| ID | B70 changes | Changed field groups | Source dependency | Initial decision |
|---|---:|---|---|---|
| `ENG-SIG-0006` | 16 | `summary_en`, maturity, technical/testing/operational evidence, relevance, gaps, dates, claims, provenance, sources | `RICH-SRC-014/015` | map `014→ENG-SRC-0431`; validate `015`; canonicalize bilingual delta only |
| `ENG-VIS-0009` | 4 | source IDs, verification date/note, migration marker | `RICH-SRC-014/015` | normalize visual relation/source fields and preserve metadata-only limitation |

The quarantined ROK mappings are not migration targets and must not be promoted.

## Module 5 — `data-integrity-identity-fixes.js`

File SHA-256:
`7c03bc97f329a030cba48c4f24f8281b3966feb2f66c477fbb949893c7b9d2fc`

This module is the highest-severity debt because the canonical pre-overlay B70
state still contains identity collisions. It is not the smallest migration.

| ID | B70 changes | Correction performed | Migration requirement |
|---|---:|---|---|
| `ENG-TECH-0032` | 2 | binds NEO-1 source `ENG-SRC-0403` and evidence `ENG-EVID-0113` | correction operation plus cross-reference test |
| `ENG-EVID-0113` | 2 copies | rebinds `related_ids` exclusively to `ENG-TECH-0032` | update canonical and mirror materialization consistently |
| `ENG-TECH-0036` | 36 across two copies | restores SIRKO-S1 identity, canonical text, temporal/classification data, source `ENG-SRC-0372`, evidence `ENG-EVID-0080`; removes NEO timeline fields | atomic identity correction; verify no legitimate newer field is lost |
| `ENG-VIS-0054` | 30 across two copies | restores Katyusha/Flot-2026 relation, sources `ENG-SRC-0238/0239`, captions, verification/rights/limits; removes Czech EOD-gallery collision fields | atomic visual correction plus browser/detail/export canary |

The existing hard assertions must move into persistent regression tests before
the runtime module is removed. Re-enabling this overlay after canonicalization
could duplicate or overwrite corrected values and is not a safe rollback.

## Priority model

Two priorities must not be conflated:

1. **Migration-risk pilot:** `rich-backfill-eod-lead.js` is the smallest safe
   first slice: one lead, five mutations, no new canonical source and strong
   evidence that the runtime addition is superseded.
2. **Data-severity priority:** `data-integrity-identity-fixes.js` is the most
   important debt because it corrects wrong canonical identities. It should be
   the next dedicated atomic correction after the first-slice process is proven.

Recommended sequence:

1. LEAD-001 first-slice rejection/delta-only canonicalization;
2. atomic SIRKO/NEO/Katyusha identity correction;
3. `rich-backfill.js` one record/source group at a time;
4. USA record + visual after source mapping;
5. split and replace dynamic EOC fan-out;
6. Israel/Türkiye entity enrichment after source validation.

## Required QA for every slice

1. fresh `main`, open-PR and ownership check;
2. exact canonical-before, overlay-resolved-before and candidate-after semantic
   diff for every affected ID;
3. source URL/title/publisher/date validation and explicit `RICH-SRC → ENG-SRC`
   mapping;
4. duplicate canonical URL check;
5. strict patch counts and run-store append validation;
6. record/source/evidence/visual/relation orphan checks after materialization;
7. complete Czech and English public text, including retained claims;
8. full Node tests, build, runtime audit, PUBLIC-CZ audit/ratchet and all canaries;
9. browser smoke for every affected record/lead/visual detail;
10. post-merge deploy and public read-back;
11. update this inventory, the baseline and `PRESENTATION_FACT_OVERLAY_GAP`.

Rollback before merge is branch disposal. After an immutable correction run is
published, rollback is a new evidence-backed correction run plus restoration of
the previous public artifact if required. Re-enabling a removed non-idempotent
overlay over already canonicalized data is not an approved rollback method.
