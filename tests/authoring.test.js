"use strict";

// Authoring aids: lint warnings, text placeholders, non-player subjects,
// doubt, and branch coverage.

const assert = require("node:assert/strict");
const test = require("node:test");
require("../scripts/MemoryGraph.js");
const NarrativeEngine = require("../scripts/NarrativeEngine.js");
const StoryCheck = require("../scripts/StoryCheck.js");

// A deckhand is suspected of a theft; the player can accuse him or vouch for
// him, and Hale (the captain) can be talked out of believing the accusation.
function makeStory() {
  return {
    id: "ferry",
    title: "Ferry",
    start: "deck",
    characters: { hale: { name: "Captain Hale" }, jory: { name: "Jory" } },
    traits: {
      suspect: { label: "under suspicion", concepts: { suspected: 1, cleared: -1 } },
      honest: { concepts: { truth: 1, lie: -1 } }
    },
    nodes: {
      deck: {
        text: "{name:hale} counts the passengers. You have {var:coins} coins.",
        onEnter: [{ type: "set", variable: "coins", value: 3 }],
        choices: [
          {
            id: "accuse", text: "Tell {name:hale} that {name:jory} did it",
            do: [{ type: "remember", concepts: ["player", "lie", "jory", "suspected"], witnesses: ["hale"],
              summary: "told {name:hale} that Jory took it" }],
            goto: "hold"
          },
          {
            id: "seen", text: "Say you saw him near the luggage",
            do: [{ type: "remember", concepts: ["jory", "suspected", "luggage"], subject: "jory", witnesses: ["hale"],
              summary: "was seen near the luggage" }],
            goto: "hold"
          },
          {
            id: "alibi", text: "Say {name:jory} was with you all night",
            do: [{ type: "remember", concepts: ["player", "truth", "jory", "cleared"], witnesses: ["hale", "jory"],
              summary: "said Jory was with you all night" }],
            goto: "hold"
          }
        ]
      },
      hold: {
        text: [{
          value: [
            { if: { type: "trait", trait: "suspect", subject: "jory", perspective: "hale", min: 1 },
              text: "Hale has Jory locked in the hold.", else: "Jory is coiling rope." },
            { recall: { perspective: "hale", subject: "jory" }, format: "Hale remembers Jory {summary}." }
          ]
        }],
        choices: [
          {
            id: "vouch", text: "Convince Hale it was a mistake",
            do: [{ type: "doubt", to: ["hale"], about: { concepts: ["luggage"] } }],
            goto: [
              { if: { type: "knows", perspective: "hale", about: { concepts: ["suspected"] } }, node: "end" },
              { node: "cleared" }
            ]
          },
          { id: "leave", text: "Leave it", goto: "end" }
        ]
      },
      cleared: { text: "Jory is let out at dawn.", ending: true },
      end: { text: "The ferry docks.", ending: true }
    }
  };
}

test("placeholders insert character names and current variable values", function () {
  const engine = new NarrativeEngine(makeStory());
  const view = engine.start();
  assert.equal(view.text, "Captain Hale counts the passengers. You have 3 coins.");
  assert.equal(view.choices[0].text, "Tell Captain Hale that Jory did it");
  engine.choose(0);
  assert.equal(engine.recall({ perspective: "hale" }).summary, "told Captain Hale that Jory took it",
    "summaries are filled in when remembered");

  const unknown = makeStory();
  unknown.nodes.deck.text = "{name:ghost} waves.";
  assert.throws(function () { new NarrativeEngine(unknown); }, /unknown character 'ghost'/);
  const unset = makeStory();
  unset.nodes.deck.text = "You have {var:gold} gold.";
  assert.throws(function () { new NarrativeEngine(unset).start(); }, /\{var:gold\} before the variable is set/);
});

test("non-player subjects get reputations, recalls, and explanations in their own words", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  const view = engine.choose(1);
  assert.equal(engine.traitScore("suspect", "hale", "jory"), 1);
  assert.equal(view.text, "Hale has Jory locked in the hold. Hale remembers Jory was seen near the luggage.");
  assert.deepEqual(view.segments[0].cause.explanation, [{
    heading: "Captain Hale sees Jory as under suspicion, because:",
    items: ["Jory was seen near the luggage"]
  }]);
  assert.equal(view.segments[1].cause.explanation[0].heading, "Captain Hale remembers that Jory:");
  assert.equal(engine.recall({ perspective: "hale" }), null, "the player is not the subject of Jory's act");
  assert.equal(view.echo, undefined, "nothing about the player was remembered");

  const accused = new NarrativeEngine(makeStory());
  accused.start();
  const hold = accused.choose(0);
  assert.deepEqual(hold.segments[0].cause.explanation[0], {
    heading: "Captain Hale sees Jory as under suspicion, because you:",
    items: ["told Captain Hale that Jory took it"]
  });
  assert.throws(function () {
    const story = makeStory();
    story.nodes.deck.choices[1].do[0].subject = "mira";
    return new NarrativeEngine(story);
  }, /subject 'mira' must be one of its concepts/);
});

test("doubt lowers or removes what a character believes", function () {
  const engine = new NarrativeEngine(makeStory());
  engine.start();
  engine.choose(1);
  assert.equal(engine.traitScore("suspect", "hale", "jory"), 1);
  const view = engine.choose(0);
  assert.equal(view.nodeId, "cleared", "Hale no longer knows of the sighting");
  assert.equal(engine.traitScore("suspect", "hale", "jory"), 0);
  assert.deepEqual(engine.knowledge.hale, {});
  assert.equal(engine.traitScore("suspect", undefined, "jory"), 1, "the world still remembers");

  const partial = makeStory();
  partial.nodes.hold.choices[0].do[0].belief = 0.25;
  const halfway = new NarrativeEngine(partial);
  halfway.start();
  halfway.choose(1);
  assert.equal(halfway.choose(0).nodeId, "end", "a doubted event is still known, just weakly");
  assert.equal(halfway.traitScore("suspect", "hale", "jory"), 0.25);

  const invalid = makeStory();
  invalid.nodes.hold.choices[0].do[0].belief = 1;
  assert.throws(function () { new NarrativeEngine(invalid); }, /\[0, 1\)/);
  delete invalid.nodes.hold.choices[0].do[0].belief;
  delete invalid.nodes.hold.choices[0].do[0].about;
  assert.throws(function () { new NarrativeEngine(invalid); }, /about must define exactly one/);
});

test("lint reports likely authoring mistakes without rejecting the story", function () {
  assert.deepEqual(new NarrativeEngine(makeStory()).lint(), []);

  const story = makeStory();
  story.characters.ghost = { name: "Ghost" };
  story.traits.honest.concepts.admit = 1;
  story.traits.brave = { concepts: { courage: 1 } };
  story.macros = { unused: { condition: { type: "always" } } };
  story.nodes.hold.text[0].value.push(
    { if: { type: "knows", perspective: "hale", about: { concepts: ["luggge"] } }, text: "Typo." },
    { if: { type: "variable", name: "tide", operator: "eq", value: 1 }, text: "{summary} and {nmae:hale}" }
  );
  story.nodes.deck.choices[0].do.push(
    { type: "remember", concepts: ["player", "truth"] },
    { type: "remember", concepts: ["player", "truth", "hale"], summary: "You told the truth." },
    { type: "remember", concepts: ["storm", "deck"], summary: "broke over the deck" }
  );
  const messages = new NarrativeEngine(story).lint().map(function (warning) {
    return warning.location + ": " + warning.message;
  });
  const expected = [
    /trait 'honest': concept 'admit' is never remembered/,
    /trait 'brave': none of its concepts is ever remembered/,
    /choice 'accuse' do operation 1: this act counts toward a trait but has no summary/,
    /choice 'accuse' do operation 2: summaries already complete "you …"/,
    /choice 'accuse' do operation 2: summaries are used mid-sentence/,
    /choice 'accuse' do operation 3: summary has no subject/,
    /character 'ghost': never witnesses or hears about anything/,
    /part 2: concept 'luggge' is never remembered, so this condition is never true/,
    /part 3: \{summary\} only works in a recall part's format/,
    /part 3: '\{nmae:hale\}' is not a placeholder/,
    /part 3: variable 'tide' is never set/,
    /macro 'unused': is never used/
  ];
  for (const pattern of expected) {
    assert.ok(messages.some(function (message) { return pattern.test(message); }),
      "missing warning " + pattern + " in:\n" + messages.join("\n"));
  }
  assert.equal(messages.length, expected.length, messages.join("\n"));
});

test("StoryCheck reports endings, unreached nodes, missed branches, and failures", function () {
  const result = StoryCheck.check(makeStory(), { runs: 50 });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.unvisitedNodes, []);
  assert.ok(result.endings.cleared > 0 && result.endings.end > 0);
  assert.deepEqual(result.missedBranches, [], "every branch fires in some run");
  assert.ok(new NarrativeEngine(makeStory()).branches().indexOf("node 'hold' choice 'vouch' goto 1") !== -1);

  const broken = makeStory();
  broken.nodes.hold.text[0].value.push({ if: { type: "visited", node: "cleared" }, text: "Never shown." });
  broken.nodes.hold.choices[1].goto = "hold";
  broken.nodes.hold.choices[1].text = "Wait for {var:tide}";
  const report = StoryCheck.check(broken, { runs: 20 });
  assert.ok(report.missedBranches.indexOf("node 'hold' text variant 0 part 2 (text)") !== -1);
  assert.match(report.errors[0].message, /\{var:tide\} before the variable is set/);
});
