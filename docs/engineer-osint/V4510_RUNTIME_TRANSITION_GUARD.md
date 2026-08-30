# ENGINEER OSINT v4.5.10 — inert runtime transition guard

Status: **RUNTIME GUARD INSTALLED / PERSISTENT B95 INERT**

## Purpose

v4.5.9 proved in a read-only preview that the first three pinned factual overlays can become zero-mutation compatibility modules after the reviewed B96 → B97 → B98 materialization is complete. v4.5.10 installs that decision logic into the browser runtime without changing the current B95 output and without modifying the pinned overlay source files.

Guarded modules:

1. `rich-backfill.js`
2. `rich-backfill-israel-turkiye-eod.js`
3. `rich-backfill-usa-rok.js`

Explicitly excluded:

- `data-integrity-identity-fixes.js`

## Runtime order

`overlay-transition-runtime-guard.js` is injected before the factual overlays. `postprocess-ui.mjs` wraps only the three reviewed modules.

The wrapper follows this rule:

```text
try guard
  complete + internally consistent B98 -> skip this legacy overlay
  anything else                      -> execute original overlay
catch guard error                     -> execute original overlay
```

The guard never mutates `window.__ENGINEER_DATA__`; it only reads it and returns a boolean decision.

## Fail-safe content checks

Short-circuit requires all of the following at once:

- `state_latest` and dashboard materialization at `engineer-osint-20260830-B98`;
- active Intelligence v1 materialization at B98;
- run-history chain B95 → B96 → B97 → B98;
- exactly 104 B96 migration operations with IDs `ENG-OP-B96-OVL-MIG-001..104`;
- every logged operation is a `REPLACE_FIELD`, its target exists, and the current canonical field value equals the logged reviewed value;
- every operation's supporting sources exist;
- all 15 reviewed `RICH-SRC-001..015` primary sources exist at their reviewed HTTPS URLs as PRIMARY tier 1;
- all 15 `ENG-GAP-B97-OVL-001..015` native gaps exist with a related entity and checked sources;
- all four `ENG-ASMT-B98-OVL-001..004` native assessments exist;
- the assessments reference exactly two distinct supporting evidence objects;
- assessment/evidence pairs share both an explicit target and a reviewed source.

Any failed check blocks the short-circuit.

## B95 parity invariant

`audit-overlay-runtime-transition.mjs` executes the three overlays twice against the persistent canonical B95 state:

1. original unguarded execution;
2. the exact v4.5.10 guarded execution.

The resulting `ENGINEER_DATA` structures must be identical (`0` leaf differences), all three guard decisions must be `false`, and the baseline overlays must still produce factual mutations. This proves that installing the runtime guard does not change current public data semantics.

## Hypothetical B98 invariant

The same audit applies the reviewed B96, B97 and B98 candidates only in memory, then executes the browser guard and wrapped overlays. All three modules must short-circuit and total overlay mutations must be exactly zero.

The six negative cases from v4.5.9 are repeated at runtime-wrapper level:

- missing native gap;
- missing native assessment;
- missing native evidence;
- missing reviewed source;
- Stage A factual-value drift;
- missing Stage A operation-log entry.

Each case must block the guard and visibly execute the legacy fallback.

## Immutable overlay sources

The three guarded overlay files remain byte-identical to their pinned SHA-256 values in `legacy-runtime-overlay-baseline.json`. The transition mechanism is implemented outside the legacy source files so the existing migration-debt integrity baseline remains meaningful.

## Safety state after v4.5.10

- persistent current run remains **B95**;
- B96/B97/B98 remain unpersisted candidates;
- current-production short-circuit count is **0/3**;
- hypothetical complete-B98 short-circuit count is **3/3**;
- identity-fix overlay remains active and unguarded;
- `safe_to_append=false`;
- `safe_to_retire_overlays=false`.

## Next gate

After v4.5.10 passes PR + Pages production validation, the next migration stage is a separately reviewed real append of the exact Stage A B96 candidate through the standard append-only helper. No overlay is retired in the same operation. B97 and B98 may follow only after each preceding persistent append has passed the full current `main` validation/deployment chain.
