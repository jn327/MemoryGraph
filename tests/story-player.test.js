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
  closest() { return new Element(); }
}

// Enough of classList for the player's toggles on <body>.
class ClassList {
  constructor() { this.names = new Set(); }
  toggle(name, on) { if (on) this.names.add(name); else this.names.delete(name); }
  contains(name) { return this.names.has(name); }
}

function createPlayer(globals) {
  const ids = [
    "story-files", "story-text-files", "folder-upload-button", "files-upload-button", "watch-file-button",
    "scene-select", "scene-presets", "scene-start-button",
    "story-picker", "story-picker-title",
    "story-menu", "story-options", "story-title", "story-text", "choice-list", "ending-actions",
    "graph-summary", "graph-visualization", "graph-empty",
    "ending-summary", "ending-overall", "ending-path",
    "ending-path-label", "ending-choices", "ending-reputation-list",
    "cast-button", "cast-dot", "cast-drawer", "cast-close", "reputation-tabs", "reputation-body",
    "cast-bar", "cast-bar-dot", "cast-bar-here", "cast-drawer-body",
    "restart-button", "clear-button", "status-message",
    "info-button", "tags-button", "about-button", "about-dialog", "about-close", "menu-button", "app-menu", "debug-panel", "debug-close", "debug-content", "check-button", "check-results",
    "map-button", "glance-results", "debug-title", "writer-tab-overview", "writer-tab-map", "writer-tab-cast",
    "writer-tab-graph", "writer-pane-overview", "writer-pane-map", "writer-pane-graph"
  ];
  const elements = Object.fromEntries(ids.map(function (id) {
    return [id, new Element()];
  }));
  elements["story-files"].webkitdirectory = true;
  const storage = new Map();
  const root = path.join(__dirname, "..");
  const scriptLoads = [];
  let context = null;
  const body = new Element();
  body.classList = new ClassList();
  const document = {
    body: body,
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
  // The story map draws into a real page; these tests only see what it's given.
  const StoryMapView = { show: function () {} };
  context = vm.createContext(Object.assign({ document, FileReader, localStorage, StoryMapView, console: quietConsole }, globals));
  context.window = context;
  ["scripts/core/MemoryGraph.js", "scripts/core/NarrativeEngine.js", "scripts/authoring/StoryText.js", "scripts/authoring/StoryCheck.js",
    "scripts/authoring/StoryMap.js", "stories/built/manifest.js", "scripts/player/storyPlayer.js"].forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  });
  const ready = Promise.all(scriptLoads).then(function () {
    return new Promise(function (resolve) { setImmediate(resolve); });
  });
  return { elements, storage, ready };
}

const StoryText = require("../scripts/authoring/StoryText.js");

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
    "each stories/*.txt file must be built into stories/built (node tools/build-stories.js)");
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

test("the ⋯ menu opens, and Writer tools closes it on the way", async function () {
  const player = createPlayer();
  await loadStory(player);
  const elements = player.elements;
  elements["menu-button"].click();
  assert.equal(elements["app-menu"].hidden, false);
  assert.equal(elements["menu-button"].attributes["aria-expanded"], "true");
  elements["menu-button"].click();
  assert.equal(elements["app-menu"].hidden, true);

  elements["menu-button"].click();
  elements["info-button"].click();
  assert.equal(elements["app-menu"].hidden, true);
  assert.equal(elements["debug-panel"].hidden, false);
});

test("Writer tools reports memory sequence numbers", async function () {
  const player = createPlayer();
  await loadStory(player);
  player.elements["choice-list"].children[0].click();
  player.elements["info-button"].click();

  const debugInfo = JSON.parse(player.elements["debug-content"].textContent);
  assert.equal(debugInfo["Memory Graph"]["Events"][0].sequence, 1);
});

test("Writer tools visualizes every concept and association", async function () {
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

test("ending summarizes choice memories and the player's path", async function () {
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
  assert.equal(player.elements["ending-overall"].children[0].textContent, "Nothing you did here defined you.",
    "a story without traits says so instead of listing raw memory concepts");

  player.elements["restart-button"].click();
  assert.equal(player.elements["ending-summary"].hidden, true);
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
    "  -> after",
    "=== after",
    "Later still.",
    "* Finish -> end",
    "=== end (ending)",
    "The end."
  ].join("\n") }]);
  assert.equal(player.elements["cast-button"].hidden, true, "nothing to show before any choice");

  player.elements["choice-list"].children[0].click();
  const picked = player.elements["story-text"].children[1];
  const echo = picked.children.find(function (child) { return child.className === "memory-tag"; });
  assert.equal(echo.children[0].textContent, "(↑ kind · Mira saw)", "hidden witnesses are not named");

  const panel = player.elements;
  assert.equal(panel["cast-button"].hidden, false);
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

  player.elements["choice-list"].children[0].click();
  assert.equal(panel["cast-button"].hidden, true, "at an ending the summary replaces Who's who");
  assert.equal(panel["ending-summary"].hidden, false);
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

  assert.equal(player.elements["ending-reputation-list"].hidden, false);
  const items = player.elements["ending-reputation-list"].children;
  assert.equal(items.length, 1, "only Mira witnessed anything");
  assert.equal(items[0].children[0].textContent, "Mira");
  assert.equal(items[0].children[1].textContent, "Will remember you as a liar.");
  assert.equal(items[0].children[2].textContent, "Mostly, that you lied about the flour.");
  assert.equal(player.elements["ending-overall"].children[0].textContent, "You leave seen as a liar.");
  assert.equal(player.elements["cast-button"].hidden, true, "the ending summary replaces Who's who");
});

test("uploads report authoring warnings, and Check story plays the story", async function () {
  const player = createPlayer();
  const warned = story.replace("=== loop", "== traits\nkind: help\n\n=== loop");
  await upload(player, [{ name: "w.txt", content: warned }]);
  assert.match(player.elements["status-message"].textContent,
    /1 story loaded\. 1 authoring warning: see Writer tools in the ⋯ menu\./);

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
  // The choice leads to a scene with no one in it (not the ending, where
  // the summary replaces Who's who).
  await upload(player, [{ name: "cast.txt", content: castStory.replace("  -> end", "  -> hold") + [
    "",
    "=== hold",
    "The hold is empty.",
    "* Go -> end"
  ].join("\n") }]);
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

test("Who's who opens on Overall, marks what changed, and opens on a person from their name", async function () {
  const player = createPlayer();
  await upload(player, [{ name: "cast.txt", content: castStory.replace("  -> end", "  -> wharf") + [
    "",
    "=== wharf",
    "present: hale",
    "Hale ties off.",
    "* Go -> end"
  ].join("\n") }]);
  const elements = player.elements;
  assert.equal(elements["cast-button"].hidden, false, "people are here, so there's a cast");
  assert.equal(elements["cast-drawer"].hidden, true);
  assert.equal(elements["cast-dot"].hidden, true, "nothing has changed yet");

  elements["cast-button"].click();
  assert.equal(elements["cast-drawer"].hidden, false);
  assert.equal(elements["cast-button"].attributes["aria-expanded"], "true");
  assert.equal(elements["reputation-tabs"].children[0].attributes["aria-pressed"], "true", "opens on Overall");
  elements["cast-close"].click();
  assert.equal(elements["cast-drawer"].hidden, true);

  elements["choice-list"].children[0].click();
  assert.equal(elements["cast-dot"].hidden, false, "helping Hale changed how you're seen");
  const changed = elements["reputation-tabs"].children.filter(function (tab) { return /is-changed/.test(tab.className); })
    .map(function (tab) { return tab.textContent; });
  assert.deepEqual(changed, ["Overall", "Captain Hale · here"], "the hidden man's view is secret, so never news");
  const chip = findAll(elements["story-text"].lastElementChild, "character-name")[0];
  assert.match(chip.className, /is-changed/);

  chip.listeners.click();
  assert.equal(elements["cast-drawer"].hidden, false);
  assert.equal(elements["reputation-tabs"].children[1].attributes["aria-pressed"], "true", "opens on Hale");
  assert.equal(elements["cast-dot"].hidden, true);
  assert.doesNotMatch(elements["reputation-tabs"].children[1].className, /is-changed/, "looked at now");
  assert.match(elements["reputation-tabs"].children[0].className, /is-changed/, "Overall still unseen");

  elements["choice-list"].children[0].click();
  assert.equal(elements["cast-drawer"].hidden, true, "the ending replaces Who's who");
  assert.equal(elements["cast-button"].hidden, true);
  const cards = elements["ending-reputation-list"].children.map(readable);
  assert.deepEqual(cards, [
    "Captain HaleWill remember you as kind.Mostly, that you helped the captain with the ropes.",
    "the man in the grey coatYou can't tell what they make of you."
  ], "hidden characters keep their view secret at the ending too");
});

test("on narrow screens Who's who docks as a bar that expands and collapses", async function () {
  const player = createPlayer({
    matchMedia: function (query) {
      return { matches: query === "(max-width: 959px)", addEventListener: function () {} };
    }
  });
  await upload(player, [{ name: "cast.txt", content: castStory }]);
  const elements = player.elements;
  assert.equal(elements["cast-drawer"].hidden, false, "the bar is always there while there's a cast");
  assert.equal(elements["cast-drawer"].className, "cast-drawer is-docked is-collapsed");
  assert.equal(elements["cast-drawer-body"].hidden, true);
  assert.equal(elements["cast-bar-here"].textContent, "Here: Captain Hale, the man in the grey coat");

  elements["cast-bar"].click();
  assert.equal(elements["cast-drawer"].className, "cast-drawer is-docked");
  assert.equal(elements["cast-drawer-body"].hidden, false);
  assert.equal(elements["cast-bar"].attributes["aria-expanded"], "true");

  elements["cast-bar"].click();
  assert.equal(elements["cast-drawer"].hidden, false, "collapsing leaves the bar");
  assert.equal(elements["cast-drawer-body"].hidden, true);

  elements["choice-list"].children[0].click();
  assert.equal(elements["cast-drawer"].hidden, true, "no bar at an ending");
});

test("Writer tools can start the story from any scene with memories in place", async function () {
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
  assert.ok(reputation.some(function (line) { return /^Captain HaleWill remember you as kind\./.test(line); }), reputation.join("\n"));
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

function linkGlobals(href) {
  const location = { href: href };
  Object.defineProperty(location, "search", { get: function () { return new URL(location.href).search; } });
  const history = { replaceState: function (state, title, url) { location.href = url; } };
  return { location: location, history: history, URL: URL, URLSearchParams: URLSearchParams };
}

test("a ?story= link opens that story and picking a story updates the link", async function () {
  const globals = linkGlobals("http://localhost/index.html?story=the_night_ferry");
  const player = createPlayer(globals);
  await player.ready;
  assert.equal(player.elements["story-picker-title"].textContent, "The Night Ferry");
  assert.ok(player.elements["choice-list"].children.length, player.elements["status-message"].textContent);

  const options = player.elements["story-options"].children;
  const other = options.find(function (option) { return option.children[0].textContent !== "The Night Ferry"; });
  other.click();
  assert.match(globals.location.href, /\?story=(?!the_night_ferry)\w+$/);
});

test("a ?story= link to a missing story says so and loads nothing", async function () {
  const player = createPlayer(linkGlobals("http://localhost/index.html?story=nope"));
  await player.ready;
  assert.equal(player.elements["story-picker-title"].textContent, "Choose a story");
  assert.match(player.elements["status-message"].textContent, /no story called "nope"/);
});

test("a link's path replays those choices, and each choice extends it", async function () {
  const globals = linkGlobals("http://localhost/index.html?story=the_night_ferry&path=0");
  const player = createPlayer(globals);
  await player.ready;
  assert.equal(player.elements["story-text"].children.length, 3, player.elements["status-message"].textContent);
  assert.match(player.elements["status-message"].textContent, /replayed 1 choice\./);
  assert.match(globals.location.href, /[?&]path=0$/);

  player.elements["choice-list"].children[0].click();
  assert.equal(player.elements["story-text"].children.length, 5);
  assert.match(globals.location.href, /[?&]path=0\.\d+$/);

  // Keeping memory means the run can't be rebuilt from its choices alone.
  player.elements["restart-button"].click();
  assert.doesNotMatch(globals.location.href, /path=/);
  assert.match(globals.location.href, /story=the_night_ferry/);
  player.elements["choice-list"].children[0].click();
  assert.doesNotMatch(globals.location.href, /path=/);

  // A fresh run is shareable again.
  player.elements["clear-button"].click();
  player.elements["choice-list"].children[0].click();
  assert.match(globals.location.href, /[?&]path=\d+$/);
});

test("a link's path that no longer fits replays as far as it can", async function () {
  const globals = linkGlobals("http://localhost/index.html?story=the_night_ferry&path=0.99");
  const player = createPlayer(globals);
  await player.ready;
  assert.match(player.elements["status-message"].textContent, /replayed 1 of 2 choices/);
  assert.match(globals.location.href, /[?&]path=0$/);
});

test("Writer tools measures the story and shows the story map as a tab with the run and the last check", async function () {
  const shown = [];
  const StoryMapView = { show: function (host, options, tab) { shown.push({ host: host, options: options, tab: tab }); } };
  const player = createPlayer({ StoryMapView: StoryMapView });
  await loadStory(player);
  const elements = player.elements;
  elements["info-button"].click();
  assert.equal(elements["debug-panel"].hidden, false);
  assert.equal(elements["writer-tab-overview"].attributes["aria-selected"], "true");
  assert.equal(elements["writer-pane-map"].hidden, true);
  assert.equal(elements["debug-title"].textContent, "Writer tools · Transcript test");
  const glance = elements["glance-results"].children.map(function (child) { return child.textContent; });
  assert.match(glance[0], /^2 scenes, 1 ending, 2 choices and 0 characters\. \d+ words, \d+% of them shown only sometimes\.$/);
  assert.match(glance[1], /The shortest route to an ending is 1 choice\./);
  assert.equal(shown.length, 0, "the map is drawn only when its tab opens");

  elements["debug-close"].click();
  elements["choice-list"].children[0].click();
  elements["info-button"].click();
  elements["map-button"].click();
  assert.equal(shown.length, 1);
  assert.equal(shown[0].tab, "map");
  assert.equal(shown[0].host, elements["writer-pane-map"]);
  assert.equal(elements["writer-pane-map"].hidden, false);
  assert.equal(elements["writer-pane-overview"].hidden, true);
  assert.equal(elements["writer-tab-map"].attributes["aria-selected"], "true");
  assert.deepEqual(Array.from(shown[0].options.path.nodes), ["loop", "loop"]);
  assert.equal(shown[0].options.check, null, "no check has run yet");

  elements["writer-tab-overview"].click();
  elements["check-button"].click();
  assert.match(elements["glance-results"].children[2].textContent, /^In 300 random runs a playthrough took 1–\d+ choices/);
  elements["writer-tab-cast"].click();
  assert.equal(shown[1].tab, "cast");
  assert.equal(shown[1].options.check.runs, 300, "the map gets the last check");

  // Writer tools reopens on the tab it was closed on.
  elements["debug-close"].click();
  assert.equal(elements["debug-panel"].hidden, true);
  elements["info-button"].click();
  assert.equal(elements["writer-tab-cast"].attributes["aria-selected"], "true");

  // The map's "Start from this scene…" goes to Start from a scene with it chosen.
  shown[shown.length - 1].options.startAt("end");
  assert.equal(elements["writer-tab-overview"].attributes["aria-selected"], "true");
  assert.equal(elements["scene-select"].value, "end");
});
