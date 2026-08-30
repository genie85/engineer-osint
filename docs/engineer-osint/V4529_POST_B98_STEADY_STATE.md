# ENGINEER OSINT v4.5.29 — post-B98 steady state and first-three retirement review

Status: **READ-ONLY REVIEW GATE — NO RETIREMENT AUTHORIZATION**

## Purpose

B98 completes the reviewed Stage A/B/C migration chain. The repository must now support two things without weakening append-only safety:

1. future factual runs after B98 must remain valid descendants instead of failing a migration-phase detector that only knows B95–B98;
2. the first three transition-guarded factual overlays may be evaluated for a separate retirement slice, while the identity-fix overlay stays explicitly out of scope.

This slice does **not** delete an overlay, edit canonical data, create a run, rewrite a manifest hash, or authorize identity-fix migration.

## Historical B98 anchor

Every post-B98 steady-state validation preserves the exact immutable B98 anchor:

- run: `engineer-osint-20260830-B98`
- parent: `engineer-osint-20260830-B97`
- parent canonical SHA-256: `9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4`
- B98 file SHA-256: `ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79`
- B98 resulting canonical SHA-256: `4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201`

A later run is accepted as a post-B98 steady-state descendant only when this exact B98 manifest entry remains an ancestor of the current append-only tip and the B98 run file remains byte-identical.

## First-three retirement-review proof

`audit-post-b98-steady-state.mjs` compares two in-memory paths from the same current canonical materialization:

- **production guarded path** — execute the transition guard and the active legacy runtime in production order; the first three factual overlays must short-circuit 3/3, while `data-integrity-identity-fixes.js` still executes normally;
- **retired-candidate path** — omit exactly the first three guarded overlays, keep the identity-fix overlay, then run the same localization modules.

The gate requires:

- all 15 native B97 gaps still present;
- both B98 evidence objects still present;
- all four B98 assessments still present;
- the first-three transition guard short-circuits 3/3;
- guarded first-three factual mutations are zero;
- guarded production vs retired-candidate data has zero semantic differences before localization;
- the same comparison has zero semantic differences after localization;
- both localized public-data states have the same deterministic SHA-256 digest;
- all four legacy overlays are still present in the current built artifact while this review is running;
- the identity-fix overlay remains active and outside the first-three scope.

The audit also executes the first three overlays unguarded only as a diagnostic. At the exact B98 anchor that diagnostic remains the reviewed **81 factual leaf mutations**. This residual is not treated as current production runtime effect because the production guard already prevents those writes.

## What PASS means

A PASS may set:

`READY_FOR_SEPARATE_RETIREMENT_SLICE_REVIEW`

It does **not** set runtime retirement authorization. The following remain false/pending:

- `retirement_authorized=false`
- `runtime_module_removal_performed=false`
- `baseline_manifest_cleanup_performed=false`
- `full_browser_retirement_regression_passed=false`
- `identity_fix_migration_authorized=false`
- `canonical_write_performed=false`

A later retirement slice must remove the three modules, update the runtime manifest and `legacy-runtime-overlay-baseline.json` in the same reviewed change, then pass full P0/P1, append-only chain, runtime, PUBLIC-CZ, Pages and browser regression validation. The identity-fix overlay is not part of that slice.

## Post-B98 steady state

Pages and migration-readiness workflows distinguish:

- exact `POST_B98` — the B98 tip itself, where the exact persistent B98 audit still runs;
- `POST_B98_STEADY` — any later append-only descendant with the exact B98 historical anchor preserved.

The steady-state audit runs in both modes. This prevents legitimate B99+ factual continuation from being rejected merely because the migration phase is complete.
