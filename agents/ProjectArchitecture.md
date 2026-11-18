# Project Architecture

## System boundaries and dependency direction

The project is a small browser-based narrative library with a separate
demo UI. Keep dependencies flowing in this direction:

```text
story text (.txt) -> StoryText -> story data -> NarrativeEngine -> MemoryGraph
                        ^                          ^      ^
                        |                          |      |
                        |                          |   StoryCheck
                        |                          |      ^
                        |                          |      |
                        +------ demo/UI (storyPlayer.js) -+
```

- **Story text** is what authors write: scenes, choices, conditions and
  actions in a plain-text format (see `docs/writing-stories.md`).
- **StoryText** parses it into **story data**: plain objects describing
  nodes, text, choices, conditions, and declarative operations. Neither
  contains executable JavaScript. StoryText depends on nothing; it checks
  syntax and names, and leaves the story's rules to the engine.
- **NarrativeEngine** validates and interprets story data, owns narrative
  progress and variables, and calls the graph when operations or
  conditions require memory behavior. It also owns character knowledge
  (who witnessed or heard about which event) and builds per-character
  perspective graphs, trait scores, and recall from the graph's event log.
- **MemoryGraph** owns the memory event log and concept associations. It
  has no dependency on the narrative engine or browser UI, and no notion
  of characters: a perspective is the engine reading the same event log
  with each event weighted by what one character believes.
- **StoryCheck** plays a story many times with seeded random choices and
  reports failures, unreached content, and the engine's authoring
  warnings. It depends only on the engine, so the tests and the demo
  share it.
- **build-stories.js** is a Node-only tool that wraps the built-in
  `stories/*.txt` files into `stories/built/` for the browser.
- **Demo/UI** loads a story, renders the engine's plain-data view, and
  forwards player input. It owns presentation only; it must not duplicate
  story rules or memory logic. It reads reputation through
  `engine.reputationOf()` rather than computing it.

Scripts are grouped by layer, and each layer may use only the ones above
it in this list:

- `scripts/core/`: the library. `MemoryGraph.js` and `NarrativeEngine.js`.
  No DOM, and nothing from the other folders.
- `scripts/authoring/`: reading and measuring stories. `StoryText.js` (the
  text format), `StoryCheck.js` (random playthroughs) and `StoryMap.js`
  (measurements and the scene-map layout). No DOM.
- `scripts/writer/`: the demo's Writer tools views, such as
  `storyMapView.js`.
- `scripts/player/`: the browser demo. `storyPlayer.js` is the entry point.
- `tools/`: Node-only scripts, such as `build-stories.js`. Never loaded by
  the page.

Story data
belongs in `stories/`, author documentation in `docs/`, page markup in
`index.html`, and shared styles in `styles/`.

## Runtime and dependencies

- Use browser-compatible JavaScript and browser APIs.
- The browser app has no runtime dependencies and needs no build or local
  server to play. Node.js is used to run tests and to build the built-in
  story library (`node tools/build-stories.js`) after a `.txt` story
  changes.
- Opening `index.html` directly with `file://` is the supported launch
  method. Load the scripts using ordered classic `<script src>` tags;
  do not rely on ES-module imports or `fetch()` for local files.
- Built-in stories are `stories/<name>.txt` files. A `file://` page can't
  read them directly, so the build script wraps each one in
  `stories/built/<name>.js` (a `registerStoryText(...)` call holding the
  text's lines) and lists them in `stories/built/manifest.js`.
  `storyPlayer.js` appends a script tag for each and parses the text
  with StoryText. Never edit `stories/built/` by hand; the tests check it
  is up to date. Uploading a folder or `.txt` files replaces the
  built-in picker for that session; uploads are not retained across
  reloads.
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
- Never execute JavaScript supplied by a story. Do not use `eval` or
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
or local-server step; after changing a built-in story, run
`node tools/build-stories.js`.

Keep changes scoped, update directly related documentation, and report
the files changed and checks actually performed. Never claim a test or
browser check passed unless it was run.
