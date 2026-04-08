# Files Status (Reference)

Last updated: 2026-03-31

Purpose:
- Keep a lightweight, trustworthy status snapshot for new CLI/agent sessions.
- Prevent re-adding removed files or chasing stale cleanup tasks.

## Current Baseline

- Dashboard build and TypeScript checks have recently passed.
- Root branch has recent UI commits and lockfile sync committed.
- This file documents file-state facts only, not roadmap items.

## Active and Important UI Runtime Files

- `packages/dashboard/src/App.tsx`
- `packages/dashboard/src/main.tsx`
- `packages/dashboard/src/components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx`
- `packages/dashboard/src/components/ui/sidebar.tsx`
- `packages/dashboard/src/components/CommandPalette.tsx`
- `packages/dashboard/src/components/DataTable.tsx`
- `packages/dashboard/src/components/PageFrame.tsx`
- `packages/dashboard/src/pages/Dashboard.tsx`
- `packages/dashboard/src/pages/Traces.tsx`
- `packages/dashboard/src/pages/TraceDetail.tsx`
- `packages/dashboard/src/pages/Costs.tsx`
- `packages/dashboard/src/pages/Models.tsx`
- `packages/dashboard/src/pages/Sessions.tsx`
- `packages/dashboard/src/pages/Settings.tsx`
- `packages/dashboard/src/index.css`

## Removed Files (intentional, already deleted)

Do not re-import these paths unless intentionally reintroduced:

- `packages/dashboard/src/components/command-palette.d.ts`
- `packages/dashboard/src/components/command-palette.jsx`
- `packages/dashboard/src/components/ui/chart.tsx`
- `packages/dashboard/src/components/ui/empty.tsx`
- `packages/dashboard/src/components/ui/glowing-bar-chart.tsx`
- `packages/dashboard/src/components/ui/glowing-line.tsx`

## Known Diagnostic Noise

In VS Code Problems, many warnings are non-blocking suggestions:
- Tailwind class rewrite hints (for example, equivalent class shorthand suggestions)
- CSS at-rule warnings for Tailwind v4 directives (`@theme`, `@utility`, `@custom-variant`) when tooling is not fully aware

Treat build/typecheck output as source of truth for release safety.

## Guardrails for Future Sessions

Before adding or deleting UI files:
1. Verify import references from `packages/dashboard/src/App.tsx` and route pages.
2. Check `UI_FILES.md` for current ownership and location.
3. Run `pnpm --filter @llmtap/dashboard build` after structural changes.
4. Avoid reviving removed files unless there is a clear new requirement.
