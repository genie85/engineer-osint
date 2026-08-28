# B89 strict-intake normalization attestation

- Run: `engineer-osint-20260826-B89`
- Parent: `engineer-osint-20260826-B88`
- Original Drive file ID: `12YbsRY1x7ANGZJAa9ufjscIeF3Zwcgad`
- Original raw SHA-256: `f04d7245cdc6fdf3e2c40ff24b69973cc749ddead2c22d5345ca533c16cce148`
- Published normalized SHA-256: `32c75be18614c6ad880910383d74a07a74bc301563cd04483dcbd76b98ad9247`
- Authorized repair date: `2026-08-28`

B89 inherited the same bounded producer defects as B88 while extending `LEAD-003` with two registered sources:

1. `UPDATE=1` is normalized to `0` because `updated_records` is empty and the lead update is already counted by `LEAD=1`.
2. Orphan identifiers `ENG-SRC-0219` and `ENG-SRC-0220`, absent from both canonical source registries, are removed. Registered sources `ENG-SRC-0329` and `ENG-SRC-0517` through `ENG-SRC-0522` remain attached.
3. The source-provided Czech `title_cs` is copied verbatim to omitted `topic_cs`, preventing new PUBLIC-CZ debt.

No factual conclusion, source/evidence content, URL, timestamp or classification was changed. The original identity/hash and exact normalization are recorded under `extensions.intake_normalization_v1`. Later runs remain fail-closed.
