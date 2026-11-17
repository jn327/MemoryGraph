"use strict";

// Plays every built-in story many times with seeded random choices. Each run
// must finish without errors or dead ends, and together the runs must reach
// every node and every ending, so no authored content is unreachable.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const MemoryGraph = require("../scripts/MemoryGraph.js");
const NarrativeEngine = require("../scripts/NarrativeEngine.js");

const RUNS = 1500;
const MAX_STEPS = 250;

function readStories() {
  const directory = path.join(__dirname, "..", "stories");
  return fs.readdirSync(directory).filter(function (name) {
    return name.endsWith(".js");
  }).sort().map(function (name) {
    let definition = null;
    vm.runInNewContext(fs.readFileSync(path.join(directory, name), "utf8"), {
      registerStory: function (value) { definition = JSON.parse(JSON.stringify(value)); }
    });
    return { file: name, definition: definition };
  });
}

// Small deterministic PRNG so failures are reproducible.
function random(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playthroughs(definition, runs) {
  const visited = new Set();
  const endings = new Map();
  for (let run = 0; run < runs; run += 1) {
    const next = random(run + 1);
    const engine = new NarrativeEngine(definition, { graph: new MemoryGraph() });
    let view = engine.start();
    let steps = 0;
    visited.add(view.nodeId);
    while (!view.ended) {
      steps += 1;
      if (steps > MAX_STEPS) {
        throw new Error("run " + run + " did not end within " + MAX_STEPS + " choices");
      }
      view = engine.choose(Math.floor(next() * view.choices.length));
      visited.add(view.nodeId);
    }
    endings.set(view.nodeId, (endings.get(view.nodeId) || 0) + 1);
  }
  return { visited: visited, endings: endings };
}

for (const { file, definition } of readStories()) {
  test(file + " plays through cleanly and every node is reachable", function () {
    const result = playthroughs(definition, RUNS);
    const unvisited = Object.keys(definition.nodes).filter(function (id) {
      return !result.visited.has(id);
    });
    assert.deepEqual(unvisited, [], "nodes never reached in " + RUNS + " runs");
    const endingIds = Object.keys(definition.nodes).filter(function (id) {
      return definition.nodes[id].ending === true;
    });
    assert.ok(endingIds.length >= 3, "stories should offer at least three endings");
  });
}

