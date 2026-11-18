# Memory Graph Stories

A dependency-free browser demo for branching stories whose logic can consult
memory recorded from earlier choices.

## Run the demo

Open `index.html` directly in a modern browser. No local server, build,
Node.js, or package installation is needed to play.

Use the story picker to choose a built-in story. The **Upload** menu can
replace the picker for the current page session with stories from a folder
or selected `.txt` story files. Invalid files are skipped and reported
with the line that went wrong. Reload the page to restore the built-in
library. In Chrome and Edge, **Open a story to edit** watches one story
file and reloads it every time you save it, replaying your choices so you
stay at the same point.

Choices add memories to the current story's graph. Each
character remembers only what they witnessed or were told, and gossip spreads
between them, so a player who lies, steals or shows mercy is treated
accordingly by the people who know. Every ending sums up how you'll be
remembered: how you're seen overall, then a card for each person who knows
anything about you, with the act that defines you to them. When something
happens because of what a character remembers, the text is followed by a
coloured tag such as *(fear)* or *(Mira: a liar)*; hover over it, or focus
it with the keyboard, to see which of your choices caused it. The **Memory
tags** switch in the **⋯** menu hides the tags. After each choice, a small
note on it shows which way it pushed you and who saw it (for example
*↑ merciful · Mira saw*). Each scene starts with who is there
(*Here: Captain Hale, Jory*), and hovering over a character's name shows
who they are and how they see you. The **Who's who** button beside the
story title opens a drawer listing everyone you've met, with whoever is
here first: their description, their current view of you as bars, and the
act they remember most. Clicking a name in the story opens it on that
person. A dot on the button, a tab or a name means that person's view of
you has changed since you last looked. The drawer stays open while you play;
on wider screens it sits beside the story and the page makes room for
it. On phones and small tablets it docks as a bar
along the bottom (showing who's here) that you tap to expand and collapse. At an
ending, **Begin again · keep memory** starts a new run with that graph intact;
**Clear memory & restart** starts over with an empty graph. The **⋯** menu also
has **How memory works**, a short explainer for players, and **Writer
tools**, which shows the current story and its graph data.

## Write a story

Start with the **[story-writing guide](docs/writing-stories.md)**. To try
it straight away, upload [`docs/story-template.txt`](docs/story-template.txt)
from the story menu, then copy it and change it.
[*The Night Ferry*](stories/the_night_ferry.txt) is a short built-in story
that uses every feature.

Stories are plain text files, in a format inspired by ink:

```
=== theft
present: hale, jory, ines

Halfway across, Mrs Duarte cries out. Her brooch is gone.
{jory knows cheat: Jory glances at you. # Jory remembers}

* Point at Jory
  ~ remember accuse, lie, jory "told the captain Jory must have taken it"
    and jory: suspected "was accused of taking the brooch"
  -> search
* {noticedGrey} Name the man in the grey coat -> search
```

Scenes have text and choices, and choices record memories that the people
present witness. Traits turn specific acts into judgements such as "a liar"
or "kind". Characters can gossip, be shown evidence, or be talked out of
what they believe, and text can change with what they remember.

While you write, open **Writer tools** in the **⋯** menu. It fills the
screen, with tabs for an overview, the story map, who's in each scene, and
the memory graph. The overview lists likely
mistakes with their line numbers, such as a concept you test for but never
remember, and your `// TODO` notes. **Check story** plays the story 300
times at random and reports crashes, dead ends, how often each ending came
up, and any text no run ever showed. **Start from a scene** jumps to any
scene with the memories you choose already in place. The **Story map** tab draws
every scene and choice, and can colour them by how often random runs reach
them, by your current run, or by where a memory is set up and pays off.

To add a built-in story, save it as `stories/<name>.txt` and run
`node tools/build-stories.js`. This wraps each story in
`stories/built/<name>.js`, which the page can load from `file://`, and
lists it in the picker. The tests fail if the built files are out of date.

The [project design specification](agents/ProjectDesign.md) describes the
story data the text format produces, the engine API, and the validation
rules.

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

Scripts are grouped by layer; each folder uses only the ones listed before it.

- `scripts/core/` — the library, with no DOM:
  - `MemoryGraph.js` — the memory event log and concept associations.
  - `NarrativeEngine.js` — story validation, state, operations, conditions,
    perspectives, and authoring warnings.
- `scripts/authoring/` — reading and measuring stories, with no DOM:
  - `StoryText.js` — reads the story text format and builds the story data
    the engine plays, with line-numbered errors.
  - `StoryCheck.js` — random playthroughs that report problems; used by the
    tests and the **Check story** button.
  - `StoryMap.js` — measures a story and lays out its scene map: word
    counts, dead ends, choke points, and where each memory is set up and
    checked.
- `scripts/writer/storyMapView.js` — the **Story map** and **Who's in each
  scene** tabs of Writer tools.
- `scripts/player/storyPlayer.js` — browser demo, built-in story loading,
  uploads, and watching a story file while you edit it.
- `tools/build-stories.js` — wraps `stories/*.txt` into `stories/built/` so
  the page can load them from `file://`.
- `stories/*.txt` — built-in stories. `stories/built/` is generated from
  them; don't edit it by hand.
- `docs/` — the story-writing guide and a starter template.
- `styles/shared.css` and `index.html` — demo presentation and markup.
- `tests/` — Node.js built-in test-runner tests, including a headless-browser
  `file://` check.

For module boundaries and contribution guidance, see the
[project architecture](agents/ProjectArchitecture.md) and
[feature implementation workflow](agents/skills/FeatureImplementation.md).
