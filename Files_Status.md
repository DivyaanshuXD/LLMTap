# Files Status (Reference)

Last updated: 2026-03-24

Purpose:
- Keep a clear, repo-local status of file usage to avoid duplicate implementations.
- Provide a quick source of truth before adding new components/files.

Scope of this snapshot:
- Focused on dashboard UI file usage and nearby entrypoints discussed in recent work.
- No files were deleted or modified for cleanup in this pass.

## Confirmed Usage

### Shared DataTable usage
- `packages/dashboard/src/components/DataTable.tsx` is actively used by:
  - `packages/dashboard/src/pages/Costs.tsx`
  - `packages/dashboard/src/pages/Sessions.tsx`
  - `packages/dashboard/src/pages/Models.tsx`

### Traces table note
- `packages/dashboard/src/pages/Traces.tsx` uses its own local table markup.
- It does not consume `packages/dashboard/src/components/DataTable.tsx`.

## Safe To Archive (High Confidence, no active references found)

- `packages/dashboard/src/components/charts/AreaTimeline.tsx`
- `packages/dashboard/src/components/charts/line.tsx`
- `packages/dashboard/src/components/charts/use-chart-interaction.ts`
- `packages/dashboard/src/components/ui/glowing-bar-chart.tsx`
- `packages/dashboard/src/components/ui/glowing-line.tsx`
- `packages/dashboard/src/components/ui/scroll-area.tsx`
- `packages/dashboard/src/components/ui/separator.tsx`
- `packages/dashboard/src/components/ui/skeleton.tsx`
- `packages/dashboard/src/components/ui/tabs.tsx`
- `packages/dashboard/src/lib/chart-styles.ts`

## Needs Manual Check (likely unused, but may be intentionally kept)

- `packages/dashboard/src/components/ui/command.tsx`
- `packages/dashboard/src/components/magicui/spotlight-card.tsx`

## Keep (Entrypoint / Runtime role)

- `packages/dashboard/src/main.tsx`
- `packages/cli/src/index.ts`
- `packages/shared/src/index.ts`
- `get-shit-done/bin/gsd-tools.cjs`
- `tests/integration.mjs`

## How this was determined

- Static reference scan across source files (imports/re-exports/common specifiers).
- Additional text-reference cross-check for candidate files.
- Explicit separation of entrypoint/runtime files from cleanup candidates.

## Guardrail for future changes

Before creating a new file/component:
1. Search for an existing equivalent in `packages/dashboard/src/components` and `packages/dashboard/src/lib`.
2. Check this file first to avoid recreating known inactive components.
3. If re-activating an archived candidate, update this document with the importing file(s).
