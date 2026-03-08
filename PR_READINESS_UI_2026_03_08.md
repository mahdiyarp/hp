# Readiness UI Hardening for `/developer`

## Summary

This PR finalizes operator readiness as an end-to-end frontend feature in the developer dashboard.
It connects backend readiness data to the Smart Control Center card, improves post-action freshness, and hardens UI behavior through normalization + tests.

## What Changed

- Added readiness query consumption and pass-through across dashboard layers:
  - core queries -> resources -> view model -> card props -> sections UI
- Smart Control Center now shows:
  - operator readiness status
  - readiness summary
  - next recommended action
  - readiness score
- Added readiness score tone states:
  - green (`>= 80`)
  - yellow (`55..79`)
  - red (`< 55`)
- Added readiness score normalization in UI:
  - round to integer
  - clamp to `0..100`
- Improved post-mutation synchronization:
  - refetch readiness + mission audit + status after key operator actions
- Updated operator docs and changelog to reflect readiness score semantics.

## Test Coverage

Added/updated tests for:

- smart card readiness rendering and fallback behavior
- yellow/red/green tone mapping
- readiness score normalization behavior
- shell-level integration for readiness render path
- hook/view-model/card-props pass-through for readiness data and refetch
- mutation/resource hook synchronization behavior

## Validation

```bash
cd frontend-next
npx vitest run src/app/developer
```

Result:

- `49 passed files`
- `223 passed tests`

## User Impact

For non-technical operators using `/developer`:

- faster situational awareness via readiness score + summary
- clearer next step via explicit recommended action
- more reliable freshness after actions without manual troubleshooting

## Risks

- Low risk in runtime behavior: changes are scoped to developer dashboard wiring and presentation.
- Primary residual risk is external API shape drift; covered by fallback logic and focused tests.
