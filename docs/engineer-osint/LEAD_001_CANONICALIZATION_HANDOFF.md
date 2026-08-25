# ENGINEER OSINT — LEAD-001 canonicalization handoff

Status: **PENDING_NEXT_DRIVE_BACKED_SUCCESS**

Prepared against: **GitHub and Drive tip `engineer-osint-20260825-B74`**

Purpose: retire the first legacy factual runtime overlay without losing public facts or provenance.

Preparation evidence (2026-08-26 00:58 Europe/Prague): GitHub API `main`
was `5a63a2ed86b03cbe11ec79f802e537c121c1d6fb`; the equivalent local B74
commit `cc37b859c67c6f8510143769924f32e656771827` had the same tree
`129df5b07c8e192cb933207f4daa4d4c4a51ff0d`. Raw Drive read-back of file
`15bS-RG027bqOW_sfVR2Wk_NL_omWhf-t` parsed as B74 `SUCCESS`, parent B73,
window end and next boundary `2026-08-25T23:39:48+02:00`. These values are
historical preparation evidence only and must be re-read before use.

The same preparation audit found a B73 lock file whose lease expired at
`2026-08-26T00:20:43+02:00`. The next factual producer must apply the existing
orphan-lock recovery protocol and verify lock ownership; this handoff does not
authorize manual deletion of that file.

## Authority and lineage gate

This document is a reviewed input, not a canonical factual run. Before use,
re-read the current Google Drive `engineer_osint_state_latest.json`, factual
lock and GitHub run-store manifest.

- Never create a repository-only B75 (or any later run) from this handoff.
- The migration must be included in the next normal, immutable,
  raw-read-back-verified Drive SUCCESS whose parent is the live
  `FACTUAL_SUCCESS_TIP`.
- If another run already owns the next run ID, rebase this handoff onto its
  successor. Do not compete for or reuse a run ID.
- Publish the exact Drive-finalized patch through `append-run.mjs` in normal
  parent order. Drive SUCCESS is not public deployment.

## Canonical LEAD-001 delta

Re-read the live canonical LEAD-001 immediately before finalization and
preserve its current priority, status, next action, notes, titles and source
IDs. The reviewed B74 lead has no canonical `claims` array and already uses
`ENG-SRC-0260` and `ENG-SRC-0261`. If either fact changed, stop and re-review
the merge; `lead_updates` replaces `claims` rather than appending them.

The minimum-standards fact and the unresolved-identifier conclusion already
exist in the canonical note/status/next-action fields. Do not duplicate them
as new claims. Add only the genuinely missing bilingual claim:

- `claim_id: LEAD-001-CLAIM-EODCOE-ANALYSIS`
- classification: `FACT`
- EN: `The same public record states that EOD COE presented analysis regarding EOC tasks in NATO operations.`
- CS: `Tentýž veřejný záznam uvádí, že EOD COE prezentovalo analýzu týkající se úkolů EOC v operacích NATO.`
- source IDs: `ENG-SRC-0261`

The claim must carry `text`, `text_en`, `text_cs`, `classification` and
`source_ids`. Keep top-level `lead_id` and `id` equal to `LEAD-001`, and set
the complete top-level source union explicitly to `ENG-SRC-0260` and
`ENG-SRC-0261`. Do not introduce `RICH-SRC-013`, `rich_backfill_status` or a
blanket provenance marker for superseded overlay content.

The wording records what the public meeting page says. It does not establish
publication of the underlying analysis, NATO validation of its findings,
promulgation of a standard or the exact annex/study identifier.

Include this delta in the next complete regular research run. Do not create a
migration-only factual run from this handoff or advance the research boundary
without the required sweep. Add `ENTITY_ENRICHMENT=1`, `CONFIRMATION=1` and
`LEAD=1` to that run's genuine counts; all other counts must describe the
actual research result.
Set `qa.multimedia_status=COMPLETE_NO_CANONICAL_MEDIA_ADDITION` only if the
run's actual media result supports that value; never copy it mechanically over
a different media outcome.

## Atomic publication companion

Only after the Drive-backed patch above is available and validates, the same
publication PR may:

1. append the immutable run;
2. remove `rich-backfill-eod-lead.js` from
   `LEGACY_FACTUAL_OVERLAY_MODULES`;
3. remove only its entry from `legacy-runtime-overlay-baseline.json`;
4. keep the source file as an inactive forensic artifact;
5. update `LEGACY_OVERLAY_MIGRATION_INVENTORY.md` while keeping
   `PRESENTATION_FACT_OVERLAY_GAP=OPEN` for the remaining modules.

Do not globally remove `RICH-SRC-013`: another still-active legacy overlay
creates and uses it. Do not restore the old LEAD overlay as a post-merge
rollback; it is non-idempotent and would duplicate canonical claims. Published
append-only data is corrected forward with a new evidence-backed run.

## Required acceptance checks

- strict schema, counts, parent and canonical hash chain PASS;
- exactly one `LEAD-001-CLAIM-EODCOE-ANALYSIS` claim and no duplicate claim;
- exact bilingual meaning, `FACT` classification and nested `ENG-SRC-0261` ref;
- no `RICH-SRC-013` or `rich_backfill_status` on LEAD-001;
- top-level source union is exactly `ENG-SRC-0260` + `ENG-SRC-0261`;
- priority, status, next action, note, minimum-standards fact and unresolved
  conclusion are preserved;
- legacy overlay module count decreases from five to four and its five runtime
  mutations disappear;
- full tests, build, runtime audit, PUBLIC-CZ audit/ratchet and CZ→EN→CZ PASS;
- built HTML does not contain `engineer-rich-backfill-eod-lead-module`;
- public read-back reports the new run and zero i18n rendering failures.
