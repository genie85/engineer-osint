# Proposed master-prompt addendum — P1 append-only publication

Do not activate this addendum until the P1 repository PR is merged. It supersedes P0 instructions that publish by replacing `docs/engineer-osint/b11-patch.json`; all evidence, bilingual, temporal, OSINT safety, branch/PR, Drive and public read-back gates remain in force.

## Canonical GitHub baseline

1. Load `docs/engineer-osint/data/run-store-manifest.json` from current `main`.
2. Treat the final manifest entry as the current canonical GitHub parent; if `runs` is empty, use `snapshot.run_id` and `snapshot.canonical_sha256`.
3. Load the parent materialization through the repository run-store tooling. `b11-patch.json` is a frozen B61 compatibility artifact and MUST NOT be changed.
4. If Drive state, manifest tip, captured `main` SHA or another factual PR disagree, stop as `CONCURRENT_RUN_CONFLICT`. Never repair the disagreement by overwriting an existing run.

## Factual run handoff

1. Produce exactly one complete strict `engineer-osint-patch-v1` document for the fresh `RUN_ID`.
2. Store it as a new immutable `docs/engineer-osint/data/runs/<RUN_ID>.json` file and append exactly one entry to `data/run-store-manifest.json` using `node docs/engineer-osint/append-run.mjs <fresh-patch.json> --write` on the run branch.
3. Never hand-edit manifest hashes, reuse a path/run ID, rewrite a snapshot/run file, or update `b11-patch.json`.
4. Run `validate-patch.mjs`, all tests, build, runtime audit, `audit-public-cz-ui-latest.mjs`, `validate-public-cz-regression.mjs` and canaries before opening the draft PR.
5. If the current ChatGPT environment cannot actually execute the repository helper and read back its result, do not fabricate hashes and do not write an unregistered run file to GitHub. Store the fresh strict patch with the normal Drive research artefacts, report `READY_FOR_CODEX_INTAKE`, and leave GitHub unchanged. Codex will perform deterministic append, local validation and PR publication.

## PUBLIC-CZ append-only handoff gate

P1 append-only publication must not create ordinary localization debt after the fact.

- For every new or materially changed public item in the fresh run, supply semantically safe Czech presentation values for ordinary free-text fields before the factual PR is opened.
- Structured enums/roles, official names and genuinely ambiguous translations may be explicit review-only fields; do not force a translation merely to satisfy a metric.
- The factual producer may add `*_cs` presentation values for its own new/materially changed items as part of the bilingual gate, but does not own general legacy localization cleanup.
- `public-cz-backlog-baseline.json` is a grandfathered legacy-debt ceiling. No run or scheduled agent may add a new baseline entry automatically. The set may only stay unchanged or shrink unless a user explicitly approves a quality-gate change.
- Run the fresh PUBLIC-CZ audit and ratchet validator against the fully materialized candidate. Any new ordinary missing field is `PUBLIC_CZ_REGRESSION`; do not open or merge the factual PR until it is resolved or correctly classified as review-only.
- When a grandfathered ordinary gap is fixed by the PUBLIC UI owner, or correctly reclassified as enum/official-name review by the review owner, remove the corresponding baseline entry in the same PR.

## Corrections and retractions

Use `extensions.operations_v1` for every post-snapshot correction. Each operation requires `operation_id`, `op`, `collection`, `target_id`, a specific `reason` and existing evidence `source_ids`. Supported operations are `REPLACE_FIELD`, `REMOVE_REFERENCE` and `RETRACT`. `state.counts.CORRECTION` must equal the number of operations. Do not combine an operation with add/update of the same target in one run. Retraction must not create orphan relations, evidence, media or source references.

## Multimedia QA

Record completed multimedia sweep status in `qa.multimedia_status`. Optional reviewed lists belong in `qa.worth_watching` and `qa.worth_listening`. `NEW_MEDIA` must match the strict `media` array semantics.

## Required report additions

Report `RUN_STORE_PARENT`, `RUN_STORE_PARENT_CANONICAL_SHA256`, `APPEND_ONLY_RUN_FILE`, `RUN_FILE_SHA256`, `RESULT_CANONICAL_SHA256`, `MANIFEST_APPEND_STATUS`, `B11_FROZEN_UNCHANGED`, `PUBLIC_CZ_RATCHET_STATUS` and the separate validation/build/deploy/read-back statuses.
