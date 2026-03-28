# LLMTap UI Requirements

This file is the working contract for external UI sourcing and staged integration.

## Non-Negotiable Rules

- Every raw `npx` command or copied external code snippet must be added inside `packages/dashboard/_ui_staging` first.
- Nothing from external UI sources should touch `packages/dashboard/src` until the staged version is reviewed and mapped properly.
- Animate UI is the first-choice source.
- If Animate UI does not have the required component, fallback sources are allowed only if they are public, no-login, copyable, and practical to integrate.
- The project palette is fixed to:
  - `#0B0C10`
  - `#1F2833`
  - `#C5C6C7`
  - `#66FCF1`
  - `#45A29E`

## Active Source Commands

- Sidebar:
  - `npx shadcn@latest add @animate-ui/components-radix-sidebar`
- Accordion:
  - `npx shadcn@latest add @animate-ui/components-base-accordion`
- Background hero:
  - `npm install motion`
  - staged source: `packages/dashboard/_ui_staging/GravityStarsBackground.tsx`

## Current Staging Status

- `GravityStarsBackground`
  - staged and mapped into live hero usage
- `Accordion`
  - exact Animate UI component installed and mapped into Overview and Settings
- `Sidebar`
  - exact Animate UI source has been inspected, but it pulls additional Animate UI dependencies and helper files before it can safely replace the live shell
  - do not promote it until the dependency chain is staged cleanly

## Animate UI Inventory Available

### Animate UI

- Avatar Group
- Code
- Code Tabs
- Cursor
- GitHub Stars Wheel
- Tabs
- Tooltip

### Radix UI

- Accordion
- Alert Dialog
- Checkbox
- Dialog
- Dropdown Menu
- Files
- Hover Card
- Popover
- Preview Link Card
- Progress
- Radio Group
- Sheet
- Sidebar
- Switch
- Tabs
- Toggle
- Toggle Group
- Tooltip

### Base UI

- Accordion
- Alert Dialog
- Checkbox
- Dialog
- Files
- Menu
- Popover
- Preview Card
- Preview Link Card
- Progress
- Radio
- Switch
- Tabs
- Toggle
- Toggle Group
- Tooltip

### Headless UI

- Accordion
- Checkbox
- Dialog
- Popover
- Switch
- Tabs

### Buttons

- Button
- Copy Button
- Flip Button
- GitHub Stars Button
- Icon Button
- Liquid Button
- Ripple Button
- Theme Toggler Button

### Backgrounds

- Bubble Background
- Fireworks Background
- Gradient Background
- Gravity Stars Background
- Hexagon Background
- Hole Background
- Stars Background

### Community

- Introduction
- Flip Card
- Management Bar
- Motion Carousel
- Notification List
- Pin List
- Playful Todolist
- Radial Intro
- Radial Menu
- Radial Nav
- Share Button
- User Presence Avatar

## Current Integration Priorities

### 1. Sidebar / Rail Navigation

Need for:

- desktop nav rail
- collapsed sidebar behavior
- clean dock geometry

Wanted qualities:

- precise icon alignment
- no text overlap in collapsed mode
- one collapse control only
- premium selection state

Suggested Animate UI candidates:

- Sidebar
- Radial Nav
- Icon Button

### 2. Command Palette / Search Overlay

Need for:

- app-wide quick navigation
- future quick actions

Wanted qualities:

- premium dark shell
- crisp input treatment
- polished result rows
- stable keyboard hints

Suggested Animate UI candidates:

- Dialog
- Tabs
- Tooltip
- Icon Button

### 3. Data Table / Operator Table

Need for:

- Traces page
- Sessions page
- Costs breakdown
- Models breakdown

Wanted qualities:

- compact rows
- sticky header
- row selection
- elegant hover state
- dense but readable

### 4. Line / Area Chart

Need for:

- Dashboard spend trend
- future latency and token trends

Wanted qualities:

- subtle motion
- dark-theme readability
- premium gradient treatment
- low overhead

### 5. Empty State / First-Run State

Need for:

- Dashboard onboarding
- Sessions empty state
- Costs empty state
- Traces no-results state

Suggested Animate UI candidates:

- Code
- Code Tabs
- Tooltip
- Tabs

### 6. KPI / Stat Cards

Need for:

- Dashboard
- Costs
- Models
- Sessions
- Settings

Suggested Animate UI candidates:

- Tooltip
- Flip Card
- Preview Card

### 7. Dense Trace Detail / Timeline

Need for:

- trace hierarchy
- nested execution blocks
- payload sections

Wanted qualities:

- compact grouping
- clear tree depth
- better timing bars
- serious observability tone

## Fallback Categories To Source Elsewhere

These are expected to come from outside Animate UI if needed:

- line chart
- area chart
- donut chart
- ranking bars
- trace timeline
- execution tree

## Current Product Notes

- Economics should populate automatically when spans exist.
- Sessions only populate when traces carry `sessionId`.
- For sessions in real projects, the SDK usage must include `sessionId` through `init(...)` or `startTrace(..., { sessionId })`.

## What To Send

For each sourced component, send:

- component name
- source link
- install command
- code files
- dependency list
- whether it is production-safe or demo-only
