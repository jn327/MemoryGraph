"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const MemoryGraph = require("../scripts/core/MemoryGraph.js");

test("remember creates symmetric pairwise associations and deduplicates concepts", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["player", "help", "wolf", "player"] });

  assert.equal(graph.associationScore("player", "help"), 1);
  assert.equal(graph.associationScore("help", "player"), 1);
  assert.equal(graph.associationScore("player", "wolf"), 1);
  assert.equal(graph.associationScore("help", "wolf"), 1);
  assert.equal(graph.associationScore("player", "player"), 0);
  assert.deepEqual(graph.related("player"), [
    { concept: "help", score: 1, seen: 1 },
    { concept: "wolf", score: 1, seen: 1 }
  ]);
  assert.throws(function () { graph.remember({ concepts: [" help "] }); }, /surrounding spaces/);
});

test("events copy their metadata and strengthen association counts", function () {
  const graph = new MemoryGraph();
  const metadata = { scene: "forest", tags: ["mercy"] };
  const first = graph.remember({ concepts: ["wolf", "mercy"], metadata: metadata });
  metadata.tags.push("changed");
  graph.remember({ concepts: ["wolf", "mercy"], strength: 2 });

  assert.equal(first.id, "event-1");
  assert.equal(first.sequence, 1);
  assert.deepEqual(first.metadata, { scene: "forest", tags: ["mercy"] });
  assert.deepEqual(graph.events[0].metadata, { scene: "forest", tags: ["mercy"] });
  assert.deepEqual(graph.related("wolf"), [{ concept: "mercy", score: 3, seen: 2 }]);
});

test("invalid events do not change the graph", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"] });
  assert.throws(function () {
    graph.remember({ concepts: ["c", "d"], strength: 0 });
  }, /strength/);
  assert.equal(graph.events.length, 1);
  assert.equal(graph.associationScore("c", "d"), 0);
});

test("clear removes events and associations, and resets counters", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"] });
  graph.clear();

  assert.deepEqual(graph.related("a"), []);
  assert.deepEqual(graph.events, []);
  assert.equal(graph.remember({ concepts: ["a"] }).id, "event-1");
});
