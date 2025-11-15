# Project Documentation Index

This file centralizes links to the project's documentation and suggests consolidation steps.

Current documents:

- `README.md` — Project overview and getting-started (English).
- `README.fa.md` — Quick start and local run instructions (Persian).
- `docs/architecture.md` — Architecture notes.
- `DEVELOPER_PROFILE.md`, `TEAM_AND_ACCESS_CONTROL.md`, `API_SECURITY.md`, `INSTALL.md`, `CHANGELOG.md`, etc. — topical documents in repository root.

Recommended consolidation steps (no files were deleted by this change):

1. Keep `README.md` as the canonical entry in English and add a short Persian section with a link to the Persian README.
2. Move language-specific long-form guides into `docs/` and keep `README.*.md` as small entry pointers. For example:
   - `docs/README.en.md` (detailed English docs)
   - `docs/README.fa.md` (detailed Persian docs)
3. Create `docs/index.md` (this file) to point to all important docs and recommended next actions.
4. If you prefer a single-language primary README, I can merge `README.fa.md` into `README.md` under a Persian section and remove `README.fa.md` after your confirmation.

If you want me to perform any of the consolidation steps (move files, merge, or delete duplicates), tell me which option to apply and I will perform the edits on a feature branch and open a PR.

---
Generated on: 2025-11-15
