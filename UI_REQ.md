# LLMTap UI Requirements

This file is the sourcing list for premium external UI components that can replace the current lighter-weight internal surfaces.

The goal is not "more components". The goal is:

- cleaner density
- stronger hierarchy
- better scanability
- premium motion without stutter
- components that still fit a dark operator-console product

## Ground Rules

- Prefer React + Tailwind compatible components.
- Prefer components that are already production-usable, not just visual demos.
- Prefer components with clear composition and editable source.
- Avoid components that depend on huge charting stacks unless they are genuinely worth the weight.
- Avoid novelty animations that hurt readability or FPS.

## Highest Priority Requests

### 1. Data Table / Operator Table

Need a premium table for:

- Traces page
- Sessions page
- Costs model breakdown
- Future models/provider registries

Wanted qualities:

- compact but readable rows
- sticky header
- sortable columns
- row selection
- elegant hover/active states
- good empty state support
- dark theme first
- looks like a serious ops console, not generic admin template

Keywords to search:

- `data table`
- `command center table`
- `analytics table`
- `ops dashboard table`

### 2. Line / Area Chart For Spend Trend

Need for:

- Dashboard "Economic pulse / Cost gradient"
- possible future token trend / latency trend

Wanted qualities:

- smooth but subtle animation
- premium gradients
- clean axes and tooltip styling
- readable on dark surfaces
- does not feel like default chart library output
- low-overhead if possible

Keywords to search:

- `line chart`
- `area chart`
- `analytics trend chart`
- `revenue trend chart`

### 3. Donut / Radial Breakdown

Need for:

- provider share on Costs page
- possibly model share or status share later

Wanted qualities:

- very clean labeling
- good legend treatment
- balanced spacing
- readable with small segment counts
- strong dark-theme look

Keywords to search:

- `donut chart`
- `radial breakdown`
- `allocation chart`

### 4. Ranking Bars / Horizontal Comparison Bars

Need for:

- model cost ranking
- model latency ranking
- token distribution ranking

Wanted qualities:

- strong typography
- good label/value alignment
- compact stacked ranking style
- premium progress-bar rendering

Keywords to search:

- `ranking bars`
- `horizontal bar analytics`
- `leaderboard component`

### 5. Command Palette / Search Overlay

Need for:

- app-wide navigation palette
- later quick actions like export, doctor, reset, open trace

Wanted qualities:

- crisp dark overlay
- premium focus/input treatment
- polished result rows
- keyboard hint support
- no washed-out borders

Keywords to search:

- `command palette`
- `spotlight search`
- `raycast style search`

### 6. Sidebar / Rail Navigation

Need for:

- desktop nav rail
- collapsed sidebar behavior

Wanted qualities:

- proper collapsed dock state
- precise icon alignment
- premium selection indicator
- compact but stable geometry
- no broken wide empty rail

Keywords to search:

- `sidebar`
- `dock sidebar`
- `collapsed nav rail`
- `app shell navigation`

### 7. Stat Cards / KPI Cards

Need for:

- Dashboard metrics
- Costs summary
- Sessions summary
- Settings system status

Wanted qualities:

- premium but restrained
- strong typography
- subtle motion
- better than generic glassmorphism
- works in dense dashboards

Keywords to search:

- `stats card`
- `kpi card`
- `metric card`
- `analytics summary card`

### 8. Empty State / First-Run State

Need for:

- Dashboard onboarding
- Sessions empty state
- Costs empty state
- Traces no-results state

Wanted qualities:

- highly professional onboarding feel
- not childish
- shows exactly what to do next
- compact code/example blocks
- polished visual hierarchy

Keywords to search:

- `empty state`
- `onboarding panel`
- `getting started block`

## Secondary Priority Requests

### 9. Timeline / Trace Tree Visual Enhancer

Need for:

- Trace detail hierarchy

Wanted qualities:

- cleaner indentation/tree readability
- better time bars
- compact but premium nested execution view

Keywords to search:

- `timeline`
- `tree view`
- `trace viewer`
- `execution timeline`

### 10. Settings Section Cards

Need for:

- export/backup/import/reset/retention/OTLP blocks

Wanted qualities:

- cleaner grouping
- less clutter
- more confidence-inspiring controls
- neat action layouts

Keywords to search:

- `settings panel`
- `configuration card`
- `tool settings section`

### 11. Session Registry Surface

Need for:

- sessions page identity and grouping view

Wanted qualities:

- session cards or tighter rows
- clearer first/last active indicators
- stronger relationship between session, traces, and cost

Keywords to search:

- `activity list`
- `conversation list`
- `session table`

### 12. Insight / Alert Cards

Need for:

- dashboard insights
- future diagnostics and anomaly surfaces

Wanted qualities:

- severity styling
- clean icon hierarchy
- concise metric badges
- serious observability tone

Keywords to search:

- `alert card`
- `insight card`
- `monitoring card`

## Best Places To Upgrade First

If you only source a few components first, prioritize these in order:

1. data table
2. line/area chart
3. sidebar / dock navigation
4. command palette
5. empty state / onboarding block
6. ranking bars
7. stat cards

## Notes About Current Behavior

- Costs/Economics should populate automatically when spans exist.
- Sessions only populate when traces carry `sessionId`.
- If you want sessions to be visible in real projects, the SDK usage must include a `sessionId` via `init(...)` or `startTrace(..., { sessionId })`.

## What To Send Back

For any component you find, send:

- component name
- source link
- install command
- code files
- dependency list
- whether it is safe for production or just a demo

If you want, send one batch per category instead of everything at once.
