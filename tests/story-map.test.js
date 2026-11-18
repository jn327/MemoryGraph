"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

require("../scripts/core/MemoryGraph.js");
require("../scripts/core/NarrativeEngine.js");
const StoryText = require("../scripts/authoring/StoryText.js");
const StoryCheck = require("../scripts/authoring/StoryCheck.js");
const StoryMap = require("../scripts/authoring/StoryMap.js");

const storiesDir = path.join(__dirname, "..", "stories");

function parse(text, fileName) {
  return StoryText.parse(text, { fileName: fileName || "test.txt" });
}

function analyse(text) {
  const parsed = parse(text);
  return StoryMap.analyse(parsed.story, { lines: parsed.lines, todos: parsed.todos });
}

function storyFiles() {
  return fs.readdirSync(storiesDir).filter(function (name) { return name.endsWith(".txt"); }).sort();
}

test("every story is measured, laid out without overlaps, and every arrow joins its scenes", function () {
  storyFiles().forEach(function (name) {
    const parsed = parse(fs.readFileSync(path.join(storiesDir, name), "utf8"), name);
    const analysis = StoryMap.analyse(parsed.story, { lines: parsed.lines, todos: parsed.todos });
    const layout = StoryMap.layout(analysis);
    const ids = Object.keys(parsed.story.nodes);

    assert.equal(analysis.stats.scenes, ids.length, name);
    assert.ok(analysis.stats.endings > 0, name);
    assert.ok(analysis.stats.words > 0, name);
    assert.deepEqual(analysis.graph.unreachable, [], name + " has a scene nothing leads to");
    assert.deepEqual(analysis.graph.deadEnds, [], name + " has a scene that can't reach an ending");
    ids.forEach(function (id) {
      assert.ok(analysis.scenes[id].line > 0, name + " " + id + " has a line number");
    });

    const nodes = Object.values(layout.nodes);
    nodes.forEach(function (a) {
      assert.ok(a.x - a.w / 2 >= 0 && a.x + a.w / 2 <= layout.width, name + " " + a.id + " fits across");
      assert.ok(a.y - a.h / 2 >= 0 && a.y + a.h / 2 <= layout.height, name + " " + a.id + " fits down");
      nodes.forEach(function (b) {
        if (a !== b && a.rank === b.rank) {
          assert.ok(Math.abs(a.x - b.x) >= a.w, name + ": " + a.id + " overlaps " + b.id);
        }
      });
    });
    const start = layout.nodes[analysis.start];
    nodes.forEach(function (node) { assert.ok(node.rank >= start.rank, name + " " + node.id + " is above the start"); });
    ids.filter(function (id) { return analysis.scenes[id].ending; }).forEach(function (id) {
      assert.equal(layout.nodes[id].rank, layout.rows - 1, name + " ending " + id + " is on the bottom row");
    });

    layout.edges.forEach(function (route) {
      const from = layout.nodes[route.from];
      const to = layout.nodes[route.to];
      const first = route.points[0];
      const last = route.points[route.points.length - 1];
      assert.ok(Math.abs(first.x - from.x) <= from.w / 2 && Math.abs(Math.abs(first.y - from.y) - from.h / 2) < 0.01,
        name + " " + route.key + " starts on its scene");
      assert.ok(Math.abs(last.x - to.x) <= to.w / 2 && Math.abs(Math.abs(last.y - to.y) - to.h / 2) < 0.01,
        name + " " + route.key + " ends on its scene");
      assert.equal(route.back, to.rank < from.rank, name + " " + route.key + " loops back only when it goes up");
    });
  });
});

test("the story map counts scenes, choices and words, and finds the TODOs in each scene", function () {
  const analysis = analyse([
    "title: Counting",
    "",
    "=== one",
    "One two three.",
    "{player with help >= 1: Four five.}",
    "// TODO: a note",
    "* Go on -> two",
    "* {visited two} Help -> two",
    "  ~ remember help",
    "",
    "=== two (ending)",
    "Six."
  ].join("\n"));
  assert.equal(analysis.stats.scenes, 2);
  assert.equal(analysis.stats.endings, 1);
  assert.equal(analysis.stats.choices, 2);
  assert.equal(analysis.stats.conditionalChoices, 1);
  assert.equal(analysis.scenes.one.words, 5);
  assert.equal(analysis.stats.words, 5 + 1 + 2 + 1);
  assert.equal(analysis.stats.conditionalShare, 2 / 6);
  assert.equal(analysis.stats.shortestRoute, 1);
  assert.deepEqual(analysis.scenes.one.todos.map(function (todo) { return todo.text; }), ["a note"]);
  assert.equal(analysis.edges.length, 1, "two choices to the same scene make one arrow");
  assert.equal(analysis.edges[0].conditional, false, "the arrow is solid when one of its choices is always offered");
});

test("the story map finds unreachable scenes, dead ends and choke points", function () {
  const analysis = analyse([
    "title: Shapes",
    "",
    "=== start",
    "Go.",
    "* Left -> hall",
    "* Right -> hall",
    "",
    "=== hall",
    "A hall.",
    "* On -> fork",
    "",
    "=== fork",
    "A fork.",
    "* End -> finish",
    "* Trap -> pit",
    "",
    "=== pit",
    "No way out.",
    "* Again -> pit",
    "",
    "=== island",
    "Nobody comes here.",
    "* Leave -> finish",
    "",
    "=== finish (ending)",
    "Done."
  ].join("\n"));
  assert.deepEqual(analysis.graph.unreachable, ["island"]);
  assert.deepEqual(analysis.graph.deadEnds, ["pit"]);
  assert.deepEqual(analysis.graph.chokePoints, ["hall", "fork"]);
  assert.equal(analysis.scenes.pit.selfLoop, true);
  const messages = analysis.problems.map(function (problem) { return problem.scene + ": " + problem.message; });
  assert.ok(messages.indexOf("island: No choice leads here from the start.") !== -1, messages.join("\n"));
  assert.ok(messages.indexOf("pit: No ending can be reached from here.") !== -1, messages.join("\n"));
});

test("the story map says where a memory is set up and whether each check can come true", function () {
  const analysis = analyse([
    "title: Payoffs",
    "",
    "== characters",
    "ana: Ana",
    "ben: Ben",
    "",
    "== traits",
    "kind: help",
    "",
    "=== start",
    "present: ana, ben",
    "{ana knows help: Ana smiles. # early}",
    "* Help Ana -> middle",
    "  ~ remember help, ana (seen by ana)",
    "* Walk on -> middle",
    "",
    "=== middle",
    "present: ana",
    "{ana knows help: Ana remembers. # set up}",
    "{ben knows help: Ben heard. # never told}",
    "{ana knows steal: Never. # nothing}",
    "* Finish -> end",
    "  ~ remember steal (seen by ana)",
    "",
    "=== end (ending)",
    "{ana sees you as kind >= 0.5: Ana waves.}",
    "Done."
  ].join("\n"));
  const status = function (scene, text) {
    const check = analysis.scenes[scene].checks.find(function (item) { return item.text.indexOf(text) !== -1; });
    assert.ok(check, scene + ": " + text);
    return check.status;
  };
  assert.equal(status("start", "Ana knows help"), "earlier", "only an earlier run can set it up");
  assert.equal(status("middle", "Ana knows help"), "ok");
  assert.equal(status("middle", "Ben knows help"), "unseen", "Ben never witnesses it");
  assert.equal(status("middle", "Ana knows steal"), "earlier", "remembered only after the check");
  assert.equal(status("end", "Ana sees you as kind"), "ok");

  assert.deepEqual(analysis.memory.concepts.help.setups, ["start"]);
  assert.deepEqual(analysis.memory.traits.kind.setups, ["start"]);
  assert.deepEqual(analysis.memory.traits.kind.checks.map(function (item) { return item.scene; }), ["end"]);

  const problems = analysis.problems.map(function (problem) { return problem.severity + " " + problem.scene + ": " + problem.message; });
  assert.ok(problems.some(function (text) { return /^warning middle: Ben never sees or hears/.test(text); }), problems.join("\n"));
  assert.ok(problems.indexOf("note start: Ana sees something here but isn't in its present: line.") === -1);
});

test("a gossip that reaches someone counts as them hearing of it", function () {
  const analysis = analyse([
    "title: Gossip",
    "",
    "== characters",
    "ana: Ana",
    "ben: Ben",
    "",
    "=== start",
    "Ana drops her bag.",
    "* Help -> middle",
    "  ~ remember help, ana (seen by ana)",
    "  ~ gossip ana to ben about help",
    "",
    "=== middle (ending)",
    "{ben knows help: Ben heard.}"
  ].join("\n"));
  assert.equal(analysis.scenes.middle.checks[0].status, "ok");
});

test("Story check counts how many runs reach each scene and take each route", function () {
  const parsed = parse(fs.readFileSync(path.join(storiesDir, "the_night_ferry.txt"), "utf8"), "the_night_ferry.txt");
  const result = StoryCheck.check(parsed.story, { runs: 50 });
  assert.equal(result.nodeRuns[parsed.story.start || "boarding"], 50);
  const endings = Object.keys(result.endings).reduce(function (sum, id) { return sum + result.endings[id]; }, 0);
  assert.equal(endings, 50);
  assert.equal(result.routeRuns["boarding>deck"], 50);
  assert.ok(result.lengths.choices.min <= result.lengths.choices.median);
  assert.ok(result.lengths.choices.median <= result.lengths.choices.max);
  assert.ok(result.lengths.words.min > 0);
});
