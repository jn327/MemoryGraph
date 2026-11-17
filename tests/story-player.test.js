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
    "story-menu", "story-options", "story-title", "story-text", "choice-list", "ending-actions",
    "graph-summary", "graph-visualization", "graph-empty",
    "ending-summary", "ending-traces", "ending-summary-empty", "ending-path",
    "ending-path-label", "ending-choices", "ending-reputation", "ending-reputation-list", "reputation-panel", "reputation-tabs", "reputation-body",
    "restart-button", "clear-button", "save-button", "restore-button", "status-message",
    "info-button", "debug-panel", "debug-close", "debug-content", "check-button", "check-results"
  ];
  const elements = Object.fromEntries(ids.map(function (id) {
    return [id, new Element()];
  }));
  elements["story-files"].webkitdirectory = true;
  const storage = new Map();
  const root = path.join(__dirname, "..");
  const scriptLoads = [];
  let context = null;
  const document = {
    head: {
      // Mimic the browser: run the script asynchronously, then fire load/error.
      appendChild: function (script) {
        scriptLoads.push(new Promise(function (resolve) {
          setImmediate(function () {
            let source;
            try {
              source = fs.readFileSync(path.join(root, script.src), "utf8");
            } catch (error) {
              script.onerror();
              resolve();
              return;
            }
            vm.runInContext(source, context, { filename: script.src });
            script.onload();
            resolve();
          });
        }));
      }
    },
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
  const quietConsole = { error: console.error, log: console.log, warn: function () {} };
  context = vm.createContext({ document, FileReader, localStorage, console: quietConsole });
  context.window = context;
  ["MemoryGraph.js", "NarrativeEngine.js", "StoryCheck.js", "storyPlayer.js"].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, "scripts", file), "utf8"), context);
  });
  const ready = Promise.all(scriptLoads).then(function () {
    return new Promise(function (resolve) { setImmediate(resolve); });
  });
  return { elements, storage, ready };
}

function readStoryFiles() {
  const directory = path.join(__dirname, "..", "stories");
  return fs.readdirSync(directory).filter(function (name) {
    return name.endsWith(".js");
  }).sort().map(function (name) {
    let definition = null;
    vm.runInNewContext(fs.readFileSync(path.join(directory, name), "utf8"), {
      registerStory: function (value) { definition = value; }
    });
    return definition;
  });
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
          do: [{ type: "remember", concepts: ["player", "choice"] }],
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

test("every story file is listed, loads, and appears in the picker", async function () {
  const player = createPlayer();
  assert.equal(player.elements["story-picker"].disabled, true);
  await player.ready;
  const definitions = readStoryFiles();
  const options = player.elements["story-options"].children;
  assert.equal(player.elements["status-message"].textContent, "");
  assert.equal(options.length, definitions.length,
    "each stories/*.js file must be listed in STORY_FILES in storyPlayer.js");
  assert.equal(player.elements["story-picker"].disabled, false);
  assert.deepEqual(options.map(function (option) { return option.children[0].textContent; }).sort(),
    definitions.map(function (definition) { return definition.title; }).sort());
  options[0].click();
  assert.equal(player.elements["story-title"].textContent, options[0].children[0].textContent);
  assert.ok(player.elements["story-text"].children.length);
});

test("JSON uploads replace built-in stories", async function () {
  const player = createPlayer();
  await player.ready;
  await loadStory(player, "story-json-files");
  assert.equal(player.elements["story-options"].children.length, 1);
  assert.equal(player.elements["story-title"].textContent, story.title);
});

test("an upload made while built-in stories load is not overwritten", async function () {
  const player = createPlayer();
  await loadStory(player, "story-json-files");
  await player.ready;
  assert.equal(player.elements["story-options"].children.length, 1);
  assert.equal(player.elements["story-title"].textContent, story.title);
});

// The text a paragraph shows, without its memory tags.
function plainText(element) {
  if (element.children.length === 0) return element.textContent;
  return element.children.map(function (child) {
    return child.className === "memory-tag" ? "" : child.textContent;
  }).join("").trim();
}

function transcript(player) {
  return player.elements["story-text"].children.map(plainText);
}

test("choosing a story option brings the new text into view", async function () {
  const player = createPlayer();
  await loadStory(player);
  assert.equal(player.elements["story-text"].lastElementChild.scrollOptions, undefined);
  player.elements["choice-list"].children[0].click();
  const newText = player.elements["story-text"].lastElementChild;
  assert.equal(plainText(newText), "After choosing.");
  const tag = newText.children.find(function (child) { return child.className === "memory-tag"; });
  assert.equal(tag.children[0].textContent, "(choice)", "memory-driven text is tagged");
  assert.equal(tag.children[1].children[0].textContent, "Memory links you with “choice”.");
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

test("Graph State visualizes every concept and association", async function () {
  const player = createPlayer();
  await loadStory(player);
  player.elements["choice-list"].children[0].click();
  player.elements["info-button"].click();

  assert.equal(player.elements["graph-summary"].textContent, "2 concepts · 1 association");
  const layers = player.elements["graph-visualization"].children;
  const edgeLayer = layers.find(function (layer) {
    return layer.className === "graph-edge-layer";
  });
  const nodeLayer = layers.find(function (layer) {
    return layer.className === "graph-node-layer";
  });
  assert.equal(edgeLayer.children.length, 1);
  assert.equal(nodeLayer.children.length, 2);
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

test("picked choices echo their effect and the reputation panel tracks each view", async function () {
  const player = createPlayer();
  const echoStory = {
    id: "echo_test",
    title: "Echo Test",
    start: "start",
    characters: { mira: { name: "Mira" }, file: { name: "The file", hidden: true } },
    traits: {
      kind: { concepts: { help: 1 } },
      untrustworthy: { label: "a liar", concepts: { lie: 1 } }
    },
    nodes: {
      start: {
        text: "Mira needs help.",
        choices: [{
          id: "help", text: "Help her",
          do: [{ type: "remember", concepts: ["player", "help"], witnesses: ["mira", "file"], summary: "helped Mira" }],
          goto: "middle"
        }]
      },
      middle: {
        text: "Later.",
        choices: [{
          id: "lie", text: "Lie",
          do: [{ type: "remember", concepts: ["player", "lie"], summary: "lied in private" }],
          goto: "end"
        }]
      },
      end: { text: "The end.", ending: true, choices: [] }
    }
  };
  player.elements["story-files"].files = [{ name: "e.json", content: JSON.stringify(echoStory) }];
  player.elements["story-files"].listeners.change();
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(player.elements["reputation-panel"].hidden, true, "nothing to show before any choice");

  player.elements["choice-list"].children[0].click();
  const picked = player.elements["story-text"].children[1];
  const echo = picked.children.find(function (child) { return child.className === "memory-tag"; });
  assert.equal(echo.children[0].textContent, "(↑ kind · Mira saw)", "hidden witnesses are not named");

  const panel = player.elements;
  assert.equal(panel["reputation-panel"].hidden, false);
  assert.deepEqual(panel["reputation-tabs"].children.map(function (tab) { return tab.textContent; }),
    ["Overall", "Mira"], "the hidden file has no tab");
  const rows = panel["reputation-body"].children[0].children;
  assert.equal(rows[0].attributes["aria-label"], "kind: strongly");

  player.elements["choice-list"].children[0].click();
  const lied = player.elements["story-text"].children[3];
  const unseen = lied.children.find(function (child) { return child.className === "memory-tag"; });
  assert.equal(unseen.children[0].textContent, "(↑ a liar · no one saw)");
  panel["reputation-tabs"].children[1].click();
  assert.equal(panel["reputation-body"].children[1].textContent,
    "What Mira remembers most: you helped Mira.", "Mira never learned about the lie");
});

test("ending lists how each witness remembers the player", async function () {
  const player = createPlayer();
  const witnessStory = {
    id: "witness_test",
    title: "Witness Test",
    start: "start",
    characters: { mira: { name: "Mira" }, tomas: { name: "Tomas" } },
    traits: { untrustworthy: { label: "a liar", concepts: { lie: 1 } } },
    nodes: {
      start: {
        text: "Mira watches.",
        choices: [{
          id: "lie",
          text: "Lie",
          do: [{
            type: "remember",
            concepts: ["player", "lie"],
            witnesses: ["mira"],
            summary: "lied about the flour"
          }],
          goto: "end"
        }]
      },
      end: { text: "The end.", ending: true, choices: [] }
    }
  };
  player.elements["story-files"].files = [{ name: "w.json", content: JSON.stringify(witnessStory) }];
  player.elements["story-files"].listeners.change();
  await new Promise(function (resolve) { setImmediate(resolve); });
  player.elements["choice-list"].children[0].click();

  assert.equal(player.elements["ending-reputation"].hidden, false);
  const items = player.elements["ending-reputation-list"].children;
  assert.equal(items.length, 1, "only Mira witnessed anything");
  assert.equal(items[0].children[0].textContent, "Mira");
  assert.equal(items[0].children[1].textContent, " remembers you as a liar.");
  assert.equal(items[0].children[2].textContent, "Mostly, that you lied about the flour.");
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

test("uploads report authoring warnings, and Check story plays the story", async function () {
  const player = createPlayer();
  const warned = JSON.parse(JSON.stringify(story));
  warned.traits = { kind: { concepts: { help: 1 } } };
  player.elements["story-files"].files = [{ name: "w.json", content: JSON.stringify(warned) }];
  player.elements["story-files"].listeners.change();
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.match(player.elements["status-message"].textContent,
    /1 story loaded\. 1 authoring warning: open Graph State \(i\) to see them\./);

  player.elements["info-button"].click();
  const lines = function () {
    return player.elements["check-results"].children.map(function (child) {
      return child.textContent || child.children.map(function (item) { return item.textContent; }).join(" | ");
    });
  };
  assert.equal(lines()[0], "1 authoring warning:");
  assert.match(lines()[1], /trait 'kind': none of its concepts is ever remembered/);

  player.elements["check-button"].click();
  const report = lines();
  assert.ok(report.indexOf("All 300 random runs finished cleanly.") !== -1, report.join("\n"));
  assert.ok(report.indexOf("Every node was reached.") !== -1, report.join("\n"));
});
