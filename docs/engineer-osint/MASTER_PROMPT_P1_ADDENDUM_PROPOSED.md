# Active master-prompt addendum — P1 append-only publication

Active since repository P1 commit `56114b9efe0375dd674c94d14b1f68d3316d8eed`. It supersedes P0 instructions that publish by replacing `docs/engineer-osint/b11-patch.json`; all evidence, bilingual, temporal, OSINT safety, branch/PR, Drive and public read-back gates remain in force.

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

### Clean Codex-intake fallback

When the repository helper, tests, build or PUBLIC-CZ ratchet cannot run in the current environment, GitHub must remain unchanged. Do not create a temporary workflow, repository staging input, marker/trigger branch or commit, or a draft PR used only as a validation container. Do not create and later remove temporary validation infrastructure. Such infrastructure is a separate technical change requiring prior user approval and independent validation.

After Drive read-back succeeds, report `READY_FOR_CODEX_INTAKE` with the exact strict-delta Drive ID. Codex owns the deterministic append, presentation-only closure, local validation and PR. If Drive latest SUCCESS is not the current GitHub manifest tip, a later factual run stops as `WAITING_FOR_CODEX_INTAKE` without creating another run or changing `state_latest`; scheduled automation is not disabled.

## PUBLIC-CZ append-only handoff gate

P1 append-only publication must not create ordinary localization debt after the fact.

- For every new or materially changed public item in the fresh run, supply semantically safe Czech presentation values for ordinary free-text fields before the factual PR is opened.
- Audit the actual type-specific public fields, not only `title` and `summary`. When used by the item type, this includes `description`, `note`, `fact`, `analysis`, `why_it_matters`, `staff_relevance`, `training_relevance`, `intelligence_gaps`, `what_it_does_not_prove` and `claims[].text`, with Czech and English mirrors.
- For public source/evidence status text, provide semantically faithful `verification_status_cs/en`, `evidence_status_cs/en` and `observation_basis_cs/en` where the renderer exposes those values.
- An `ENG-UNIT` or another detail type that expects fact/analysis must include `fact_cs/en` and `analysis_cs/en` even when `summary_cs/en` is already complete.
- Structured enums/roles, official names and genuinely ambiguous translations may be explicit review-only fields; do not force a translation merely to satisfy a metric.
- The factual producer may add `*_cs` presentation values for its own new/materially changed items as part of the bilingual gate, but does not own general legacy localization cleanup.
- `public-cz-backlog-baseline.json` is a grandfathered legacy-debt ceiling. No run or scheduled agent may add a new baseline entry automatically. The set may only stay unchanged or shrink unless a user explicitly approves a quality-gate change.
- Run the fresh PUBLIC-CZ audit and ratchet validator against the fully materialized candidate. Any new ordinary missing field is `PUBLIC_CZ_REGRESSION`; do not open or merge the factual PR until it is resolved or correctly classified as review-only.
- Do not report `CZ_EN_COMPLETE` or `BILINGUAL_PRECHECK=PASS` without checking the concrete expected field list. If repository-native audit execution is unavailable, report `BILINGUAL_PRECHECK_UNVERIFIED` and rely on Codex intake for the final gate.
- When a grandfathered ordinary gap is fixed by the PUBLIC UI owner, or correctly reclassified as enum/official-name review by the review owner, remove the corresponding baseline entry in the same PR.

## Corrections and retractions

Use `extensions.operations_v1` for every post-snapshot correction. Each operation requires `operation_id`, `op`, `collection`, `target_id`, a specific `reason` and existing evidence `source_ids`. Supported operations are `REPLACE_FIELD`, `REMOVE_REFERENCE` and `RETRACT`. `state.counts.CORRECTION` must equal the number of operations. Do not combine an operation with add/update of the same target in one run. Retraction must not create orphan relations, evidence, media or source references.

## Multimedia QA

Record completed multimedia sweep status in `qa.multimedia_status`. Optional reviewed lists belong in `qa.worth_watching` and `qa.worth_listening`. `NEW_MEDIA` must match the strict `media` array semantics.

## Required report additions

Report `RUN_STORE_PARENT`, `RUN_STORE_PARENT_CANONICAL_SHA256`, `APPEND_ONLY_RUN_FILE`, `RUN_FILE_SHA256`, `RESULT_CANONICAL_SHA256`, `MANIFEST_APPEND_STATUS`, `B11_FROZEN_UNCHANGED`, `PUBLIC_CZ_RATCHET_STATUS` and the separate validation/build/deploy/read-back statuses.

Every Drive-finalized run also reports run-specific `storage_verification_bNN` and `dashboard_bNN` metadata with the current parent, publication state and exact report/delta/state Drive IDs. Stale global `artifacts` or `dashboard_publication` fields are not proof of the current run.
