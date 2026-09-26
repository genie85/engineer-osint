# ENGINEER OSINT: direct Netlify deploy

The existing `engineer-osint` site is deployed from the local canonical `main` worktree. This path does not use GitHub Actions or Netlify Git builds. Research imports are a separate, reviewed operation; the deploy script only materializes the canonical run-store already in the checkout.

Run from any directory:

```bash
python3 /path/to/engineer-osint/scripts/deploy-engineer-netlify.py --dry-run
python3 /path/to/engineer-osint/scripts/deploy-engineer-netlify.py
```

The production command requires a clean local `main` branch, at least 11 GB free, a Netlify token in `NETLIFY_AUTH_TOKEN` or a mode-0600 file selected by `NETLIFY_AUTH_TOKEN_FILE`, an unlinked Netlify site named `engineer-osint`, and anonymous HTTP 200 on `https://engineer-osint.netlify.app/`. The existing server token file is the fallback when neither variable is set. Never print or commit the token.

It runs the current B112/P0 integrity test, chain validation, Pages build and the relevant media, runtime, Czech and artifact gates. The deploy is skipped when every Netlify file SHA-1 matches the local build. After a changed deploy it verifies Netlify's published deploy ID, all file hashes, HTTP 200 and the public HTML SHA-256. If an upload returns an ambiguous result, reconcile the deploy ID in Netlify before retrying.

Netlify Edge currently inserts a site-specific hosting comment immediately after the HTML charset declaration. Public readback accepts that exact comment at that exact position and otherwise requires byte equality with the built HTML; both source and public SHA-256 values are reported. Any other difference blocks verification.

The Netlify project's visibility is controlled in Netlify UI. As of 26 September 2026, anonymous requests returned 401; the production command fails before upload until that access setting is corrected. [Netlify visibility instructions](https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/).

Historical Google Drive B96–B161 is a divergent research lineage and is not input to this deploy command. Resolve and review individual findings before a canonical run-store change. The private raw lineage map is kept outside this public repository.
