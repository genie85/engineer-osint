# ENGINEER OSINT v4.5 — legacy overlay retirement policy

Status: **ACTIVE GUARDRAIL**

The four modules listed in `LEGACY_FACTUAL_OVERLAY_MODULES` remain factual migration debt. This v4.5 slice does **not** remove them and does not write any canonical data.

## Retirement gate

A legacy factual runtime overlay may enter retirement review only when its effect on the **current canonical materialization** is zero:

`ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT`

`mutation_count === 0` is necessary, but it is not sufficient by itself. Final removal still requires:

1. evidence-backed equivalent factual state in the strict canonical append-only run store;
2. a validated append via the normal `append-run.mjs` path — never hand-edited manifest hashes or an unregistered run file;
3. public-output comparison proving that removing the overlay does not remove or alter intended factual content;
4. full P0/P1, canonical-chain, runtime, PUBLIC-CZ and browser regression checks;
5. removal/update of the matching `legacy-runtime-overlay-baseline.json` entry and runtime manifest only in the same reviewed retirement slice.

## Current audit artifact

`audit-overlay-retirement.mjs` executes every still-active pinned overlay in runtime order against the built canonical materialization. It verifies the pinned file hash and allowed target scope, then publishes:

- `overlay-retirement-audit.json`
- `overlay-retirement-audit.md`
- health markers `overlay_retirement_*` and `legacy_factual_overlay_mutations`

Each module is classified as either:

- `ACTIVE_MUTATION_DEBT` — it still changes the current canonical materialization and must remain active;
- `READY_FOR_RETIREMENT_REVIEW` — it currently makes zero changes and may proceed to a separate removal review.

The B61 mutation fingerprint remains an integrity guard for the original pinned baseline. The v4.5 current-run audit is the retirement-readiness decision signal; historical B61/B70 mutation counts are not treated as proof that a module is still needed or safe to remove today.

## v4.5.1 field-level migration map

The same read-only pass also publishes:

- `overlay-migration-map.json` — exact before/after value envelopes for every current leaf mutation;
- `overlay-migration-map.md` — compact path-level and consolidated candidate view;
- health markers `overlay_migration_*`.

The migration map preserves runtime order and separates overlay-only metadata from canonical migration candidates. Multiple nested leaf changes under one target top-level field are consolidated into one candidate because `extensions.operations_v1.REPLACE_FIELD` operates on a top-level field.

Candidate routes are advisory and never authorize a write:

- `OPERATIONS_V1_REPLACE_FIELD` / `OPERATIONS_V1_RETRACT` — structurally expressible by the strict correction contract, but still require supporting source IDs and a reviewed append-only run;
- `STRICT_COLLECTION_APPEND` — a new item must be introduced through the corresponding strict patch collection and validated counts;
- `PROTECTED_FIELD_MANUAL_MIGRATION_REVIEW` — stable identity or other protected fields cannot be changed through `REPLACE_FIELD`;
- `FIELD_REMOVAL_MANUAL_MIGRATION_REVIEW` and other `MANUAL_*` routes — the current strict contract cannot reproduce the overlay result directly and requires an explicit reviewed migration design;
- `NO_CANONICAL_MIGRATION_OVERLAY_META` — runtime bookkeeping only, not factual canonical content.

A source hint copied from a resolved target is not proof of provenance. Every canonical migration must independently verify that the cited source supports the exact value being persisted. A candidate marked `SOURCE_BINDING_REQUIRED` cannot become an operation until that evidence binding is supplied.

## v4.5.2 strict in-memory equivalence dry-run

`audit-overlay-migration-dry-run.mjs` consumes the v4.5.1 map and constructs **synthetic, in-memory-only** strict patches in the same order as the four runtime overlays. It uses the production `applyStrictPatchToCanonicalData` path so schema validation, collection counts, operation constraints, source references, canonical identity checks, mirror synchronization and reference validation are exercised exactly as they would be for a strict canonical patch.

The dry-run deliberately uses synthetic 2099 run IDs and never calls `append-run.mjs`, writes `data/runs`, or updates `data/run-store-manifest.json`. Its output is diagnostic only:

- `overlay-migration-dry-run.json`
- `overlay-migration-dry-run.md`
- health markers `overlay_migration_dry_run_*`.

After each synthetic strict patch, the corresponding legacy overlay is executed again against a clone of the simulated canonical state. Residuals are classified by storage role rather than being conflated:

- **authoritative canonical residuals** are changes under the canonical collection locations used by the strict run-store contract. Every such residual must already be an explicitly mapped manual migration candidate; any unexpected canonical or unscoped residual is a CI failure;
- **legacy/derived mirror residuals** are changes in compatibility or historical presentation collections outside those authoritative locations. They do not demonstrate that the strict canonical value is wrong, so they are reported separately instead of being misclassified as a canonical-equivalence failure;
- **overlay metadata residuals** remain non-canonical bookkeeping.

This separation does **not** weaken retirement safety. Legacy/derived mirror residuals remain explicit migration debt and continue to block overlay retirement until public-output comparison or an explicit mirror-cleanup slice proves that their removal cannot change intended public factual content. `safe_to_append` and `safe_to_retire_overlays` therefore remain false in the dry-run artifact.

A module with no unexpected canonical residual can pass the structural canonical-equivalence gate even while manual-field or mirror debt remains. This means only that the current strict contract reproduces the mapped authoritative canonical values; it does **not** authorize migration, prove source provenance, or authorize removal of the overlay.

The dry-run is therefore a structural gate between mapping and a real append-only migration. A real run may be prepared only after each candidate's provenance is independently checked against its supporting sources. Synthetic run IDs, synthetic operation IDs and dry-run QA metadata must never be copied into production run-store data.

## Safety rule

The retirement audit, migration map and strict dry-run are read-only with respect to canonical data and persistence. They must never create a real run, alter `data/run-store-manifest.json`, fabricate a production hash, change a source/evidence/claim in persistent state, or turn runtime-only factual content into canonical truth. Actual migration must use the normal strict append-only run path and must be followed by a fresh retirement audit before any overlay is removed.
