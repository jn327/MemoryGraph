# Memory Graph Stories

A dependency-free browser demo for branching stories whose logic can consult
memory recorded from earlier choices.

## Run the demo

Open `index.html` directly in a modern browser. No local server, build,
Node.js, or package installation is needed to play.

Use the story picker to choose a built-in story. The **Upload** menu can
replace the picker for the current page session with stories from a folder
or selected JSON files. Invalid files are skipped and reported. Reload the
page to restore the built-in library. Browsers without folder selection can
use **Choose JSON files**.

Choices can add memories and transitions to the current story's graph. Each
character remembers only what they witnessed or were told, and gossip spreads
between them, so a player who lies, steals or shows mercy is treated
accordingly by the people who know. Every ending lists how each character
remembers you, and the act that defines you to them. When something
happens because of what a character remembers, the text is followed by a
coloured tag such as *(fear)* or *(Mira: a liar)*; hover over it, or focus
it with the keyboard, to see which of your choices caused it. **Memory
tags: on/off** in the header hides the tags. After each choice, a small
note on it shows which way it pushed you and who saw it (for example
*↑ merciful · Mira saw*). The collapsible **How you're seen** panel above
the choices shows each character's current view of you as bars, plus the
act they remember most. At an
ending, **Begin again · keep memory** starts a new run with that graph intact;
**Clear memory & restart** starts over with an empty graph. The **Graph State**
button (`i`) shows the current story and its graph data.

## Edit and add stories

A story definition is a JSON object with an `id`, `title`, `start` node, and
`nodes` object; `synopsis` and `macros` are optional. Non-ending nodes need
one or more choices, each with a `goto` destination. Ending nodes use
`"ending": true` and have no choices. Conditional text and routes use ordered
rules with a final unconditional fallback. Operations and conditions are
declarative JSON.

Stories can also declare `characters`, a `traits` lexicon (specific acts
mapped to weighted judgements such as "a liar" or "merciful"), and an
optional `memory.halfLife` so that recent behaviour counts more. Mark who
sees an act with `witnesses` and describe it with a `summary`. Then
`gossip`, `reveal`, and the `trait`, `dominantTrait` and `knows` conditions
let characters react to what *they* know. Text can be composed from
conditional parts and `recall`s of specific remembered acts, which keeps
endings from becoming a combinatorial list of variants. See section 12 of
the specification below.

Built-in stories live in `stories/<name>.js`. Each file wraps its JSON
definition in a single call, so the page can load it with a `<script>` tag
under `file://`, where browsers block `fetch()`:

```js
registerStory({
  "id": "my_story",
  "title": "My Story",
  ...
});
```

To add a built-in story, create the file and add its name (without `.js`) to
`STORY_FILES` at the top of `scripts/storyPlayer.js`. The tests fail if a
story file is missing from that list. Uploaded stories are plain `.json`
files containing just the object.

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
built-in stories. No `npm install` is required.

`tests/browser.test.js` also opens `index.html` over `file://` in headless
Chrome or Edge and checks that every built-in story loads. It finds the usual
install locations automatically. Set `CHROME_PATH` to use another
Chromium-based browser. The test is skipped if none is found.

Without a separate Node.js install, VS Code's bundled runtime can run the
suite. From Git Bash on Windows:

```sh
ELECTRON_RUN_AS_NODE=1 "$LOCALAPPDATA/Programs/Microsoft VS Code/Code.exe" --test tests/*.test.js
```

VS Code's Simple Browser only opens `http`/`https` URLs, so it can't open
`index.html` over `file://`. Open the page in a desktop browser instead, or
serve the folder locally if you want to preview it inside VS Code.

## Project layout

- `scripts/MemoryGraph.js` — memory events, associations, transitions, and
  activation.
- `scripts/NarrativeEngine.js` — story validation, state, operations, and
  conditions.
- `scripts/storyPlayer.js` — browser demo, built-in story loading, and
  uploaded-story handling.
- `stories/*.js` — built-in stories, each a `registerStory({...})` call.
- `styles/shared.css` and `index.html` — demo presentation and markup.
- `tests/` — Node.js built-in test-runner tests, including a headless-browser
  `file://` check.

For module boundaries and contribution guidance, see the
[project architecture](agents/ProjectArchitecture.md) and
[feature implementation workflow](agents/skills/FeatureImplementation.md).
