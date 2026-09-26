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

After an exact, run-specific authorization and a compatible fail-closed dispatcher are installed, materialize the run file and manifest update in the isolated execution branch:

```bash
node docs/engineer-osint/append-run.mjs docs/engineer-osint/candidates/EXACT_REVIEWED_PATCH.json --write --authorization docs/engineer-osint/EXACT_RUN_AUTHORIZATION.json
node docs/engineer-osint/validate-patch.mjs
node docs/engineer-osint/build-pages.mjs
node docs/engineer-osint/validate-runtime.mjs
```

The helper refuses stale parents and existing run paths. It computes the parent and resulting canonical hashes itself. Generated `.tmp` files from an interrupted local append are not canonical and must be reviewed before recovery; never force-replace an existing run.

An agent that cannot execute the repository helper must not fabricate hashes or place an unregistered JSON file in `data/runs`. It should preserve the validated candidate patch in the Drive research handoff for Codex intake.

An immutable SUCCESS handoff with a narrowly missing non-factual QA field is not edited in place. Any publication waiver must be fail-closed, restricted to one explicitly approved run, pinned to the run identity, parent, repository file and canonical hashes, and backed by a hash-verified local snapshot of the original Drive report. The validator must label the waiver explicitly; it must not present an omitted field as if it had existed in the patch. Future runs and factual/schema/reference failures remain ineligible.

### B88-B89 exact migrations

Runs `engineer-osint-20260826-B88` and `engineer-osint-20260826-B89` are the complete approved exception set to the preceding eligibility rule. Their immutable sources mixed a lead update into the record `UPDATE` count, carried two source identifiers absent from both canonical source registries, and omitted the Czech `topic_cs` counterpart already available verbatim as `title_cs`. Each published representation normalizes only those strict-intake and localization defects, exposes its original Drive file ID and SHA-256 under `extensions.intake_normalization_v1`, and is covered by a dedicated regression test and attestation. These migrations do not create a reusable waiver mechanism; later schema, count, reference or PUBLIC-CZ failures remain ineligible.

## Research continuity versus publication continuity

Historically, `FACTUAL_SUCCESS_TIP` named a verified Drive continuation tip and `PUBLISHED_TIP` named the final GitHub manifest entry. `PUBLICATION_LAG` described only a proven ancestor relationship on the same branch; it never permitted a fork or a skipped handoff. Preserve those historical run files and receipts without reinterpretation.

After the user's 2026-09-26 lineage decision, the GitHub manifest at B112 or a later individually authorized successor is the parent of a new public patch. The divergent Drive B96–B161 chain is an immutable research archive, not an ordered publication backlog and not the parent of a new factual/canonical run. New research may be stored as non-canonical handoff. A finding from the archive needs individual source validation, semantic deduplication, a new canonical ID with private legacy mapping, explicit factual approval and the exact append guard before publication. The current helper rejects unknown future runs; this policy text does not make B113 executable.

### Bounded contiguous publication batches

A publication PR may contain at most four consecutive missing runs when all are already finalized immutable factual SUCCESS artifacts. The executor must start from the current `main` manifest tip, invoke `append-run.mjs --write` separately in parent order, and stop at the first validation failure or non-final candidate. Only the successfully validated contiguous prefix may remain in the PR; skipping and parallel parent branches are forbidden. Full repository QA, PR CI, merge read-back and public deployment still apply once to the resulting batch. The next batch must start only after the merged manifest tip is confirmed.

Run `engineer-osint-20260826-B93` is an exact-artifact storage reconciliation, not a patch migration. Its original report stopped at `SUCCESS_CANDIDATE_PENDING_STORAGE_FINALIZATION`, but the same Drive folder contains the immutable strict delta with `state.status=SUCCESS`, the historical state and the report. The finalized B94 report then names B93 as its verified live SUCCESS parent, confirms the three required B93 artifacts, records byte-identical historical/latest state read-back and verifies lock release. The B93 raw file is therefore eligible without modifying its factual content; the evidence and hashes are pinned in `data/attestations/engineer-osint-20260826-B93-storage-reconciliation.md`.

The historical publication executor reconciled immutable Drive handoffs with the manifest and appended exactly the first missing run on a proven shared chain. Its B67/B68/B69 example is historical; it must not be applied to the divergent B96–B161 archive. Future approved patches must parent the fresh manifest tip, and the helper must reject a stale parent.

A Drive SUCCESS does not imply that repository data, build, deploy or public read-back succeeded. Missing immutable handoff artifacts or a divergence block dependent historical-chain continuation and publication; independent non-canonical research may continue. A presentation-only or infrastructure publication failure on a proven historical chain left that factual chain valid and its ordered backlog pending.

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
