# B88 strict-intake normalization attestation

- Run: `engineer-osint-20260826-B88`
- Parent: `engineer-osint-20260826-B87`
- Original Drive file ID: `1PAS986nHRrqKibINETmN7D8I9oyBp6YP`
- Original raw SHA-256: `4432cfc298f5c88bb6fd248f8a61a8dfe62c1f573fac2a295b8a2839759e32ed`
- Published normalized SHA-256: `eb183f979fb782c68c8395bdf075ee456f275884998bbe26a5a72b4ddbe977bc`
- Authorized repair date: `2026-08-28`

The immutable source failed the repository's strict validator for two bounded reasons:

1. `state.counts.UPDATE` was `1`, while `updated_records` was empty. The only updated object was `LEAD-003` in `lead_updates`, already and correctly counted by `LEAD=1`. The published representation therefore normalizes `UPDATE` to `0`.
2. `LEAD-003.source_ids` included `ENG-SRC-0219` and `ENG-SRC-0220`. Neither identifier exists in the repository source registry nor in the finalized B88 Drive source registry. They are removed as orphan references. The registered prior source `ENG-SRC-0329` and all four B88 sources `ENG-SRC-0517` through `ENG-SRC-0520` remain attached.

No lead text, source content, evidence content, URL, timestamp, classification or factual conclusion was changed. The normalized run records the original identity, hash and exact rule under `extensions.intake_normalization_v1`. This is a one-run migration, not a general waiver: every other run remains subject to the unchanged fail-closed strict validator.
