# Project Structure — LLMTap

**Monorepo Structure** | Turborepo + pnpm Workspace | Excluded: node_modules, dist, .turbo, .git, build outputs

---

## Root Directory

```
llmtap/
├── .agents/                  # Agent customization & skills
├── .claude/                  # Claude-specific configurations
├── .github/                  # GitHub workflows & instructions
├── .insforge/                # InsForge backend configuration
├── .planning/                # Project planning documents
├── design-system/            # Design system & UI guidelines
├── examples/                 # Example implementations
├── get-shit-done/            # GSD project management system
├── packages/                 # Core monorepo packages
├── scripts/                  # Utility scripts
├── tests/                    # Integration tests
│
├── .gitignore                # Git ignore rules
├── .npmrc                     # NPM configuration
├── .turbo/                   # Turborepo cache (excluded)
├── GEM.md                     # Coding Agent Master Rules
├── MASTERPLAN.md             # High-level project roadmap
├── PHASE_COMPLETION.md       # Phase completion tracking
├── README.md                 # Project overview
├── UI_FILES.md              # UI component file listing
├── UI_PLAN.md               # UI improvement plan
├── UI_REQ.md                # UI requirements
├── UI_STATE_ANALYSIS.md     # Current UI state analysis
├── package.json             # Root workspace config
├── pnpm-lock.yaml           # Dependency lock file
├── pnpm-workspace.yaml      # Workspace configuration
├── tsconfig.base.json       # Base TypeScript config
├── turbo.json               # Turborepo configuration
├── skills-lock.json         # Skills/capabilities lock file
└── rules.md                 # Project rules & guidelines
```

---

## Packages Directory

```
packages/
├── cli/                      # Command-line interface
│   ├── src/
│   │   ├── commands/         # CLI command implementations
│   │   ├── lib/              # CLI utilities & helpers
│   │   └── index.ts          # Main CLI entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts        # Bundle configuration
│   └── README.md
│
├── collector/                # Backend collector/server
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── db.ts             # Database layer
│   │   ├── events.ts         # Event handling
│   │   ├── schemas.ts        # Data schemas
│   │   ├── server.ts         # Server setup
│   │   ├── otlp-forwarder.ts # OpenTelemetry forwarding
│   │   ├── seed.ts           # Database seeding
│   │   ├── index.ts          # Main entry point
│   │   ├── db.test.ts        # Database tests
│   │   └── server.test.ts    # Server tests
│   ├── package.json
│   └── README.md
│
├── dashboard/                # React web dashboard/UI
│   ├── src/
│   │   ├── api/              # API client methods
│   │   ├── components/       # React components
│   │   │   ├── charts/       # Chart visualizations
│   │   │   ├── kokonutui/    # Kokonut UI components
│   │   │   ├── magicui/      # Magic UI effects
│   │   │   ├── shadcn-space/ # shadcn space design blocks
│   │   │   ├── shadcn-studio/# shadcn studio components
│   │   │   ├── ui/           # shadcn/ui primitives
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── ConnectionToast.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── GettingStartedPanel.tsx
│   │   │   ├── LivePulse.tsx
│   │   │   ├── PageFrame.tsx
│   │   │   ├── ProviderBadge.tsx
│   │   │   ├── ShortcutsHelp.tsx
│   │   │   └── StatusDot.tsx
│   │   ├── hooks/            # React custom hooks
│   │   │   ├── use-debounce.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   └── useLiveRefresh.ts
│   │   ├── lib/              # Utility functions
│   │   │   ├── content.ts
│   │   │   ├── format.ts
│   │   │   ├── provider-colors.ts
│   │   │   └── utils.ts
│   │   ├── pages/            # Page components
│   │   │   ├── Costs.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Models.tsx
│   │   │   ├── Sessions.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── TraceDetail.tsx
│   │   │   └── Traces.tsx
│   │   ├── types/            # TypeScript type definitions
│   │   ├── assets/           # Static assets
│   │   ├── fonts/            # Font files
│   │   ├── App.tsx           # Root app component
│   │   ├── main.tsx          # Entry point
│   │   ├── index.css         # Global styles
│   │   └── command-palette.jsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts        # Vite build config
│   ├── index.html
│   └── README.md
│
├── sdk/                      # JavaScript/TypeScript SDK
│   ├── src/
│   │   ├── providers/        # Provider integrations
│   │   ├── config.ts         # SDK configuration
│   │   ├── ids.ts            # ID generation utilities
│   │   ├── index.ts          # Main SDK export
│   │   ├── trace.ts          # Trace implementation
│   │   ├── transport.ts      # Transport layer
│   │   └── index.test.ts     # SDK tests
│   ├── package.json
│   └── README.md
│
└── shared/                   # Shared utilities & types
    ├── src/
    │   ├── constants.ts      # Shared constants
    │   ├── index.ts          # Main export
    │   ├── otlp.ts           # OpenTelemetry integration
    │   ├── pricing.ts        # Pricing calculations
    │   ├── pricing.test.ts   # Pricing tests
    │   └── types.ts          # Shared types
    ├── package.json
    └── README.md
```

---

## Design System Directory

```
design-system/
└── llmtap/
    ├── MASTER.md             # Design system master doc
    └── pages/                # Design system pages/components
```

---

## Examples Directory

```
examples/
├── multi-step-agent/         # Multi-step agent example
│   ├── index.mjs
│   └── package.json
├── openai-basic/             # OpenAI basic integration
│   ├── index.mjs
│   └── package.json
└── streaming/                # Streaming example
    ├── index.mjs
    └── package.json
```

---

## Get-Shit-Done (GSD) Directory

```
get-shit-done/
├── bin/                      # Executable scripts
├── VERSION                   # Version tracking
├── references/               # Reference documentation
│   ├── checkpoints.md
│   ├── continuation-format.md
│   ├── decimal-phase-calculation.md
│   ├── git-integration.md
│   ├── git-planning-commit.md
│   ├── model-profile-resolution.md
│   ├── model-profiles.md
│   ├── phase-argument-parsing.md
│   ├── planning-config.md
│   ├── questioning.md
│   ├── tdd.md
│   ├── ui-brand.md
│   ├── verification-patterns.md
│   └── ...
├── templates/                # Document templates
│   ├── config.json
│   ├── context.md
│   ├── continue-here.md
│   ├── debug-subagent-prompt.md
│   ├── DEBUG.md
│   ├── discovery.md
│   ├── milestone-archive.md
│   ├── milestone.md
│   ├── phase-prompt.md
│   ├── planner-subagent-prompt.md
│   ├── project.md
│   ├── requirements.md
│   ├── research.md
│   ├── retrospective.md
│   ├── roadmap.md
│   ├── state.md
│   ├── summary-*.md
│   ├── UAT.md
│   ├── user-setup.md
│   ├── VALIDATION.md
│   ├── verification-report.md
│   ├── codebase/
│   └── research-project/
└── workflows/                # Workflow definitions
    ├── add-phase.md
    ├── add-tests.md
    ├── add-todo.md
    ├── audit-milestone.md
    ├── check-todos.md
    ├── cleanup.md
    ├── complete-milestone.md
    ├── diagnose-issues.md
    ├── discovery-phase.md
    ├── discuss-phase.md
    ├── execute-phase.md
    ├── execute-plan.md
    ├── health.md
    ├── help.md
    ├── insert-phase.md
    ├── list-phase-assumptions.md
    ├── map-codebase.md
    ├── new-milestone.md
    ├── new-project.md
    ├── pause-work.md
    ├── plan-milestone-gaps.md
    ├── plan-phase.md
    ├── progress.md
    ├── quick.md
    ├── remove-phase.md
    ├── research-phase.md
    ├── resume-project.md
    ├── set-profile.md
    ├── settings.md
    ├── transition.md
    ├── update.md
    ├── verify-phase.md
    └── verify-work.md
```

---

## .agents Directory

```
.agents/
└── skills/                   # Custom agent skills
    ├── insforge/             # InsForge backend skill
    │   └── SKILL.md
    └── insforge-cli/         # InsForge CLI skill
        └── SKILL.md
```

---

## .github Directory

```
.github/
├── instructions/             # GitHub-specific instructions
│   └── r1.instructions.md
└── workflows/                # GitHub Actions workflows
    └── [workflow files]
```

---

## .claude Directory

```
.claude/
└── skills/
    └── ui-ux-pro-max/        # UI/UX design skill
        └── SKILL.md
```

---

## Tests Directory

```
tests/
└── integration.mjs           # Integration tests
```

---

## Scripts Directory

```
scripts/
└── verify-publish-manifests.mjs
```

---

## Key Configuration Files

```
Root-level configs:
├── tsconfig.base.json        # Shared TypeScript config
├── turbo.json                # Turborepo task configuration
├── pnpm-workspace.yaml       # Workspace definition
├── .npmrc                    # NPM configuration
├── .gitignore               # Git ignore patterns
└── package.json             # Root dependencies

Per-package configs:
├── packages/*/package.json
├── packages/*/tsconfig.json
├── packages/*/vite.config.ts (dashboard)
├── packages/*/tsup.config.ts (cli)
└── ...
```

---

## Technology Stack by Package

| Package | Tech Stack | Purpose |
|---------|-----------|---------|
| **cli** | TypeScript, tsup, Node.js | Command-line interface for LLMTap |
| **collector** | Node.js, Express, OTLP, Database | Backend server, trace collection |
| **dashboard** | React, Vite, TypeScript, Tailwind, Shadcn/ui | Web UI for trace visualization |
| **sdk** | TypeScript, OTLP | JavaScript/TypeScript SDK for instrumentation |
| **shared** | TypeScript | Shared utilities, types, constants |

---

## Build Outputs (Excluded)

```
node_modules/                # Dependencies (all packages)
packages/*/node_modules/     # Package-specific deps
dist/                        # Build output
**/.turbo/                   # Turborepo cache
llmtap-*.tgz                 # Packaged tarballs
```

---

## Summary Stats

- **Total Packages:** 5 main packages
- **Total Components:** 50+ React components
- **Total Pages:** 7 page routes
- **Total Utilities:** 15+ utility functions/hooks
- **Scripts:** 1 verification script + multiple npm tasks
- **Tests:** Unit + Integration test files
- **Documentation:** 20+ markdown documentation files

