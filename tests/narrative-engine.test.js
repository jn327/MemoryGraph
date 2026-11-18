"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
require("../scripts/core/MemoryGraph.js");
const NarrativeEngine = require("../scripts/core/NarrativeEngine.js");

function makeStory(overrides) {
  const story = {
    id: "test_story",
    title: "Test Story",
    start: "start",
    macros: {},
    nodes: {
      start: {
        text: "The story begins.",
        onEnter: [
          { type: "remember", concepts: ["place", "start"] },
          { type: "inc", variable: "entries" }
        ],
        choices: [
          {
            id: "help",
            text: "Help",
            do: [
              { type: "remember", concepts: ["player", "help", "mercy"] },
              { type: "set", variable: "helped", value: true }
            ],
            goto: "merge"
          },
          {
            id: "leave",
            text: "Leave",
            do: [{ type: "remember", concepts: ["player", "leave"] }],
            goto: "merge"
          }
        ]
      },
      merge: {
        text: [
          {
            if: { type: "association", a: "player", b: "mercy", min: 1 },
            value: "You are remembered kindly."
          },
          { value: "You are a stranger." }
        ],
        choices: [
          {
            id: "finish",
            text: "Finish",
            goto: [
              {
                if: { type: "variable", name: "helped", operator: "eq", value: true },
                node: "kind_end"
              },
              { node: "end" }
            ]
          }
        ]
      },
      kind_end: { text: "Kind ending.", ending: true, choices: [] },
      end: { text: "Ending.", ending: true, choices: [] }
    }
  };
  return Object.assign(story, overrides || {});
}

test("start runs onEnter once, views are read-only, and branches converge", function () {
  const engine = new NarrativeEngine(makeStory());
  const snapshot = function () {
    return JSON.stringify([engine.nodeVisits, engine.choiceHistory, engine.variables, engine.graph.events]);
  };
  assert.throws(function () { engine.getView(); }, /has not started/);
  assert.deepEqual(engine.start(), {
    nodeId: "start",
    text: "The story begins.",
    segments: [{ text: "The story begins." }],
    choices: [
      { index: 0, id: "help", text: "Help" },
      { index: 1, id: "leave", text: "Leave" }
    ],
    ended: false
  });
  const beforeViews = snapshot();
  engine.getView();
  engine.getView();
  assert.equal(snapshot(), beforeViews);
  const view = engine.choose(0);
  assert.equal(view.nodeId, "merge");
  assert.equal(view.text, "You are remembered kindly.");
  assert.equal(engine.variables.helped, true);
  assert.equal(engine.choiceHistory.length, 1);
});

test("visible choice indexes exclude hidden choices and cannot select them", function () {
  const story = makeStory();
  story.nodes.start.choices.unshift({
    id: "hidden",
    text: "Hidden",
    showIf: { type: "association", a: "missing", b: "concept", min: 1 },
    goto: "end"
  });
  const engine = new NarrativeEngine(story);
  const view = engine.start();

  assert.equal(view.choices[0].id, "help");
  assert.throws(function () { engine.choose(2); }, /no visible choice/);
  assert.equal(engine.choose(0).nodeId, "merge");
});

test("non-ending nodes with no visible choices report a dynamic dead end", function () {
  const story = makeStory();
  story.nodes.start.choices = [
    { id: "go", text: "Continue", goto: "merge" }
  ];
  story.nodes.merge.choices[0].showIf = {
    type: "association",
    a: "player",
    b: "mercy",
    min: 1
  };
  const engine = new NarrativeEngine(story);
  engine.start();
  assert.throws(function () { engine.choose(0); }, /no visible choices/);
});

test("failed choice operation stops execution but keeps prior effects and history unchanged", function () {
  const story = makeStory();
  story.nodes.start.choices[0].do = [
    { type: "remember", concepts: ["player", "help"] },
    { type: "set", variable: "word", value: "yes" },
    { type: "inc", variable: "word" }
  ];
  const engine = new NarrativeEngine(story);

  engine.start();

  assert.throws(function () { engine.choose(0); }, /test_story.*start.*help.*operation 2.*must be numeric/);
  assert.equal(engine.graph.associationScore("player", "help"), 1);
  assert.equal(engine.choiceHistory.length, 0);
  assert.equal(engine.currentNodeId, "start");
});

test("conditions support nested logic and type-safe variable comparisons", function () {
  const story = makeStory();
  story.nodes.start.choices[1].showIf = {
    type: "all",
    conditions: [
      { type: "visited", node: "start" },
      { type: "not", condition: { type: "variable", name: "missing", operator: "eq", value: 1 } },
      { type: "not", condition: { type: "variable", name: "count", operator: "gte", value: 1 } }
    ]
  };
  story.nodes.start.onEnter.push({ type: "set", variable: "count", value: "1" });
  const engine = new NarrativeEngine(story);
  assert.equal(engine.start().choices.length, 2);
});

test("conditional text and routes use first match then fallback", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  const view = engine.choose(0);
  assert.equal(view.text, "You are remembered kindly.");
  assert.equal(engine.choose(0).nodeId, "kind_end");
  assert.equal(engine.getView().ended, true);
});

test("variable operations update state", function () {
  const story = makeStory();
  story.nodes.start.onEnter.push(
    { type: "set", variable: "trust", value: 2 },
    { type: "dec", variable: "trust", amount: 1 }
  );
  const engine = new NarrativeEngine(story);
  engine.start();

  assert.equal(engine.variables.trust, 1);
});

test("retired activation and transition rules are rejected", function () {
  const withOperation = makeStory();
  withOperation.nodes.start.onEnter.push({ type: "learnTransition", transitionType: "t", from: "a", to: "b" });
  assert.throws(function () { new NarrativeEngine(withOperation).start(); }, /unknown type 'learnTransition'/);
  const withCondition = makeStory();
  withCondition.nodes.merge.text[0].if = { type: "activation", starts: ["player"], contains: "mercy", min: 0.1 };
  assert.throws(function () { new NarrativeEngine(withCondition).start(); }, /unknown condition type 'activation'/);
});

test("macros execute and recursive macros fail validation", function () {
  const story = makeStory();
  story.macros.record = {
    do: [{ type: "remember", concepts: ["player", "help"] }]
  };
  story.nodes.start.choices[0].do = [{ type: "macro", name: "record" }];
  const engine = new NarrativeEngine(story);
  engine.start();
  engine.choose(0);
  assert.equal(engine.graph.associationScore("player", "help"), 1);

  const recursive = makeStory();
  recursive.macros.first = { do: [{ type: "macro", name: "second" }] };
  recursive.macros.second = { do: [{ type: "macro", name: "first" }] };
  recursive.nodes.start.choices[0].do = [{ type: "macro", name: "first" }];
  assert.throws(function () { new NarrativeEngine(recursive); }, /recursive action macro/);
});

test("condition macros and revisits use current history", function () {
  const story = makeStory();
  story.nodes.merge.choices.push({ id: "back", text: "Back", goto: "start" });
  story.macros.wasVisited = {
    condition: { type: "visited", node: "merge" }
  };
  story.nodes.start.choices[0].showIf = {
    type: "macroCondition",
    name: "wasVisited"
  };
  const engine = new NarrativeEngine(story);
  engine.start();
  assert.equal(engine.getView().choices.length, 1);
  engine.choose(0);
  assert.equal(engine.choose(1).choices.length, 2);
  assert.equal(engine.variables.entries, 2);
  assert.equal(engine.nodeVisits.filter(function (nodeId) {
    return nodeId === "start";
  }).length, 2);
});

test("reset keeps or clears memory", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  engine.choose(0);
  engine.reset({ keepMemory: true });
  assert.equal(engine.graph.events.length, 2);
  assert.equal(engine.currentNodeId, null);
  engine.start();
  engine.reset({ keepMemory: false });
  assert.equal(engine.graph.events.length, 0);
});

test("story validation rejects missing fallbacks and unreachable endings", function () {
  const missingTextFallback = makeStory();
  missingTextFallback.nodes.merge.text.pop();
  assert.throws(function () {
    new NarrativeEngine(missingTextFallback);
  }, /exactly one final fallback/);

  const missingRouteFallback = makeStory();
  missingRouteFallback.nodes.merge.choices[0].goto = [
    { if: { type: "always" }, node: "kind_end" }
  ];
  assert.throws(function () {
    new NarrativeEngine(missingRouteFallback);
  }, /exactly one final fallback route/);

  const unreachableEnd = makeStory();
  unreachableEnd.nodes.start.choices.forEach(function (choice) {
    choice.goto = "merge";
  });
  unreachableEnd.nodes.merge.choices[0].goto = "merge";
  assert.throws(function () {
    new NarrativeEngine(unreachableEnd);
  }, /no reachable explicitly marked ending/);
});
