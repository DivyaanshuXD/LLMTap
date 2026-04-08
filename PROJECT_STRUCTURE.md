# Project Structure — LLMTap

Last updated: 2026-03-31

Monorepo: Turborepo + pnpm workspaces

Notes:
- This is a development-focused structure map.
- Generated folders like `node_modules`, `.turbo`, and package `dist` outputs are intentionally not expanded.

## Related Docs

- `README.md` — user-facing install, features, and API usage
- `UI_FILES.md` — dashboard UI file inventory by area
- `UI_PLAN.md` — phased UI implementation plan

## Root

```text
llmtap/
├── .claude/
├── .github/
├── .planning/
├── design-system/
├── examples/
├── get-shit-done/
├── packages/
├── scripts/
├── tests/
├── Files_Status.md
├── GEM.md
├── MASTERPLAN.md
├── PHASE_COMPLETION.md
├── PROJECT_STRUCTURE.md
├── README.md
├── UI_FILES.md
├── UI_PLAN.md
├── UI_REQ.md
├── UI_STATE_ANALYSIS.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

## Packages

```text
packages/
├── cli/
├── collector/
├── dashboard/
├── sdk/
└── shared/
```

## packages/cli

```text
packages/cli/
├── src/
│   ├── commands/
│   ├── lib/
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## packages/collector

```text
packages/collector/
├── src/
│   ├── routes/
│   ├── db.ts
│   ├── events.ts
│   ├── index.ts
│   ├── otlp-forwarder.ts
│   ├── schemas.ts
│   ├── seed.ts
│   ├── server.ts
│   ├── db.test.ts
│   └── server.test.ts
├── package.json
└── README.md
```

## packages/dashboard

```text
packages/dashboard/
├── src/
│   ├── api/
│   │   └── client.ts
│   ├── assets/
│   ├── components/
│   │   ├── animate-ui/
│   │   ├── backgrounds/
│   │   ├── charts/
│   │   ├── kokonutui/
│   │   ├── magicui/
│   │   ├── shadcn-space/
│   │   ├── shadcn-studio/
│   │   ├── ui/
│   │   ├── CommandPalette.tsx
│   │   ├── ConnectionToast.tsx
│   │   ├── DataTable.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── GettingStartedPanel.tsx
│   │   ├── LivePulse.tsx
│   │   ├── PageFrame.tsx
│   │   ├── ProviderBadge.tsx
│   │   ├── ShortcutsHelp.tsx
│   │   └── StatusDot.tsx
│   ├── fonts/
│   ├── hooks/
│   │   ├── use-controlled-state.tsx
│   │   ├── use-debounce.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useLiveRefresh.ts
│   │   └── use-mobile.ts
│   ├── lib/
│   │   ├── chart-styles.ts
│   │   ├── constants.ts
│   │   ├── content.ts
│   │   ├── format.ts
│   │   ├── get-strict-context.tsx
│   │   ├── provider-colors.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Costs.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Models.tsx
│   │   ├── Sessions.tsx
│   │   ├── Settings.tsx
│   │   ├── TraceDetail.tsx
│   │   └── Traces.tsx
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

### dashboard/ui primitives

```text
packages/dashboard/src/components/ui/
├── alert-dialog.tsx
├── badge.tsx
├── button.tsx
├── card.tsx
├── collapsible.tsx
├── command.tsx
├── dialog.tsx
├── input.tsx
├── scroll-area.tsx
├── select.tsx
├── separator.tsx
├── sheet.tsx
├── sidebar.tsx
├── skeleton.tsx
├── sonner.tsx
├── table.tsx
├── tabs.tsx
└── tooltip.tsx
```

## packages/sdk

```text
packages/sdk/
├── src/
│   ├── providers/
│   ├── config.ts
│   ├── ids.ts
│   ├── index.ts
│   ├── trace.ts
│   ├── transport.ts
│   └── index.test.ts
├── package.json
└── README.md
```

## packages/shared

```text
packages/shared/
├── src/
│   ├── constants.ts
│   ├── index.ts
│   ├── otlp.ts
│   ├── pricing.ts
│   ├── pricing.test.ts
│   └── types.ts
├── package.json
└── README.md
```

## examples

```text
examples/
├── multi-step-agent/
├── openai-basic/
└── streaming/
```

## tests

```text
tests/
└── integration.mjs
```

## Quick Orientation

- CLI entrypoint: `packages/cli/src/index.ts`
- Collector server: `packages/collector/src/server.ts`
- Dashboard app root: `packages/dashboard/src/App.tsx`
- SDK public API: `packages/sdk/src/index.ts`
- Shared types/constants: `packages/shared/src/index.ts`
