"use strict";

// Plays every built-in story many times with seeded random choices (see
// scripts/authoring/StoryCheck.js). Each run must finish without errors or dead ends,
// together the runs must reach every node, and the story must have no
// authoring warnings. Text that no run ever showed is reported as a
// diagnostic: it may be unreachable, or just rare.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const StoryCheck = require("../scripts/authoring/StoryCheck.js");
const StoryText = require("../scripts/authoring/StoryText.js");
const { buildOutputs } = require("../tools/build-stories.js");

const RUNS = 1500;
const STORIES = path.join(__dirname, "..", "stories");

function readStories() {
  return fs.readdirSync(STORIES).filter(function (name) {
    return name.endsWith(".txt");
  }).sort().map(function (name) {
    const parsed = StoryText.parse(fs.readFileSync(path.join(STORIES, name), "utf8"), { fileName: name });
    return { file: name, definition: parsed.story, todos: parsed.todos };
  });
}

for (const { file, definition, todos } of readStories()) {
  test(file + " plays through cleanly, reaches every node, and has no warnings", function (t) {
    const result = StoryCheck.check(definition, { runs: RUNS });
    assert.deepEqual(result.errors, [], "runs failed");
    assert.deepEqual(result.unvisitedNodes, [], "nodes never reached in " + RUNS + " runs");
    assert.deepEqual(result.warnings, [], "authoring warnings");
    assert.ok(Object.keys(result.endings).length >= 3, "stories should offer at least three endings");
    for (const branch of result.missedBranches) {
      t.diagnostic("never used in " + RUNS + " runs: " + branch);
    }
    for (const todo of todos) {
      t.diagnostic("TODO on line " + todo.line + ": " + todo.text);
    }
  });
}

test("stories/built matches the .txt stories (run node tools/build-stories.js)", function () {
  const { files, errors } = buildOutputs();
  assert.deepEqual(errors, []);
  const built = path.join(STORIES, "built");
  const onDisk = fs.readdirSync(built).filter(function (name) { return name.endsWith(".js"); }).sort();
  assert.deepEqual(onDisk, Object.keys(files).sort(), "generated files are missing or left over");
  for (const [name, contents] of Object.entries(files)) {
    // Git may check the files out with CRLF line endings; that's not a change.
    assert.equal(fs.readFileSync(path.join(built, name), "utf8").replace(/\r\n/g, "\n"), contents,
      "stories/built/" + name + " is out of date");
  }
});
