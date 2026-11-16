"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.hidden = false;
    this.dataset = {};
    this.textContent = "";
  }

  addEventListener(type, listener) { this.listeners[type] = listener; }
  appendChild(child) { this.children.push(child); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get lastElementChild() { return this.children[this.children.length - 1]; }
  setAttribute(name, value) {
    this.attributes = this.attributes || {};
    this.attributes[name] = value;
    if (name === "class") this.className = value;
  }
  focus() {}
  click() { this.listeners.click(); }
  scrollIntoView(options) { this.scrollOptions = options; }
}

function createPlayer() {
  const ids = [
    "story-files", "story-json-files", "folder-upload-button", "json-upload-button",
    "story-picker", "story-picker-title",
    "story-options", "story-title", "story-text", "choice-list", "ending-actions",
    "graph-summary", "graph-visualization", "graph-empty",
    "ending-summary", "ending-traces", "ending-summary-empty", "ending-path",
    "ending-path-label", "ending-choices",
    "restart-button", "clear-button", "save-button", "restore-button", "status-message",
    "info-button", "debug-panel", "debug-close", "debug-content"
  ];
  const elements = Object.fromEntries(ids.map(function (id) {
    return [id, new Element()];
  }));
  elements["story-files"].webkitdirectory = true;
  const storage = new Map();
  const document = {
    getElementById: function (id) { return elements[id] || null; },
    querySelector: function () { return new Element(); },
    createElement: function () { return new Element(); },
    createElementNS: function () { return new Element(); },
    createTextNode: function (text) { return { textContent: text }; },
    addEventListener: function () {}
  };
  class FileReader {
    readAsText(file) {
      this.result = file.content;
      this.onload();
    }
  }
  const localStorage = {
    setItem: function (key, value) { storage.set(key, value); },
    getItem: function (key) { return storage.has(key) ? storage.get(key) : null; }
  };
  const context = vm.createContext({ document, FileReader, localStorage, console });
  context.window = context;
  ["MemoryGraph.js", "NarrativeEngine.js", "builtInStories.js", "storyPlayer.js"].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "scripts", file), "utf8"), context);
  });
  return { elements, storage, builtInStories: context.builtInStories };
}

const story = {
  id: "transcript_test",
  title: "Transcript test",
  start: "loop",
  nodes: {
    loop: {
      text: [
        { if: { type: "association", a: "player", b: "choice", min: 1 }, value: "After choosing." },
        { value: "Before choosing." }
      ],
      choices: [
        {
          id: "again",
          text: "Choose again",
          do: [
            { type: "remember", concepts: ["player", "choice"] },
            { type: "learnTransition", transitionType: "route", from: "loop", to: "end" }
          ],
          goto: "loop"
        },
        { id: "finish", text: "Finish", goto: "end" }
      ]
    },
    end: { text: "The end.", ending: true, choices: [] }
  }
};

async function loadStory(player, inputId = "story-files") {
  player.elements[inputId].files = [{ name: "test.json", content: JSON.stringify(story) }];
  player.elements[inputId].listeners.change();
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.ok(player.elements["choice-list"].children.length, player.elements["status-message"].textContent);
}

test("built-in stories are available and match the story files", function () {
  const player = createPlayer();
  const directory = path.join(__dirname, "..", "stories");
  const definitions = fs.readdirSync(directory).filter(function (name) {
    return name.endsWith(".json");
  }).sort().map(function (name) {
    return JSON.parse(fs.readFileSync(path.join(directory, name), "utf8"));
  });
  const options = player.elements["story-options"].children;
  assert.equal(options.length, definitions.length);
  assert.equal(JSON.stringify(player.builtInStories.map(function (entry) {
    return entry.definition;
  })), JSON.stringify(definitions));
  assert.deepEqual(options.map(function (option) { return option.children[0].textContent; }).sort(),
    definitions.map(function (definition) { return definition.title; }).sort());
  options[0].click();
  assert.equal(player.elements["story-title"].textContent, options[0].children[0].textContent);
  assert.ok(player.elements["story-text"].children.length);
});

test("JSON uploads replace built-in stories", async function () {
  const player = createPlayer();
  await loadStory(player, "story-json-files");
  assert.equal(player.elements["story-options"].children.length, 1);
  assert.equal(player.elements["story-title"].textContent, story.title);
});

function transcript(player) {
  return player.elements["story-text"].children.map(function (element) {
    return element.textContent;
  });
}

test("choosing a story option brings the new text into view", async function () {
  const player = createPlayer();
  await loadStory(player);
  assert.equal(player.elements["story-text"].lastElementChild.scrollOptions, undefined);
  player.elements["choice-list"].children[0].click();
  const newText = player.elements["story-text"].lastElementChild;
  assert.equal(newText.textContent, "After choosing.");
  assert.equal(newText.scrollOptions.block, "nearest");
  assert.equal(newText.scrollOptions.inline, "nearest");
});

test("Graph State reports memory sequence numbers", async function () {
  const player = createPlayer();
  await loadStory(player);
  player.elements["choice-list"].children[0].click();
  player.elements["info-button"].click();

  const debugInfo = JSON.parse(player.elements["debug-content"].textContent);
  assert.equal(debugInfo["Memory Graph"]["Events"][0].sequence, 1);
});

test("Graph State visualizes every concept, association, and transition", async function () {
  const player = createPlayer();
  await loadStory(player);
  player.elements["choice-list"].children[0].click();
  player.elements["info-button"].click();

  assert.equal(player.elements["graph-summary"].textContent,
    "4 concepts · 1 association · 1 transition");
  const layers = player.elements["graph-visualization"].children;
  const edgeLayer = layers.find(function (layer) {
    return layer.className === "graph-edge-layer";
  });
  const nodeLayer = layers.find(function (layer) {
    return layer.className === "graph-node-layer";
  });
  assert.equal(edgeLayer.children.length, 2);
  assert.equal(nodeLayer.children.length, 4);
  const debugInfo = JSON.parse(player.elements["debug-content"].textContent);
  assert.equal(debugInfo["Memory Graph"]["Transitions"][0].type, "route");
});

test("transcript preserves shown text and choices across revisits and resets", async function () {
  const player = createPlayer();
  await loadStory(player);
  player.elements["choice-list"].children[0].click();
  player.elements["choice-list"].children[1].click();
  assert.deepEqual(transcript(player), [
    "Before choosing.", "Choose again", "After choosing.", "Finish", "The end."
  ]);
  player.elements["restart-button"].click();
  assert.deepEqual(transcript(player), ["After choosing."]);
  player.elements["clear-button"].click();
  assert.deepEqual(transcript(player), ["Before choosing."]);
});

test("ending summarizes choice memories and restores the player's path", async function () {
  const player = createPlayer();
  await loadStory(player);
  assert.equal(player.elements["ending-summary"].hidden, true);

  player.elements["choice-list"].children[0].click();
  player.elements["choice-list"].children[1].click();

  assert.equal(player.elements["ending-summary"].hidden, false);
  assert.equal(player.elements["ending-path-label"].textContent, "Your choices (2)");
  assert.deepEqual(player.elements["ending-choices"].children.map(function (item) {
    return item.textContent;
  }), ["Choose again", "Finish"]);
  assert.equal(player.elements["ending-traces"].children[0].children[0].textContent, "choice");

  player.elements["save-button"].click();
  player.elements["restart-button"].click();
  assert.equal(player.elements["ending-summary"].hidden, true);
  player.elements["restore-button"].click();
  assert.equal(player.elements["ending-summary"].hidden, false);
  assert.deepEqual(player.elements["ending-choices"].children.map(function (item) {
    return item.textContent;
  }), ["Choose again", "Finish"]);
});

test("saving and restoring preserves the transcript and accepts older saves", async function () {
  const player = createPlayer();
  await loadStory(player);
  player.elements["choice-list"].children[0].click();
  player.elements["save-button"].click();
  const key = "memory-graph:transcript_test";
  const saved = player.storage.get(key);
  player.elements["choice-list"].children[1].click();
  player.elements["restore-button"].click();
  assert.deepEqual(transcript(player), ["Before choosing.", "Choose again", "After choosing."]);

  const olderSave = JSON.parse(saved);
  delete olderSave.transcript;
  player.storage.set(key, JSON.stringify(olderSave));
  player.elements["restore-button"].click();
  assert.deepEqual(transcript(player), ["After choosing."]);
  assert.match(player.elements["status-message"].textContent, /Earlier story text is unavailable/);
});
