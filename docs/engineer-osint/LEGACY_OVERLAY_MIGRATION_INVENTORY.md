# ENGINEER OSINT — legacy factual overlay migration inventory

Status: **EO-P2 inventory; first slice completed in Drive-backed B75, four overlays remain**

Version: **1.2**

Baseline: **public run B75 publication candidate; original five-module baseline prepared at B74**
Generated: **2026-08-25; updated 2026-08-27**

## Purpose

This document is the item-level migration inventory for the legacy factual runtime overlays pinned by `legacy-runtime-overlay-baseline.json`. It separates migration severity from migration complexity and records completed slices without hiding the remaining presentation/fact overlay debt.

The original inventory was produced by executing each module in its declared runtime order against a structured clone of the B70 canonical run-store materialization and comparing the complete object graph before and after each module. Migration decisions still require evidence review, strict patch validation and the normal append-only publication path.

## Summary

| Module | B61 pinned mutations | B70 observed mutations | Factual targets | Added runtime sources | Disposition |
|---|---:|---:|---:|---:|---|
| `rich-backfill.js` | 77 | 77 | 5 records | 6 | `REVIEW_CANONICALIZE_ITEMWISE` |
| `rich-backfill-israel-turkiye-eod.js` | 88 | 89 | 9 records | 7 | `DEFER_SPLIT_DYNAMIC_EOC_FROM_ENTITY_ENRICHMENT` |
| `rich-backfill-eod-lead.js` | 5 | 5 | 1 lead | 0, depended on `RICH-SRC-013` | **`RETIRED_BY_B75_CANONICAL_DELTA`** |
| `rich-backfill-usa-rok.js` | 23 | 23 | 1 record + 1 visual | 2 | `REVIEW_CANONICALIZE_AFTER_SOURCE_MAPPING` |
| `data-integrity-identity-fixes.js` | 55 | 70 | 2 records + 1 evidence + 1 visual, including mirrors | 0 | `CRITICAL_CANONICAL_CORRECTION` |

The B70 count increase was not a file change. The Israel/Türkiye module added one metadata mutation, and the identity module reached duplicated materialized/mirror copies in `dashboard_patch_extras`. Mutation counts are diagnostics, not a claim that every changed path is an independent fact.

`PRESENTATION_FACT_OVERLAY_GAP` remains **OPEN**: B75 retires only the LEAD-001 overlay. Four factual runtime overlays remain active.

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
| `RICH-SRC-013` | `ENG-SRC-0137`, `ENG-SRC-0230`, `ENG-SRC-0261`, `ENG-SRC-0464` | LEAD-001 migration uses canonical `ENG-SRC-0261`; alias remains relevant to another active overlay and must not be globally removed |
| `RICH-SRC-014` | `ENG-SRC-0431` | map alias |
| `RICH-SRC-015` | none | validate whether it is distinct from later DVIDS/Army media URLs |

No migration may preserve a `RICH-SRC-*` reference in the canonical run store. No exact URL match is not proof that a source is absent: title, redirect and publisher reconciliation must still run before a new `ENG-SRC-*` is created.

## Module 1 — `rich-backfill.js`

File SHA-256: `ab586191861c2eaaa910b1bf612782fad202157ef9fc9d47944e6e5950cd1c80`

The helper replaces/assigns factual fields and then merges its runtime source IDs. Current target inventory:

| ID | B70 changes | Source dependency | Initial decision |
|---|---:|---|---|
| `ENG-TECH-0011` | 15 | `RICH-SRC-001` | compare field-by-field with newer canonical data; resolve duplicate canonical source ownership |
| `ENG-TECH-0012` | 17 | `RICH-SRC-002` | do not overwrite newer SYFRALL milestones; delta-only review with `ENG-SRC-0204` |
| `ENG-TECH-0014` | 18 | `RICH-SRC-003` | delta-only review with `ENG-SRC-0206` |
| `ENG-TECH-0015` | 10 | `RICH-SRC-004` | source validation required before canonicalization |
| `ENG-SIG-0007` | 11 | `RICH-SRC-005/006` | source validation and bilingual claim review required |
| `RICH-SRC-001..006` | 6 whole-object additions | URLs above | map known aliases; review/create unresolved sources |

Risk: full-object copying would overwrite newer canonical values. Migrate one record/source group per run and preserve only verified missing deltas.

## Module 2 — `rich-backfill-israel-turkiye-eod.js`

File SHA-256: `f5a68655b2fbef6e5db049c708ff503cdf86fb4ed8a3363a9ae960b17386cb30`

The module combines explicit entity enrichment with a dynamic regex-selected EOC fan-out. These concerns must be split before migration.

### Explicit entity targets

| ID | B70 changes | Source dependency | Initial decision |
|---|---:|---|---|
| `ENG-UNIT-0012` | 14 | `RICH-SRC-007..009` | validate IDF sources; do not infer NATO EOD/EOC equivalence |
| `ENG-TECH-0013` | 12 | `RICH-SRC-010/011` | generic Namer evidence must not prove a specific engineering configuration |
| `ENG-UNIT-0013` | 10 | `RICH-SRC-012` | map source to `ENG-SRC-0100`; delta-only review |
| `ENG-EVT-0021` | 14 | `RICH-SRC-012` | map source to `ENG-SRC-0100`; preserve explicit unknown bridge model/MLC |

### Dynamic EOC targets

| ID | B70 changes | Risk |
|---|---:|---|
| `CZECH_EOD_FORCE_DESIGN_BASELINE` | 9 | replaces newer canonical sources with one old runtime alias |
| `ENG-DOC-0051` | 5 | canonical B41 already uses stronger `ENG-SRC-0464` + evidence |
| `ENG-DOC-0053` | 7 | overwrites newer source mappings |
| `ENG-EVT-0002` | 5 | regex-selected denormalized copy |
| `ENG-EVT-0020` | 5 | regex-selected denormalized copy |

The dynamic EOC text must not be copied into all targets. Reconstruct explicit source/evidence relations and keep shared interpretation in one canonical document/evidence object where possible.

## Module 3 — `rich-backfill-eod-lead.js` — RETIRED

File SHA-256 retained for forensic reference: `66b7c68dcdbfc9d96d89b8b07557fc308e6c09ae3ad69fadf32928530092bc3b`.

B75 is the Drive-backed canonicalization slice authorized by `LEAD_001_CANONICALIZATION_HANDOFF.md`. It preserves the canonical LEAD-001 status, priority, next action, notes and top-level `ENG-SRC-0260/0261` source union, and adds only the genuinely missing bilingual FACT claim `LEAD-001-CLAIM-EODCOE-ANALYSIS` supported by `ENG-SRC-0261`.

The legacy module was order-dependent and non-idempotent. Its `RICH-SRC-013` dependency is not carried onto LEAD-001. Publication of B75 therefore removes the module from `LEGACY_FACTUAL_OVERLAY_MODULES` and removes only its entry from `legacy-runtime-overlay-baseline.json`; the source file remains an inactive forensic artifact. `RICH-SRC-013` is not globally removed because another still-active overlay creates/uses it.

This slice does **not** establish publication of the underlying EOD COE analysis, NATO validation of findings, promulgation of a standard, or the exact annex/study identifier. Those boundaries remain as stated in the canonical lead.

## Module 4 — `rich-backfill-usa-rok.js`

File SHA-256: `6b3542e58469e0eba6c12152c3ae815e676254b279d55b4691e91bce3688d877`

| ID | B70 changes | Source dependency | Initial decision |
|---|---:|---|---|
| `ENG-SIG-0006` | 16 | `RICH-SRC-014/015` | map `014→ENG-SRC-0431`; validate `015`; canonicalize bilingual delta only |
| `ENG-VIS-0009` | 4 | `RICH-SRC-014/015` | normalize visual relation/source fields and preserve metadata-only limitation |

The quarantined ROK mappings are not migration targets and must not be promoted.

## Module 5 — `data-integrity-identity-fixes.js`

File SHA-256: `7c03bc97f329a030cba48c4f24f8281b3966feb2f66c477fbb949893c7b9d2fc`

This module is the highest-severity debt because the canonical pre-overlay state still contains identity collisions. It was not the smallest migration.

| ID | B70 changes | Correction performed | Migration requirement |
|---|---:|---|---|
| `ENG-TECH-0032` | 2 | binds NEO-1 source `ENG-SRC-0403` and evidence `ENG-EVID-0113` | correction operation plus cross-reference test |
| `ENG-EVID-0113` | 2 copies | rebinds `related_ids` exclusively to `ENG-TECH-0032` | update canonical and mirror materialization consistently |
| `ENG-TECH-0036` | 36 across two copies | restores SIRKO-S1 identity and removes NEO timeline fields | atomic identity correction; verify no legitimate newer field is lost |
| `ENG-VIS-0054` | 30 across two copies | restores Katyusha/Flot-2026 relation and removes Czech EOD-gallery collision fields | atomic visual correction plus browser/detail/export canary |

The existing hard assertions must move into persistent regression tests before the runtime module is removed. Re-enabling this overlay after canonicalization could duplicate or overwrite corrected values and is not a safe rollback.

## Priority model and remaining sequence

The LEAD-001 migration-risk pilot is complete with B75. Remaining priority is:

1. atomic SIRKO/NEO/Katyusha identity correction;
2. `rich-backfill.js` one record/source group at a time;
3. USA record + visual after source mapping;
4. split and replace dynamic EOC fan-out;
5. Israel/Türkiye entity enrichment after source validation.

## Required QA for every slice

1. fresh `main`, open-PR and ownership check;
2. exact canonical-before, overlay-resolved-before and candidate-after semantic diff for every affected ID;
3. source URL/title/publisher/date validation and explicit `RICH-SRC → ENG-SRC` mapping;
4. duplicate canonical URL check;
5. strict patch counts and run-store append validation;
6. record/source/evidence/visual/relation orphan checks after materialization;
7. complete Czech and English public text, including retained claims;
8. full Node tests, build, runtime audit, PUBLIC-CZ audit/ratchet and all canaries;
9. browser smoke for every affected record/lead/visual detail;
10. post-merge deploy and public read-back;
11. update this inventory, the baseline and `PRESENTATION_FACT_OVERLAY_GAP`.

Rollback before merge is branch disposal. After an immutable correction run is published, rollback is a new evidence-backed correction run plus restoration of the previous public artifact if required. Re-enabling a removed non-idempotent overlay over already canonicalized data is not an approved rollback method.
