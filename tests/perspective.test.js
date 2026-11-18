"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
require("../scripts/core/MemoryGraph.js");
const NarrativeEngine = require("../scripts/core/NarrativeEngine.js");

// A small village: the player lies in front of Mira, then may confess or
// keep a promise in front of Tomas. Mira can later gossip to Tomas.
function makeStory(overrides) {
  const story = {
    id: "perspective_story",
    title: "Perspective Story",
    start: "market",
    characters: {
      mira: { name: "Mira" },
      tomas: { name: "Tomas" },
      reeve: {}
    },
    traits: {
      untrustworthy: { label: "a liar", concepts: { lie: 1, steal: 1, kept_promise: -1 } },
      kind: { concepts: { help: 1, mercy: 0.5 } }
    },
    nodes: {
      market: {
        text: "The market.",
        choices: [
          {
            id: "lie",
            text: "Lie to Mira",
            do: [{
              type: "remember",
              concepts: ["player", "lie", "mira"],
              witnesses: ["mira"],
              summary: "lied to her about the flour"
            }],
            goto: "river"
          },
          {
            id: "help",
            text: "Help Mira",
            do: [{
              type: "remember",
              concepts: ["player", "help", "mira"],
              witnesses: "all",
              summary: "carried her flour"
            }],
            goto: "river"
          }
        ]
      },
      river: {
        text: [{
          value: [
            "Tomas looks up.",
            {
              if: { type: "trait", trait: "untrustworthy", perspective: "tomas", min: 0.5 },
              text: "'Mira warned me about you.'",
              else: "'Sit down.'"
            },
            {
              recall: { perspective: "tomas", about: { trait: "untrustworthy" } },
              format: "'You {summary}.'"
            }
          ]
        }],
        choices: [
          {
            id: "gossip",
            text: "Wait while Mira talks to Tomas",
            do: [{ type: "gossip", from: "mira", to: ["tomas"], about: { trait: "untrustworthy" } }],
            goto: "river"
          },
          {
            id: "promise",
            text: "Keep your promise",
            do: [{
              type: "remember",
              concepts: ["player", "kept_promise", "tomas"],
              strength: 2,
              witnesses: ["tomas"],
              summary: "kept your word"
            }],
            goto: "river"
          },
          {
            id: "confess",
            text: "Confess to the reeve",
            do: [{ type: "reveal", to: ["reeve"], about: { concepts: ["lie"] } }],
            goto: "end"
          }
        ]
      },
      end: { text: "End.", ending: true, choices: [] }
    }
  };
  return Object.assign(story, overrides || {});
}

test("witnesses only learn the events they saw, and gossip passes them on at reduced belief", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  let view = engine.choose(0);

  assert.equal(engine.traitScore("untrustworthy", "mira"), 1);
  assert.equal(engine.traitScore("untrustworthy", "tomas"), 0);
  assert.equal(engine.traitScore("untrustworthy"), 1, "the world view sees everything");
  assert.equal(view.text, "Tomas looks up. 'Sit down.'");

  view = engine.choose(0);
  assert.equal(engine.traitScore("untrustworthy", "tomas"), 0.5);
  assert.equal(view.text,
    "Tomas looks up. 'Mira warned me about you.' 'You lied to her about the flour.'");
});

test("negative trait weights let later deeds outweigh earlier ones", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  engine.choose(0);
  engine.choose(0);
  const view = engine.choose(1);

  assert.equal(engine.traitScore("untrustworthy", "tomas"), 0.5 - 2);
  assert.equal(view.text, "Tomas looks up. 'Sit down.' 'You lied to her about the flour.'",
    "recall still finds the lie, but the trait condition no longer holds");
});

test("'all' witnesses, reveal, knows, and dominantTrait", function () {
  const story = makeStory();
  story.nodes.river.choices.push({
    id: "check",
    text: "Check",
    showIf: {
      type: "all",
      conditions: [
        { type: "knows", perspective: "reeve", about: { concepts: ["lie"] } },
        { type: "dominantTrait", among: ["untrustworthy", "kind"], is: "untrustworthy", perspective: "reeve" }
      ]
    },
    goto: "end"
  });
  const engine = new NarrativeEngine(story);
  engine.start();
  engine.choose(1);
  assert.equal(engine.traitScore("kind", "reeve"), 1);
  assert.equal(engine.traitScore("kind", "tomas"), 1);
  assert.deepEqual(engine.getView().choices.map(function (c) { return c.id; }),
    ["gossip", "promise", "confess"]);

  const reveal = new NarrativeEngine(story);
  reveal.start();
  reveal.choose(0);
  reveal.apply([{ type: "reveal", to: ["reeve"], about: { concepts: ["lie"] } }]);
  assert.equal(reveal.getView().choices.length, 4);
});

test("perspective association conditions use a character's memory", function () {
  const story = makeStory();
  story.nodes.end.text = [
    { if: { type: "association", a: "player", b: "lie", min: 1, perspective: "tomas" }, value: "Tomas knows." },
    { if: { type: "association", a: "player", b: "lie", min: 1, perspective: "mira" }, value: "Mira knows." },
    { value: "Nobody knows." }
  ];
  const engine = new NarrativeEngine(story);
  engine.start();
  engine.choose(0);
  assert.equal(engine.linkWeight("player", "lie", "mira"), 1);
  assert.equal(engine.linkWeight("player", "lie", "tomas"), 0);
  assert.equal(engine.choose(2).text, "Mira knows.");
});

test("memory.halfLife fades older events in perspectives but not the raw graph", function () {
  const engine = new NarrativeEngine(makeStory({ memory: { halfLife: 1 } }));
  const graph = engine.graph;
  engine.start();
  engine.choose(0);
  assert.equal(engine.traitScore("untrustworthy", "mira"), 1);
  graph.remember({ concepts: ["rain"] });
  assert.equal(engine.traitScore("untrustworthy", "mira"), 0.5);
  assert.equal(graph.associationScore("player", "lie"), 1);
});

test("knowledge survives keepMemory resets, and clears on a full reset", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  engine.choose(0);
  assert.deepEqual(engine.knowledge, { mira: { "event-1": 1 } });
  engine.reset({ keepMemory: true });
  assert.equal(engine.traitScore("untrustworthy", "mira"), 1);
  engine.reset();
  assert.deepEqual(engine.knowledge, {});
});

test("reputationOf summarizes a character's view of the player", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  engine.choose(1);
  assert.deepEqual(engine.knownCharacters().map(function (id) { return engine.reputationOf(id).name; }),
    ["Mira", "Tomas", "reeve"]);
  const mira = engine.reputationOf("mira");
  assert.deepEqual(mira.traits.map(function (t) { return t.label; }), ["kind"]);
  assert.equal(mira.memory, "carried her flour");
});

test("memory-driven text segments explain which remembered acts caused them", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  engine.choose(0);
  const view = engine.choose(0);

  assert.equal(view.segments.map(function (s) { return s.text; }).join(""), view.text);
  assert.equal(view.segments[0].cause, undefined, "unconditional text has no cause");
  assert.deepEqual(view.segments[1].cause, {
    tag: "Tomas: a liar",
    kind: "trait",
    trait: "untrustworthy",
    color: null,
    explanation: [{
      heading: "Tomas sees you as a liar, because you:",
      items: ["lied to her about the flour (heard secondhand)"]
    }]
  });
  assert.equal(view.segments[2].cause.tag, "Tomas remembers");
  assert.deepEqual(view.segments[2].cause.explanation[0].items,
    ["lied to her about the flour (heard secondhand)"]);
});

test("author tags, macro tags, choice causes, and arrival causes", function () {
  const story = makeStory();
  story.macros = {
    miraDistrusts: { tag: "suspicion", condition: { type: "trait", trait: "untrustworthy", perspective: "mira", min: 1 } }
  };
  story.traits.untrustworthy.color = "#aa3322";
  story.nodes.river.choices.push({
    id: "glare", text: "Meet Mira's glare", tag: "Mira's grudge",
    showIf: { type: "macroCondition", name: "miraDistrusts" },
    goto: [{ if: { type: "macroCondition", name: "miraDistrusts" }, node: "end" }, { node: "river" }]
  });
  story.nodes.end.text = [
    { if: { type: "variable", name: "missing", operator: "eq", value: 1 }, value: "Never." },
    { if: { type: "macroCondition", name: "miraDistrusts" }, value: "Mira won't look at you." },
    { value: "End." }
  ];
  const engine = new NarrativeEngine(story);
  engine.start();
  const river = engine.choose(0);
  const glare = river.choices.find(function (c) { return c.id === "glare"; });
  assert.equal(glare.cause.tag, "Mira's grudge");
  assert.equal(glare.cause.color, "#aa3322");
  assert.equal(river.choices[0].cause, undefined);

  const end = engine.choose(glare.index);
  assert.equal(end.arrival.tag, "suspicion");
  assert.equal(end.segments[0].cause.tag, "suspicion");
  assert.deepEqual(end.segments[0].cause.explanation[0].items, ["lied to her about the flour"]);
  engine.reset();
  assert.equal(engine.start().arrival, undefined);
});

test("after a choice, the next view echoes its trait pushes and visible witnesses", function () {
  const story = makeStory();
  story.characters.reeve.hidden = true;
  story.nodes.market.choices[1].do[0].witnesses = ["mira", "reeve"];
  const engine = new NarrativeEngine(story);
  assert.equal(engine.start().echo, undefined);

  const helped = engine.choose(1);
  assert.deepEqual(helped.echo, {
    tag: "↑ kind · Mira saw",
    kind: "echo",
    trait: "kind",
    color: null,
    explanation: [
      { heading: "Remembered as:", items: ["you carried her flour."] },
      { heading: "Seen by:", items: ["Mira"] },
      { heading: "Pushes how you're seen:", items: ["↑ kind"] }
    ]
  }, "the hidden reeve is never named");

  const promised = engine.choose(1);
  assert.equal(promised.echo.tag, "↓ a liar · Tomas saw", "negative weights push away");
  const gossip = engine.choose(0);
  assert.equal(gossip.echo, undefined, "choices that remember nothing about the player have no echo");
});

test("reputationOf and knownCharacters support live displays", function () {
  const story = makeStory();
  story.characters.reeve.hidden = true;
  const engine = new NarrativeEngine(story);
  engine.start();
  engine.choose(1);
  engine.choose(1);
  assert.deepEqual(engine.knownCharacters(), ["mira", "tomas"]);
  assert.deepEqual(engine.knownCharacters({ includeHidden: true }), ["mira", "tomas", "reeve"]);
  const tomas = engine.reputationOf("tomas");
  assert.deepEqual(tomas.traits.map(function (t) { return [t.trait, t.score]; }),
    [["untrustworthy", -2], ["kind", 1]]);
  assert.equal(tomas.name, "Tomas");
  assert.equal(engine.reputationOf().name, null);
});

test("validation rejects unknown characters, traits, and malformed parts", function () {
  function broken(mutate) {
    const story = makeStory();
    mutate(story);
    return function () { new NarrativeEngine(story); };
  }
  assert.throws(broken(function (s) {
    s.nodes.market.choices[0].do[0].witnesses = ["ghost"];
  }), /unknown character 'ghost'/);
  assert.throws(broken(function (s) {
    s.nodes.river.text[0].value[1].if.trait = "brave";
  }), /unknown trait 'brave'/);
  assert.throws(broken(function (s) {
    s.nodes.river.text[0].value.push({ text: "a", recall: {} });
  }), /exactly one of text or recall/);
  assert.throws(broken(function (s) {
    s.traits.kind.concepts.help = 0;
  }), /non-zero/);
  assert.throws(broken(function (s) {
    s.nodes.river.choices[0].do[0].belief = 2;
  }), /\(0, 1\]/);
  assert.throws(broken(function (s) {
    s.characters.all = {};
  }), /reserved/);
});
