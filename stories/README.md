# Memoria Story Showcase

Eight JSON stories demonstrating the MemoryGraph + NarrativeEngine.

## Stories

1. **The Injured Wolf** — basic event memories, macros, conditional text.
2. **A Pattern of Choices** — repeated behaviour, association accumulation, transition learning.
3. **The Echo Chamber** — activation spreading and activation-driven choice visibility.
4. **The Locked Archive** — memory-gated choices and reusable condition macros.
5. **The Returning Guard** — persistent graph memory across repeated encounters/sessions.
6. **Three Witnesses** — different characters/roles evaluate different remembered traits; nested conditions.
7. **The Looping Dream** — variables, counters, revisiting nodes, and a loop with a clear exit condition.
8. **The Village Remembers** — larger branching narrative combining recurring characters, clues, memory conditions, activation-friendly concepts, macros, branches that reconverge, and multiple endings.

## Loading

Use the loader approach supported by your app/bundler. In a browser, `fetch()` is broadly compatible:

```js
const response = await fetch("./assets/story/the_wolf.json");
const story = await response.json();

const graph = new MemoryGraph();
const engine = new NarrativeEngine(story, { graph });

engine.start();
console.log(engine.getView());
```

Render `getView().text` and `getView().choices`; call `engine.choose(choice.index)` when a player selects a choice.

## Important notes

- These stories use the `{ "type": "...", ... }` operation and condition format from the project specification.
- The graph only learns the concepts explicitly grouped in each `remember` event. It does not infer meanings from prose.
- For the persistent-memory example, reuse the same `MemoryGraph` instance or restore it from saved JSON when starting another chapter/session.
- The transition demo records explicit transitions with `learnTransition`; it does not assume that co-occurrence implies sequence.
- The large story is deliberately expansive but remains a compact showcase, not a full commercial-length game.
