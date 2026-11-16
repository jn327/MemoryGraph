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

1.  **MemoryGraph** stores events as collections of named concepts,
    builds weighted associations between concepts, learns ordered
    transitions, and can spread activation from one or more concepts to
    find related memories.
2.  **NarrativeEngine** interprets a JSON story definition. It displays
    scene text and choices, evaluates declarative conditions, executes
    declarative operations, and moves between story nodes.

The **StoryPlayer** is demo UI outside the core library. It offers built-in
stories and lets the user upload a folder or JSON files, renders the
engine's view, and sends selected visible choices back to the engine. It
is not a required library module or a supported UI framework.

A story author should be able to create or modify a story by editing
JSON only. They should not need to write JavaScript for ordinary story
logic.

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
-   Keep story content, memory rules, conditions, and branching in JSON.
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
-   Unrestricted JavaScript execution from story JSON.
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
load local files. Built-in story definitions are generated into
`scripts/builtInStories.js` from the JSON files with
`node scripts/bundleStories.js`. Regenerate this file after adding, editing,
or deleting stories.
The Upload control lets the user select a folder or JSON files to replace
the built-in story picker. Uploads are not retained across page reloads.

Use the existing project structure:

``` text
  index.html
  scripts/
    MemoryGraph.js
    NarrativeEngine.js
    builtInStories.js      # generated from stories/*.json
    bundleStories.js       # regenerates the built-in story definitions
    storyPlayer.js          # demo UI only; not part of the core library
  styles/
    shared.css
  stories/
    *.json
  tests/                    # dependency-free unit tests using Node's built-in runner
    memory-graph.test.js
    narrative-engine.test.js
    story-player.test.js
```

Load `MemoryGraph.js`, `NarrativeEngine.js`, `builtInStories.js`, and `storyPlayer.js` in that
order from `index.html`. The core scripts expose `MemoryGraph` and
`NarrativeEngine` through explicit `window` properties. `storyPlayer.js`
is the browser demo entry point; core scripts must not depend on the
demo, DOM, or styles.

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

### 5.3 Associations and transitions are different

-   **Associations** are undirected weighted links created between every
    pair of concepts in one event.
-   **Transitions** are directed counts of one item following another,
    stored separately and grouped by a caller-supplied transition type.

Do not use association links as a substitute for sequence information.

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

#### `learnTransition(type, from, to, amount = 1)`

Record a directed transition from `from` to `to` in the named transition
group.

-   `type`, `from`, and `to` are non-empty strings.
-   `amount` defaults to `1` and must be finite and positive.
-   Store counts separately for each transition type.
-   Aggregate observations by transition type, `from`, and `to`; metadata
    is not retained by the MVP.
-   Return the updated transition count.

#### `predictNext(type, from, limit = 10)`

Return possible next values ordered by descending count, breaking ties
alphabetically by destination concept:

``` js
[
  { concept: "strike", score: 8 },
  { concept: "heal", score: 3 }
]
```

This is a frequency-based prediction, not a guarantee. Return an empty
array when there is no data.

#### `activate(start, options = {})`

Spread activation through association edges.

Example:

``` js
const results = graph.activate("wolf", {
  depth: 3,
  decay: 0.7,
  limit: 20
});
```

Return:

``` js
[
  { concept: "wolf", activation: 1 },
  { concept: "forest", activation: 0.7 },
  { concept: "help", activation: 0.7 }
]
```

Required behaviour:

-   The starting concept has activation `1`.
-   At each hop, propagate activation to neighbours.
-   For an edge with positive score `s`, normalize edge influence as
    `s / (s + edgeK)`, where `edgeK` is a finite positive option
    (default `1`). This yields a value strictly between `0` and `1`;
    never multiply activation directly by the unbounded raw score.
-   Propagate using `nextActivation = activation * decay * edgeInfluence`,
    where `decay` is in `(0, 1]`.
-   Prevent cycles from causing infinite work.
-   Track the strongest activation reached for each `(concept, depth)`
    pair; revisit that pair only when a stronger path is found. Return
    each concept once, with its maximum activation across depths.
-   Stop at `depth` hops and optionally at a configurable minimum
    activation.
-   Exclude or include the start concept according to a documented
    option; default should include it.
-   Return results ordered by descending activation, with deterministic
    tie-breaking.
-   `limit` bounds returned results, not traversal. Bound traversal
    separately with `maxExpansions` (default `10000` edge examinations);
    throw a descriptive error if the budget is exceeded rather than
    returning an indistinguishable partial result.

Suggested defaults: `depth: 2`, `decay: 0.7`, `edgeK: 1`,
`minActivation: 0.01`, `limit: 20`, `maxExpansions: 10000`.

#### `activateMany(starts, options = {})`

Spread activation from several starting concepts and merge the results
by taking the maximum activation per concept (not summing by default).
`starts` is an array of concept strings and each start has initial
activation `1`; weighted starts are not supported in the MVP.

#### `findMemories(concept, limit = 20)`

Return recent or relevant event records containing a concept, using a
concept-to-event index, ordered newest-first by event sequence.

#### `toJSON()` and static `fromJSON(data)`

Support saving and restoring all information needed to continue
learning:

-   events and metadata
-   association scores and counts, or enough source data to rebuild them
-   transitions
-   sequence counter and ID counter

Validate loaded data and provide useful errors for malformed input. Do
not serialize `Map` objects directly; convert them to plain
JSON-compatible objects or arrays.

#### `clear()`

Clear all stored events, indexes, associations, transitions, and
counters.

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
            },
            {
              "type": "learnTransition",
              "transitionType": "player_choice",
              "from": "wolf_encounter",
              "to": "help_wolf"
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
            "type": "activation",
            "starts": ["wolf"],
            "contains": "mercy",
            "min": 0.1
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
operations and conditions. Transitions are learned only through explicit
`learnTransition` operations; the engine does not infer them from choices.

## 8. Declarative operations

Operations are data objects and always use the `{ "type": "...", ... }`
form. Do not use shorthand objects with operation names as keys.

Recommended representation:

``` json
{ "type": "remember", "concepts": ["player", "help", "wolf"] }
```

Required MVP built-in operations are `remember`, `learnTransition`,
`activate`, `set`, `inc`, `dec`, and `macro`. Every operation is expressed
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

### `learnTransition`

``` json
{
  "type": "learnTransition",
  "transitionType": "player_choice",
  "from": "wolf_encounter",
  "to": "help_wolf",
  "amount": 1
}
```

Records a directed transition.

### `activate`

``` json
{
  "type": "activate",
  "starts": ["wolf", "hunter"],
  "options": { "depth": 2, "decay": 0.7, "limit": 20 },
  "storeAs": "currentThoughts"
}
```

Stores activation results in a named variable for later conditions or UI
use. Do not mutate global graph activation state unless a deliberate API
is added.

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

### `activation`

True when a concept reaches at least the requested activation after
spreading from one or more start concepts.

``` json
{
  "type": "activation",
  "starts": ["wolf", "hunter"],
  "contains": "lie",
  "min": 0.2,
  "options": { "depth": 3, "decay": 0.7 }
}
```

### `transition`

True when a directed transition count reaches a threshold.

``` json
{
  "type": "transition",
  "transitionType": "player_choice",
  "from": "wolf_encounter",
  "to": "help_wolf",
  "min": 1
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

### 10.3 Branches that diverge and collect

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

## 12. Choice handling and state transitions

`getView()` returns only choices whose `showIf` condition is true. Each
returned choice includes its original choice ID and a new visible index.
The visible-choice list is recalculated from current state on every call.

`choose(index)`:

1.  Recalculates the current visible-choice list.
2.  Validates the index.
3.  Executes the selected choice's `do` operations in order.
4.  Records the choice in choice history.
5.  Does not learn a transition automatically. Transitions are recorded
    only by an explicit `learnTransition` operation in the story.
6.  Resolves `goto` if present.
7.  Enters the destination node and runs its `onEnter`.
8.  Returns the new `getView()` result.

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

## 13. History and persistence

Maintain:

-   `nodeVisits`: ordered list of node IDs entered
-   `choiceHistory`: ordered list of selected choice IDs and source node
    IDs
-   `variables`: plain JSON-compatible object
-   current node ID
-   ended flag

`NarrativeEngine.toJSON()` serializes engine runtime state only; it does
not include the story definition or graph. Serialize the graph separately
with `MemoryGraph.toJSON()`. Restore both using the same story definition:
load graph data into a `MemoryGraph`, pass that graph to the
`NarrativeEngine`, then load the engine state. Validate that the saved
current node exists in the supplied story.

Support resetting story progress while optionally retaining graph
memory. `keepMemory: false` clears the supplied graph; `keepMemory: true`
leaves it unchanged.

The demo also supports per-story local storage when save/restore controls
are added to its markup. The current page exposes only the ending actions
to restart while keeping memory or clear memory and restart.

``` js
engine.reset({ keepMemory: true });
```

## 14. Validation and error handling

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
-   Concepts and transition identifiers are non-empty strings.
-   At least one explicitly marked ending is reachable from `start`
    when all declared route destinations are considered.

At runtime, assert that a non-ending node has at least one visible
choice. If conditions hide all of its choices, throw a descriptive
dead-end error with the node ID rather than silently presenting a
non-ending terminal screen. This catches dynamic dead ends that static
reachability cannot detect.

Errors should identify the story, node, choice, and offending field
where possible. Do not silently ignore malformed rules.

## 15. Extensibility

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
receive unrestricted access to browser globals through the story JSON.

Never use `eval`, `Function`, or execute arbitrary JavaScript strings
from story data.

## 16. Automated test requirements

Write automated tests for:

### MemoryGraph

-   remembering two concepts creates a symmetric association
-   remembering three concepts creates all three pairwise links
-   duplicate concepts in one event do not create duplicate links
-   repeated events increase scores and `seen`
-   event metadata and event lookup work
-   transition counts and predictions are directional
-   activation spreads across multiple hops
-   activation decays and respects depth
-   cycles terminate
-   the edge normalization formula bounds influence as edge scores grow
-   best activation is tracked independently at each depth
-   activation throws when `maxExpansions` is exceeded
-   serialization and restoration preserve query results

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
-   transitions are learned only when an explicit `learnTransition`
    operation runs
-   macros execute and recursive macros fail clearly
-   history and variables update correctly
-   graph and engine state serialize and restore separately
-   reset can retain or clear graph memory as requested
-   malformed stories fail validation with useful errors

### StoryPlayer

-   built-in story options match the JSON files and can be selected
-   uploading JSON stories replaces the current picker contents
-   the transcript preserves the text and choices shown during a run
-   saved transcripts restore correctly, including older saves without one
-   graph-state diagnostics include each event's sequence number

## 17. MVP acceptance criteria

The implementation is complete when:

1.  A developer can instantiate `MemoryGraph` and `NarrativeEngine` in a
    browser.
2.  A JSON-only story can present text and choices.
3.  Choices can record multi-concept memories.
4.  The graph exposes direct associations and spreading activation.
5.  Story conditions can query association scores, activation,
    transitions, variables, and visit history.
6.  Conditional text and conditional routing work.
7.  Branches can diverge and later converge.
8.  An engine save and graph save can be restored independently with the
    same story definition.
9.  A small example story demonstrates memory affecting later dialogue
    or available choices.
10. The demo runs by opening `index.html` directly with `file://`, without
    a build or local-server step. Built-in stories are available immediately;
    users may optionally replace them for the current page session by
    uploading a folder or JSON files.
11. The automated test requirements above pass.

## 18. Suggested implementation order

1.  Implement and test `MemoryGraph` event storage, associations,
    transitions, and serialization.
2.  Add bounded activation spreading and event lookup.
3.  Implement `NarrativeEngine` node lifecycle and `getView()` /
    `choose()`.
4.  Add operations and condition evaluation.
5.  Add conditional text and routing.
6.  Add macros and extension registries.
7.  Add save/restore and validation.
8.  Create the sample story and browser demo.
9.  Run the automated tests and document any intentionally deferred
    features.
