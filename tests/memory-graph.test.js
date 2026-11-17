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

test("serialization restores memories and counters", function () {
  const graph = new MemoryGraph({ maxEvents: 5 });
  graph.remember({
    concepts: ["player", "wolf", "mercy"],
    metadata: { scene: "forest", turn: 3 }
  });

  const saved = JSON.parse(JSON.stringify(graph.toJSON()));
  assert.equal(saved.version, 2);
  const restored = MemoryGraph.fromJSON(saved);
  assert.deepEqual(restored.related("wolf"), graph.related("wolf"));
  assert.deepEqual(restored.findMemories("mercy"), graph.findMemories("mercy"));
  assert.equal(restored.remember({ concepts: ["next"] }).id, "event-2");
});

test("version 1 saves load, ignoring their retired transitions list", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"] });
  const older = Object.assign({}, graph.toJSON(), {
    version: 1,
    transitions: [{ type: "choice", from: "a", to: "b", count: 2 }]
  });
  assert.equal(MemoryGraph.fromJSON(older).associationScore("a", "b"), 1);
  assert.throws(function () {
    MemoryGraph.fromJSON(Object.assign({}, older, { version: 3 }));
  }, /Unsupported/);
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

test("clear removes events and associations, and resets counters", function () {
  const graph = new MemoryGraph();
  graph.remember({ concepts: ["a", "b"] });
  graph.clear();

  assert.deepEqual(graph.related("a"), []);
  assert.deepEqual(graph.findMemories("a"), []);
  assert.equal(graph.remember({ concepts: ["a"] }).id, "event-1");
});
