"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const MemoryGraph = require("../scripts/MemoryGraph.js");
const NarrativeEngine = require("../scripts/NarrativeEngine.js");

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
              { type: "learnTransition", transitionType: "choice", from: "start", to: "help" }
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
                if: { type: "transition", transitionType: "choice", from: "start", to: "help", min: 1 },
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
  const graph = new MemoryGraph();
  const engine = new NarrativeEngine(makeStory(), {
    graph: graph,
    initialVariables: { entries: 0 }
  });
  assert.throws(function () { engine.getView(); }, /has not started/);
  assert.deepEqual(engine.start(), {
    nodeId: "start",
    text: "The story begins.",
    choices: [
      { index: 0, id: "help", text: "Help" },
      { index: 1, id: "leave", text: "Leave" }
    ],
    ended: false
  });
  const stateBeforeViews = engine.toJSON();
  const memoryBeforeViews = graph.toJSON();
  engine.getView();
  engine.getView();
  assert.deepEqual(engine.toJSON(), stateBeforeViews);
  assert.deepEqual(graph.toJSON(), memoryBeforeViews);
  const view = engine.choose(0);
  assert.equal(view.nodeId, "merge");
  assert.equal(view.text, "You are remembered kindly.");
  assert.equal(graph.transitionCount("choice", "start", "help"), 1);
  assert.equal(engine.toJSON().choiceHistory.length, 1);
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
    { type: "fail" }
  ];
  const engine = new NarrativeEngine(story, {
    operationHandlers: {
      fail: function () {
        throw new Error("intentional failure");
      }
    }
  });

  engine.start();

  assert.throws(function () { engine.choose(0); }, /test_story.*start.*help.*operation 1.*intentional failure/);
  assert.equal(engine.graph.associationScore("player", "help"), 1);
  assert.equal(engine.toJSON().choiceHistory.length, 0);
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
  const engine = new NarrativeEngine(story, {
    initialVariables: { count: "1" }
  });
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

test("activation and variable operations update serializable state", function () {
  const story = makeStory();
  story.nodes.start.onEnter.push(
    { type: "activate", starts: ["place"], storeAs: "thoughts", options: { depth: 1 } },
    { type: "set", variable: "trust", value: 2 },
    { type: "dec", variable: "trust", amount: 1 }
  );
  const engine = new NarrativeEngine(story);
  engine.start();

  assert.equal(engine.variables.trust, 1);
  assert.equal(engine.variables.thoughts[0].concept, "place");
  assert.equal(engine.toJSON().variables.trust, 1);
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

test("condition macros, revisits, and explicit navigation use current history", function () {
  const story = makeStory();
  story.macros.wasVisited = {
    condition: { type: "visited", node: "merge" }
  };
  story.nodes.start.choices[0].showIf = {
    type: "macroCondition",
    name: "wasVisited"
  };
  const engine = new NarrativeEngine(story, {
    initialVariables: { entries: 0 }
  });
  engine.start();
  assert.equal(engine.getView().choices.length, 1);
  engine.goTo("merge");
  assert.equal(engine.getView().choices[0].id, "finish");
  engine.goTo("start");
  assert.equal(engine.variables.entries, 2);
  assert.equal(engine.nodeVisits.filter(function (nodeId) {
    return nodeId === "start";
  }).length, 2);
});

test("runtime state restores independently from graph and reset controls memory", function () {
  const story = makeStory();
  const graph = new MemoryGraph();
  const engine = new NarrativeEngine(story, { graph: graph });
  engine.start();
  engine.choose(0);
  const savedEngine = JSON.parse(JSON.stringify(engine.toJSON()));
  const savedGraph = JSON.parse(JSON.stringify(graph.toJSON()));
  const restoredGraph = MemoryGraph.fromJSON(savedGraph);
  const restoredEngine = new NarrativeEngine(story, { graph: restoredGraph });
  assert.equal(restoredEngine.loadState(savedEngine).nodeId, "merge");
  assert.deepEqual(restoredEngine.toJSON(), savedEngine);

  restoredEngine.reset({ keepMemory: true });
  assert.equal(restoredEngine.graph.events.length, 2);
  restoredEngine.start();
  restoredEngine.reset({ keepMemory: false });
  assert.equal(restoredEngine.graph.events.length, 0);
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

test("registered custom operation and condition handlers are available to stories", function () {
  const story = makeStory();
  story.nodes.start.onEnter = [{ type: "customSet", value: 3 }];
  story.nodes.start.choices[0].showIf = { type: "customCheck", minimum: 3 };
  const engine = new NarrativeEngine(story, {
    operationHandlers: {
      customSet: function (operation, context) {
        context.setVariable("custom", operation.value);
      }
    },
    conditionHandlers: {
      customCheck: function (condition, context) {
        return context.variables.custom >= condition.minimum;
      }
    }
  });

  assert.equal(engine.start().choices[0].id, "help");
  assert.equal(engine.variables.custom, 3);
});

test("custom handlers can be registered after construction but before start", function () {
  const story = makeStory();
  story.nodes.start.onEnter = [{ type: "customSet", value: 4 }];
  const engine = new NarrativeEngine(story);
  engine.operations.register("customSet", function (operation, context) {
    context.setVariable("value", operation.value);
  });

  assert.equal(engine.start().nodeId, "start");
  assert.equal(engine.variables.value, 4);
});
