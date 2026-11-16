# Memory Graph Stories

A dependency-free browser demo for branching stories whose logic can consult
memory recorded from earlier choices.

## Run the demo

Open `index.html` directly in a modern browser. The story library is bundled
with the page, so no local server, build, Node.js, or package installation is
needed to play.

Use the story picker to choose a built-in story. The **Upload** menu can
replace the picker for the current page session with stories from a folder
or selected JSON files. Invalid files are skipped and reported. Reload the
page to restore the built-in library. Browsers without folder selection can
use **Choose JSON files**.

Choices can add memories and transitions to the current story's graph. At an
ending, **Begin again · keep memory** starts a new run with that graph intact;
**Clear memory & restart** starts over with an empty graph. The **Graph State**
button (`i`) shows the current story and its graph data.

## Edit and add stories

Stories are JSON files in `stories/`. A definition has an `id`, `title`,
`start` node, and `nodes` object; `synopsis` and `macros` are optional.
Non-ending nodes need one or more choices, each with a `goto` destination.
Ending nodes use `"ending": true` and have no choices. Conditional text and
routes use ordered rules with a final unconditional fallback. Operations and
conditions are declarative JSON; story files do not contain executable
JavaScript.

After adding, editing, or deleting a built-in story, regenerate the browser
catalog from the repository root:

```sh
node scripts/bundleStories.js
```

Commit both the story JSON and the generated `scripts/builtInStories.js`.
The generated catalog is required by the page and its consistency with the
story files is covered by the tests.

See the [project design specification](agents/ProjectDesign.md) for the full
story schema, operation and condition reference, validation rules, and engine
API.

## Test

Install Node.js, then run the dependency-free test suite from the repository
root:

```sh
node --test
```

The suite covers the memory graph, narrative engine, story player, and
built-in story catalog. No `npm install` is required.

## Project layout

- `scripts/MemoryGraph.js` — memory events, associations, transitions, and
  activation.
- `scripts/NarrativeEngine.js` — story validation, state, operations, and
  conditions.
- `scripts/storyPlayer.js` — browser demo and uploaded-story handling.
- `scripts/builtInStories.js` — generated story catalog loaded by the page.
- `scripts/bundleStories.js` — regenerates the catalog from `stories/*.json`.
- `styles/shared.css` and `index.html` — demo presentation and markup.
- `tests/` — Node.js built-in test-runner tests.

For module boundaries and contribution guidance, see the
[project architecture](agents/ProjectArchitecture.md) and
[feature implementation workflow](agents/skills/FeatureImplementation.md).
