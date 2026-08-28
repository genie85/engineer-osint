# ENGINEER OSINT — Intelligence Extension v1

Status: **implemented contract; materialization activates on first run that carries `extensions.intelligence_v1`**.

## Purpose

ENGINEER OSINT v4 separates analytical products from factual entity records. Three versioned canonical collections are introduced without rewriting the historical B61+ append-only chain:

- `ENG-ASMT-*` — analytical assessments,
- `ENG-GAP-*` — intelligence gaps,
- `ENG-CONTRA-*` — explicit contradictions between sourced claims.

The extension is carried inside the existing `engineer-osint-patch-v1` envelope as `extensions.intelligence_v1`. Historical runs that do not contain the extension materialize exactly as before.

## Hash-chain compatibility

The run-store MUST NOT create empty intelligence collections while replaying historical patches. The top-level canonical collections are created only when a patch actually contains `extensions.intelligence_v1`, or when a later versioned correction targets an already materialized intelligence object.

This preserves all pre-extension canonical digests. The first run carrying Intelligence v1 receives a new canonical digest in the normal append-only manner.

## Assessments — `ENG-ASMT-*`

An assessment is an analytical conclusion, not a factual source record. It requires:

- stable `assessment_id`,
- assessment text in at least one supported language,
- explicit `confidence`,
- one or more `supporting_evidence_ids`,
- one or more `source_ids`,
- `last_reviewed`.

Recommended fields include `related_ids`, limitations, what could change the assessment, geography, topics and validity dates.

## Intelligence gaps — `ENG-GAP-*`

A gap records a question the public evidence cannot yet answer. It requires:

- stable `gap_id`,
- question text,
- `priority`,
- lifecycle `status`,
- `related_ids`,
- `sources_checked`,
- `first_opened`,
- `last_checked`.

Supported lifecycle states in v1 are `OPEN`, `MONITORING`, `RESOLVED`, `CLOSED` and `BLOCKED`.

An empty `sources_checked` array is valid for a newly opened gap; the gap must not be interpreted as evidence that the underlying capability or event does not exist.

## Contradictions — `ENG-CONTRA-*`

A contradiction stores two incompatible sourced claims without forcing an automatic resolution. It requires:

- stable `contradiction_id`,
- topic,
- claim A and claim B,
- at least one source for each side,
- lifecycle `status`,
- `date_identified`,
- `confidence`.

Supported v1 states are `OPEN`, `UNDER_REVIEW`, `RESOLVED` and `SUPERSEDED`.

## References and integrity

After materialization:

- assessment `source_ids` must resolve to canonical sources,
- assessment `supporting_evidence_ids` must resolve to canonical evidence,
- gap `sources_checked` must resolve to canonical sources,
- contradiction A/B source IDs must resolve to canonical sources,
- `related_ids` must resolve to a known canonical object.

Missing references fail canonical materialization.

## Corrections and retractions

`extensions.operations_v1` supports the new collections `assessments`, `gaps` and `contradictions`. Stable identifiers and `first_seen_run` are protected fields. Corrections therefore remain explicit, sourced and append-only; silent mutation is forbidden.

## Public rendering

The public v4.1 UI prefers native canonical Intelligence v1 collections. Until the first such objects are produced, it may show clearly labelled legacy compatibility views derived from existing record-level analysis/gap fields. Compatibility views MUST NOT be labelled canonical Intelligence v1.
