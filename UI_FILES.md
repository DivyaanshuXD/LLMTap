# UI Files List - LLMTap Dashboard

Last updated: 2026-03-31

Purpose:
- Provide a current UI-only file map for dashboard work.
- Help new CLI/agent sessions find the right files quickly.
- Reduce duplicate component creation and stale references.

## Related Docs

- `README.md` — user-facing product and usage guide
- `PROJECT_STRUCTURE.md` — full monorepo structure overview
- `UI_PLAN.md` — UI roadmap, phases, and progress

## Scope

Included:
- Dashboard UI routes, layout, components, hooks, styling, and UI utilities.

Excluded:
- Collector/server internals
- SDK instrumentation internals
- Non-UI package READMEs and workflow docs

## Route entrypoints

- `packages/dashboard/src/App.tsx`
- `packages/dashboard/src/main.tsx`
- `packages/dashboard/src/pages/Dashboard.tsx`
- `packages/dashboard/src/pages/Traces.tsx`
- `packages/dashboard/src/pages/TraceDetail.tsx`
- `packages/dashboard/src/pages/Costs.tsx`
- `packages/dashboard/src/pages/Models.tsx`
- `packages/dashboard/src/pages/Sessions.tsx`
- `packages/dashboard/src/pages/Settings.tsx`

## App shell and navigation

- `packages/dashboard/src/components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx`
- `packages/dashboard/src/components/ui/sidebar.tsx`
- `packages/dashboard/src/components/PageFrame.tsx`
- `packages/dashboard/src/components/CommandPalette.tsx`
- `packages/dashboard/src/components/ShortcutsHelp.tsx`
- `packages/dashboard/src/components/ConnectionToast.tsx`
- `packages/dashboard/src/components/LivePulse.tsx`

## Data display and shared UI blocks

- `packages/dashboard/src/components/DataTable.tsx`
- `packages/dashboard/src/components/StatusDot.tsx`
- `packages/dashboard/src/components/ProviderBadge.tsx`
- `packages/dashboard/src/components/ErrorBoundary.tsx`
- `packages/dashboard/src/components/GettingStartedPanel.tsx`
- `packages/dashboard/src/components/shadcn-studio/blocks/statistics-with-status.tsx`
- `packages/dashboard/src/components/shadcn-studio/blocks/statistics-with-status-grid.tsx`

## Charts and chart helpers

- `packages/dashboard/src/components/charts/AreaTimeline.tsx`
- `packages/dashboard/src/components/charts/DonutBreakdown.tsx`
- `packages/dashboard/src/components/charts/RankingBars.tsx`
- `packages/dashboard/src/components/charts/line.tsx`
- `packages/dashboard/src/components/charts/line-chart.tsx`
- `packages/dashboard/src/components/charts/chart-context.tsx`
- `packages/dashboard/src/components/charts/use-chart-interaction.ts`

## UI primitives (shadcn/ui + local primitives)

- `packages/dashboard/src/components/ui/alert-dialog.tsx`
- `packages/dashboard/src/components/ui/badge.tsx`
- `packages/dashboard/src/components/ui/button.tsx`
- `packages/dashboard/src/components/ui/card.tsx`
- `packages/dashboard/src/components/ui/collapsible.tsx`
- `packages/dashboard/src/components/ui/command.tsx`
- `packages/dashboard/src/components/ui/dialog.tsx`
- `packages/dashboard/src/components/ui/input.tsx`
- `packages/dashboard/src/components/ui/scroll-area.tsx`
- `packages/dashboard/src/components/ui/select.tsx`
- `packages/dashboard/src/components/ui/separator.tsx`
- `packages/dashboard/src/components/ui/sheet.tsx`
- `packages/dashboard/src/components/ui/sidebar.tsx`
- `packages/dashboard/src/components/ui/skeleton.tsx`
- `packages/dashboard/src/components/ui/sonner.tsx`
- `packages/dashboard/src/components/ui/table.tsx`
- `packages/dashboard/src/components/ui/tabs.tsx`
- `packages/dashboard/src/components/ui/tooltip.tsx`

## Visual effects and decorative components

- `packages/dashboard/src/components/backgrounds/GravityStarsBackground.tsx`
- `packages/dashboard/src/components/magicui/animated-grid-pattern.tsx`
- `packages/dashboard/src/components/magicui/border-beam.tsx`
- `packages/dashboard/src/components/magicui/lamp-hero.tsx`
- `packages/dashboard/src/components/magicui/number-ticker.tsx`
- `packages/dashboard/src/components/magicui/shiny-text.tsx`
- `packages/dashboard/src/components/magicui/spotlight-card.tsx`
- `packages/dashboard/src/components/kokonutui/action-search-bar.tsx`

## Hooks and UI helpers

- `packages/dashboard/src/hooks/useKeyboardShortcuts.ts`
- `packages/dashboard/src/hooks/useLiveRefresh.ts`
- `packages/dashboard/src/hooks/use-mobile.ts`
- `packages/dashboard/src/hooks/use-debounce.ts`
- `packages/dashboard/src/hooks/use-controlled-state.tsx`

## Styling and utility context

- `packages/dashboard/src/index.css`
- `packages/dashboard/src/lib/utils.ts`
- `packages/dashboard/src/lib/format.ts`
- `packages/dashboard/src/lib/provider-colors.ts`
- `packages/dashboard/src/lib/constants.ts`
- `packages/dashboard/src/lib/content.ts`
- `packages/dashboard/src/lib/chart-styles.ts`
- `packages/dashboard/src/lib/get-strict-context.tsx`

## Known removals (already deleted from repo)

These files are no longer present and should not be re-imported:

- `packages/dashboard/src/components/command-palette.d.ts`
- `packages/dashboard/src/components/command-palette.jsx`
- `packages/dashboard/src/components/ui/chart.tsx`
- `packages/dashboard/src/components/ui/empty.tsx`
- `packages/dashboard/src/components/ui/glowing-bar-chart.tsx`
- `packages/dashboard/src/components/ui/glowing-line.tsx`

## Known caution

- `app-sidebar.tsx` is actively used by `App.tsx` and should not be deleted unless replaced in the route shell.
- Some editor diagnostics in dashboard files are Tailwind rewrite suggestions, not runtime breakage.
