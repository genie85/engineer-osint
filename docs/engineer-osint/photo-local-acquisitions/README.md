# Local photo acquisition policy

`READY_FOR_IMPORT` is an execution trigger, not a backlog target.

When a photo-review entry has verified source identity and compatible redistribution rights and reaches `READY_FOR_IMPORT`, ENGINEER OSINT should archive a repository-local copy in the same safe work slice whenever binary acquisition is technically available.

Each acquisition must preserve auditable provenance: card ID, source page and title, author/rightsholder, license and license URL, attribution requirement, exact source SHA-256, repository-local path, exact local SHA-256, acquisition date, dimensions, byte counts, and any transformation applied.

Repository-local archival and canonical publication are deliberately separate states. An archived file does **not** become `LOCAL_IMAGE` until a linked canonical visual references that exact local path and the existing `LOCAL_IMAGE` contract passes. This separation permits immediate preservation without bypassing canonical append-only controls.

Files with unclear redistribution rights or unresolved depicted-system identity must not be downloaded into the canonical media archive merely because they are publicly viewable.
