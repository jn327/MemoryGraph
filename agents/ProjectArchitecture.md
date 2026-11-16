# Project Architecture

## System boundaries and dependency direction

The project is a small browser-based narrative library with a separate
demo UI. Keep dependencies flowing in this direction:

```text
story JSON -> NarrativeEngine -> MemoryGraph
                   ^
                   |
        demo/UI (storyPlayer.js)
```

- **Story JSON** contains nodes, text, choices, conditions, and declarative
  operations. It does not contain executable JavaScript.
- **NarrativeEngine** validates and interprets story data, owns narrative
  progress and variables, and calls the graph when operations or
  conditions require memory behavior.
- **MemoryGraph** owns memory events, associations, transitions, and
  activation. It has no dependency on the narrative engine or browser UI.
- **Demo/UI** loads a story, renders the engine's plain-data view, and
  forwards player input. It owns presentation only; it must not duplicate
  story rules or memory logic.

The core library consists of `scripts/MemoryGraph.js` and
`scripts/NarrativeEngine.js`. The browser demo entry point is
`scripts/storyPlayer.js`; it is not part of the core library. Story data
belongs in `stories/`, page markup in `index.html`, and shared styles in
`styles/`.

## Runtime and dependencies

- Use browser-compatible JavaScript and browser APIs.
- The browser app has no runtime dependencies and needs no build or local
  server. Node.js is used only to run tests and regenerate embedded stories.
- Opening `index.html` directly with `file://` is the supported launch
  method. Load the scripts using ordered classic `<script src>` tags;
  do not rely on ES-module imports or `fetch()` for local files.
- Built-in stories are included in `scripts/builtInStories.js` so they work
  under `file://`. After adding, editing, or deleting story JSON, run
  `node scripts/bundleStories.js` to regenerate the catalog. Uploading a
  folder or JSON files replaces the built-in picker for that session;
  uploads are not retained across reloads.
- Keep core modules independent of the DOM, styles, and demo entry point.
- Prefer native browser APIs and vanilla JavaScript.

## General principles

- Keep modules focused and avoid unnecessary abstractions.
- Reuse existing project patterns and helpers before adding new ones.
- Use clear names, `const` by default, and `let` only when reassignment is
  needed. Do not use `var`.
- Keep state ownership clear and avoid unnecessary shared mutation.
- Avoid circular dependencies and preserve the one-way dependency flow
  described above.
- Validate external data and report errors explicitly; do not silently
  swallow failures or invent fallback behavior.
- Never execute JavaScript supplied by story JSON. Do not use `eval` or
  `Function` for story behavior.

## Working and verification guidance

Before substantial changes, inspect the existing implementation and
related design documents, identify affected files, and explain the
proposed approach. Ask before changing agreed story behavior or making
major architectural changes.

Use the tests available in the repository and add focused tests for
important rules and regressions. Do not add a test framework or other
dependency without approval. For browser-facing changes, open
`index.html` directly with `file://`, inspect browser behavior and
console errors, and verify the actual UI. There is no production build
or local-server step.

Keep changes scoped, update directly related documentation, and report
the files changed and checks actually performed. Never claim a test or
browser check passed unless it was run.
