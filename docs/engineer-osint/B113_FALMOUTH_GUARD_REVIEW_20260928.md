# B113 Falmouth exact append guard

Status: pre-execution technical slice. GitHub canonical remains B112. The user separately approved the exact B113 guard and the narrow public Falmouth fact on 28 September 2026 in this conversation.

- Candidate: `candidates/B113_FALMOUTH_20260928.json`; raw SHA-256 `4ff481952ba2f4eb705dc3ce830e43f57f669191d93e39be090438553bb91f17`.
- Parent: `engineer-osint-20260924-B112`; canonical SHA-256 `39b41f5af58d33982fe60f9eea5b993eef740db35838521084adf02d0abb92e4`.
- Predicted result: `engineer-osint-20260928-B113`; canonical SHA-256 `c7ff079cfade9b35093f4779624bee6075a7df67b8069a47f040f8ae4d6c1d9b`.
- Source handoff raw SHA-256: `bb9918e07172276e7e107bfe089c3dd763ffb3a6609b7caf74353025a12dba07`.
- Public claim: 23 September removal from Falmouth Docks and lifting of the cordon, with Royal Navy Bravo Squadron participation. No assertion that subsequent at-sea final disposal was completed. No tactical or disposal procedure and no media.
- The exact guard permits this candidate, authorization file and parent/result pair only. B114 and other paths remain rejected.

The isolated smoke check must append B113 and validate its full canonical chain while leaving this branch's manifest and run files unchanged. This technical PR does not publish. In the later factual PR, recheck source and dedupe, execute the append in a clean isolated branch, update the exact B113 publication tests and CI routes, run full QA, obtain a reviewed merge, then directly deploy and verify the public Netlify artifact. Runnerless CI is not a pass or an implicit waiver.
