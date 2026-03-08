# Reviewer Checklist - Readiness UI (2026-03-08)

## PR Branch

- Branch: `copilot/readiness-ui-hardening-publish`
- PR link: `https://github.com/mahdiyarp/hp/pull/new/copilot/readiness-ui-hardening-publish`
- Commit: `24ead77e`

## Scope (relative to `origin/main`)

- Total files: `25`
- Main areas:
  - Developer dashboard readiness wiring and rendering
  - Readiness-related tests (hook/view-model/section/shell)
  - Operator docs/changelog alignment

## Critical Files to Review First

- `frontend-next/src/app/developer/sections.tsx`
- `frontend-next/src/app/developer/page-core-queries-hook.ts`
- `frontend-next/src/app/developer/page-core-mutations-hook.ts`
- `frontend-next/src/app/developer/page-core-resources-hook.ts`
- `frontend-next/src/app/developer/page-view-model-input-builders.ts`
- `frontend-next/src/app/developer/page-view-model-hook.ts`
- `frontend-next/src/app/developer/page-view-model-logic.ts`
- `frontend-next/src/app/developer/page-card-props-hook.ts`
- `frontend-next/src/app/developer/page-interaction-handlers-hook.ts`
- `frontend-next/src/app/developer/page-section-props-logic.ts`

## Behavior Expectations

- Smart Control Center shows:
  - operator readiness status
  - readiness summary
  - next action
  - readiness score
- Readiness score visual tone:
  - green (`>= 80`)
  - yellow (`55..79`)
  - red (`< 55`)
- Readiness score is normalized in UI (`round + clamp(0..100)`).
- After major operator actions, UI refresh includes readiness + mission + status.

## Test Expectations

- In a fully installed frontend env:

```bash
cd frontend-next
npx vitest run src/app/developer
```

- Expected result (from validated main workspace run):
  - `49 passed files`
  - `223 passed tests`

## Note on Clean Publish Worktree

- The clean publish worktree (`e:\hp_readiness_publish`) was used only to isolate and publish a minimal branch.
- Running vitest there failed due to missing local dependencies (`react`, `@testing-library/react`) in that worktree environment, not due to readiness code regressions.

## Operator Docs Updated

- `OPERATOR_NO_CODE_FA.md`
- `OPERATOR_ONE_PAGE_FA.md`
- `CHANGELOG.md`
- Additional release summary docs included in this PR for auditability.
