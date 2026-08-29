# ENGINEER OSINT v4.5.5 — exact Stage A patch candidate

Status: **READ-ONLY PRE-APPEND GATE**

This slice turns the reviewed v4.5.4 Stage A templates into one exact strict patch candidate for the current canonical tip. It does not append that patch.

## Candidate identity

- proposed run: `engineer-osint-20260829-B96`
- required parent: `engineer-osint-20260826-B95`
- proposed migration date: `2026-08-29`
- scope: the first three pinned factual overlays only
- identity-fix overlay: explicitly out of scope

The candidate is fail-closed on staleness. If the canonical tip is no longer B95, generation fails and a new candidate must be reviewed against the new parent.

## Exact append-run validation

`build-overlay-stage-a-candidate.mjs` emits `overlay-stage-a-patch-candidate.json` into the disposable Pages build directory. The Pages workflow then runs the repository's normal `append-run.mjs` **without `--write`**. This exercises the same strict schema, parent, operation, reference and canonical-hash path that a real append would use.

The workflow additionally fingerprints `data/run-store-manifest.json`, counts `data/runs/*.json` before and after the dry-run, and runs `git diff --exit-code -- docs/engineer-osint/data`. Any persistent write is therefore a hard deployment failure.

The dry-run publishes `overlay-stage-a-append-plan.json`, which contains the exact proposed manifest entry including the candidate file SHA-256 and resulting canonical SHA-256. This is review evidence only; it is not a manifest update.

## Stage A content

The candidate contains:

- 104 reviewed `operations_v1.REPLACE_FIELD` operations;
- 15 reviewed primary-source appends;
- the resolved SDZ machine-only weight of `10.7 t`;
- the narrowed Namer wording from the reviewed IMOD source scope;
- source-ID unions that preserve prior canonical provenance;
- `last_verified_date` values set to the candidate run date rather than copied from the old presentation overlays.

It deliberately omits:

- the BLT Arjun `PUBLIC_DATA_NOT_FOUND` weight sentinel;
- legacy `rich_backfill_status` and presentation migration notes;
- the 19 analytical fields reserved for native Intelligence v1 Stage B;
- every identity-fix/manual-removal item.

## Post-Stage-A impact audit

`audit-overlay-stage-a-impact.mjs` applies the candidate only in memory and then re-runs the first three legacy overlays in their runtime order. Remaining mutations are permitted only when they map to an already reviewed transition-debt decision from v4.5.4:

- Stage B Intelligence v1 objectization;
- source-ID union versus legacy replacement behavior;
- real-run verification dates versus legacy fixed dates;
- explicit no-write legacy metadata;
- the reviewed SDZ/Namer value corrections or narrowing;
- the intentionally omitted BLT absence sentinel.

Any other residual signature fails CI. Expected residuals are not waived: they quantify why the overlays cannot yet be retired immediately after Stage A.

## Safety

`safe_to_append=false` and `safe_to_retire_overlays=false` remain mandatory. v4.5.5 creates a precise reviewed candidate and its expected hashes, but a real append requires a separate explicit production slice. That future slice must re-check the canonical tip, use the normal `append-run.mjs ... --write` path, preserve the reviewed patch bytes or regenerate/re-review them if stale, and must not retire the overlays in the same action.
