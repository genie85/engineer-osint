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

## Safety rule

This audit is read-only with respect to canonical data. It must never create a run, alter `data/run-store-manifest.json`, fabricate a hash, change a source/evidence/claim, or turn runtime-only factual content into canonical truth.
