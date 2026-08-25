# ENGINEER OSINT P1 run store

## Purpose

P1 replaces publication-time replay of every historical `b11-patch.json` revision with a frozen canonical B61 snapshot followed by a small, explicit append-only chain. This removes the full-Git-history build dependency while preserving the known legacy anomalies as immutable audit metadata.

## Files

- `data/snapshots/canonical-engineer-osint-20260823-B61.json` — canonical migration checkpoint.
- `data/run-store-manifest.json` — ordered file paths plus raw-file and canonical-state SHA-256 values.
- `data/runs/<RUN_ID>.json` — one immutable strict patch per successful post-B61 run.
- `b11-patch.json` — frozen B61 compatibility and forensic input; do not update after P1 activation.

## Adding a run

Create a complete strict patch on a fresh branch. Its parent must equal the current manifest tip. Validate it without changing the repository:

```bash
node docs/engineer-osint/append-run.mjs /path/to/fresh-patch.json
```

After review, materialize the run file and manifest update in the branch:

```bash
node docs/engineer-osint/append-run.mjs /path/to/fresh-patch.json --write
node docs/engineer-osint/validate-patch.mjs
node docs/engineer-osint/build-pages.mjs
node docs/engineer-osint/validate-runtime.mjs
```

The helper refuses stale parents and existing run paths. It computes the parent and resulting canonical hashes itself. Generated `.tmp` files from an interrupted local append are not canonical and must be reviewed before recovery; never force-replace an existing run.

An agent that cannot execute the repository helper must not fabricate hashes or place an unregistered JSON file in `data/runs`. It should preserve the validated candidate patch in the Drive research handoff for Codex intake.

## Research continuity versus publication continuity

The Drive factual chain and the GitHub publication chain have separate tips:

- `FACTUAL_SUCCESS_TIP` is the verified Drive continuation tip. It is the parent of the next research run.
- `PUBLISHED_TIP` is the final manifest entry. It is the parent accepted by `append-run.mjs`.

The published tip may be an ancestor of the factual tip. This normal `PUBLICATION_LAG` must not block a later research run. It also does not weaken publication ordering: the helper still refuses a patch whose parent is not the current manifest tip.

The publication executor reconciles immutable Drive handoffs with the manifest and appends exactly the first missing run. With GitHub at B67 and Drive at B68, it appends B68. If factual research has meanwhile produced B69 with parent B68, B69 remains pending until B68 is merged and confirmed as the manifest tip. Attempting B69 first fails the existing stale-parent check.

A Drive SUCCESS does not imply that repository data, build, deploy or public read-back succeeded. Missing immutable handoff artefacts or a lineage divergence block both continuation and publication; a presentation-only or infrastructure publication failure leaves the factual chain valid and the ordered backlog pending.

## Corrections and retractions

Post-snapshot corrections use `extensions.operations_v1`. Supported operations are:

- `REPLACE_FIELD` — replace one non-identity top-level field.
- `REMOVE_REFERENCE` — remove one value from a non-identity array field.
- `RETRACT` — remove a canonical item when the resulting state has no orphan references.

Every operation requires a unique `ENG-OP-*` ID, target collection/ID, a specific reason and existing supporting source IDs. `state.counts.CORRECTION` must equal the operation count. An operation cannot target an item also added or updated in the same patch. Identity fields and `first_seen_run` are protected.

## Rollback and recovery

Before merge, discard the branch. After merge, never edit or delete the published run file; create a new evidence-backed correction/retraction run. If a run is present but not deployed, diagnose CI and deployment separately. The manifest order—not filename sorting or Git history—is canonical.

## Legacy audit

The old full-history validator remains available only for forensic verification:

```bash
ENGINEER_OSINT_LEGACY_AUDIT=1 node --test docs/engineer-osint/tests/p0-integrity.test.mjs
```

It is deliberately excluded from normal shallow CI.
