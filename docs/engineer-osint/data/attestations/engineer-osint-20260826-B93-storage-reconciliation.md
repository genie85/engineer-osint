# B93 storage-finalization reconciliation

- Run: `engineer-osint-20260826-B93`
- Parent: `engineer-osint-20260826-B92`
- Strict delta Drive ID: `1GJAWnYyhyhnd9NJuwDsk6ZBLX5J8CZU0`
- Strict delta raw SHA-256: `1ad989b353e839e9f84176c7d573282dc690696cd1ff593b74680d61f1b8d470`
- Strict delta size: `5192` bytes
- B93 report Drive ID: `1d_-h7qjbnEiI1WVycp-QjkjJ9Q9BxoW1`
- B93 historical state Drive ID: `17qfZc77Uw-WbtKgz5652SHm3Uc-tVTg8`
- B94 report Drive ID: `15IrXbDL8icb0ERbQwyeUdIkp2pblecb1`
- Repository file SHA-256: `1ad989b353e839e9f84176c7d573282dc690696cd1ff593b74680d61f1b8d470`
- Resulting canonical SHA-256: `cb0f944121ccbcc8e94651e4d9cb363ebb9c63ac2e36a8a33b9b8d556643dfe3`

## Decision

The B93 markdown report was written before storage finalization and retained the status `SUCCESS_CANDIDATE_PENDING_STORAGE_FINALIZATION`. The immutable strict delta in the same Drive artifact folder declares B93 `SUCCESS` with parent B92. The finalized B94 report subsequently records B93 as the verified live raw-read-back SUCCESS parent, confirms that all three required B93 run-specific artifacts exist, reports byte-identical B93 historical state and `state_latest` (`1680107` bytes; SHA-256 `651cfb9e0a39362cb2fd97de04462a4a4a85cb3f810599990be1e88ce29ee1bc`), and records verified lock release.

The repository publishes the strict delta byte-for-byte. No field is normalized, inferred or waived. The B93 `finalized_at` ordering warning noted by B94 remains preserved as source metadata and does not alter factual lineage.
