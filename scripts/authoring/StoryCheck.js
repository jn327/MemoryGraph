(function (root) {
  "use strict";

  // Plays a story many times with seeded random choices and reports what an
  // author needs to know: runs that crashed or hit a dead end, nodes and
  // branches no run ever reached, how often each ending came up, and the
  // engine's authoring warnings. Used by the test suite and the demo's
  // "Check story" button. Results are deterministic for the same seed.
  //
  // For the story map it also counts how many runs reached each scene
  // (nodeRuns) and took each route between two scenes (routeRuns, keyed
  // "from>to"), and how long the finished runs were in choices and in words
  // read (lengths: { choices, words }, each { min, median, max }).

  const DEFAULT_RUNS = 500;
  const MAX_STEPS = 250;
  const MAX_REPORTED_ERRORS = 10;
  const SEED = 1;

  function check(definition, options) {
    const runs = options === undefined || options.runs === undefined ? DEFAULT_RUNS : options.runs;
    const seed = SEED;
    const maxSteps = MAX_STEPS;
    const NarrativeEngine = loadEngine();

    const fired = new Set();
    const visited = new Set();
    const endings = {};
    const errors = [];
    const errorMessages = new Set();
    const nodeRuns = {};
    const routeRuns = {};
    const choiceCounts = [];
    const wordCounts = [];
    // One engine plays every run; reset() clears its progress and memory.
    const engine = new NarrativeEngine(definition, {
      onBranch: function (id) { fired.add(id); }
    });

    for (let run = 0; run < runs; run += 1) {
      const next = random(seed + run);
      engine.reset();
      const reached = new Set();
      const routes = new Set();
      try {
        let view = engine.start();
        visited.add(view.nodeId);
        reached.add(view.nodeId);
        let words = countWords(view.text);
        let steps = 0;
        while (!view.ended) {
          steps += 1;
          if (steps > maxSteps) {
            throw new Error("did not reach an ending within " + maxSteps + " choices");
          }
          const from = view.nodeId;
          view = engine.choose(Math.floor(next() * view.choices.length));
          visited.add(view.nodeId);
          reached.add(view.nodeId);
          routes.add(from + ">" + view.nodeId);
          words += countWords(view.text);
        }
        endings[view.nodeId] = (endings[view.nodeId] || 0) + 1;
        choiceCounts.push(steps);
        wordCounts.push(words);
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        if (!errorMessages.has(message) && errors.length < MAX_REPORTED_ERRORS) {
          errorMessages.add(message);
          errors.push({ run: run, seed: seed + run, message: message });
        }
      }
      reached.forEach(function (id) { nodeRuns[id] = (nodeRuns[id] || 0) + 1; });
      routes.forEach(function (key) { routeRuns[key] = (routeRuns[key] || 0) + 1; });
    }

    const nodes = Object.keys(engine.story.nodes);
    for (const id of nodes) {
      if (engine.story.nodes[id].ending === true && endings[id] === undefined) {
        endings[id] = 0;
      }
    }
    return {
      runs: runs,
      errors: errors,
      unvisitedNodes: nodes.filter(function (id) { return !visited.has(id); }),
      missedBranches: engine.branches().filter(function (id) { return !fired.has(id); }),
      endings: endings,
      warnings: engine.lint(),
      nodeRuns: nodeRuns,
      routeRuns: routeRuns,
      lengths: { choices: spread(choiceCounts), words: spread(wordCounts) }
    };
  }

  function countWords(text) {
    const words = String(text || "").match(/[A-Za-z0-9À-ɏ'’-]+/g);
    return words === null ? 0 : words.length;
  }

  function spread(values) {
    if (values.length === 0) return null;
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
  }

  function loadEngine() {
    if (root && typeof root.NarrativeEngine === "function") {
      return root.NarrativeEngine;
    }
    if (typeof require === "function") {
      require("../core/MemoryGraph.js");
      return require("../core/NarrativeEngine.js");
    }
    throw new Error("NarrativeEngine must be loaded before StoryCheck.");
  }

  // Small deterministic PRNG (mulberry32) so a failing run can be replayed.
  function random(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const StoryCheck = Object.freeze({ check: check });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = StoryCheck;
  }
  if (root) {
    root.StoryCheck = StoryCheck;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
