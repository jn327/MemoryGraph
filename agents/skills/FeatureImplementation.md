
---
name: implement-feature
description: >
  Implement new game features or modify existing gameplay systems.
  Use when adding mechanics, entities, UI, scenes or other game functionality.
---

# Feature Implementation Workflow

## Step 1: Understand
- Read the relevant project information and architecture documentation.
- Read the relevant project design documentation.
- Inspect the existing implementation.
- Identify affected files and dependencies.
- Identify existing patterns that should be followed.
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
- Do not silently change gameplay requirements, If an implementation reveals that a design decision is impractical: Explain the problem, Suggest alternatives, Discuss the trade-offs, Wait for approval before changing the design then Update the design document after an approved decision.

## Step 4: Verify
- Run relevant tests.
- Run the production build.
- Check for console errors.
- Test the actual gameplay behaviour.
- Inspect visual changes in the running game.
- Check for regressions.

## Step 5: Report
Summarise:
- What was implemented.
- Files created or modified.
- Architectural decisions.
- Tests and build commands executed.
- Any remaining issues.
