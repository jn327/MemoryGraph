"use strict";

// The story text format (scripts/StoryText.js): what each piece of syntax
// becomes, and the errors writers see when something is wrong.

const assert = require("node:assert/strict");
const test = require("node:test");
const StoryText = require("../scripts/StoryText.js");
global.MemoryGraph = require("../scripts/MemoryGraph.js");
const NarrativeEngine = require("../scripts/NarrativeEngine.js");

function parse(lines, fileName) {
  return StoryText.parse(lines.join("\n"), { fileName: fileName || "test_story.txt" });
}

const HEADER = [
  "title: The Test",
  "synopsis: A story",
  "  over two lines.",
  "half-life: 12",
  "",
  "== characters",
  "hale: Captain Hale",
  "  Runs the ferry,",
  "  strictly.",
  "grey: the man in the grey coat (hidden)",
  "",
  "== traits",
  "honest: truth, admit +1.5, lie -1",
  "thief (a thief) #9b2c4a: steal",
  "",
  "== macros",
  "trusted: hale sees you as more honest than thief by 0.5 # Hale trusts you",
  "rememberHelp:",
  "  ~ remember help"
];

test("the header, characters, traits and macros become story fields", function () {
  const { story } = parse(HEADER.concat(["=== start (ending)", "The end."]));
  assert.equal(story.id, "test_story", "the id defaults to the file name");
  assert.equal(story.title, "The Test");
  assert.equal(story.synopsis, "A story over two lines.");
  assert.equal(story.start, "start", "start defaults to the first scene");
  assert.deepEqual(story.memory, { halfLife: 12 });
  assert.deepEqual(story.characters, {
    hale: { name: "Captain Hale", description: "Runs the ferry, strictly." },
    grey: { name: "the man in the grey coat", hidden: true }
  });
  assert.deepEqual(story.traits, {
    honest: { concepts: { truth: 1, admit: 1.5, lie: -1 } },
    thief: { label: "a thief", color: "#9b2c4a", concepts: { steal: 1 } }
  });
  assert.deepEqual(story.macros.trusted, {
    condition: { type: "dominantTrait", among: ["honest", "thief"], is: "honest", perspective: "hale", margin: 0.5 },
    tag: "Hale trusts you"
  });
  assert.deepEqual(story.macros.rememberHelp, { do: [{ type: "remember", concepts: ["player", "help"] }] });
});

test("conditions read as plain words", function () {
  const conditions = {
    "always": { type: "always" },
    "visited start": { type: "visited", node: "start" },
    "coins >= 2": { type: "variable", name: "coins", operator: "gte", value: 2 },
    "mood == \"calm\"": { type: "variable", name: "mood", operator: "eq", value: "calm" },
    "promised != true": { type: "variable", name: "promised", operator: "neq", value: true },
    "player with grey >= 1": { type: "association", a: "player", b: "grey", min: 1 },
    "player with lie >= 1 for hale": { type: "association", a: "player", b: "lie", min: 1, perspective: "hale" },
    "hale knows lie, grey": { type: "knows", perspective: "hale", about: { concepts: ["lie", "grey"] } },
    "hale knows trait thief (belief 0.5)": { type: "knows", perspective: "hale", about: { trait: "thief" }, min: 0.5 },
    "hale sees you as honest >= 1": { type: "trait", trait: "honest", perspective: "hale", min: 1 },
    "world sees grey as thief >= 0.5 <= 2": { type: "trait", trait: "thief", subject: "grey", min: 0.5, max: 2 },
    "trusted": { type: "macroCondition", name: "trusted" },
    "not trusted and coins > 1 or visited start": { type: "any", conditions: [
      { type: "all", conditions: [
        { type: "not", condition: { type: "macroCondition", name: "trusted" } },
        { type: "variable", name: "coins", operator: "gt", value: 1 }
      ] },
      { type: "visited", node: "start" }
    ] },
    "not (trusted or always)": { type: "not", condition: { type: "any", conditions: [
      { type: "macroCondition", name: "trusted" }, { type: "always" }
    ] } }
  };
  for (const [text, expected] of Object.entries(conditions)) {
    const { story } = parse(HEADER.concat(["=== start", "Hi.", "* {" + text + "} Go -> start", "* Stay -> start"]));
    assert.deepEqual(story.nodes.start.choices[0].showIf, expected, text);
  }
});

test("scene text becomes a string, parts, or alternatives", function () {
  const { story, lines } = parse(HEADER.concat([
    "=== plain",
    "One line",
    "joined to the next.",
    "",
    "A new paragraph about {hale} with {coins} coins and *feeling*.",
    "* Next -> parts",
    "",
    "=== parts",
    "Opening.",
    "{hale knows lie: She frowns. | She smiles. # Hale remembers}",
    "{recall hale among honest, thief rank 2: She remembers you {summary}. | Nothing.}",
    "",
    "{recall hale about lie if trusted: You {summary}.}",
    "* Next -> alternatives",
    "",
    "=== alternatives",
    "{",
    "- trusted: # trust",
    "She waves you through.",
    "- else:",
    "She checks again.",
    "{hale knows lie: Twice.}",
    "}",
    "* Done -> plain"
  ]));
  assert.equal(story.nodes.plain.text,
    "One line joined to the next.\n\nA new paragraph about {name:hale} with {var:coins} coins and *feeling*.");
  assert.deepEqual(story.nodes.parts.text, [{ value: [
    "Opening.",
    { if: { type: "knows", perspective: "hale", about: { concepts: ["lie"] } }, text: "She frowns.", else: "She smiles.", tag: "Hale remembers" },
    { recall: { perspective: "hale", among: ["honest", "thief"], rank: 2 }, format: "She remembers you {summary}.", otherwise: "Nothing." },
    "\n\n",
    { if: { type: "macroCondition", name: "trusted" }, recall: { perspective: "hale", about: { concepts: ["lie"] } }, format: "You {summary}." }
  ] }]);
  assert.deepEqual(story.nodes.alternatives.text, [
    { if: { type: "macroCondition", name: "trusted" }, tag: "trust", value: "She waves you through." },
    { value: ["She checks again.", { if: { type: "knows", perspective: "hale", about: { concepts: ["lie"] } }, text: "Twice." }] }
  ]);
  assert.equal(lines["node 'parts' text variant 0 part 2"], 30, "parts know their line numbers");
});

test("choices, routes and actions", function () {
  const { story } = parse(HEADER.concat([
    "=== deck",
    "present: hale, grey",
    "~ coins = 3",
    "Aboard.",
    "* (pay) {coins >= 1 # can pay} Pay {hale} a coin",
    "  ~ coins -= 1",
    "  ~ remember help, hale \"paid {hale} her fare\"",
    "  -> deck",
    "* Accuse the man in the grey coat",
    "  ~ remember accuse, lie, grey (seen by hale) (strength 2)",
    "      \"told {hale} he took it\"",
    "    and grey: suspected \"was accused of taking it\"",
    "  ~ remember world: brooch, missing (seen by no one)",
    "  ~ gossip hale to grey about trait thief (belief 0.8)",
    "  ~ reveal to everyone about brooch",
    "  ~ doubt hale about grey, suspected (belief 0.25)",
    "  ~ describe grey: The man who was accused.",
    "  ~ do rememberHelp",
    "  ~ coins += 2",
    "  -> end if coins > 2 # rich",
    "  -> deck",
    "* Accuse the man in the grey coat -> end",
    "=== end (ending)",
    "Done."
  ]));
  const deck = story.nodes.deck;
  assert.deepEqual(deck.present, ["hale", "grey"]);
  assert.deepEqual(deck.onEnter, [{ type: "set", variable: "coins", value: 3 }]);
  assert.deepEqual(deck.choices[0], {
    id: "pay",
    text: "Pay {name:hale} a coin",
    showIf: { type: "variable", name: "coins", operator: "gte", value: 1 },
    tag: "can pay",
    do: [
      { type: "dec", variable: "coins" },
      { type: "remember", concepts: ["player", "help", "hale"], witnesses: ["hale", "grey"], summary: "paid {name:hale} her fare" }
    ],
    goto: "deck"
  }, "a remember without (seen by …) is seen by everyone present");
  assert.equal(deck.choices[1].id, "accuse_the_man_in_the", "ids come from the first words");
  assert.equal(deck.choices[2].id, "accuse_the_man_in_the_2", "and stay unique");
  assert.deepEqual(deck.choices[1].do, [
    { type: "remember", concepts: ["player", "accuse", "lie", "grey"], witnesses: ["hale"], strength: 2, summary: "told {name:hale} he took it" },
    { type: "remember", concepts: ["grey", "suspected"], witnesses: ["hale"], subject: "grey", summary: "was accused of taking it" },
    { type: "remember", concepts: ["brooch", "missing"] },
    { type: "gossip", from: "hale", to: ["grey"], about: { trait: "thief" }, belief: 0.8 },
    { type: "reveal", to: "all", about: { concepts: ["brooch"] } },
    { type: "doubt", to: ["hale"], about: { concepts: ["grey", "suspected"] }, belief: 0.25 },
    { type: "describe", character: "grey", description: "The man who was accused." },
    { type: "macro", name: "rememberHelp" },
    { type: "inc", variable: "coins", amount: 2 }
  ], "an 'and' line shares the witnesses of the remember above it");
  assert.deepEqual(deck.choices[1].goto, [
    { if: { type: "variable", name: "coins", operator: "gt", value: 2 }, node: "end", tag: "rich" },
    { node: "deck" }
  ]);
  assert.equal(story.nodes.end.ending, true);
});

test("comments are ignored and TODO notes are collected", function () {
  const { story, todos } = parse([
    "// A note at the top",
    "title: Notes",
    "=== start (ending)",
    "// TODO: make this scarier",
    "It is dark.",
    "  // todo check the ending"
  ]);
  assert.equal(story.nodes.start.text, "It is dark.");
  assert.deepEqual(todos, [{ line: 4, text: "make this scarier" }, { line: 6, text: "check the ending" }]);
});

test("mistakes are reported with the line and a suggestion", function () {
  const story = function (body) {
    return HEADER.concat(["=== start", "Hello."]).concat(body).concat(["=== end (ending)", "Bye."]);
  };
  const cases = [
    [story(["* Go -> edn"]), /^line 22: there is no scene called 'edn' \(did you mean 'end'\?\)\.$/],
    [story(["* {hlae knows lie} Go -> end"]), /line 22: .*'hlae' isn't a macro \(did you mean 'hale'\?\)|no character called 'hlae'/],
    [story(["* {trustd} Go -> end"]), /^line 22: 'trustd' isn't a macro \(did you mean 'trusted'\?\)/],
    [story(["* Go", "  ~ remember help (seen by hael)", "  -> end"]), /^line 23: there is no character called 'hael' \(did you mean 'hale'\?\)\.$/],
    [story(["* Go"]), /^line 22: this choice doesn't say where it goes/],
    [story(["* Go -> end", "More text."]), /^line 23: this line comes after the scene's choices/],
    [story(["* Go", "  ~ rmember help", "  -> end"]), /^line 23: 'rmember' isn't an action \(did you mean 'remember'\?\)/],
    [story(["* {coins = 1} Go -> end"]), /^line 22: '=' isn't understood here \(to compare, use ==\)\./],
    [HEADER.concat(["=== start", "Hi {name:hale}.", "* Go -> start"]), /^line 21: write \{hale\} instead of \{name:hale\}\.$/],
    [HEADER.concat(["=== start", "{", "- trusted:", "Yes.", "}", "* Go -> start"]), /^line 22: the last alternative in a \{ block must be '- else:'/],
    [HEADER.concat(["=== start", "Hello.", "{", "- else:", "Yes.", "}", "* Go -> start"]), /^line 22: a \{ … \} block of alternatives must be the scene's whole text/],
    [HEADER.concat(["=== start", "Hello."]), /^line 20: scene 'start' has no choices/],
    [["synopsis: none", "=== a (ending)", "x"], /^line 1: the story needs a title/],
    [HEADER.concat(["== charaters"]), /^line 20: unknown section '== charaters'.*did you mean == characters\?/]
  ];
  for (const [lines, expected] of cases) {
    assert.throws(function () { parse(lines); }, function (error) {
      assert.ok(error instanceof StoryText.StoryTextError, String(error));
      assert.match(error.message, expected);
      return true;
    }, lines.slice(HEADER.length).join(" / "));
  }
});

test("lineFor maps engine locations back to source lines", function () {
  const { lines } = parse(HEADER.concat(["=== start", "Hi.", "* Go", "  ~ remember help", "  -> start"]));
  assert.equal(StoryText.lineFor(lines, "node 'start' choice 'go' do operation 0: summary has no subject"), 23);
  assert.equal(StoryText.lineFor(lines, "Story 'x': node 'start' text"), 20);
  assert.equal(StoryText.lineFor(lines, "trait 'thief'"), 14);
  assert.equal(StoryText.lineFor(lines, "somewhere else"), null);
});

test("the engine shows who is present, applies describe, and joins punctuation", function () {
  const { story } = parse(HEADER.concat([
    "=== start",
    "present: hale",
    "Hale looks up{trusted: , smiling}.",
    "* Go",
    "  ~ describe hale: The captain, now your friend.",
    "  -> start",
    "* Leave -> end",
    "=== end (ending)",
    "Bye."
  ]));
  const engine = new NarrativeEngine(story);
  const view = engine.start();
  assert.deepEqual(view.present, [{ id: "hale", name: "Captain Hale", description: "Runs the ferry, strictly." }]);
  assert.equal(view.text, "Hale looks up.", "no space before closing punctuation");
  const next = engine.choose(0);
  assert.equal(next.present[0].description, "The captain, now your friend.");
  const saved = engine.toJSON();
  const restored = new NarrativeEngine(story, { graph: engine.graph });
  restored.loadState(saved);
  assert.equal(restored.characterDescription("hale"), "The captain, now your friend.", "descriptions are saved");
  engine.reset();
  assert.equal(engine.characterDescription("hale"), "Runs the ferry, strictly.", "and reset with the run");
});

test("apply runs operations before a run, and lint suggests a concept for typos", function () {
  const { story } = parse(HEADER.concat([
    "=== start",
    "Hale waits. {hale knows lei: She frowns.}",
    "* Lie",
    "  ~ remember lie (seen by hale) \"lied to her\"",
    "  -> start",
    "* Leave -> end",
    "=== end (ending)",
    "Bye."
  ]));
  const engine = new NarrativeEngine(story);
  engine.apply([{ type: "remember", concepts: ["player", "truth"], witnesses: ["hale"], summary: "told the truth" }]);
  engine.start();
  assert.ok(engine.traitScore("honest", "hale") > 0);
  const warning = engine.lint().find(function (entry) { return /'lei'/.test(entry.message); });
  assert.match(warning.message, /concept 'lei' is never remembered, so this condition is never true \(did you mean 'lie'\?\)\./);
});
