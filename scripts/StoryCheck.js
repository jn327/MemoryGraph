(function (root) {
  "use strict";

  // Plays a story many times with seeded random choices and reports what an
  // author needs to know: runs that crashed or hit a dead end, nodes and
  // branches no run ever reached, how often each ending came up, and the
  // engine's authoring warnings. Used by the test suite and the demo's
  // "Check story" button. Results are deterministic for the same seed.

  const DEFAULT_RUNS = 500;
  const DEFAULT_MAX_STEPS = 250;
  const MAX_REPORTED_ERRORS = 10;

  function check(definition, options) {
    const settings = options === undefined ? {} : options;
    const runs = settings.runs === undefined ? DEFAULT_RUNS : settings.runs;
    const maxSteps = settings.maxSteps === undefined ? DEFAULT_MAX_STEPS : settings.maxSteps;
    const seed = settings.seed === undefined ? 1 : settings.seed;
    const NarrativeEngine = loadEngine();

    const fired = new Set();
    const visited = new Set();
    const endings = {};
    const errors = [];
    const errorMessages = new Set();
    const probe = new NarrativeEngine(definition);

    for (let run = 0; run < runs; run += 1) {
      const next = random(seed + run);
      const engine = new NarrativeEngine(definition, {
        onBranch: function (id) { fired.add(id); }
      });
      try {
        let view = engine.start();
        visited.add(view.nodeId);
        let steps = 0;
        while (!view.ended) {
          steps += 1;
          if (steps > maxSteps) {
            throw new Error("did not reach an ending within " + maxSteps + " choices");
          }
          view = engine.choose(Math.floor(next() * view.choices.length));
          visited.add(view.nodeId);
        }
        endings[view.nodeId] = (endings[view.nodeId] || 0) + 1;
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        if (!errorMessages.has(message) && errors.length < MAX_REPORTED_ERRORS) {
          errorMessages.add(message);
          errors.push({ run: run, seed: seed + run, message: message });
        }
      }
    }

    const nodes = Object.keys(probe.story.nodes);
    for (const id of nodes) {
      if (probe.story.nodes[id].ending === true && endings[id] === undefined) {
        endings[id] = 0;
      }
    }
    return {
      runs: runs,
      errors: errors,
      unvisitedNodes: nodes.filter(function (id) { return !visited.has(id); }),
      missedBranches: probe.branches().filter(function (id) { return !fired.has(id); }),
      endings: endings,
      warnings: probe.lint()
    };
  }

  function loadEngine() {
    if (root && typeof root.NarrativeEngine === "function") {
      return root.NarrativeEngine;
    }
    if (typeof require === "function") {
      require("./MemoryGraph.js");
      return require("./NarrativeEngine.js");
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
