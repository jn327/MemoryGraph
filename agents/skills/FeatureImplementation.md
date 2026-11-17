
---
name: implement-feature
description: >
  Implement MemoryGraph or NarrativeEngine features and the separate browser demo.
  Use when changing narrative runtime behavior, memory behavior, or demo UI.
---

# Feature Implementation Workflow

## Step 1: Understand
- Read the project architecture documentation.
- Read the relevant project design documentation.
- Inspect the existing implementation.
- Identify affected files and dependencies.
- Identify existing patterns and the dependency direction that should be followed.
- Ask questions if requirements are ambiguous.

## Step 2: Plan
- Describe the proposed implementation.
- Identify which files need changing.
- Identify any new modules required.
- Consider potential side effects.
- Avoid introducing unnecessary abstractions.

For substantial changes, wait for approval before implementing.

## Step 3: Implement
- Follow project coding standards.
- Keep responsibilities separated.
- Reuse existing functionality where appropriate.
- Avoid unrelated refactoring.
- Keep changes as small as reasonably possible.
- Do not silently change story requirements. If an implementation reveals that a design decision is impractical, explain the problem and alternatives, then wait for approval before changing the design document.

## Step 4: Verify
- Run relevant tests.
- There is no production build step. After changing a built-in story in
  `stories/*.txt`, run `node scripts/build-stories.js`. Run automated tests
  with `node --test`.
  If Node.js is not installed, VS Code's runtime works:
  `ELECTRON_RUN_AS_NODE=1 "$LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe" --test tests/*.test.js`.
- `tests/browser.test.js` loads `index.html` over `file://` in headless
  Chrome or Edge. Make sure it runs rather than skips for browser-facing
  changes. For interactive behaviour, also open `index.html` directly in a
  desktop browser and check console errors. VS Code's Simple Browser cannot
  open `file://` pages.
- Test actual narrative and memory behavior.
- Inspect visual changes in the running demo.
- Check for regressions.

## Step 5: Report
Summarise:
- What was implemented.
- Files created or modified.
- Architectural decisions.
- Tests and build commands executed.
- Any remaining issues.
