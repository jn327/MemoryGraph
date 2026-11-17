"use strict";

// Plays every built-in story many times with seeded random choices (see
// scripts/StoryCheck.js). Each run must finish without errors or dead ends,
// together the runs must reach every node, and the story must have no
// authoring warnings. Text that no run ever showed is reported as a
// diagnostic: it may be unreachable, or just rare.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const StoryCheck = require("../scripts/StoryCheck.js");

const RUNS = 1500;

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

for (const { file, definition } of readStories()) {
  test(file + " plays through cleanly, reaches every node, and has no warnings", function (t) {
    const result = StoryCheck.check(definition, { runs: RUNS });
    assert.deepEqual(result.errors, [], "runs failed");
    assert.deepEqual(result.unvisitedNodes, [], "nodes never reached in " + RUNS + " runs");
    assert.deepEqual(result.warnings, [], "authoring warnings");
    assert.ok(Object.keys(result.endings).length >= 3, "stories should offer at least three endings");
    for (const branch of result.missedBranches) {
      t.diagnostic("never used in " + RUNS + " runs: " + branch);
    }
  });
}
