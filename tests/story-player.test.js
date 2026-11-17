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
  querySelectorAll(selector) {
    // Enough for the player's one use: checked boxes among the descendants.
    const found = [];
    const visit = function (element) {
      (element.children || []).forEach(function (child) {
        if (selector === "input:checked" && child.type === "checkbox" && child.checked) found.push(child);
        visit(child);
      });
    };
    visit(this);
    return found;
  }
  scrollIntoView(options) { this.scrollOptions = options; }
}

function createPlayer(globals) {
  const ids = [
    "story-files", "story-text-files", "folder-upload-button", "files-upload-button", "watch-file-button",
    "scene-select", "scene-presets", "scene-start-button",
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
  context = vm.createContext(Object.assign({ document, FileReader, localStorage, console: quietConsole }, globals));
  context.window = context;
  ["scripts/MemoryGraph.js", "scripts/NarrativeEngine.js", "scripts/StoryText.js", "scripts/StoryCheck.js",
    "stories/built/manifest.js", "scripts/storyPlayer.js"].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  });
  const ready = Promise.all(scriptLoads).then(function () {
    return new Promise(function (resolve) { setImmediate(resolve); });
  });
  return { elements, storage, ready };
}

const StoryText = require("../scripts/StoryText.js");

function readStoryFiles() {
  const directory = path.join(__dirname, "..", "stories");
  return fs.readdirSync(directory).filter(function (name) {
    return name.endsWith(".txt");
  }).sort().map(function (name) {
    return StoryText.parse(fs.readFileSync(path.join(directory, name), "utf8"), { fileName: name }).story;
  });
}

const story = [
  "title: Transcript test",
  "id: transcript_test",
  "",
  "=== loop",
  "{",
  "- player with choice >= 1:",
  "After choosing.",
  "- else:",
  "Before choosing.",
  "}",
  "",
  "* Choose again",
  "  ~ remember choice",
  "  -> loop",
  "* Finish -> end",
  "",
  "=== end (ending)",
  "The end."
].join("\n");

async function upload(player, files, inputId = "story-files") {
  player.elements[inputId].files = files;
  player.elements[inputId].listeners.change();
  await new Promise(function (resolve) { setImmediate(resolve); });
}

async function loadStory(player, inputId = "story-files") {
  await upload(player, [{ name: "test.txt", content: story }], inputId);
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
    "each stories/*.txt file must be built into stories/built (node scripts/build-stories.js)");
  assert.equal(player.elements["story-picker"].disabled, false);
  assert.deepEqual(options.map(function (option) { return option.children[0].textContent; }).sort(),
    definitions.map(function (definition) { return definition.title; }).sort());
  options[0].click();
  assert.equal(player.elements["story-title"].textContent, options[0].children[0].textContent);
  assert.ok(player.elements["story-text"].children.length);
});

test("story file uploads replace built-in stories", async function () {
  const player = createPlayer();
  await player.ready;
  await loadStory(player, "story-text-files");
  assert.equal(player.elements["story-options"].children.length, 1);
  assert.equal(player.elements["story-title"].textContent, "Transcript test");
});

test("an upload made while built-in stories load is not overwritten", async function () {
  const player = createPlayer();
  await loadStory(player, "story-text-files");
  await player.ready;
  assert.equal(player.elements["story-options"].children.length, 1);
  assert.equal(player.elements["story-title"].textContent, "Transcript test");
});

// The text a paragraph shows, without its memory tags, tooltips, or "Here:" line.
function plainText(element) {
  return readable(element).trim();
}

function readable(element) {
  if (!element.children || element.children.length === 0) return element.textContent;
  return element.children.map(function (child) {
    return /memory-tag|memory-tip|story-here/.test(child.className || "") ? "" : readable(child);
  }).join("");
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
  await upload(player, [{ name: "echo_test.txt", content: [
    "title: Echo Test",
    "== characters",
    "mira: Mira",
    "file: The file (hidden)",
    "== traits",
    "kind: help",
    "untrustworthy (a liar): lie",
    "=== start",
    "Mira needs help.",
    "* Help her",
    "  ~ remember help (seen by mira, file) \"helped Mira\"",
    "  -> middle",
    "=== middle",
    "Later.",
    "* Lie",
    "  ~ remember lie \"lied in private\"",
    "  -> end",
    "=== end (ending)",
    "The end."
  ].join("\n") }]);
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
  await upload(player, [{ name: "witness_test.txt", content: [
    "title: Witness Test",
    "== characters",
    "mira: Mira",
    "tomas: Tomas",
    "== traits",
    "untrustworthy (a liar): lie",
    "=== start",
    "Mira watches.",
    "* Lie",
    "  ~ remember lie (seen by mira) \"lied about the flour\"",
    "  -> end",
    "=== end (ending)",
    "The end."
  ].join("\n") }]);
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
  const warned = story.replace("=== loop", "== traits\nkind: help\n\n=== loop");
  await upload(player, [{ name: "w.txt", content: warned }]);
  assert.match(player.elements["status-message"].textContent,
    /1 story loaded\. 1 authoring warning: open Graph State \(i\) to see them\./);

  player.elements["info-button"].click();
  const lines = function () {
    return player.elements["check-results"].children.map(function (child) {
      return child.textContent || child.children.map(function (item) { return item.textContent; }).join(" | ");
    });
  };
  assert.equal(lines()[0], "1 authoring warning:");
  assert.match(lines()[1], /^line 5, trait 'kind': none of its concepts is ever remembered/, "warnings name their line");

  player.elements["check-button"].click();
  const report = lines();
  assert.ok(report.indexOf("All 300 random runs finished cleanly.") !== -1, report.join("\n"));
  assert.ok(report.indexOf("Every node was reached.") !== -1, report.join("\n"));
});

test("an upload that doesn't parse is skipped with its line number", async function () {
  const player = createPlayer();
  await upload(player, [
    { name: "good.txt", content: story },
    { name: "bad.txt", content: story.replace("-> loop", "-> lopo") }
  ]);
  assert.equal(player.elements["story-options"].children.length, 1);
  assert.match(player.elements["status-message"].textContent,
    /Skipped 1 invalid file: bad\.txt: line 14: there is no scene called 'lopo' \(did you mean 'loop'\?\)\./);
});

// Every element below `element` (depth first) that has the given class.
function findAll(element, className) {
  const found = [];
  (element.children || []).forEach(function (child) {
    if ((child.className || "").split(" ").indexOf(className) !== -1) found.push(child);
    found.push.apply(found, findAll(child, className));
  });
  return found;
}

const castStory = [
  "title: Cast Test",
  "== characters",
  "hale: Captain Hale",
  "  Runs the ferry.",
  "grey: the man in the grey coat (hidden)",
  "  Reads the same page all night.",
  "== traits",
  "kind: help",
  "=== deck",
  "present: hale, grey",
  "Hale counts heads. The man in the grey coat reads. *Nobody* speaks.",
  "* Help Hale with the ropes",
  "  ~ remember help, hale \"helped the captain with the ropes\"",
  "  ~ describe grey: The man who never turns the page.",
  "  -> end",
  "=== end (ending)",
  "Hale nods."
].join("\n");

test("passages show who is here, and names explain who people are", async function () {
  const player = createPlayer();
  await upload(player, [{ name: "cast.txt", content: castStory }]);
  const passage = player.elements["story-text"].children[0];
  assert.equal(plainText(passage), "Hale counts heads. The man in the grey coat reads. Nobody speaks.");
  const here = findAll(passage, "story-here")[0];
  assert.equal(readable(here).replace(/\s+/g, " "), "Here: Captain Hale, the man in the grey coat");
  assert.equal(findAll(passage, "character-name").length, 2, "names in the Here line are not linked again in the text");
  assert.equal(passage.children.filter(function (child) { return child.className === undefined && child.children && child.children.length; })
    .map(readable).join(""), "Nobody", "*Nobody* is in italics");

  const tips = findAll(here, "character-tip").map(function (tip) {
    return tip.children.map(function (line) { return line.textContent; });
  });
  assert.deepEqual(tips[0], ["Captain Hale", "Runs the ferry.", "Here now.", "Hasn't made up their mind about you."]);
  assert.deepEqual(tips[1], ["the man in the grey coat", "Reads the same page all night.", "Here now.",
    "You can't tell what they make of you."]);

  player.elements["choice-list"].children[0].click();
  const tabs = player.elements["reputation-tabs"].children.map(function (tab) { return tab.textContent; });
  assert.deepEqual(tabs, ["Overall", "Captain Hale", "the man in the grey coat"],
    "people you have been with are in the cast, hidden or not");
  player.elements["reputation-tabs"].children[2].click();
  assert.deepEqual(player.elements["reputation-body"].children.map(function (note) { return note.textContent; }),
    ["The man who never turns the page.", "You can't tell what they make of you."],
    "describe updates the description, and a hidden character's view stays secret");
  player.elements["reputation-tabs"].children[1].click();
  assert.equal(player.elements["reputation-body"].children[0].textContent, "Runs the ferry.");
});

test("Graph State can start the story from any scene with memories in place", async function () {
  const player = createPlayer();
  await upload(player, [{ name: "cast.txt", content: castStory }]);
  player.elements["info-button"].click();
  const options = player.elements["scene-select"].children.map(function (option) { return option.value; });
  assert.deepEqual(options, ["deck", "end"]);
  const presets = player.elements["scene-presets"].children;
  assert.equal(readable(presets[0]).replace(/\s+/g, " ").trim(),
    "deck you helped the captain with the ropes (seen by Captain Hale, the man in the grey coat)");
  presets[0].children[0].checked = true;
  player.elements["scene-select"].value = "end";
  player.elements["scene-start-button"].click();
  assert.equal(plainText(player.elements["story-text"].children[0]), "Hale nods.");
  assert.match(player.elements["status-message"].textContent, /Started at end with 1 thing already in place\./);
  const reputation = player.elements["ending-reputation-list"].children.map(readable);
  assert.ok(reputation.some(function (line) { return /^Captain Hale remembers you as kind\./.test(line); }), reputation.join("\n"));
});

test("a watched story file reloads on save and replays the choices made so far", async function () {
  // A fake file the "editor" saves, and a fake timer the test ticks.
  const file = { name: "watched.txt", lastModified: 1, content: story };
  let tick = null;
  const player = createPlayer({
    showOpenFilePicker: function () {
      return Promise.resolve([{ getFile: function () {
        const snapshot = { name: file.name, lastModified: file.lastModified, content: file.content };
        return Promise.resolve({ name: snapshot.name, lastModified: snapshot.lastModified,
          text: function () { return Promise.resolve(snapshot.content); } });
      } }]);
    },
    setInterval: function (callback) { tick = callback; return 1; },
    clearInterval: function () {}
  });
  const settle = async function () {
    for (let i = 0; i < 5; i += 1) await new Promise(function (resolve) { setImmediate(resolve); });
  };
  await player.ready;
  assert.equal(player.elements["watch-file-button"].hidden, false, "offered where the browser supports it");
  player.elements["watch-file-button"].click();
  await settle();
  assert.match(player.elements["status-message"].textContent, /^Watching watched\.txt\./);
  player.elements["choice-list"].children[0].click();
  assert.deepEqual(transcript(player), ["Before choosing.", "Choose again", "After choosing."]);

  file.content = story.replace("After choosing.", "After choosing, edited.");
  file.lastModified = 2;
  tick();
  await settle();
  assert.deepEqual(transcript(player), ["Before choosing.", "Choose again", "After choosing, edited."]);
  assert.match(player.elements["status-message"].textContent, /Reloaded watched\.txt and replayed your 1 choice\./);

  file.content = story.replace("-> loop", "-> nowhere");
  file.lastModified = 3;
  tick();
  await settle();
  assert.match(player.elements["status-message"].textContent,
    /watched\.txt line 14: there is no scene called 'nowhere'.*The last working version is still playing\./);
  assert.deepEqual(transcript(player), ["Before choosing.", "Choose again", "After choosing, edited."]);
});
