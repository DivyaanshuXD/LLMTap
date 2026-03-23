# UI_PLAN.md — LLMTap Dashboard Premium UI/UX Overhaul

## Status Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1.1 | Foundation Setup (shadcn/ui init, deps, path alias, CSS utils) | DONE |
| Phase 1.2 | Extract Shared Components (dedup across 7 pages) | DONE |
| Phase 2.5 | Cards, Badges, Buttons, Tooltips (component files created) | DONE (components created, not yet integrated into all pages) |
| Phase 2.6 | Command Palette (Ctrl+K) | DONE | 
| Phase 3.1 | Number Ticker | DONE (integrated into Dashboard, Costs, Models, Sessions) |
| Phase 3.2 | Border Beam | DONE (component created + integrated into PageFrame hero) |
| Phase 3.5 | Shiny Text | DONE (component created + integrated into PageFrame eyebrow) |
| Phase 4.1 | Spotlight Card | DONE (component created + integrated into Dashboard MetricCard) |
| Phase 2.1 | Data Tables (TanStack Table) | IN PROGRESS (shared DataTable landed; Costs, Models, Sessions migrated) |
| Phase 2.2 | Select Dropdowns (Radix Select) | DONE |
| Phase 2.3 | Dialogs & Sheets | DONE |
| Phase 2.4 | Toast Notifications (Sonner migration) | DONE |
| Phase 2.7 | Sidebar Navigation (collapsible) | DONE |
| Phase 2.8 | Charts Upgrade (Tremor) | DONE |
| Phase 3.3 | Animated Grid Pattern (background) | DONE |
| Phase 3.4 | Shine Border | TODO |
| Phase 3.6 | Marquee (live activity) | TODO |
| Phase 3.7 | Animated List (trace entries) | TODO |
| Phase 3.8 | Particles (background accent) | TODO |
| Phase 4.2 | Lamp Effect (hero section) | DONE |
| Phase 4.3 | Tracing Beam (TraceDetail scroll) | TODO |
| Phase 4.4 | Moving Border (active trace row) | TODO |
| Phase 5 | Page-Specific Polish & Integration | TODO |

---

## Context

The dashboard is functional with 7 pages, hand-built components, and a dark "mission control" aesthetic — but every UI primitive (tables, selects, modals, toasts, cards, buttons) is built with raw HTML + inline Tailwind classes. There's no component library, no reusable design system, and significant code duplication across pages. The goal is to adopt professional component libraries that add premium animated effects, accessibility, and a cohesive design system — while preserving the existing dark cyberpunk/operator aesthetic and Framer Motion animations.

**Current stack:** React 19 + Vite 7 + Tailwind CSS v4 + Framer Motion 12 + Recharts 2 + Lucide icons + TanStack Query 5

---

## Library Strategy — 3 Layers

### Layer 1: shadcn/ui (Foundation)
Copy-paste component library built on Radix UI + Tailwind CSS. You own the code. Adds accessibility (ARIA, keyboard nav, screen reader) for free.

### Layer 2: Magic UI (Premium animated effects)
Extends shadcn/ui with animated components. Same copy-paste model, same theming system. Uses Framer Motion (already installed).

### Layer 3: Selective Aceternity UI (Dramatic visual effects)
Copy-paste animated components. More dramatic effects (3D, spotlights, beams). Cherry-pick only what elevates the operator aesthetic.

---

## MANDATORY — Component Discovery (Fetch Before Building From Scratch)

| Site | URL | Use When |
|------|-----|----------|
| **goodcomponents.io** | https://goodcomponents.io | FIRST STOP — highest quality components, check here before anything else |
| **Shoogle.dev** | https://shoogle.dev | Search engine for shadcn blocks — type "animated list", "moving border", "lamp effect" etc. and get exact code |
| **Magic UI** | https://magicui.design/docs/components | All Phase 3 components are here |
| **Aceternity UI** | https://ui.aceternity.com/components | All Phase 4 components — Lamp, TracingBeam, MovingBorder |
| **motion-primitives** | https://motion-primitives.com/docs | BlurFade, TextEffect for Phase 5 polish |
| **Tremor** | https://tremor.so/docs | Phase 2.8 charts — built-in dark theme, zero config, replaces raw Recharts |
| **Origin UI** | https://originui.com | Phase 2.3 Dialogs & form inputs — cleaner than raw Radix |

### Shoogle Searches for TODO Phases

```
Phase 2.1 → search "data table sortable"
Phase 2.2 → search "select dropdown dark"
Phase 2.3 → search "dialog confirmation" and "side sheet"
Phase 2.7 → search "collapsible sidebar"
Phase 3.6 → search "marquee scrolling"
Phase 3.7 → search "animated list stagger"
```

---

## When Stuck Protocol (MANDATORY for AI agents executing this plan)

If a component doesn't look right or doesn't exist in the listed library:
1. Search https://shoogle.dev with the component name
2. Check https://goodcomponents.io for a visual match
3. Check https://magicui.design/docs/components — Magic UI has 50+ components
4. Check https://ui.aceternity.com/components — for dramatic/cinematic effects
5. Only build from scratch if none of the above have it

**Never hallucinate a component. Always fetch from a real source.**

---

## Future Phase — Landing Page (DO NOT IMPLEMENT YET)

LLMTap needs a marketing landing page for GitHub visitors and future users. This is separate from the dashboard UI overhaul. Implementation will be guided by the user later — do not start this until explicitly instructed.

---

## COMPLETED WORK

### Phase 1.1 — Foundation Setup (DONE)

**What was done:**
- Created `src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- Added `@/` path alias in `vite.config.ts` using `path.resolve(__dirname, "./src")`
- Installed all foundation dependencies into `packages/dashboard/package.json`:
  - `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`
  - `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tooltip`
  - `@radix-ui/react-tabs`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`
  - `@radix-ui/react-collapsible`, `@radix-ui/react-visually-hidden`
  - `cmdk`, `sonner`, `@tanstack/react-table`
- Added Tailwind v4 animation utilities to `index.css`:
  - `@keyframes enter/exit` for shadcn animate-in/out system
  - 16 `@utility` directives: `fade-in-*`, `fade-out-*`, `zoom-in-*`, `zoom-out-*`, `slide-in-from-*`, `slide-out-to-*`
  - `@keyframes border-beam` (360deg rotation for border beam effect)
  - `@keyframes shiny-text` (background-position animation for shimmer)

**Files created:**
- `packages/dashboard/src/lib/utils.ts`

**Files modified:**
- `packages/dashboard/vite.config.ts` — added `@/` alias
- `packages/dashboard/src/index.css` — added animation keyframes + utilities
- `packages/dashboard/package.json` — added 15 new dependencies

---

### Phase 1.2 — Extract Shared Components (DONE)

**What was done:**
Identified and eliminated 13 duplicated patterns across 7 pages. Created 6 shared utility files and 2 shared components.

**Shared utilities created:**
| File | What it replaces | Used by |
|------|-----------------|---------|
| `lib/chart-styles.ts` | Duplicated `tooltipStyle` object | Dashboard, Costs, Models |
| `lib/provider-colors.ts` | Inconsistent provider color maps (3, 5, 6 providers) | Costs, Models, ProviderBadge |
| `lib/constants.ts` | Duplicated `PERIOD_OPTIONS`, animation variants | Dashboard, Traces |
| `lib/content.ts` | Duplicated `getTextContent()` function | Traces, TraceDetail |

**Shared components created:**
| Component | What it replaces | Used by |
|-----------|-----------------|---------|
| `components/StatusDot.tsx` | Identical StatusDot in Dashboard + Traces + inline in TraceDetail | Dashboard, Traces, TraceDetail |
| `components/ProviderBadge.tsx` | Inconsistent provider badge formatting | TraceDetail |

**Pages updated to use shared imports:**
- `Dashboard.tsx` — uses shared StatusDot, tooltipStyle, PERIOD_OPTIONS
- `Traces.tsx` — uses shared StatusDot, PERIOD_OPTIONS, getTextContent
- `TraceDetail.tsx` — uses shared StatusDot, ProviderBadge, getTextContent
- `Costs.tsx` — uses shared tooltipStyle, providerColors
- `Models.tsx` — uses shared tooltipStyle, providerColors

---

### Phase 2.5 — shadcn/ui Component Files Created (DONE — components exist, not all integrated)

**14 shadcn/ui components created in `src/components/ui/`:**

| Component | File | Variants/Features |
|-----------|------|-------------------|
| Button | `ui/button.tsx` | 6 variants (default/destructive/outline/secondary/ghost/link), 4 sizes, emerald glow on default |
| Badge | `ui/badge.tsx` | 6 variants (default/success/warning/error/info/purple) |
| Card | `ui/card.tsx` | Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter |
| Dialog | `ui/dialog.tsx` | Dialog with backdrop-blur overlay, animated enter/exit |
| Sheet | `ui/sheet.tsx` | Side sheet with 4 directions (top/bottom/left/right), VisuallyHidden title |
| Select | `ui/select.tsx` | Radix Select with dark styling, check indicator |
| Table | `ui/table.tsx` | Table/TableHeader/TableBody/TableRow/TableHead/TableCell/TableCaption/TableFooter |
| Tabs | `ui/tabs.tsx` | Radix Tabs with active state styling |
| Command | `ui/command.tsx` | cmdk wrapper: Command/CommandDialog/CommandInput/CommandList/CommandEmpty/CommandGroup/CommandItem/CommandShortcut |
| Tooltip | `ui/tooltip.tsx` | Radix Tooltip with animations |
| ScrollArea | `ui/scroll-area.tsx` | Custom scrollbar with emerald-to-sky gradient thumb |
| Separator | `ui/separator.tsx` | Styled separator |
| Skeleton | `ui/skeleton.tsx` | Shimmer skeleton using shimmer keyframe |
| Sonner | `ui/sonner.tsx` | Dark-themed Sonner wrapper with status-specific colors |

**Integration status:**
- Button — used in Dashboard (pagination buttons)
- Toaster (Sonner) — added to App.tsx as global provider
- TooltipProvider — added to App.tsx wrapping entire app
- Command — used by CommandPalette component
- Others — created and ready but NOT yet replacing raw HTML in pages

---

### Phase 2.6 — Command Palette (DONE)

**What was done:**
- Created `components/CommandPalette.tsx` — Full Ctrl+K command palette
  - Navigate group: Overview, Traces, Economics, Models, Sessions, Settings (with `g` hotkeys shown)
  - Actions group: Keyboard shortcuts, Refresh data
  - Dark-themed, keyboard-first interaction
- Updated `hooks/useKeyboardShortcuts.ts` — Added `onOpenCommandPalette` callback, Ctrl+K now opens command palette instead of focusing search input
- Updated `App.tsx`:
  - Added `commandOpen` state and `openCommand` callback
  - Wired `useKeyboardShortcuts` with `onOpenCommandPalette`
  - Added `<CommandPalette>` component
  - Added search button in header with `Ctrl+K` hint badge

---

### Phase 3 — Magic UI Components (PARTIALLY DONE)

**4 Magic UI components created in `src/components/magicui/`:**

| Component | File | Status | Integrated where? |
|-----------|------|--------|-------------------|
| NumberTicker | `magicui/number-ticker.tsx` | Created | NOT yet integrated into metric cards |
| BorderBeam | `magicui/border-beam.tsx` | Created + Integrated | `PageFrame.tsx` hero section (all pages) |
| ShinyText | `magicui/shiny-text.tsx` | Created + Integrated | `PageFrame.tsx` eyebrow label (all pages) |
| SpotlightCard | `magicui/spotlight-card.tsx` | Created + Integrated | `Dashboard.tsx` MetricCard hover effect |

---

### Phase 4.1 — Spotlight Card (DONE)

Created custom SpotlightCard component (mouse-following radial gradient on hover). Integrated into Dashboard MetricCard. Emerald-tinted spotlight color.

---

## REMAINING WORK (TODO)

### Phase 2.1 — Data Tables (TanStack Table Integration)

**Current state:** Hand-built `<table>` with `border-separate`, inline sort logic, manual pagination — repeated in 5 pages.

**What will be done:**
- Create a reusable `DataTable` component wrapping `@tanstack/react-table` (already installed)
- Replace hand-built tables in 5 pages with DataTable:
  - `Dashboard.tsx` — recent traces table
  - `Traces.tsx` — main trace explorer table
  - `Costs.tsx` — cost breakdown table
  - `Models.tsx` — model stats table
  - `Sessions.tsx` — sessions table
- Features: built-in column sorting, filtering, pagination, sticky headers
- Uses the shadcn `Table` primitives (`ui/table.tsx`) already created

**Pages affected:** Dashboard, Traces, Costs, Models, Sessions

---

### Phase 2.2 — Select Dropdowns (Radix Select)

**Current state:** Raw `<select>` elements with Tailwind classes (6 instances).

**What will be done:**
- Replace all raw `<select>` elements with shadcn `Select` component (`ui/select.tsx`, already created)
- 6 instances to replace:
  - `Dashboard.tsx` — 3 selects (period, sort, filter)
  - `Traces.tsx` — 2 selects (period, status filter)
  - `Settings.tsx` — 1 select (theme or export format)
- Benefits: keyboard nav, custom styling, search within options, accessible

**Pages affected:** Dashboard, Traces, Settings

---

### Phase 2.3 — Dialogs & Sheets

**Current state:** Hand-built modals and slide-out panel.

**What will be done:**
- Replace ShortcutsHelp modal with shadcn `Dialog` (`ui/dialog.tsx`, already created)
- Replace Replay modal in TraceDetail with shadcn `Dialog`
- Replace `window.confirm()` in Settings with shadcn `Dialog` (confirmation dialog)
- Replace Traces PreviewPanel slide-out with shadcn `Sheet` (`ui/sheet.tsx`, already created)
  - Right-side slide-in with proper overlay and animation

**Files affected:**
- `components/ShortcutsHelp.tsx` — Dialog
- `pages/TraceDetail.tsx` — Dialog (Replay modal)
- `pages/Traces.tsx` — Sheet (PreviewPanel)
- `pages/Settings.tsx` — Dialog (Reset confirm)

---

### Phase 2.4 — Toast Notifications (Sonner Migration)

**Current state:** Hand-built `ConnectionToast` component + `alert()` calls in Settings. Sonner `<Toaster />` already added to App.tsx.

**What will be done:**
- Refactor `ConnectionToast.tsx` to use Sonner `toast()` API instead of custom component
- Replace all `alert()` calls in `Settings.tsx` with `toast.success()` / `toast.error()`
- Add `toast()` for copy confirmations in `TraceDetail.tsx`
- Add `toast()` for export success in any export flow
- Unified toast system for all user feedback

**Files affected:**
- `components/ConnectionToast.tsx` — refactor to Sonner
- `pages/Settings.tsx` — replace `alert()` with `toast()`
- `pages/TraceDetail.tsx` — copy confirmations via `toast()`

---

### Phase 2.7 — Sidebar Navigation (Collapsible)

**Current state:** Hand-built nav in App.tsx with NavItem components.

**What will be done:**
- Replace hand-built sidebar with shadcn-style collapsible sidebar
- Features:
  - Collapsible to icon-only mode (more screen space for data)
  - Mobile-responsive (hamburger + drawer)
  - Tooltip labels when collapsed (using `ui/tooltip.tsx`)
  - Smooth animated transition between expanded/collapsed
  - Persistent collapse state in localStorage

**File affected:** `App.tsx`

---

### Phase 2.8 — Charts Upgrade (Tremor)

**Current state:** Raw Recharts with manual styling, shared `tooltipStyle` already extracted.

**What will be done:**
- **Do NOT build a custom ChartContainer wrapper** — use Tremor instead
- Tremor's chart components (BarChart, AreaChart, DonutChart) are built for exactly this use case — dark dashboards with stats
- They use Recharts under the hood but wrap it with pre-built dark theming, tooltips, and responsive behavior
- Check https://tremor.so/docs/charts/bar-chart first before writing any wrapper code
- Replace direct Recharts usage with Tremor chart components
- Source for sparklines: https://tremor.so/docs/charts/sparkline

**Pages affected:** Dashboard, Costs, Models

---

### Phase 3 — Magic UI (Remaining Components)

**What will be done:**

| Component | Where | Effect |
|-----------|-------|--------|
| NumberTicker (integrate) | Dashboard MetricCards (4), Costs CostCards (3), TraceDetail MetaCards (5) | Numbers count up from 0 to value on first render |
| Animated Grid Pattern | App.tsx background | Grid lines that subtly pulse/fade, "living HUD" feel |
| Shine Border | Sidebar info panel, collector status panel | Rotating light shine around border |
| Marquee | Dashboard aside/footer | Recent trace activity auto-scrolling cards |
| Animated List | Trace table rows, insight cards | Staggered fade/slide entrance for items |
| Particles | Behind hero section, empty states | Floating particles reacting to mouse |

---

### Phase 4 — Aceternity UI Cherry-Picks (Remaining)

| Component | Where | Effect |
|-----------|-------|--------|
| Lamp Effect | Dashboard page hero title | Dramatic top-down cone of light, cinematic entrance |
| Tracing Beam | TraceDetail left sidebar | Beam follows scroll position through span tree |
| Moving Border | Active/hovered trace table row | Animated gradient border orbiting the row |

---

### Phase 5 — Page-Specific Enhancements

Final polish pass once all components and effects are integrated.

#### Phase 5 Component Sources
| Component Need | Source |
|---------------|--------|
| Sparklines | Tremor Sparkline — https://tremor.so/docs/charts/sparkline |
| Code block syntax highlighting | Shiki — https://shiki.style — zero runtime, theme matches dark aesthetic |
| Trace tree scroll beam | Aceternity TracingBeam — https://ui.aceternity.com/components/tracing-beam |
| Session status badges | shadcn Badge already created in Phase 2.5 — just integrate |
| Settings form inputs | Origin UI inputs — https://originui.com — cleaner than raw Radix |
| Blur fade transitions | motion-primitives BlurFade — https://motion-primitives.com/docs |
| Text entrance effects | motion-primitives TextEffect — https://motion-primitives.com/docs |

**Dashboard:**
- NumberTicker on all 4 metric cards
- Sparkline mini-charts inside metric cards (Tremor Sparkline)
- Animated provider allocation bars (gradient glow)

**Traces Explorer:**
- DataTable with sorting, filtering, checkbox selection
- Sheet for preview panel
- Moving Border on selected rows
- Animated List for row entrance

**Trace Detail:**
- Tracing Beam alongside span tree scroll (Aceternity TracingBeam)
- NumberTicker on MetaCards
- Spotlight on span detail panels
- Code block syntax highlighting (Shiki — https://shiki.style)
- Dialog for Replay modal

**Costs:**
- NumberTicker on CostCards
- Enhanced charts with Tremor components
- Sparkline in table rows for cost trend (Tremor Sparkline)
- Spotlight on chart panels

**Models:**
- NumberTicker on stats
- Provider-colored badges (shadcn Badge)
- Enhanced charts with Tremor components

**Sessions:**
- Status indicator badges (shadcn Badge — already created)
- DataTable with sorting
- Link each session to filtered Traces view

**Settings:**
- Form inputs from Origin UI (https://originui.com)
- Dialog for destructive actions (shadcn Dialog)
- Toast notifications for all actions (Sonner)
- Better section layout with shadcn Card

---

## Files Inventory

### Files Created (all in `packages/dashboard/src/`)
```
lib/utils.ts                          -- cn() helper
lib/chart-styles.ts                   -- shared tooltipStyle
lib/provider-colors.ts                -- provider color map + badge styles
lib/constants.ts                      -- PERIOD_OPTIONS, animation variants
lib/content.ts                        -- getTextContent()

components/StatusDot.tsx              -- shared status indicator
components/ProviderBadge.tsx          -- shared provider badge
components/CommandPalette.tsx         -- Ctrl+K command palette

components/ui/button.tsx              -- shadcn Button
components/ui/badge.tsx               -- shadcn Badge
components/ui/card.tsx                -- shadcn Card
components/ui/dialog.tsx              -- shadcn Dialog
components/ui/sheet.tsx               -- shadcn Sheet
components/ui/select.tsx              -- shadcn Select
components/ui/table.tsx               -- shadcn Table
components/ui/tabs.tsx                -- shadcn Tabs
components/ui/command.tsx             -- shadcn Command (cmdk)
components/ui/tooltip.tsx             -- shadcn Tooltip
components/ui/scroll-area.tsx         -- shadcn ScrollArea
components/ui/separator.tsx           -- shadcn Separator
components/ui/skeleton.tsx            -- shadcn Skeleton
components/ui/sonner.tsx              -- shadcn Sonner (toast)

components/magicui/number-ticker.tsx  -- animated number counting
components/magicui/border-beam.tsx    -- rotating light beam border
components/magicui/shiny-text.tsx     -- metallic shimmer text
components/magicui/spotlight-card.tsx -- mouse-following radial spotlight
```

### Files Modified
```
vite.config.ts                        -- added @/ path alias
index.css                             -- animation keyframes + utilities
App.tsx                               -- CommandPalette, Toaster, TooltipProvider, search button
hooks/useKeyboardShortcuts.ts         -- onOpenCommandPalette callback

components/PageFrame.tsx              -- BorderBeam + ShinyText integration

pages/Dashboard.tsx                   -- shared imports, SpotlightCard, Button
pages/Traces.tsx                      -- shared imports (StatusDot, PERIOD_OPTIONS, getTextContent)
pages/TraceDetail.tsx                 -- shared imports (StatusDot, ProviderBadge, getTextContent)
pages/Costs.tsx                       -- shared imports (tooltipStyle, providerColors)
pages/Models.tsx                      -- shared imports (tooltipStyle, providerColors)

package.json                          -- 15 new dependencies
```

---

## Dependencies Added
```json
{
  "clsx": "^2.1",
  "tailwind-merge": "^3.0",
  "class-variance-authority": "^0.7",
  "@radix-ui/react-slot": "^1.1",
  "@radix-ui/react-dialog": "^1.1",
  "@radix-ui/react-select": "^2.1",
  "@radix-ui/react-tooltip": "^1.1",
  "@radix-ui/react-tabs": "^1.1",
  "@radix-ui/react-scroll-area": "^1.2",
  "@radix-ui/react-separator": "^1.1",
  "@radix-ui/react-collapsible": "^1.1",
  "@radix-ui/react-visually-hidden": "^1.1",
  "cmdk": "^1.0",
  "sonner": "^2.0",
  "@tanstack/react-table": "^8.21"
}
```

---

## Suggested Next Implementation Order

1. **Phase 2.1** — DataTable integration (largest remaining foundation gap across Dashboard, Traces, Costs, Models, Sessions)
2. **Phase 3.1** — Integrate NumberTicker into Dashboard, Costs, and TraceDetail metric cards
3. **Phase 3.x** — Finish motion upgrades: AnimatedGrid, ShineBorder, Marquee, AnimatedList, Particles
4. **Phase 4** — Lamp, TracingBeam, MovingBorder
5. **Phase 5** — Full page-by-page visual polish

---

## Build Status

- All 5 packages build clean (`pnpm -r build`)
- All 72 tests pass (`pnpm -r test`: 47 shared + 7 sdk + 18 collector)
- Dashboard Vite bundle: ~555KB (index chunk — increased from ~406KB due to Radix/cmdk deps)

---

## Verification (run after all phases complete)
1. `pnpm -r build` — all packages build clean
2. `pnpm -r test` — all tests pass
3. Visual QA each page: Dashboard, Traces, TraceDetail, Costs, Models, Sessions, Settings
4. Test Ctrl+K command palette — navigation, trace search, quick actions
5. Test sidebar collapse/expand on desktop and mobile
6. Test all toast notifications (connection, export, copy, reset, errors)
7. Test keyboard navigation through all shadcn components (Tab, Enter, Escape, Arrow keys)
8. Performance: DevTools > Performance tab — no regression from new animations
9. Bundle size check: `npx vite-bundle-visualizer` — ensure tree-shaking keeps bundle lean
