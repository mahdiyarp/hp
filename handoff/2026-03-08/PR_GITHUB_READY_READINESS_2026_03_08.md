# PR Title

feat(developer): end-to-end operator readiness wiring in /developer

# PR Body

## Summary

This PR finalizes operator readiness as an end-to-end feature in the `/developer` dashboard.
It wires readiness data from query layer to UI, improves post-action freshness, and hardens rendering behavior with normalization and focused tests.

## Changes

- Added readiness query wiring across developer dashboard layers:
  - queries -> resources -> view-model -> card-props -> sections
- Smart Control Center now displays:
  - operator readiness status
  - readiness summary
  - next recommended action
  - readiness score
- Added readiness score tone mapping:
  - green (`>= 80`)
  - yellow (`55..79`)
  - red (`< 55`)
- Added readiness score normalization in UI:
  - round to integer
  - clamp to `0..100`
- Improved post-mutation refresh behavior:
  - refetch readiness + mission audit + status after key operator actions
- Synced operator-facing docs and changelog with readiness UX semantics.

## Test Coverage

Added/updated tests for:

- smart card readiness rendering + fallback behavior
- readiness tone mapping (green/yellow/red)
- readiness score normalization
- shell-level readiness integration path
- pass-through integrity in hook/view-model/card-props
- post-action refresh wiring in core mutations/resources

## Validation

Validated in main workspace:

```bash
cd frontend-next
npx vitest run src/app/developer
```

Result:

- `49 passed files`
- `223 passed tests`

Note:

- In clean publish worktree, test execution failed due to missing local frontend dependencies (`react`, `@testing-library/react`) in that isolated environment.
- This is an environment/setup issue, not a readiness regression.

## Branch / Commits

- PR branch: `copilot/readiness-ui-hardening-publish`
- Main feature commit: `24ead77e`
- Reviewer checklist commit: `de169a63`

## Reviewer Notes

Please prioritize review of:

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

Detailed reviewer checklist is included in:

- `PR_REVIEWER_CHECKLIST_READINESS_2026_03_08.md`
