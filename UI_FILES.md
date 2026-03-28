# UI Files List - LLMTap Dashboard

## Overview
This document lists all UI-only related files for the sections you want to modify:
- **Sidebar**
- **CommandPalette**
- **Costs Page**
- **Sessions Page**
- **Models Page**
- **GettingStartedPanel**
- **TraceDetail Page**
- **App (Main Component)**

**IMPORTANT:** These are UI rendering files only. No API, backend, or business logic dependencies included.

---

## 1. Application Root & Layout

### Main Application File
- `packages/dashboard/src/App.tsx` — Main app wrapper, routes, header, sidebar provider

### Sidebar Structure
- `packages/dashboard/src/components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx` — Main sidebar component
- `packages/dashboard/src/components/shadcn-space/blocks/sidebar-01/nav-main.tsx` — Sidebar navigation items

### Sidebar UI Primitives
- `packages/dashboard/src/components/ui/sidebar.tsx` — Sidebar container, context, hooks (useSidebar)

---

## 2. Command Palette

### Main Component
- `packages/dashboard/src/components/CommandPalette.tsx` — Command palette / omnibar for global shortcuts

### Dependencies
- `packages/dashboard/src/components/command-palette/` (directory) — Command palette base and logic
  - Uses Framer Motion for animations
  - Uses React Router for navigation

---

## 3. Pages (UI Components)

### Costs / Economics Page
- `packages/dashboard/src/pages/Costs.tsx` — Main economics page layout

### Sessions Page
- `packages/dashboard/src/pages/Sessions.tsx` — Sessions management page

### Models Page
- `packages/dashboard/src/pages/Models.tsx` — Models intelligence page

### Trace Detail Page
- `packages/dashboard/src/pages/TraceDetail.tsx` — Individual trace inspection page

### Dashboard Home Page
- `packages/dashboard/src/pages/Dashboard.tsx` — Home/overview page (contains GettingStartedPanel)

---

## 4. Core Feature Components

### Getting Started Panel
- `packages/dashboard/src/components/GettingStartedPanel.tsx` — Onboarding panel on dashboard

### Page Frame / Layout
- `packages/dashboard/src/components/PageFrame.tsx` — Wrapper for page sections with title/description/aside

### Data Display
- `packages/dashboard/src/components/DataTable.tsx` — Reusable data table component
- `packages/dashboard/src/components/StatusDot.tsx` — Status indicator dots
- `packages/dashboard/src/components/ProviderBadge.tsx` — Provider display badge
- `packages/dashboard/src/components/LivePulse.tsx` — Live status indicator

### Error & UI Feedback
- `packages/dashboard/src/components/ErrorBoundary.tsx` — Error boundary wrapper
- `packages/dashboard/src/components/ConnectionToast.tsx` — Connection status toast
- `packages/dashboard/src/components/ShortcutsHelp.tsx` — Keyboard shortcuts help modal

---

## 5. Chart Components

### Chart Utilities & Context
- `packages/dashboard/src/components/charts/chart-context.tsx` — Chart context provider
- `packages/dashboard/src/components/charts/line-chart.tsx` — Base line chart component
- `packages/dashboard/src/components/charts/line.tsx` — Advanced line chart
- `packages/dashboard/src/components/charts/AreaTimeline.tsx` — Area timeline chart

### Chart Visualizations (Used in Pages)
- `packages/dashboard/src/components/charts/DonutBreakdown.tsx` — Donut chart for provider breakdown (Costs page)
- `packages/dashboard/src/components/charts/RankingBars.tsx` — Horizontal bar ranking (Costs & Models pages)

---

## 6. shadcn/ui Primitives (Headless UI Components)

### Layout & Structure
- `packages/dashboard/src/components/ui/card.tsx` — Card container
- `packages/dashboard/src/components/ui/button.tsx` — Button primitive
- `packages/dashboard/src/components/ui/badge.tsx` — Badge/tag

### Forms & Input
- `packages/dashboard/src/components/ui/input.tsx` — Input field
- `packages/dashboard/src/components/ui/select.tsx` — Dropdown select
- `packages/dashboard/src/components/ui/command.tsx` — Command/combobox base

### Modals & Dialogs
- `packages/dashboard/src/components/ui/dialog.tsx` — Modal dialog
- `packages/dashboard/src/components/ui/alert-dialog.tsx` — Alert dialog
- `packages/dashboard/src/components/ui/sheet.tsx` — Slide-out sheet

### Navigation & Organization
- `packages/dashboard/src/components/ui/tabs.tsx` — Tabbed interface
- `packages/dashboard/src/components/ui/collapsible.tsx` — Collapsible sections

### Data Display
- `packages/dashboard/src/components/ui/table.tsx` — Table wrapper for data rendering
- `packages/dashboard/src/components/ui/scroll-area.tsx` — Scrollable container

### Styling & Visual
- `packages/dashboard/src/components/ui/tooltip.tsx` — Tooltip on hover
- `packages/dashboard/src/components/ui/separator.tsx` — Divider line
- `packages/dashboard/src/components/ui/skeleton.tsx` — Loading skeleton
- `packages/dashboard/src/components/ui/empty.tsx` — Empty state
- `packages/dashboard/src/components/ui/glowing-bar-chart.tsx` — Glowing bar chart primitive
- `packages/dashboard/src/components/ui/glowing-line.tsx` — Glowing line effect

### Notifications
- `packages/dashboard/src/components/ui/sonner.tsx` — Toast notifications

---

## 7. Magic UI Components (Animated Effects)

### Backgrounds & Effects
- `packages/dashboard/src/components/magicui/animated-grid-pattern.tsx` — Animated grid background
- `packages/dashboard/src/components/magicui/border-beam.tsx` — Animated border beam effect

### Text & Display
- `packages/dashboard/src/components/magicui/shiny-text.tsx` — Shiny text effect
- `packages/dashboard/src/components/magicui/number-ticker.tsx` — Animated number counter (used in pages)

### Cards & Containers
- `packages/dashboard/src/components/magicui/spotlight-card.tsx` — Spotlight effect on card
- `packages/dashboard/src/components/magicui/lamp-hero.tsx` — Lamp hero animation

---

## 8. shadcn Studio & Blocks (Complex Components)

### Statistics Components (Used in Costs, Models, Sessions)
- `packages/dashboard/src/components/shadcn-studio/blocks/statistics-with-status.tsx` — Stat card with status
- `packages/dashboard/src/components/shadcn-studio/blocks/statistics-with-status-grid.tsx` — Grid of stat cards

### Kokonut UI (Additional UI Kit)
- `packages/dashboard/src/components/kokonutui/action-search-bar.tsx` — Search bar action component

---

## 9. UI Hooks (UI State Management)

### Keyboard & Input
- `packages/dashboard/src/hooks/useKeyboardShortcuts.ts` — Keyboard shortcut handler for app-wide shortcuts

### Data Handling (UI-related)
- `packages/dashboard/src/hooks/use-debounce.ts` — Debounce hook for search/input
- `packages/dashboard/src/hooks/useLiveRefresh.ts` — Live refresh UI updates

---

## 10. UI Utilities & Formatting

### Styling
- `packages/dashboard/src/lib/utils.ts` — Utility functions (includes `cn()` for class merging via clsx)

### Data Formatting (Display purposes)
- `packages/dashboard/src/lib/format.ts` — Formatting utilities:
  - `formatCost()` — Format currency display
  - `formatDuration()` — Format time duration
  - `formatCompactNumber()` — Format large numbers compactly
  - `formatTimeAgo()` — Format relative time

### Visual Configuration
- `packages/dashboard/src/lib/provider-colors.ts` — Color palette mapping for providers
- `packages/dashboard/src/lib/content.ts` — Content processing for display (text extraction)

---

## File Organization Summary

### By Count
- **Pages:** 7 files
- **Core Components:** 8 files
- **shadcn/ui Primitives:** 20 files
- **Chart Components:** 6 files
- **Magic UI Effects:** 4 files
- **Complex Blocks:** 3 files
- **Hooks:** 3 files
- **Utilities:** 3 files
- **Sidebar:** 2 files
- **App Root:** 1 file

**Total UI Files:** ~57 files

---

## Important Notes

### What's NOT Included (Excluded - Functionality Only)
❌ `packages/dashboard/src/api/client.ts` — API calls (not UI)  
❌ `packages/dashboard/src/main.tsx` — Entry point (setup)  
❌ `packages/dashboard/src/index.css` — Global styles (modify if needed for theme)  
❌ Any backend/server code  
❌ Any data fetching logic  

### Dependencies These Files Use
✅ React + React Router (navigation)  
✅ Framer Motion (animations)  
✅ TanStack React Table (data tables)  
✅ TanStack React Query (caching - displays data)  
✅ Lucide React (icons)  
✅ clsx (class utilities)  
✅ Recharts (charting)  
✅ Sonner (toasts)  
✅ Radix UI (primitives)  
✅ Tailwind CSS (styling)  

### Safe to Modify
✅ **Color Schemes** — Gradients in class names  
✅ **Spacing/Sizing** — Padding, margins, rounded corners  
✅ **Layout** — Grid, flex, positioning  
✅ **Typography** — Font sizes, weights, tracking  
✅ **Animations** — Framer Motion duration, easing  
✅ **Icons** — Replace Lucide icons  
✅ **Component Props** — Class names, variants  

### DO NOT Modify (Breaks Functionality)
❌ API endpoints  
❌ React Query hooks that fetch data  
❌ State management  
❌ Route definitions  
❌ Event handlers that trigger navigation  

---

## How to Use This File

1. **For Your Changes** → Reference the files in each section you're modifying
2. **For Testing** → Build & run the dashboard after changes: `pnpm --filter @llmtap/dashboard build`
3. **For Verification** → Check all files in the section are properly styled

