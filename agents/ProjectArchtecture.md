
# Project Architecture

## Architecture
- Separate logic, rendering, UI, data and infrastructure.
- Avoid putting unrelated functionality into large files.
- Reuse existing systems before creating new ones.
- Reuse UI components where appropriate.
- Centralise shared styling and design tokens.
- Avoid duplicating layout and interaction logic.
- Handle different screen sizes and aspect ratios.
- Use the HTML Canvas API for 2D rendering where suitable.
- Prefer native browser APIs and vanilla JavaScript, do not introduce npm packages or external dependencies.
- Use native browser APIs for input, audio and animation where practical.
- Keep the project runnable directly in a browser using a simple local HTTP server (8000)

### Scenes

Scenes handle:
- Initialisation and shutdown.
- Scene transitions.
- Coordinating systems.
- Connecting entities and systems.
Scenes should NOT:
- Contain all logic.
- Become repositories for unrelated utility functions.
- Directly manage every UI interaction.

### Entities

Entities represent objects in a game or environment:
- Player
- Enemies
- NPCs
- Collectables
- Projectiles

Entities should own their own behaviour and state where appropriate.

### Components

Components provide reusable pieces of behaviour or data.

Examples:
- Health
- Movement
- Inventory
- Combat
- Interaction

Avoid creating components for trivial functionality that does not benefit from reuse.

### Systems

Systems coordinate functionality across multiple entities.

Examples:
- CombatSystem
- SpawnSystem
- InventorySystem
- SaveSystem

Systems should not depend unnecessarily on individual scenes.

### UI

UI handles:
- Menus
- HUD
- Dialogues
- Inventory screens
- Settings
- Notifications

UI should display and communicate state rather than own the underlying rules.

### Data

Keep configurable data separate from implementation.

Examples:
- Enemy definitions
- Item definitions
- Level configuration
- Balance values
- Dialogue data

### Utilities

Utilities should contain genuinely reusable, stateless helper functions.

Do not use this folder as a dumping ground for miscellaneous code.

## General principles
- Write clean, readable, maintainable SOLID JavaScript.
- Prefer simple solutions over clever or unnecessarily abstract ones.
- Follow existing project conventions before introducing new patterns.
- Avoid unnecessary dependencies.
- Use clear, descriptive names.
- Avoid quick workarounds with comments in favour of fixing root problems.
- Do not introduce architecture or abstractions without a clear benefit.
- Prioritise maintainability, reliability and readability over reducing line count.
- Make focused changes rather than rewriting unrelated code.
- Never silently remove existing functionality.
- Avoid circular dependencies.
- Keep dependencies flowing in one direction.
- Do not put general-purpose utilities inside project-specific modules.
- Prefer composition over deep inheritance.

## Working With This Project
- Inspect existing code before making changes.
- Identify relevant files before implementing features.
- Don't rewrite working systems unnecessarily.
- Ask before introducing major architectural changes.
- Keep changes focused on the requested task.
- Avoid overengineering.

## JavaScript standards
- Use modern ES modules (import/export).
- Use const by default and let when reassignment is necessary.
- Avoid var.
- Use descriptive variable and function names.
- Prefer early returns over deeply nested conditionals.
- Avoid magic numbers and unexplained strings.
- Extract shared values into named constants.
- Avoid unnecessary mutation of shared state.
- Avoid global variables.
- Avoid excessive use of callbacks and deeply nested functions.
- Keep functions small and focused.
- Use async/await for asynchronous operations.
- Handle errors explicitly
- Prioritise readability over compact code.

## Error handling and reliability
- Do not silently swallow errors.
- Validate important external inputs.
- Handle missing assets gracefully.
- Avoid unexplained fallback behaviour.
- Clean up event listeners, timers and resources.
- Avoid adding defensive checks that obscure otherwise clear logic.

## Before Implementing New Features
1. Explore the existing project.
2. Identify all relevant files.
3. Explain how the current architecture works.
4. Propose which files need creating or modifying.
5. Identify potential integration problems.

## Testing
- Manual testing is the default for small features.
- Check browser console errors and warnings.
- Verify actual behaviour after implementation.
- Use simple assertions for important rules where appropriate.
- Do not install automated testing frameworks without approval.
- Never claim something has been tested if it has only been inspected in code.
- Add tests for important rules and reusable systems.
- Test edge cases, not just the happy path.
- Test bug fixes with regression tests where practical.
- Run the existing test suite after making changes.
- Run the production build before declaring work complete.
- For visual changes, launch the project and inspect the actual result.
- Do not claim tests passed unless they were actually executed.

## Changes and refactoring
Before making changes:
- Inspect relevant files and existing patterns.
- Understand how the affected functionality is currently used.
- Identify dependencies and potential side effects.
- Explain the proposed approach for substantial changes.

When making changes:
- Keep changes scoped to the task.
- Avoid unrelated refactoring.
- Preserve existing public interfaces unless explicitly asked to change them.
- Update documentation when architecture or behaviour changes.

## Verification
- Check for unused imports and variables.
- Check for duplicated logic.
- Check for unnecessary complexity.
- Run relevant tests.
- Run the production build.
- Review the final diff.
- Summarise files changed, decisions made and verification performed.
- Report any checks that could not be completed.
- Explain which files were changed.

## Important
Do not claim a feature is complete unless it has been
implemented and the relevant verification has passed.
