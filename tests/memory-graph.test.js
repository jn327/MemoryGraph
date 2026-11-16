"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const MemoryGraph = require("../scripts/MemoryGraph.js");

test("remember creates symmetric pairwise associations and deduplicates concepts", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["player", " help ", "wolf", "player"] });

  assert.equal(graph.associationScore("player", "help"), 1);
  assert.equal(graph.associationScore("help", "player"), 1);
  assert.equal(graph.associationScore("player", "wolf"), 1);
  assert.equal(graph.associationScore("help", "wolf"), 1);
  assert.equal(graph.associationScore("player", "player"), 0);
  assert.deepEqual(graph.related("player"), [
    { concept: "help", score: 1, seen: 1, lastSeen: 1 },
    { concept: "wolf", score: 1, seen: 1, lastSeen: 1 }
  ]);
});

test("events preserve metadata, support lookup, and strengthen association counts", function () {
  const graph = new MemoryGraph();
  const metadata = { scene: "forest", tags: ["mercy"] };
  const first = graph.remember({ concepts: ["wolf", "mercy"], metadata: metadata });
  metadata.tags.push("changed");
  graph.remember({ concepts: ["wolf", "mercy"], strength: 2 });

  assert.equal(first.id, "event-1");
  assert.equal(first.sequence, 1);
  assert.deepEqual(first.metadata, { scene: "forest", tags: ["mercy"] });
  assert.deepEqual(graph.findMemories("wolf").map(function (event) {
    return event.id;
  }), ["event-2", "event-1"]);
  assert.deepEqual(graph.related("wolf"), [
    { concept: "mercy", score: 3, seen: 2, lastSeen: 2 }
  ]);
});

test("transitions are directional and predictions are ordered by count then name", function () {
  const graph = new MemoryGraph();
  graph.learnTransition("choice", "intro", "help", 2);
  graph.learnTransition("choice", "intro", "leave");
  graph.learnTransition("choice", "intro", "assist");

  assert.deepEqual(graph.predictNext("choice", "intro"), [
    { concept: "help", score: 2 },
    { concept: "assist", score: 1 },
    { concept: "leave", score: 1 }
  ]);
  assert.equal(graph.transitionCount("choice", "intro", "help"), 2);
  assert.equal(graph.transitionCount("choice", "help", "intro"), 0);
  assert.deepEqual(graph.predictNext("choice", "help"), []);
});

test("activation propagates with normalized edge influence and respects depth", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"], strength: 4 });
  graph.remember({ concepts: ["b", "c"], strength: 4 });

  assert.deepEqual(graph.activate("a", { depth: 1, decay: 1 }), [
    { concept: "a", activation: 1 },
    { concept: "b", activation: 0.8 }
  ]);
  assert.ok(Math.abs(
    graph.activate("a", { depth: 2, decay: 1 }).find(function (item) {
      return item.concept === "c";
    }).activation - 0.64
  ) < 1e-12);
  assert.deepEqual(graph.activate("a", { depth: 2, decay: 1, includeStart: false })
    .map(function (item) { return item.concept; }), ["b", "c"]);
});

test("activation merges multiple starts, terminates cycles, and enforces expansion budget", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b", "c"] });

  assert.deepEqual(graph.activateMany(["a", "c"], { depth: 3, decay: 1 }), [
    { concept: "a", activation: 1 },
    { concept: "c", activation: 1 },
    { concept: "b", activation: 0.5 }
  ]);
  assert.throws(function () {
    graph.activate("a", { depth: 2, maxExpansions: 1 });
  }, /maxExpansions/);
});

test("activation remains bounded as association scores increase", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"], strength: 1e100 });

  const activation = graph.activate("a", { depth: 1, decay: 1 })[1].activation;
  assert.ok(activation < 1);
  assert.ok(activation > 0.99);
});

test("activation keeps the strongest path when a concept is reached at different depths", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"], strength: 1 });
  graph.remember({ concepts: ["a", "c"], strength: 9 });
  graph.remember({ concepts: ["c", "b"], strength: 9 });

  const result = graph.activate("a", { depth: 2, decay: 1 });
  assert.equal(result.find(function (item) {
    return item.concept === "b";
  }).activation, 0.81);
});

test("serialization restores memories, transitions, and counters", function () {
  const graph = new MemoryGraph({ maxEvents: 5 });
  graph.remember({
    concepts: ["player", "wolf", "mercy"],
    metadata: { scene: "forest", turn: 3 }
  });
  graph.learnTransition("choice", "forest", "help", 2);

  const restored = MemoryGraph.fromJSON(JSON.parse(JSON.stringify(graph.toJSON())));
  assert.deepEqual(restored.related("wolf"), graph.related("wolf"));
  assert.deepEqual(restored.findMemories("mercy"), graph.findMemories("mercy"));
  assert.deepEqual(restored.predictNext("choice", "forest"), graph.predictNext("choice", "forest"));
  assert.deepEqual(restored.activate("wolf"), graph.activate("wolf"));
  assert.equal(restored.remember({ concepts: ["next"] }).id, "event-2");
});

test("capacity errors and invalid data do not mutate graph state", function () {
  const graph = new MemoryGraph({ maxEvents: 1 });
  graph.remember({ concepts: ["a", "b"] });
  const before = graph.toJSON();

  assert.throws(function () {
    graph.remember({ concepts: ["c"] });
  }, /maxEvents/);
  assert.throws(function () {
    graph.remember({ concepts: ["c", "d"], strength: 0 });
  }, /strength/);
  assert.deepEqual(graph.toJSON(), before);
});

test("clear removes events, associations, transitions, and resets counters", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"] });
  graph.learnTransition("choice", "a", "b");
  graph.clear();

  assert.deepEqual(graph.related("a"), []);
  assert.deepEqual(graph.findMemories("a"), []);
  assert.deepEqual(graph.predictNext("choice", "a"), []);
  assert.equal(graph.remember({ concepts: ["a"] }).id, "event-1");
});
