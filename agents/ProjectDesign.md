# Memory graph --- Narrative Engine Project Specification

**Document type:** MVP implementation specification\
**Target:** JavaScript library for browser-based interactive narrative\
**Working name:** Memory Graph\
**Primary modules:** `MemoryGraph.js` and `NarrativeEngine.js`\
**Status:** Current implementation reference

------------------------------------------------------------------------

## 1. Project summary

Build a small, dependency-free JavaScript system for authoring
interactive stories whose characters and story logic can consult a
persistent associative memory.

The system has two core library modules and a separate demo UI:

1.  **MemoryGraph** stores events as collections of named concepts and
    builds weighted associations between concepts that appear together.
2.  **NarrativeEngine** interprets a story definition (plain data). It displays
    scene text and choices, evaluates declarative conditions, executes
    declarative operations, and moves between story nodes.

Three smaller pieces sit outside the core library. **StoryText** reads the
story text format that authors write and builds the definition the engine
plays (section 4.1). **StoryCheck** plays a story many times at random and
reports problems (section 16.3). The **StoryPlayer** is demo UI. It offers
built-in stories and lets the user upload a folder or `.txt` story files,
or watch one file while editing it, renders the
engine's view, and sends selected visible choices back to the engine. It
is not a required library module or a supported UI framework.

A story author should be able to create or modify a story by editing a
plain text file only. They should not need to write JavaScript or JSON.
The author-facing guide, which is also the reference for the text syntax,
is [docs/writing-stories.md](../docs/writing-stories.md). This document
specifies the story data that the text produces, and the engine.

The engine is not an LLM and does not understand natural language
automatically. It operates on concepts and rules explicitly supplied by
the story author.

## 2. Goals

-   Run in a modern browser directly from `index.html` using
    `file://`.
-   Have no runtime dependencies.
-   Keep the public API small and predictable.
-   Use strings as concept identifiers; do not require numeric concept
    IDs.
-   Keep story content, memory rules, conditions, and branching in story data.
-   Support branching stories that can later converge on shared nodes.
-   Allow the same memory graph to persist across chapters or play
    sessions.
-   Make memory inspectable and serializable for debugging and saving.
-   Make it straightforward to add custom operations and conditions in
    JavaScript.

## 3. Non-goals for the MVP

Do not attempt to implement:
-   Natural-language understanding or automatic extraction of concepts
    from prose.
-   Embeddings, vector databases, neural networks, or LLM calls.
-   Automatic generation of story prose.
-   A visual story editor.
-   A full replacement for Ink, Twine, Unity, or a general-purpose game
    engine.
-   Unrestricted JavaScript execution from story data.
-   Sophisticated temporal reasoning, causal inference, or human-like
    understanding.

The graph's associations are statistical bookkeeping over
author-provided concepts. A high association score is not proof that the
concepts have a meaningful semantic relationship.

## 4. Runtime and project layout

Use browser-compatible JavaScript and APIs. Do not require Node-specific
APIs in the core library. There is no build, bundling, or local-server
step at runtime: opening `index.html` directly with `file://` is the supported
launch method. Use ordered classic `<script src="...">` tags for the
library and demo scripts; do not use ES-module imports or `fetch()` to
load local files. Built-in stories are written as `stories/<name>.txt`.
Because a `file://` page can't read text files itself,
`node scripts/build-stories.js` wraps each one in
`stories/built/<name>.js`, whose only statement is
`registerStoryText("<name>.txt", [lines…])` with the file's lines
unchanged, and writes `stories/built/manifest.js`, which sets
`globalThis.memoryGraphStoryFiles` to the list of names. This build step
is for the built-in library only; playing needs nothing but the browser.
`storyPlayer.js` appends a classic `<script>` tag for each listed story,
parses it with StoryText, and validates it before populating the picker.
The Upload control lets the user select a folder or `.txt` files to
replace the built-in story picker. Uploads are not retained across page
reloads.

Use the existing project structure:

``` text
  index.html
  scripts/
    MemoryGraph.js
    NarrativeEngine.js
    StoryText.js            # reads the story text format; used by the demo, build and tests
    StoryCheck.js           # random-playthrough checker; used by tests and the demo
    build-stories.js        # Node only: wraps stories/*.txt into stories/built/
    storyPlayer.js          # demo UI only; not part of the core library
  styles/
    shared.css
  stories/
    *.txt                   # built-in stories, in the text format
    built/                  # generated by build-stories.js; never edited by hand
  docs/
    writing-stories.md      # guide for story authors and syntax reference
    story-template.txt      # a minimal story to copy
  tests/                    # dependency-free unit tests using Node's built-in runner
```

Load `MemoryGraph.js`, `NarrativeEngine.js`, `StoryText.js`,
`StoryCheck.js`, `stories/built/manifest.js`, and `storyPlayer.js` in that
order from `index.html`; `storyPlayer.js` loads the story files itself.
The scripts expose `MemoryGraph`, `NarrativeEngine`, and `StoryText`
through explicit `window` properties. `storyPlayer.js`
is the browser demo entry point; core scripts must not depend on the
demo, DOM, or styles.

### 4.1 Story text format

`StoryText.parse(text, { fileName })` returns `{ story, lines, todos }`:

-   `story` is the definition specified in the rest of this document.
    `id` defaults to the file name, and `start` to the first scene.
-   `lines` maps engine locations (`"node 'deck' choice 'pay' do operation 0"`)
    to source line numbers. `StoryText.lineFor(lines, text)` finds the line
    for a lint warning or error message by the longest location it
    mentions, so the demo can report "line 42".
-   `todos` lists `// TODO` comments as `{ line, text }`.

It throws `StoryText.StoryTextError` (with `line` and `reason`) for
syntax errors and for names that don't exist: scenes, characters, traits
and macros, with a "did you mean" suggestion when one is close. It checks
names and syntax only; the engine still validates the result.

The parser's own conveniences, all of which produce ordinary story data:

-   A choice's id is `(label)` if given, else the first five words of its
    text as `snake_case`, made unique within the scene.
-   `~ remember` adds `"player"` to the concepts unless it starts with
    `subject:` (which also sets `subject`) or `world:` (neither).
-   A remember without `(seen by …)` gets the scene's `present` list as
    its witnesses (or none). An `and` line under a remember is another
    remember with the same witnesses unless it lists its own.
-   `{hale}` becomes `{name:hale}` for a character, else `{var:hale}`.
-   Paragraph lines are joined with spaces; blank lines become `"\n\n"`
    parts. A passage with no `{…}` parts becomes a plain string.
-   In a recall part with `if`, the `|` fallback is used both as `else`
    and as `otherwise`.
-   `+= 1` and `-= 1` omit `amount`.

## 5. Core design principles

### 5.1 Concepts are strings

Use readable strings such as `"wolf"`, `"help"`, `"hunter"`, and
`"mercy"` as keys throughout the public API.

Normalize concept names consistently by trimming whitespace. For the
MVP, preserve case rather than silently lowercasing; story authors
should use consistent spelling and case. Reject empty strings and
non-string concept values with clear errors.

### 5.2 Memories are events, not just edges

Each call to `remember()` creates an event record containing at least:

-   unique event ID
-   unique concepts in the event
-   strength
-   monotonically increasing sequence number (or turn)
-   optional metadata

The graph also maintains indexes and weighted associations so queries
are efficient. The event log is the source record; derived indexes can
be rebuilt from it.

### 5.3 Associations

**Associations** are undirected weighted links created between every pair
of concepts in one event. They carry no order: use node visits, variables,
or separate events when sequence matters.

Earlier versions also had directed transitions and spreading activation.
No story used them, so they were removed to keep the library small.

### 5.4 Deterministic and explainable

For the same saved state, story, and player choices, results should be
deterministic. Do not introduce random selection in the MVP.

Queries should return scores and enough detail to inspect why a result
was returned.

## 6. MemoryGraph specification

### 6.1 Constructor

``` js
const graph = new MemoryGraph(options);
```

Suggested options:

``` js
{
  maxEvents: 10000 // optional; default is unlimited
}
```

If `maxEvents` is configured and the graph is at capacity, `remember()`
throws before changing graph state. The MVP does not evict old events.

### 6.2 Required public API

#### `remember(input)`

Create an event and strengthen all pairwise associations between its
unique concepts.

Preferred input shape:

``` js
graph.remember({
  concepts: ["player", "help", "wolf", "forest", "mercy"],
  strength: 1,
  metadata: {
    scene: "forest_encounter",
    actor: "player",
    turn: 3
  }
});
```

Requirements:

-   `concepts` is a required array of non-empty strings.
-   Remove duplicate concepts within the event.
-   `strength` defaults to `1` and must be a finite positive number.
-   Store the event and metadata.
-   For each unordered pair of distinct concepts, increase the
    association score in both directions by `strength`.
-   Do not create self-links.
-   Return the created event record (or a safe copy of it).

An event with zero or one concept is valid and is stored, but creates no
association edges.

#### `related(concept, limit = 10)`

Return direct neighbours ordered by descending score.

Example result:

``` js
[
  { concept: "wolf", score: 4, seen: 4, lastSeen: 12 },
  { concept: "mercy", score: 3, seen: 3, lastSeen: 10 }
]
```

`seen` is the number of events that strengthened that edge. `lastSeen`
is the latest event sequence that strengthened it. Break score ties by
ascending alphabetical concept name.

#### `associationScore(a, b)`

Return the direct association score, or `0` if no edge exists.

#### `findMemories(concept, limit = 20)`

Return recent or relevant event records containing a concept, using a
concept-to-event index, ordered newest-first by event sequence.

#### `toJSON()` and static `fromJSON(data)`

Support saving and restoring all information needed to continue
learning:

-   events and metadata
-   association scores and counts, or enough source data to rebuild them
-   sequence counter and ID counter

`toJSON()` writes version 2. `fromJSON()` also accepts version 1 saves and
ignores their retired `transitions` list.

Validate loaded data and provide useful errors for malformed input. Do
not serialize `Map` objects directly; convert them to plain
JSON-compatible objects or arrays.

#### `clear()`

Clear all stored events, indexes, associations, and counters.

### 6.3 Association construction

For an event with concepts `["player", "help", "wolf"]`, create:

``` text
player <-> help
player <-> wolf
help   <-> wolf
```

Do not create an implicit association between concepts merely because
they occur in adjacent story nodes. Associations are created only when a
memory event explicitly groups them.

### 6.4 Memory metadata

Metadata is descriptive and searchable by application code. The MVP does
not need arbitrary metadata query syntax, but it must preserve metadata
through serialization.

Suggested metadata fields include:

``` js
{
  scene: "forest_encounter",
  actor: "player",
  target: "wolf",
  turn: 12,
  source: "choice"
}
```

## 7. NarrativeEngine specification

### 7.1 Constructor

``` js
const engine = new NarrativeEngine(storyDefinition, {
  graph,
  initialVariables: {}
});
```

The graph may be supplied by the caller. If omitted, the engine creates
a new `MemoryGraph`.

The engine owns:

-   story definition
-   current node ID
-   visit history
-   choice history
-   variables
-   graph reference
-   registered operations
-   registered conditions

### 7.2 Required public API

``` js
engine.start();                 // start at story.start
engine.start("intro");          // optional explicit start node
engine.getView();               // current renderable scene
engine.choose(0);               // choose visible choice by index
engine.goTo("node_id");         // explicit navigation helper
engine.reset({ keepMemory: true });
engine.toJSON();                // serializable runtime state
engine.loadState(data);         // restore runtime state
```

`getView()` should return plain data suitable for a website UI:

``` js
{
  nodeId: "wolf_encounter",
  text: "An injured wolf lies beside the road.",
  segments: [{ text: "An injured wolf lies beside the road." }],  // see 12.8
  choices: [
    { index: 0, id: "help", text: "Help it" },
    { index: 1, id: "leave", text: "Leave it alone" }
  ],
  ended: false
}
```

The engine must not manipulate the DOM. The website renders the returned
text and choices and calls `choose(index)` when the player selects one.
Calling `getView()` before `start()` or after a reset that has not been
started throws a clear error.

`getView()` recomputes a read-only projection of the current state each
time it is called. It evaluates conditions and formats text and choices,
but never runs `onEnter`, operations, or navigation and never mutates
engine or graph state. `onEnter` runs only as part of entering a node.
Custom condition handlers must also be side-effect-free so repeated
`getView()` calls remain safe. The MVP does not require view caching.

### 7.3 Node lifecycle

When entering a node:

1.  Validate that the node exists.
2.  Set it as the current node.
3.  Record the visit in history.
4.  Execute its `onEnter` operations exactly once for that entry.
5.  Evaluate text variants and visible choices.
6.  Return the resulting view.

A node is not automatically replayed. It remains current until the player
chooses an available choice or calls `goTo()`. Revisiting a node runs its
`onEnter` operations again. Ending nodes are explicitly marked
`"ending": true` and have no choices. Every non-ending node must have at
least one choice, and every choice must have a `goto` route. There is no
implicit auto-advance and `goto` is not an operation.

### 7.4 Story structure

The player displays the optional `synopsis` string in the story picker.
Stories without one remain playable and display "No synopsis provided."
The player shows the current run's story text and selected choices in order,
including the text as it was originally presented. The transcript grows with
the page and resets for a new run. The player script supports per-story
save/restore controls when the corresponding elements are present, but the
current `index.html` does not expose those controls. When enabled, the save
includes the transcript; older saves without one can only display the current
passage and later choices.

Example:

``` json
{
  "id": "village_remembers",
  "title": "The Village Remembers",
  "synopsis": "Explore a village that remembers your choices.",
  "start": "wolf_encounter",
  "macros": {},
  "nodes": {
    "wolf_encounter": {
      "text": "An injured wolf lies beside the road.",
      "onEnter": [
        {
          "type": "remember",
          "concepts": ["forest", "wolf"],
          "metadata": { "scene": "wolf_encounter" }
        }
      ],
      "choices": [
        {
          "id": "help_wolf",
          "text": "Help the wolf",
          "do": [
            {
              "type": "remember",
              "concepts": ["player", "help", "wolf", "mercy"],
              "metadata": { "actor": "player", "action": "help" }
            }
          ],
          "goto": "hunter"
        },
        {
          "id": "leave_wolf",
          "text": "Leave it alone",
          "do": [
            {
              "type": "remember",
              "concepts": ["player", "ignore", "wolf", "indifference"]
            }
          ],
          "goto": "hunter"
        }
      ]
    },
    "hunter": {
      "text": "A hunter steps onto the path. 'Have you seen a wolf?'",
      "choices": [
        {
          "id": "tell_truth",
          "text": "Tell the truth",
          "do": [
            {
              "type": "remember",
              "concepts": ["player", "truth", "hunter", "honesty"]
            }
          ],
          "goto": "ending"
        },
        {
          "id": "lie",
          "text": "Lie to protect the wolf",
          "showIf": {
            "type": "association",
            "a": "player",
            "b": "mercy",
            "min": 1
          },
          "do": [
            {
              "type": "remember",
              "concepts": ["player", "lie", "hunter", "protect", "wolf"]
            }
          ],
          "goto": "ending"
        }
      ]
    },
    "ending": {
      "text": [
        {
          "if": {
            "type": "association",
            "a": "player",
            "b": "mercy",
            "min": 1
          },
          "value": "The hunter studies you, then lowers his weapon."
        },
        {
          "value": "The hunter watches you carefully."
        }
      ],
      "choices": [],
      "ending": true
    }
  }
}
```

This example uses the canonical `{ "type": "...", ... }` format for all
operations and conditions.

## 8. Declarative operations

Operations are data objects and always use the `{ "type": "...", ... }`
form. Do not use shorthand objects with operation names as keys.

Recommended representation:

``` json
{ "type": "remember", "concepts": ["player", "help", "wolf"] }
```

Built-in operations are `remember`, `set`, `inc`, `dec`, and `macro`;
`gossip`, `reveal`, `doubt`, and `describe`, and the `witnesses`, `summary`, and
`subject` fields of `remember`, are described in section 12. Every operation is expressed
with its own `type` property. The `goto` field is navigation data on a
choice, not an operation; `forget` is deferred and is not supported in
the MVP.

### `remember`

``` json
{
  "type": "remember",
  "concepts": ["player", "help", "wolf"],
  "strength": 1,
  "metadata": { "source": "story" }
}
```

Creates one memory event.

### `set`

``` json
{ "type": "set", "variable": "trust", "value": 2 }
```

### `inc` and `dec`

``` json
{ "type": "inc", "variable": "trust", "amount": 1 }
```

``` json
{ "type": "dec", "variable": "trust", "amount": 1 }
```

## 9. Conditions

Conditions return booleans and can be nested.

Use a consistent representation:

``` json
{ "type": "association", "a": "player", "b": "mercy", "min": 2 }
```

Required condition types are listed below. The perspective conditions
`trait`, `dominantTrait`, and `knows`, and the optional `perspective` field
on `association`, are described in section 12.

Required condition types:

### `always`

``` json
{ "type": "always" }
```

### `association`

True when the direct association score is at least `min`.

``` json
{
  "type": "association",
  "a": "player",
  "b": "mercy",
  "min": 2
}
```

### `variable`

Support `eq`, `neq`, `gt`, `gte`, `lt`, and `lte` comparisons without
JavaScript coercion. `eq` and `neq` compare JSON scalar values using
strict type-sensitive equality. Relational operators require finite
numeric values on both sides. A missing variable evaluates to `false`
for every operator. Reject invalid operators, non-scalar equality
operands, and non-numeric relational operands during story validation.

``` json
{ "type": "variable", "name": "trust", "operator": "gte", "value": 2 }
```

### `visited`

True if a node has been visited at least once.

``` json
{ "type": "visited", "node": "wolf_encounter" }
```

### `not`, `all`, and `any`

``` json
{ "type": "not", "condition": { "type": "visited", "node": "crypt" } }
```

``` json
{
  "type": "all",
  "conditions": [
    { "type": "association", "a": "player", "b": "mercy", "min": 2 },
    { "type": "visited", "node": "wolf_encounter" }
  ]
}
```

`all` requires every child condition to be true; `any` requires at least
one. Reject empty condition arrays during validation.

## 10. Conditional text and routing

### 10.1 Conditional text

A node's `text` may be a string or an ordered array of variants:

``` json
"text": [
  {
    "if": {
      "type": "association",
      "a": "player",
      "b": "mercy",
      "min": 2
    },
    "value": "The child smiles when you approach."
  },
  {
    "value": "The child watches you cautiously."
  }
]
```

Evaluate in order and use the first matching variant. A variant without
`if` is the fallback. Require exactly one fallback and require it to be
the final variant; reject malformed variant lists during validation.

### 10.2 Conditional routing

A choice's `goto` may be a string or an ordered array:

``` json
"goto": [
  {
    "if": {
      "type": "association",
      "a": "player",
      "b": "mercy",
      "min": 2
    },
    "node": "trusted_hunter"
  },
  {
    "node": "suspicious_hunter"
  }
]
```

Use the first matching route. Require exactly one unconditional route as
the final fallback. Validate every destination node ID, including
destinations on conditional routes.

### 10.3 Placeholders

Any node text, text part (`text`, `else`, `format`, `otherwise`), choice
text, or `remember` summary can contain:

-   `{name:mira}`: the character's `name` (validated against
    `characters`).
-   `{var:coins}`: the variable's current value. Using a variable that has
    not been set, or that holds an object or array, is a runtime error.

Summaries are filled in when the event is remembered. Other braces are
left as they are, including a recall format's `{summary}`.

### 10.4 Branches that diverge and collect

Multiple choices may point to the same node. This is how branches
collect again. The engine must not duplicate nodes or require separate
copies of shared scenes.

## 11. Macros

Macros are reusable operation lists and condition definitions.

Recommended format:

``` json
{
  "macros": {
    "rememberHelp": {
      "do": [
        {
          "type": "remember",
          "concepts": ["player", "help"]
        }
      ]
    },
    "mercifulPlayer": {
      "condition": {
        "type": "association",
        "a": "player",
        "b": "mercy",
        "min": 2
      }
    }
  }
}
```

Choices can invoke an action macro:

``` json
{
  "text": "Help",
  "do": [
    { "type": "macro", "name": "rememberHelp" }
  ],
  "goto": "next_scene"
}
```

Conditions can invoke a condition macro:

``` json
{
  "type": "macroCondition",
  "name": "mercifulPlayer"
}
```

Requirements:

-   Detect unknown macro names.
-   Detect recursive macro calls and stop with a clear error.
-   Macros do not accept parameters in the MVP.
-   Keep macro expansion/execution deterministic.

## 12. Characters, perspectives, and reputation

Plain associations make a story remember *what happened*. Perspectives
make it remember *who knows*. They let a story react heuristically: a
player who lies often comes to be treated as a liar, but only by the
people who saw the lies or heard about them. No author has to anticipate
the exact path that got them there.

All of this lives in `NarrativeEngine`. `MemoryGraph` is unchanged: the
graph's event log is the single source of truth, and each perspective is
a weighted reading of it.

### 12.1 Story fields

All three fields are optional.

``` json
{
  "characters": {
    "mira": { "name": "Mira" },
    "tomas": {}
  },
  "traits": {
    "untrustworthy": {
      "label": "a liar",
      "concepts": { "lie": 1, "steal": 1, "kept_promise": -1 }
    }
  },
  "memory": { "halfLife": 12 }
}
```

-   **`characters`**: IDs that can witness events and hold a perspective.
    `name` is shown to players; it defaults to the ID. `all` is reserved.
-   **`traits`**: a lexicon from specific acts to general judgements.
    Each concept has a non-zero weight; negative weights let later deeds
    count against a trait, which makes redemption possible. `label` is
    the phrase used in "remembers you as …" and defaults to the trait
    name with underscores replaced by spaces.
-   **`memory.halfLife`**: when set, an event's weight in perspectives,
    trait scores, and recall halves every `halfLife` events, so recent
    behaviour counts more than old behaviour. The raw graph is
    unaffected.

### 12.2 Knowledge and perspectives

The engine keeps `knowledge`: for each character, the events they know
and a belief in `(0, 1]`. A character's **perspective** reads the event
log with each event weighted by `strength × belief × recency`; events
they don't know weigh 0. Omitting the perspective gives the **world**
view: every event at full belief, still recency-weighted.

-   `remember` accepts `witnesses` (an array of character IDs, or `"all"`).
    Each witness learns the new event at belief 1.
-   `gossip` copies what one character knows to others, at reduced
    belief, so hearsay counts for less than seeing.
-   `reveal` teaches characters events from the world log directly, for
    example evidence being shown, a confession, or a public record.
-   `doubt` talks characters out of what they know: their belief in
    matching events drops to at most `belief` (default 0, which removes
    the event from their knowledge).

A character's view can only include what they witnessed or were told.

### 12.3 Trait scores

```
traitScore(trait, perspective, subject = "player")
  = Σ weight(concept) × linkWeight(subject, concept, perspective)

linkWeight(a, b, perspective)
  = Σ over events containing both a and b of strength × belief × recency
```

The link weight is read from the perspective. Events must
include the subject concept (normally `"player"`) to count. Using
another subject scores a character instead. For example,
`"subject": "ellis"` asks how dangerous the jury thinks Ellis is.

### 12.4 Operations

``` json
{ "type": "remember", "concepts": ["player", "lie", "guard"],
  "witnesses": ["mira"], "summary": "lied to the guard about the flour" }
```

`summary` is stored as `metadata.summary` (metadata must be an object if
both are given). It is the text that recall uses. Write summaries as
second-person past-tense verb phrases that complete "you …", for example
"carried her flour" or "told the inspector you'd never seen it". Never
write them in a character's first person ("asked us", "our door").

`subject` (optional, stored as `metadata.subject`) names whose act the
summary describes when it isn't the player's. It must be one of the
event's concepts. The summary then completes "<subject> …": with
`"subject": "jory"`, "was seen near the luggage". Without `subject`, an
event that includes `"player"` is the player's act. Keep one subject per
event: everyone in an event is linked to all of its concepts, so record
an act and its consequence for someone else as two events.

``` json
{ "type": "doubt", "to": ["hale"], "about": { "concepts": ["jory", "suspected"] }, "belief": 0.25 }
```

`doubt` requires `about`. `belief` is in `[0, 1)` and defaults to 0.
A later `gossip` or `reveal` can restore belief.

``` json
{ "type": "gossip", "from": "mira", "to": ["tomas"],
  "about": { "trait": "untrustworthy" }, "belief": 0.5 }
{ "type": "reveal", "to": "all", "about": { "concepts": ["portfolio"] } }
```

-   `about` is optional and filters which events are passed on.
    `{ "trait": t }` matches events containing any of the trait's
    concepts. `{ "concepts": [...] }` matches events containing all of
    them.
-   A listener's new belief is `max(existing, sourceBelief × belief)`.
    `gossip` defaults to belief 0.5; `reveal` defaults to 1. A source
    never gossips to itself.

### 12.5 Conditions

``` json
{ "type": "trait", "trait": "untrustworthy", "perspective": "tomas", "min": 0.5 }
{ "type": "dominantTrait", "among": ["open", "guarded"], "is": "open",
  "perspective": "pim", "margin": 0 }
{ "type": "knows", "perspective": "abara", "about": { "concepts": ["lie", "portfolio"] } }
{ "type": "association", "a": "player", "b": "lie", "min": 1, "perspective": "mira" }
```

-   `trait` needs `min`, `max`, or both. It also accepts `subject`.
-   `dominantTrait` is true when `is` scores above zero and above every
    other listed trait by more than `margin`.
-   `knows` is true when the character knows a matching event with
    belief of at least `min` (any belief above zero by default). It does
    not require the player to be in the event.
-   `association` accepts an optional `perspective`, and then compares
    `linkWeight`. Without one it reads the raw graph (no recency fade).

### 12.6 Composed text and recall

A text variant's `value` can be an array of **parts** instead of a
string. Parts are joined with single spaces. A part that starts or ends
with whitespace (such as `"\n\n"` for a paragraph break) is joined as-is,
and empty parts are skipped. Each part is either a string or an object:

``` json
[
  "Tomas looks up.",
  { "if": { "type": "trait", "trait": "untrustworthy", "perspective": "tomas", "min": 0.5 },
    "text": "'Mira warned me about you.'", "else": "'Sit down.'" },
  { "recall": { "perspective": "tomas", "about": { "trait": "untrustworthy" } },
    "format": "'You {summary}.'", "otherwise": "" }
]
```

-   An object part defines exactly one of `text` or `recall`. It may
    have `if`, with an optional `else` string used when the condition is
    false.
-   `recall` picks the event with a `summary` that best matches, scored
    by `strength × belief × recency × relevance` (×1.5 when the event
    involves the remembering character), with ties going to the
    most recent event. The event must include the subject (default
    `"player"`).
    -   `about` sets relevance: the sum of trait weights in the event,
        or 1 for a concepts match.
    -   `among: [traits]` uses whichever of those traits currently
        dominates the perspective, so a character recalls the act that
        defines you to them.
    -   `rank: 2` picks the second-best match.
    -   `subject` (default `"player"`) only matches events whose subject
        it is (see `remember`'s `subject`).
    -   Without `format`, the summary is used alone. When nothing
        matches, `otherwise` (default empty) is used.
    -   Formats should address the player as "you", because summaries
        do.

Composed text lets endings be assembled from independent consequences,
such as a core outcome plus one coda per character, instead of a
combinatorial set of hand-written variants.

### 12.7 Engine API

``` js
engine.linkWeight("player", "lie", "mira"); // number
engine.traitScore("kind", "mira");        // number
engine.traitScores("mira");               // { trait: score }
engine.recall({ perspective: "mira", about: { trait: "kind" } }); // or null
engine.describeReputation();              // per-character summary for UIs
engine.characterName("mira");
engine.subjectName("ellis");              // "you" for the player, else a name
engine.traitLabel("kind");
```

`describeReputation()` lists each character who knows at least one
event, with their positive traits in descending order and the memory
recalled for their dominant trait. The demo shows it at every ending as
"How the people you met remember you".

Perspectives are computed from the event log on demand; nothing is
cached.

### 12.8 Explanations and memory tags

The engine tells the UI when memory made something appear, so players
can see that the story reacted to them rather than following a fixed
branch. It reports a **cause** for:

-   a text variant or text part whose `if` held,
-   a `recall` part that found a memory,
-   a choice shown because of its `showIf`, and
-   a node entered through a conditional route entry (`view.arrival`).

``` js
{
  nodeId: "reeve_response",
  text: "…People step back from you. Not far. Just enough.…",
  segments: [
    { text: "…" },
    { text: " People step back from you. Not far. Just enough.",
      cause: {
        tag: "fear",
        kind: "trait",            // trait | knows | association | recall | author | echo
        trait: "dangerous",       // or null
        color: null,              // the trait's optional "color"
        explanation: [{
          heading: "Brackenridge sees you as dangerous, because you:",
          items: ["stole flour off a stall while the baker was being robbed",
                  "pocketed a chapel candle… (heard secondhand)"]
        }]
      } }
  ],
  choices: [{ index: 0, id: "mira_speaks", text: "Ask Mira to speak", cause: { … } }],
  arrival: { … },                 // only when routed here by memory
  ended: false
}
```

Segments always concatenate to exactly `text`. A text variant's cause is
attached to its first segment.

Only memory conditions explain themselves: `trait` (with `min`),
`dominantTrait`, `knows`, and `association`. `all` collects
the causes of its children, `any` uses its first true child, and
`macroCondition` follows the macro. `not`, `variable`, and `visited`
produce no cause. Explanations list up to three supporting remembered
acts (those with a `summary`), strongest first, marking anything the
character only heard about as "(heard secondhand)". When every listed act
is the player's, the heading ends "because you:" and items are bare
summaries; otherwise it ends "because:" and each item is prefixed with
its subject ("you accused Jory", "Jory was seen near the luggage").

**Tags.** The engine builds a default label: "Mira: a liar" for a trait,
"Abara knows" for `knows`, the concept for an association, and
"Mira remembers" for a recall. Authors can override it with `tag` on:

-   a text variant or a text part,
-   a choice (applies to its `showIf`),
-   a conditional route entry, or
-   a macro (`{ "tag": "fear", "condition": {...} }`).

A tagged macro shows its tag whenever it holds, even when it holds
because something *didn't* happen (for example `max` or `not`
conditions). Prefer short, in-world tags ("fear", "Pim trusts you") over
mechanical ones. Traits may set `"color": "#rrggbb"` for their tags;
otherwise the demo picks a stable colour per trait.

Causes are presentation data. `getView()` stays read-only, and
`view.arrival` is not part of saved engine state.

The demo shows each cause as a coloured, bracketed tag after the text it
explains, with the explanation in a tooltip on hover or keyboard focus.
**Memory tags: on/off** in the header hides them for players who prefer
an uninterrupted read; that preference is stored per browser. Saved
transcripts keep their tags.

### 12.9 Presence and descriptions

`characters.<id>.description` (optional string) says who the character is.
`nodes.<id>.present` (optional array of distinct character IDs) says who
is in the scene. The engine itself only validates and reports them:

-   `getView()` includes `present: [{ id, name, description }]` when the
    node has a `present` list.
-   `{ "type": "describe", "character": "grey", "description": "…" }`
    replaces a character's description for the rest of the run (it may use
    placeholders). `engine.characterDescription(id)` returns the current
    description or `null`. Descriptions are run progress: saved in
    `toJSON()` as `descriptions` (optional when loading) and cleared by
    `reset()`, even when memory is kept.
-   `engine.apply(operations)` validates and runs operations outside any
    choice, before or during a run. Authoring tools use it to set up a
    scene, such as the demo's **Start from a scene**.

The demo shows "Here: …" above each passage with a `present` list. Each
character's first mention in a passage (by full name, or by a capitalised
last word no other character shares) can be hovered or focused to show
their name, description, whether they're here, and how they see the
player. For hidden characters it says the player can't tell.

Composed text is joined with single spaces, except that no space is added
before a part starting with closing punctuation (`. , ; : ! ? ) ’ ”`).

### 12.10 Choice echoes and the reputation panel

Players get feedback on a choice *after* making it, never as a preview.
Previews would turn moral choices into stat optimisation, and would
reveal witnesses the story means to keep secret.

**Echo.** The view entered by `choose()` carries `view.echo`, a
cause-shaped object (`kind: "echo"`) describing what that choice's
operations remembered about the player:

-   **Traits pushed:** the summed trait weights × strength of the
    choice's player events. Positive pushes toward a trait, negative
    away, so `"↑ merciful"` or `"↓ a liar"`.
-   **Who saw:** the choice's witnesses, minus hidden characters.
-   **Remembered as:** the events' summaries.

The tag reads like `↑ merciful · Mira saw`, or `↑ a thief · no one saw`.
A choice that remembers nothing about the player has no echo. Like
`arrival`, the echo is presentation-only and is not saved in engine
state. The demo attaches it to the picked choice in the transcript, and
saved transcripts keep it.

**Hidden characters.** `"characters": { "file": { "hidden": true } }`
keeps a character out of echoes and the live panel, so a secret
watcher is never revealed by the interface. Hidden characters still
witness, gossip, and appear in the ending summary, where their
`describeReputation()` entry has `hidden: true`.

**Engine API.**

``` js
engine.knownCharacters();                       // ids who know anything, hidden excluded
engine.knownCharacters({ includeHidden: true });
engine.reputationOf("mira");  // { character, name, traits: [{ trait, label, color, score }], memory }
engine.reputationOf();        // overall (world) view; character and name are null
```

`reputationOf()` includes negative scores, so a trait can be shown
pushed away as well as toward, sorted by absolute size.

**Panel.** The demo's collapsible **Who's who** panel sits above the
choices:

-   One tab for **Overall** and one per character met so far: anyone in
    the `present` list of a visited node, plus every non-hidden character
    who knows something. Characters present in the current node come
    first and are marked "· here".
-   A character's tab shows their current description first. For a hidden
    character it then says the player can't tell what they think, and
    shows no bars.
-   For the selected view, diverging bars per trait (toward a trait to the
    right of centre, away from it to the left), drawn on one scale shared
    by every tab so people can be compared. Each bar has a word strength
    (slightly / clearly / strongly) for screen readers and narrow screens.
-   The act that view remembers most.

Its open or closed state is remembered per browser.

## 13. Choice handling and state changes

`getView()` returns only choices whose `showIf` condition is true. Each
returned choice includes its original choice ID and a new visible index.
The visible-choice list is recalculated from current state on every call.

`choose(index)`:

1.  Recalculates the current visible-choice list.
2.  Validates the index.
3.  Executes the selected choice's `do` operations in order.
4.  Records the choice in choice history.
5.  Resolves `goto`.
6.  Enters the destination node and runs its `onEnter`.
7.  Returns the new `getView()` result.

Choice operations run in order and stop at the first error. The engine
does not undo operations that already succeeded. For example, if a
choice successfully remembers an event and its next operation fails,
that event remains in graph memory; the remaining operations do not run,
the choice is not added to history, and the engine does not navigate.
Trying the choice again may therefore repeat earlier effects. Include
the story, node, choice, and failed operation in the error.

Every choice on a non-ending node must have a valid `goto` destination or
a conditional `goto` with a final unconditional fallback. Endings have
no choices, so choices are never terminal actions.

Do not execute hidden choices. Do not allow choosing by an array index
from the unfiltered source choices; use the visible index returned by
`getView()`.

## 14. History and persistence

Maintain:

-   `nodeVisits`: ordered list of node IDs entered
-   `choiceHistory`: ordered list of selected choice IDs and source node
    IDs
-   `variables`: plain JSON-compatible object
-   `knowledge`: per-character event IDs and beliefs (section 12)
-   current node ID
-   ended flag

`NarrativeEngine.toJSON()` (state version 2) serializes engine runtime
state only, including knowledge; `loadState()` also accepts version 1
states, which load with no knowledge. It does
not include the story definition or graph. Serialize the graph separately
with `MemoryGraph.toJSON()`. Restore both using the same story definition:
load graph data into a `MemoryGraph`, pass that graph to the
`NarrativeEngine`, then load the engine state. Validate that the saved
current node exists in the supplied story.

Support resetting story progress while optionally retaining graph
memory. `keepMemory: false` clears the supplied graph and all character
knowledge; `keepMemory: true`
leaves both unchanged, so characters remember earlier runs.

The demo also supports per-story local storage when save/restore controls
are added to its markup. The current page exposes only the ending actions
to restart while keeping memory or clear memory and restart.

``` js
engine.reset({ keepMemory: true });
```

## 15. Validation and error handling

Validate a story definition before starting:

-   `start` exists in `nodes`.
-   Every node has valid text. Every ending must explicitly set
    `"ending": true`.
-   An ending has no choices. A non-ending has at least one choice.
-   Every choice has a non-empty text and unique ID within its node.
-   Every non-ending choice has a valid `goto`; conditional routes have
    exactly one final unconditional fallback.
-   All `goto` destinations exist.
-   All condition structures are valid.
-   All operation types are known.
-   All referenced macros exist.
-   Macro recursion is rejected.
-   Concepts are non-empty strings.
-   `{name:…}` placeholders name known characters, and a `remember`
    `subject` is one of its concepts.
-   At least one explicitly marked ending is reachable from `start`
    when all declared route destinations are considered.

At runtime, assert that a non-ending node has at least one visible
choice. If conditions hide all of its choices, throw a descriptive
dead-end error with the node ID rather than silently presenting a
non-ending terminal screen. This catches dynamic dead ends that static
reachability cannot detect.

Errors should identify the story, node, choice, and offending field
where possible. Do not silently ignore malformed rules.

## 16. Extensibility and authoring tools

Expose registries on the engine:

``` js
engine.operations.register("customOperation", (operation, context) => {
  // custom behaviour
});

engine.conditions.register("customCondition", (condition, context) => {
  return true;
});
```

The exact registry API can be simpler, but it must be documented and
must not require editing core engine methods to add a custom operation
or condition.

Custom handlers receive a controlled context containing the engine,
graph, variables, current node, and helper methods. They must not
receive unrestricted access to browser globals through story data.

Never use `eval`, `Function`, or execute arbitrary JavaScript strings
from story data.

### 16.1 Authoring warnings

`engine.lint()` returns `[{ location, message }]` for things that are
valid but almost certainly mistakes. It never throws for them:

-   a concept used in a trait, `knows`, `association`, `about`, or
    `subject` that no `remember` in the story ever produces (usually a
    typo), or a trait none of whose concepts is ever remembered;
-   a `remember` that counts toward a trait about a subject but has no
    `summary`, so recall and tags can't cite it;
-   a summary with no subject, one that starts with "you", or one that
    ends with punctuation;
-   a character who never witnesses or hears about anything;
-   a variable that is read but never set (and isn't an initial
    variable);
-   a placeholder that isn't `{name:…}` or `{var:…}`, or `{summary}`
    outside a recall format;
-   a macro that is never used.

A concept warning suggests the closest remembered concept when one is
within a few edits ("did you mean 'lie'?").

Concepts produced only by custom operations are reported too; treat
those warnings as expected.

### 16.2 Branch coverage

`engine.branches()` lists a stable ID for every text variant, each
conditional text part's outcomes (`(text)`, `(else)`, `(recall)`,
`(otherwise)`), each choice being offered, and each conditional route
entry, for example `node 'galley' text variant 0 part 1 (else)`. Pass
`onBranch: function (id) { … }` to the constructor to be told whenever
one is used. The callback must not change engine state.

### 16.3 StoryCheck

`StoryCheck.check(definition, { runs, seed, maxSteps })` plays `runs`
seeded random playthroughs (default 500) and returns:

``` js
{
  runs: 500,
  errors: [{ run, seed, message }],      // up to 10 distinct failures
  unvisitedNodes: ["node_id"],
  missedBranches: ["node 'x' text variant 1"],
  endings: { ending_id: count },          // unreached endings count 0
  warnings: [{ location, message }]       // engine.lint()
}
```

The demo's **Graph State** panel shows the selected story's warnings with
their source lines, its TODO notes, and a **Check story** button that runs
300 playthroughs. Uploads that have warnings say so in the status line.
**Start from a scene** starts a fresh run at any node after applying the
`set` operations and summarised `remember` operations the author ticks
from the story's own operations.

### 16.4 Watching a story file

Where the File System Access API exists (Chrome and Edge, including over
`file://`), **Open a story to edit** lets the author pick one `.txt` file.
The demo checks its modification time every second. After a change it
parses the file again; on success it starts the new version and replays
the run's choices by ID until one is no longer offered, and on failure
it reports the line and keeps the current run.

## 17. Automated test requirements

Write automated tests for:

### MemoryGraph

-   remembering two concepts creates a symmetric association
-   remembering three concepts creates all three pairwise links
-   duplicate concepts in one event do not create duplicate links
-   repeated events increase scores and `seen`
-   event metadata and event lookup work
-   serialization and restoration preserve query results, and version 1
    saves still load

### NarrativeEngine

-   story starts at configured start node
-   `onEnter` runs once per node entry
-   visible choices are filtered correctly
-   hidden choices cannot be selected
-   choosing a choice runs operations in order
-   a failed operation stops execution without recording or navigating
-   effects of completed operations remain after a later operation fails
-   `goto` enters the destination node
-   branches can converge on one shared node
-   conditional text selects the first matching variant
-   conditional routes select the first matching route
-   missing or non-final text/route fallbacks fail validation
-   nested `all`, `any`, and `not` conditions work
-   variable comparisons do not coerce types and missing values are false
-   `getView()` does not change engine or graph state
-   non-ending nodes with no visible choices fail at runtime
-   stories without a reachable explicit ending fail validation
-   retired `learnTransition`, `activate`, `transition`, and `activation`
    rules are rejected as unknown
-   macros execute and recursive macros fail clearly
-   history and variables update correctly
-   graph and engine state serialize and restore separately
-   reset can retain or clear graph memory as requested
-   witnesses learn only what they saw; gossip passes it on at reduced
    belief; reveal teaches from the world log
-   trait scores, negative weights, `dominantTrait`, `knows`, and
    perspective `association` conditions
-   `memory.halfLife` fades perspectives without changing the raw graph
-   composed text parts, `if`/`else`, and recall with `about`, `among`,
    `format`, and `otherwise`
-   memory-driven text, recalls, choices, and routes report causes with
    default or author tags and evidence; tagged macros, trait colours
-   choice echoes sum trait pushes, name only non-hidden witnesses, and are
    absent when nothing about the player was remembered; `reputationOf`
    and `knownCharacters`
-   knowledge survives save/load (state version 2), accepts version 1
    saves, and follows `reset({ keepMemory })`
-   malformed stories fail validation with useful errors
-   `{name:…}` and `{var:…}` placeholders, including in summaries
-   non-player subjects: reputations, recall, and explanations phrased
    with each act's own subject
-   `doubt` lowers or removes belief
-   `lint()` reports each kind of warning in 16.1
-   StoryCheck reports endings, unreached nodes, missed branches, and
    failures

### StoryPlayer

-   every stories/*.txt file is built, loads, and can be selected
-   uploading `.txt` stories replaces the current picker contents, and a
    file that doesn't parse is skipped with its line number
-   a watched file reloads on save, replays the choices made, and keeps
    the last working version when the new one doesn't parse
-   passages show who is here, names explain who people are (hidden
    characters' views stay secret), and `describe` updates the cast panel
-   **Start from a scene** starts at the chosen node with ticked memories
-   the transcript preserves the text and choices shown during a run
-   saved transcripts restore correctly, including older saves without one
-   graph-state diagnostics include each event's sequence number
-   an upload made while built-in stories are loading is not overwritten
-   endings list how each witness remembers the player
-   memory-driven text and choices render tags with explanations
-   picked choices show their echo (hidden witnesses unnamed), and the
    cast panel lists Overall plus each character met
-   uploads report authoring warnings, and **Check story** shows the
    results of a run

### StoryText

-   each piece of syntax produces the story data described in 4.1
-   mistakes are reported with their line number and a suggestion
-   `lineFor` maps engine locations back to source lines
-   the engine reports `present`, applies and saves `describe`, joins
    closing punctuation without a space, and `apply()` runs operations

### Built-in stories

-   1,500 seeded random playthroughs of every story (via StoryCheck)
    finish without errors or dead ends and between them reach every node;
    each story offers at least three endings and has no authoring
    warnings. Branches no run used are reported as test diagnostics.
-   `stories/built/` matches what `build-stories.js` would write.

### Browser (`file://`)

-   opening `index.html` over `file://` in headless Chrome or Edge loads
    every built-in story with no skipped-story message; skipped when no
    browser is installed (`CHROME_PATH` overrides detection)

## 18. MVP acceptance criteria

The implementation is complete when:

1.  A developer can instantiate `MemoryGraph` and `NarrativeEngine` in a
    browser.
2.  A story written only as a text file can present text and choices.
3.  Choices can record multi-concept memories.
4.  The graph exposes direct associations.
5.  Story conditions can query association scores, character knowledge
    and reputation, variables, and visit history.
6.  Conditional text and conditional routing work.
7.  Branches can diverge and later converge.
8.  An engine save and graph save can be restored independently with the
    same story definition.
9.  A small example story demonstrates memory affecting later dialogue
    or available choices.
10. The demo runs by opening `index.html` directly with `file://`, without
    a build or local-server step. Built-in stories are available immediately;
    users may optionally replace them for the current page session by
    uploading a folder or `.txt` story files.
11. The automated test requirements above pass.

## 19. Suggested implementation order

1.  Implement and test `MemoryGraph` event storage, associations,
    serialization, and event lookup.
2.  (Removed: activation spreading and transitions.)
3.  Implement `NarrativeEngine` node lifecycle and `getView()` /
    `choose()`.
4.  Add operations and condition evaluation.
5.  Add conditional text and routing.
6.  Add macros and extension registries.
7.  Add save/restore and validation.
8.  Create the sample story and browser demo.
9.  Run the automated tests and document any intentionally deferred
    features.
