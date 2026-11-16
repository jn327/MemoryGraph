# Memory graph --- Narrative Engine Project Specification

**Document type:** MVP implementation specification\
**Target:** JavaScript library for browser-based interactive narrative\
**Working name:** Memory Graph\
**Primary modules:** `MemoryGraph.js` and `NarrativeEngine.js`\
**Status:** Ready for implementation

------------------------------------------------------------------------

## 1. Project summary

Build a small, dependency-free JavaScript system for authoring
interactive stories whose characters and story logic can consult a
persistent associative memory.

The system has three main parts:

1.  **MemoryGraph** stores events as collections of named concepts,
    builds weighted associations between concepts, learns ordered
    transitions, and can spread activation from one or more concepts to
    find related memories.
2.  **NarrativeEngine** interprets a JSON story definition. It displays
    scene text and choices, evaluates declarative conditions, executes
    declarative operations, and moves between story nodes.
2.  **StoryPlayer** a simple presentational layer that displays available
    stories to select from, then once selected exposes the text to display 
    and the choices currently available. Repeatedly requests story content, 
    displays it, and sends the player's chosen option back to the runtime. 

A story author should be able to create or modify a story by editing
JSON only. They should not need to write JavaScript for ordinary story
logic.

The engine is not an LLM and does not understand natural language
automatically. It operates on concepts and rules explicitly supplied by
the story author.

## 2. Goals

-   Run in a modern browser using standard JavaScript (ES modules).
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

Use modern JavaScript ES modules and browser-compatible APIs. Do not
require Node-specific APIs in the core library.

Suggested project structure:
  index.html
  memoryGraph/
    MemoryGraph.js
    NarrativeEngine.js
  stories/
    the-village-remembers.json
  scripts/
    storyPlayer.js
  tests/
    memory-graph.test.js
    narrative-engine.test.js

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
  maxEvents: 10000 // optional safety limit; default may be unlimited
}
```

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
is the latest event sequence that strengthened it. Define and document
tie-breaking (for example, alphabetical by concept).

#### `associationScore(a, b)`

Return the direct association score, or `0` if no edge exists.

#### `learnTransition(type, from, to, amount = 1, metadata = {})`

Record a directed transition from `from` to `to` in the named transition
group.

-   `type`, `from`, and `to` are non-empty strings.
-   `amount` defaults to `1` and must be positive.
-   Store counts separately for each transition type.
-   Optionally retain transition metadata or aggregate observations.
-   Return the updated transition count.

#### `predictNext(type, from, limit = 10)`

Return possible next values ordered by descending count:

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
-   Each hop multiplies activation by `decay` and by an edge-strength
    factor.
-   Raw association scores can grow without bound, so **do not multiply
    directly by raw edge score**. Normalize edge influence to a bounded
    value, for example `score / (score + k)` with configurable `k > 0`,
    or use another documented bounded normalization.
-   Prevent cycles from causing infinite work.
-   Track the strongest activation reached for each concept; only
    revisit a concept if a stronger path is found.
-   Stop at `depth` hops and optionally at a configurable minimum
    activation.
-   Exclude or include the start concept according to a documented
    option; default should include it.
-   Return results ordered by descending activation, with deterministic
    tie-breaking.
-   Support a `limit` on returned results. The search itself must also
    have sensible work bounds for large graphs.

Suggested defaults: `depth: 2`, `decay: 0.7`, `edgeK: 1`,
`minActivation: 0.01`, `limit: 20`.

#### `activateMany(starts, options = {})`

Spread activation from several starting concepts and merge the results
by taking the maximum activation per concept (not summing by default).
Each start has initial activation `1`, unless a weighted input form is
deliberately supported and documented.

#### `findMemories(concept, limit = 20)`

Return recent or relevant event records containing a concept, using a
concept-to-event index. Define whether ordering is newest-first
(recommended).

#### `toJSON()` and `loadJSON(data)` (or static `fromJSON(data)`)

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

### 7.3 Node lifecycle

When entering a node:

1.  Validate that the node exists.
2.  Set it as the current node.
3.  Record the visit in history.
4.  Execute its `onEnter` operations exactly once for that entry.
5.  Evaluate text variants and visible choices.
6.  Return the resulting view.

A node is not automatically replayed. It remains the current node until
the player chooses an available choice, an explicit operation navigates
elsewhere, or the node is marked as an ending. Revisiting a node through
a branch runs its `onEnter` operations again.

Provide a protection against accidental infinite automatic navigation.
The MVP should not support implicit auto-advance. If an explicit `goto`
operation is allowed during `onEnter`, cap chained navigation (for
example, 50 hops) and throw a useful error if exceeded.

### 7.4 Story structure

Example:

``` json
{
  "id": "village_remembers",
  "title": "The Village Remembers",
  "start": "wolf_encounter",
  "macros": {},
  "nodes": {
    "wolf_encounter": {
      "text": "An injured wolf lies beside the road.",
      "onEnter": [
        {
          "remember": {
            "concepts": ["forest", "wolf"],
            "metadata": { "scene": "wolf_encounter" }
          }
        }
      ],
      "choices": [
        {
          "id": "help_wolf",
          "text": "Help the wolf",
          "do": [
            {
              "remember": {
                "concepts": ["player", "help", "wolf", "mercy"],
                "metadata": { "actor": "player", "action": "help" }
              }
            },
            {
              "learnTransition": {
                "type": "player_choice",
                "from": "wolf_encounter",
                "to": "help_wolf"
              }
            }
          ],
          "goto": "hunter"
        },
        {
          "id": "leave_wolf",
          "text": "Leave it alone",
          "do": [
            {
              "remember": {
                "concepts": ["player", "ignore", "wolf", "indifference"]
              }
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
              "remember": {
                "concepts": ["player", "truth", "hunter", "honesty"]
              }
            }
          ],
          "goto": "ending"
        },
        {
          "id": "lie",
          "text": "Lie to protect the wolf",
          "showIf": {
            "activation": {
              "start": "wolf",
              "contains": "mercy",
              "min": 0.1
            }
          },
          "do": [
            {
              "remember": {
                "concepts": ["player", "lie", "hunter", "protect", "wolf"]
              }
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
            "association": {
              "a": "player",
              "b": "mercy",
              "min": 1
            }
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

The example is illustrative. Ensure its conditions are consistent with
the graph semantics and default activation settings in the
implementation.

## 8. Declarative operations

Operations are data objects. An operation object should have exactly one
operation key, or use a consistent `{ type, ... }` form. Choose one
representation and use it consistently throughout the code,
documentation, and examples.

Recommended representation:

``` json
{ "type": "remember", "concepts": ["player", "help", "wolf"] }
```

Required built-in operations:

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

### `goto`

Navigation should normally be expressed using a choice's `goto` or a
node's conditional routing, rather than buried in arbitrary operations.
If `goto` is also supported as an operation, define its execution order
and ensure it cannot silently continue executing operations for the old
node after navigation.

### `forget`

Do not implement destructive deletion of arbitrary graph concepts in the
MVP unless the semantics are precisely defined. Prefer a `forget`
operation that reduces or removes a specified association, or defer it.
Never silently delete event history while leaving stale indexes.

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

Support `eq`, `neq`, `gt`, `gte`, `lt`, and `lte` comparisons. Validate
operand types.

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
one. Empty condition arrays should have documented behaviour
(recommended: reject them during validation).

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
`if` is the fallback. If no variant matches and there is no fallback,
return an empty string or a validation error; choose and document one
behaviour.

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

Use the first matching route. The final unconditional route is the
fallback. Validate destination node IDs.

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
-   Define whether macros can accept parameters. For MVP, they do not
    need parameters.
-   Keep macro expansion/execution deterministic.

## 12. Choice handling and state transitions

`getView()` returns only choices whose `showIf` condition is true. Each
returned choice includes its original choice ID and a new visible index.

`choose(index)`:

1.  Calls `getView()` or uses the current cached visible-choice list.
2.  Validates the index.
3.  Executes the selected choice's `do` operations in order.
4.  Records the choice in choice history.
5.  Learns any explicitly configured transition (do not infer
    transitions unless documented).
6.  Resolves `goto` if present.
7.  Enters the destination node and runs its `onEnter`.
8.  Returns the new `getView()` result.

If a choice has no `goto`, the engine should remain on the current node
and return an updated view, or report that the choice is terminal.
Choose one clear behaviour; recommended: require `goto` unless the story
is explicitly marked as an ending.

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
-   graph state (or allow graph persistence to be handled separately)

`NarrativeEngine.toJSON()` should serialize engine state. Prefer
separate methods for story definition and runtime state so story content
is not duplicated in every save.

A save should be restorable with the same story definition and graph
state. Validate that the saved current node exists in the supplied
story.

Support resetting story progress while optionally retaining graph
memory:

``` js
engine.reset({ keepMemory: true });
```

## 14. Validation and error handling

Validate a story definition before starting:

-   `start` exists in `nodes`.
-   Every node has a valid text value and a choices array (empty allowed
    for endings).
-   Every choice has a non-empty text and unique ID within its node.
-   All `goto` destinations exist.
-   All condition structures are valid.
-   All operation types are known.
-   All referenced macros exist.
-   Macro recursion is rejected.
-   Concepts and transition identifiers are non-empty strings.

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

## 16. Browser integration example

The library does not render HTML. A host page can render the view:

``` js
import MemoryGraph from "./src/MemoryGraph.js";
import NarrativeEngine from "./src/NarrativeEngine.js";
import story from "./stories/the-village-remembers.json" with { type: "json" };

const graph = new MemoryGraph();
const engine = new NarrativeEngine(story, { graph });

function render() {
  const view = engine.getView();

  document.querySelector("#story-text").textContent = view.text;

  const choices = document.querySelector("#choices");
  choices.replaceChildren();

  for (const choice of view.choices) {
    const button = document.createElement("button");
    button.textContent = choice.text;
    button.addEventListener("click", () => {
      engine.choose(choice.index);
      render();
    });
    choices.append(button);
  }
}

engine.start();
render();
```

The import syntax for JSON varies by browser and bundler. The example
may instead load JSON using `fetch()`.

## 17. Testing requirements

At minimum, write automated tests for:

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
-   strong repeated edges do not produce unbounded activation
-   serialization and restoration preserve query results

### NarrativeEngine

-   story starts at configured start node
-   `onEnter` runs once per node entry
-   visible choices are filtered correctly
-   hidden choices cannot be selected
-   choosing a choice runs operations in order
-   `goto` enters the destination node
-   branches can converge on one shared node
-   conditional text selects the first matching variant
-   conditional routes select the first matching route
-   nested `all`, `any`, and `not` conditions work
-   macros execute and recursive macros fail clearly
-   history and variables update correctly
-   save/restore resumes at the correct node
-   reset can retain or clear graph memory as requested
-   malformed stories fail validation with useful errors

## 18. MVP acceptance criteria

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
8.  The engine can save and restore runtime state and graph memory.
9.  A small example story demonstrates memory affecting later dialogue
    or available choices.
10. Automated tests cover the behaviours listed above.

## 19. Important implementation cautions

-   **Do not claim the graph understands concepts.** It only links
    labels supplied by the author.
-   **Avoid treating raw association score as probability.** It is an
    accumulated weight. If a probability is needed later, add a
    separately defined normalization.
-   **Avoid uncontrolled activation loops.** Use bounded edge influence,
    depth limits, minimum activation, and deterministic traversal.
-   **Avoid logging every line of prose as memory.** Record meaningful
    events and reusable concepts.
-   **Do not conflate co-occurrence with sequence.** Use events for
    associations and explicit transitions for ordered behaviour.
-   **Do not make story authors write JavaScript.** All ordinary
    narrative logic should be expressible in JSON.
-   **Keep the engine UI-agnostic.** It returns structured data; the
    host application decides how to display it.
-   **Keep the first version small.** Implement the specified features
    before adding emotion systems, automatic summarisation, generated
    dialogue, or more advanced reasoning.

## 20. Suggested implementation order

1.  Implement and test `MemoryGraph` event storage, associations,
    transitions, and serialization.
2.  Add bounded activation spreading and event lookup.
3.  Implement `NarrativeEngine` node lifecycle and `getView()` /
    `choose()`.
4.  Add operations and condition evaluation.
5.  Add conditional text and routing.
6.  Add macros and extension registries.
7.  Add save/restore and validation.
8.  Build the sample story and browser demo.
9.  Run the acceptance tests and document any intentionally deferred
    features.

------------------------------------------------------------------------

**Deliverable requested from the coding LLM:** Produce complete,
runnable source files, not pseudocode. Include a sample JSON story, a
minimal browser demo, and tests. Keep all public methods and JSON
formats consistent with this specification. If a design detail is
ambiguous, choose the simplest deterministic behaviour, document it, and
add a test.
