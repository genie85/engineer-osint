# ENGINEER OSINT evidence-quality inventory

Run from the repository root:

```sh
node scripts/audit-evidence-quality.mjs --as-of 2026-09-30
```

`--details` prints stable IDs and review codes; `--stale-days N` changes the
threshold for a recorded URL check. The command is read-only and prints JSON to
stdout. It first uses the existing canonical run-store loader, which checks the
manifest, raw hashes, chain and references. Output includes the exact canonical
tip and manifest hash that were analyzed.

The report identifies missing metadata, single-source records, reused exact URL
strings and old *recorded* URL checks. Each code is a **review signal**. A reused
URL can legitimately support several source IDs; a single source can be valid;
an old check does not prove a page is dead. This command performs no HTTP fetch,
live URL verification, factual assessment, media rights review, canonical import
or publication. It does not alter the run-store or any public artifact.

Tests: `node --test scripts/tests/evidence-quality.test.mjs`.
