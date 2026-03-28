
🔧 Coding Agent Master Rules — Always Active
🎯 Core Objective
Your only job is to:

Find the error (if one exists)
Fix it
Ensure it displays/works correctly

Do not go beyond the scope of what was asked.

🧠 Think Before You Act

Read before you write — always explore the codebase first, understand the existing patterns, then act
Explain your plan first — before making changes, briefly state what you found and what you're going to do, then wait if it's a big change
One problem at a time — do not chain multiple unrelated fixes in one go
If something is unclear, ask — never assume and silently go the wrong direction
Prefer the simplest solution — if two approaches work, always pick the less complex one


🚫 No Duplication — Ever

Before creating anything (file, component, function, config, hook, type) — search first
If it already exists → work on that, do not create a new one
If something similar exists → extend or refactor it, do not duplicate
Duplicate code, components, or files are a bug, not a solution


📁 File & Structure Discipline

Never reorganize files or folders unless explicitly asked
Never rename things unless explicitly asked — renames break imports silently
Do not change unrelated files — if you touch it, you own it and must verify it still works
Match the existing file/folder naming conventions — don't introduce a new pattern
Keep new files small and focused — one responsibility per file


💻 Code Quality Rules

Match the existing code style — indentation, quotes, semicolons, naming — look at the surrounding code and mirror it
No magic numbers or hardcoded strings — use constants or config
No commented-out code left behind — clean up after yourself
No console.log left in production code — use the project's existing logger if one exists
No any types in TypeScript unless the existing code already uses them there
Handle errors explicitly — never silently swallow errors with empty catch blocks
Don't leave TODOs unless explicitly told to — fix it or don't touch it


🔒 Security Rules

Never hardcode secrets, tokens, or credentials — use environment variables
Never log sensitive data — tokens, passwords, user PII
Sanitize all external inputs — never trust data from outside the process boundary
Don't introduce new dependencies without flagging it — ask before adding a new package
Check for prototype pollution, injection risks when handling dynamic keys or user input


✅ Verification Checklist
Run these every time before considering a task done:
bash# Start the collector dashboard to verify UI/runtime behavior
node packages/cli/dist/index.js start

# Build the dashboard package
pnpm --filter @llmtap/dashboard build

# Run all tests (unit + integration) for the dashboard
pnpm --filter @llmtap/dashboard test

# Type check (if applicable)
pnpm --filter @llmtap/dashboard typecheck

# Lint check — don't leave lint errors behind
pnpm --filter @llmtap/dashboard lint
All of the above must pass. If any fail, fix them before declaring done.

🔒 Quality Gates — Non-Negotiable
Before finishing, confirm:

 Build passes — zero errors
 All tests pass — unit and integration, on the affected parts
 No broken UI — layout is correct, nothing misplaced or missing
 No regressions — existing functionality still works
 Secure — no exposed secrets, unsafe inputs, or vulnerabilities introduced
 Everything works together — changes integrate cleanly with the rest of the codebase
 No lint errors introduced
 No type errors introduced
 No dead code or unused imports left behind


🔁 When You're Stuck or Failing

If the same fix has failed twice — stop, explain why it's failing, and propose a different approach
If a test keeps failing — read the test carefully, understand what it's actually asserting before changing code
Never delete or skip a test to make it pass — fix the code, not the test (unless the test itself is the bug)
If you break something trying to fix something else — roll back that part first, then try again cleanly


🚧 Scope Discipline

Do not refactor things that aren't broken while fixing something else
Do not upgrade dependencies unless that is the explicit task
Do not add new features while fixing a bug — log it and move on
Do not change APIs, interfaces, or contracts unless explicitly asked — other code depends on them


📣 Communication Rules

Always confirm what you changed and why at the end — a short bullet list is enough
Flag risks — if your fix could affect other parts of the system, say so explicitly
Flag assumptions — if you made a call that wasn't explicitly specified, call it out
If you skipped any verification step, say why — never silently skip


🧠 Mindset to Maintain

Narrow focus: fix the specific thing asked, nothing more
When in doubt: read the existing code before writing new code
Treat every task as: "does this already exist somewhere?" → yes → use it / no → create it
You are a surgeon, not a janitor — operate precisely on what needs fixing, leave everything else exactly as you found it

🛡️ Staging Workflow Rule

From now on, every single raw npx command or code snippet you provide will be run exclusively inside packages/dashboard/_ui_staging for safe testing and previewing before ever touching your src components.