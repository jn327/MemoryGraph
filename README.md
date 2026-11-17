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

Choices add memories to the current story's graph. Each
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

## Write a story

Start with the **[story-writing guide](docs/writing-stories.md)**. To try
it straight away, upload [`docs/story-template.json`](docs/story-template.json)
from the story menu, then copy it and change it.
[*The Night Ferry*](stories/the_night_ferry.js) is a short built-in story
that uses every feature.

Stories are JSON: scenes with choices, plus memories that choices record
(`remember`), characters who witness them, and traits that turn specific
acts into judgements such as "a liar" or "kind". Characters can gossip,
be shown evidence, or be talked out of what they believe. Text can be
assembled from conditional parts, recalled memories, and `{name:…}` /
`{var:…}` placeholders.

While you write, open **Graph State** (the `i` button). It lists likely
mistakes, such as a concept you test for but never remember. **Check
story** plays the story 300 times at random and reports crashes, dead
ends, how often each ending came up, and any text no run ever showed.

To add a built-in story, save it as `stories/<name>.js` wrapped in
`registerStory({...})`, and add `<name>` to `STORY_FILES` at the top of
`scripts/storyPlayer.js`. The tests fail if a story file is missing from
that list. Uploaded stories are plain `.json` files containing just the
object.

The [project design specification](agents/ProjectDesign.md) is the full
reference for the story schema, engine API, and validation rules.

## Test

Install Node.js, then run the dependency-free test suite from the repository
root:

```sh
node --test
```

The suite covers the memory graph, narrative engine, authoring tools,
story player, and built-in stories. Each built-in story is played 1,500
times at random and must reach every node with no authoring warnings; text
that no run showed is printed as a test diagnostic. No `npm install` is
required.

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

- `scripts/MemoryGraph.js` — the memory event log and concept associations.
- `scripts/NarrativeEngine.js` — story validation, state, operations,
  conditions, perspectives, and authoring warnings.
- `scripts/StoryCheck.js` — random playthroughs that report problems; used
  by the tests and the **Check story** button.
- `scripts/storyPlayer.js` — browser demo, built-in story loading, and
  uploaded-story handling.
- `stories/*.js` — built-in stories, each a `registerStory({...})` call.
- `docs/` — the story-writing guide and a starter template.
- `styles/shared.css` and `index.html` — demo presentation and markup.
- `tests/` — Node.js built-in test-runner tests, including a headless-browser
  `file://` check.

For module boundaries and contribution guidance, see the
[project architecture](agents/ProjectArchitecture.md) and
[feature implementation workflow](agents/skills/FeatureImplementation.md).
