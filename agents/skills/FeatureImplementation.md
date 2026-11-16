
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
- There is no production build step. Run automated tests with `node --test`.
- Open `index.html` directly with `file://` for browser-facing changes
  and check console errors.
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
