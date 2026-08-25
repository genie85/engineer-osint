# B73 source intake review

Reviewed during repository intake on 2026-08-25. This note does not modify the immutable B73 patch.

## ENG-SRC-0511

- Canonical URL: `https://www.president.gov.ua/en/news/u-35-tu-richnicyu-vidnovlennya-nezalezhnosti-ukrayini-vidbuv-106037`
- A normal direct HTTP read from the Codex host returned HTTP 403 from the site's edge layer. No proxy, cookie, forged browser session or protection bypass was attempted.
- The official President of Ukraine URL, title, publication time and relevant text were independently reproduced through the public search index for the same official page. The indexed official text states that a video showed 30 UGVs, names TerMIT, Rys, Simba, Ardal, Zmiy and Ratel, and describes reconnaissance, mine-laying, mine-clearance, logistics, evacuation, fire-support and assault-support roles.
- The official ArmyInform parade article independently reproduces the six platform names, but derives the parade video from the President's social publication and is not treated as a separate observation of the count 30.

## Intake decision

The current HTTP 403 is classified as access/read-back drift, not a factual contradiction. B73 is accepted as the immutable producer handoff because its wording attributes the presentation and task portfolio to the official public source, explicitly states that no direct pixel/frame inspection occurred, and does not treat the displayed count as inventory, readiness or independent mission-count validation.

The producer's `VERIFIED_DIRECT_PRIMARY_PUBLIC_PAGE` label records its run-time verification claim. Current reproducibility is limited to indexed official content; any later correction of the verification label must be made by a new append-only correction run, never by editing B73.
