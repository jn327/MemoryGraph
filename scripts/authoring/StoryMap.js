(function (root) {
  "use strict";

  // Reads a parsed story (StoryText.parse(...).story) and describes its
  // shape for the story map in Writer tools. Works without a browser, so the
  // tests can check it.
  //
  //   analyse(definition, { lines, todos }) -> {
  //     start, order, scenes, edges, stats, problems, memory, characters
  //   }
  //   layout(analysis) -> { width, height, nodes, edges, selfLoops }
  //
  // Nothing here runs the story. "Can reach" means there is some sequence of
  // choices between two scenes if every condition were true, so it is the
  // most generous view of the story. Story check (StoryCheck.js) reports what
  // random play actually reaches.

  const NODE_W = 172;
  const NODE_H = 54;
  const DUMMY_W = 14;
  const H_GAP = 26;
  const RANK_GAP = 62;
  const MARGIN = 36;
  const ORDER_SWEEPS = 16;
  const PLACE_SWEEPS = 24;

  // ---- Analysis -------------------------------------------------------

  function analyse(definition, options) {
    const settings = options || {};
    const lines = settings.lines || {};
    const story = definition;
    const order = Object.keys(story.nodes);
    const start = story.start !== undefined ? story.start : order[0];
    const scenes = {};
    const edgeMap = new Map();

    order.forEach(function (id) {
      const node = story.nodes[id];
      const scene = {
        id: id,
        ending: node.ending === true,
        start: id === start,
        line: hasOwn(lines, "node '" + id + "'") ? lines["node '" + id + "'"] : null,
        words: 0,
        present: Array.isArray(node.present) ? node.present.slice() : null,
        choices: [],
        conditions: [],
        remembers: [],
        checks: [],
        spreads: [],
        todos: [],
        selfLoop: false
      };
      scenes[id] = scene;
      const walker = memoryWalker(story, scene);

      scene.words = textWords(node.text);
      walkText(node.text, function (condition, where) {
        scene.conditions.push({ where: where, text: describeCondition(condition, story) });
        walker.condition(condition, where, false);
      }, function (recall, where) {
        walker.recall(recall, where);
      });
      walker.operations(node.onEnter, "enter");

      (node.choices || []).forEach(function (choice) {
        const where = "choice '" + choice.text + "'";
        const routes = typeof choice.goto === "string"
          ? [{ node: choice.goto, condition: null }]
          : (choice.goto || []).map(function (entry) {
            return { node: entry.node, condition: entry.if === undefined ? null : entry.if };
          });
        const info = {
          id: choice.id,
          text: choice.text,
          once: choice.once === true,
          showIf: choice.showIf === undefined ? null : describeCondition(choice.showIf, story),
          tag: choice.tag === undefined ? null : choice.tag,
          routes: routes.map(function (route) {
            return {
              node: route.node,
              condition: route.condition === null ? null : describeCondition(route.condition, story)
            };
          })
        };
        scene.choices.push(info);
        if (choice.showIf !== undefined) walker.condition(choice.showIf, where, false);
        walker.operations(choice.do, "choice", choice.text);
        routes.forEach(function (route) {
          if (route.condition !== null) walker.condition(route.condition, where + " route", false);
          const conditional = choice.showIf !== undefined || route.condition !== null;
          if (route.node === id) {
            scene.selfLoop = true;
          }
          const key = id + ">" + route.node;
          if (!edgeMap.has(key)) {
            edgeMap.set(key, { key: key, from: id, to: route.node, choices: [], conditional: true });
          }
          const edge = edgeMap.get(key);
          if (edge.choices.indexOf(choice.text) === -1) edge.choices.push(choice.text);
          if (!conditional) edge.conditional = false;
        });
      });
    });

    assignTodos(scenes, order, settings.todos || []);
    const edges = Array.from(edgeMap.values());
    const graph = structure(scenes, order, start, edges);
    const memory = memoryIndex(story, scenes, order, graph);
    const problems = collectProblems(story, scenes, order, graph, memory);
    return {
      title: story.title,
      start: start,
      order: order,
      scenes: scenes,
      edges: edges,
      characters: characterList(story),
      graph: graph,
      memory: memory,
      problems: problems,
      stats: statistics(story, scenes, order, edges, graph)
    };
  }

  function walkText(text, onCondition, onRecall) {
    if (typeof text === "string" || !Array.isArray(text)) return;
    text.forEach(function (variant, index) {
      if (variant.if !== undefined) onCondition(variant.if, "text version " + (index + 1));
      if (!Array.isArray(variant.value)) return;
      variant.value.forEach(function (part) {
        if (typeof part === "string") return;
        if (part.if !== undefined) onCondition(part.if, "text");
        if (part.recall !== undefined) onRecall(part.recall, "text");
      });
    });
  }

  // Every word a scene can show, counting each version and each optional
  // passage once, so it measures how much writing the scene holds. With
  // `conditionalOnly`, only the words that are shown only sometimes: those
  // in optional passages, and all of them when the scene has versions.
  function textWords(text, conditionalOnly) {
    if (typeof text === "string") return conditionalOnly ? 0 : countWords(text);
    let total = 0;
    const versions = text.length > 1;
    text.forEach(function (variant) {
      const parts = typeof variant.value === "string" ? [variant.value] : variant.value;
      parts.forEach(function (part) {
        if (typeof part === "string") {
          if (!conditionalOnly || versions) total += countWords(part);
          return;
        }
        ["text", "else", "otherwise", "format"].forEach(function (key) {
          if (typeof part[key] === "string") total += countWords(part[key]);
        });
      });
    });
    return total;
  }

  function countWords(text) {
    const plain = String(text).replace(/\{(?:name|var):([^{}]*)\}/g, "$1").replace(/\{summary\}/g, "it");
    const words = plain.match(/[A-Za-z0-9À-ɏ'’-]+/g);
    return words === null ? 0 : words.length;
  }

  function assignTodos(scenes, order, todos) {
    const starts = order
      .filter(function (id) { return scenes[id].line !== null; })
      .sort(function (a, b) { return scenes[a].line - scenes[b].line; });
    todos.forEach(function (todo) {
      let owner = null;
      starts.forEach(function (id) {
        if (scenes[id].line <= todo.line) owner = id;
      });
      if (owner !== null) scenes[owner].todos.push(todo);
    });
  }

  // Collects what a scene remembers, checks, and passes on, expanding
  // macros where they are used.
  function memoryWalker(story, scene) {
    const macrosSeen = [];
    const memoryCheck = function (kind, condition, where, negated, concepts, traits, subject) {
      scene.checks.push({
        kind: kind,
        perspective: condition.perspective === undefined ? null : condition.perspective,
        concepts: concepts,
        traits: traits,
        subject: subject,
        negated: negated,
        where: where,
        text: describeCondition(condition, story)
      });
    };
    const walker = {
      condition: function (condition, where, negated) {
        if (!condition || typeof condition !== "object") return;
        switch (condition.type) {
          case "not":
            walker.condition(condition.condition, where, !negated);
            return;
          case "all":
          case "any":
            condition.conditions.forEach(function (child) { walker.condition(child, where, negated); });
            return;
          case "macroCondition": {
            const macro = story.macros[condition.name];
            if (!macro || macrosSeen.indexOf(condition.name) !== -1) return;
            macrosSeen.push(condition.name);
            walker.condition(macro.condition, where, negated);
            macrosSeen.pop();
            return;
          }
          case "knows":
            memoryCheck("knows", condition, where, negated,
              condition.about.concepts ? condition.about.concepts.slice() : null,
              condition.about.trait !== undefined ? [condition.about.trait] : null, null);
            return;
          case "association":
            memoryCheck("association", condition, where, negated, [condition.a, condition.b], null, null);
            return;
          case "trait":
          case "dominantTrait":
            memoryCheck("trait", condition, where, negated, null,
              condition.type === "trait" ? [condition.trait] : condition.among.slice(),
              condition.subject === undefined ? "player" : condition.subject);
            return;
          default:
            return;
        }
      },
      recall: function (spec, where) {
        const subject = spec.subject === undefined ? "player" : spec.subject;
        const traits = spec.among !== undefined ? spec.among.slice()
          : spec.about && spec.about.trait !== undefined ? [spec.about.trait] : null;
        const concepts = spec.about && spec.about.concepts ? spec.about.concepts.slice() : null;
        scene.checks.push({
          kind: "recall",
          perspective: spec.perspective === undefined ? null : spec.perspective,
          concepts: concepts,
          traits: traits,
          subject: subject,
          negated: false,
          where: where,
          text: "what " + characterName(story, spec.perspective === undefined ? null : spec.perspective) +
            " remembers " + (subject === "player" ? "you" : characterName(story, subject)) + " doing" +
            (traits !== null ? " (" + traits.join(", ") + ")" : concepts !== null ? " (" + concepts.join(" + ") + ")" : "")
        });
      },
      operations: function (list, when, choiceText) {
        (list || []).forEach(function (operation) {
          if (operation.type === "remember") {
            scene.remembers.push({
              concepts: operation.concepts.slice(),
              witnesses: operation.witnesses === undefined ? [] : operation.witnesses,
              subject: operation.subject === undefined ? null : operation.subject,
              summary: operation.summary === undefined ? null : operation.summary,
              when: when,
              choice: choiceText === undefined ? null : choiceText
            });
          } else if (operation.type === "gossip" || operation.type === "reveal") {
            scene.spreads.push({
              type: operation.type,
              from: operation.from === undefined ? null : operation.from,
              to: operation.to,
              about: operation.about === undefined ? null : operation.about,
              when: when
            });
          } else if (operation.type === "macro") {
            const macro = story.macros[operation.name];
            if (!macro || macrosSeen.indexOf(operation.name) !== -1) return;
            macrosSeen.push(operation.name);
            walker.operations(macro.do, when, choiceText);
            macrosSeen.pop();
          }
        });
      }
    };
    return walker;
  }

  // ---- Structure -------------------------------------------------------

  function structure(scenes, order, start, edges) {
    const out = {};
    const into = {};
    order.forEach(function (id) { out[id] = []; into[id] = []; });
    edges.forEach(function (edge) {
      if (!hasOwn(out, edge.from) || !hasOwn(into, edge.to)) return;
      if (out[edge.from].indexOf(edge.to) === -1) out[edge.from].push(edge.to);
      if (into[edge.to].indexOf(edge.from) === -1) into[edge.to].push(edge.from);
    });
    const endings = order.filter(function (id) { return scenes[id].ending; });
    const reachable = search([start], out, null);
    const canEnd = search(endings, into, null);
    // Scenes reachable from each scene in one or more choices.
    const after = {};
    order.forEach(function (id) { after[id] = search(out[id], out, null); });

    const endingReachable = endings.some(function (id) { return reachable.has(id); });
    const chokePoints = !endingReachable ? [] : order.filter(function (id) {
      if (id === start || scenes[id].ending || !reachable.has(id)) return false;
      const without = search([start], out, id);
      return !endings.some(function (ending) { return without.has(ending); });
    });

    // Fewest choices from the start to any ending.
    const distance = {};
    distance[start] = 0;
    const queue = [start];
    let shortest = null;
    while (queue.length > 0) {
      const id = queue.shift();
      if (scenes[id].ending && shortest === null) shortest = distance[id];
      out[id].forEach(function (next) {
        if (distance[next] === undefined) {
          distance[next] = distance[id] + 1;
          queue.push(next);
        }
      });
    }

    return {
      out: out,
      into: into,
      after: after,
      reachable: reachable,
      unreachable: order.filter(function (id) { return !reachable.has(id); }),
      deadEnds: order.filter(function (id) {
        return reachable.has(id) && !scenes[id].ending && !canEnd.has(id);
      }),
      chokePoints: chokePoints,
      shortestRoute: shortest
    };
  }

  function search(from, next, skip) {
    const seen = new Set();
    const stack = from.filter(function (id) { return id !== skip; });
    while (stack.length > 0) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      (next[id] || []).forEach(function (other) {
        if (other !== skip && !seen.has(other)) stack.push(other);
      });
    }
    return seen;
  }

  // ---- Memory: where things are set up and where they pay off ----------

  function memoryIndex(story, scenes, order, graph) {
    const concepts = {};
    const traits = {};
    const entry = function (table, key) {
      if (!hasOwn(table, key)) table[key] = { key: key, setups: [], checks: [] };
      return table[key];
    };
    const addSetup = function (record, sceneId) {
      if (record.setups.indexOf(sceneId) === -1) record.setups.push(sceneId);
    };
    Object.keys(story.traits).forEach(function (trait) { entry(traits, trait); });

    order.forEach(function (id) {
      scenes[id].remembers.forEach(function (memory) {
        memory.concepts.forEach(function (concept) { addSetup(entry(concepts, concept), id); });
        Object.keys(story.traits).forEach(function (trait) {
          if (memory.concepts.some(function (concept) { return hasOwn(story.traits[trait].concepts, concept); })) {
            addSetup(entry(traits, trait), id);
          }
        });
      });
    });

    order.forEach(function (id) {
      scenes[id].checks.forEach(function (check) {
        assess(story, scenes, order, graph, id, check);
        (check.traits || []).forEach(function (trait) {
          entry(traits, trait).checks.push({ scene: id, check: check });
        });
        (check.concepts || []).forEach(function (concept) {
          entry(concepts, concept).checks.push({ scene: id, check: check });
        });
      });
    });
    return { concepts: concepts, traits: traits };
  }

  // Can this check come true in a single run? Fills in check.status:
  //   "ok"        something that satisfies it can happen earlier in the run
  //   "never"     nothing in the story ever remembers what it asks about
  //   "earlier"   only memory kept from an earlier run can make it true
  //   "unseen"    it can happen first, but the character asked about never
  //               witnesses it or hears of it before here
  // and check.setups to the scenes that can satisfy it earlier in the run.
  function assess(story, scenes, order, graph, sceneId, check) {
    const matches = [];
    order.forEach(function (id) {
      scenes[id].remembers.forEach(function (memory) {
        if (satisfies(story, memory, check)) matches.push({ scene: id, memory: memory });
      });
    });
    const earlier = matches.filter(function (match) {
      return comesBefore(graph, match.scene, sceneId, match.memory.when === "enter");
    });
    check.setups = unique(earlier.map(function (match) { return match.scene; }));
    if (check.negated) {
      check.status = "ok";
      return;
    }
    if (matches.length === 0) {
      check.status = "never";
      return;
    }
    if (earlier.length === 0) {
      check.status = "earlier";
      return;
    }
    const who = check.perspective;
    if (who === null || who === "player" || !hasOwn(story.characters, who)) {
      check.status = "ok";
      return;
    }
    const sees = earlier.some(function (match) { return includesCharacter(match.memory.witnesses, who); });
    const hears = !sees && order.some(function (id) {
      return comesBefore(graph, id, sceneId, true) && scenes[id].spreads.some(function (spread) {
        return includesCharacter(spread.to, who) && earlier.some(function (match) {
          return spreadCarries(story, spread, match.memory);
        });
      });
    });
    check.status = sees || hears ? "ok" : "unseen";
  }

  function satisfies(story, memory, check) {
    const has = function (concept) { return memory.concepts.indexOf(concept) !== -1; };
    if ((check.kind === "trait" || check.kind === "recall") && !has(check.subject || "player")) return false;
    if (check.traits !== null) {
      return check.traits.some(function (trait) {
        const weights = story.traits[trait] ? story.traits[trait].concepts : {};
        return memory.concepts.some(function (concept) { return hasOwn(weights, concept); });
      });
    }
    return (check.concepts || []).every(has);
  }

  function spreadCarries(story, spread, memory) {
    if (spread.about === null) return true;
    if (spread.about.trait !== undefined) {
      const weights = story.traits[spread.about.trait] ? story.traits[spread.about.trait].concepts : {};
      return memory.concepts.some(function (concept) { return hasOwn(weights, concept); });
    }
    return (spread.about.concepts || []).every(function (concept) {
      return memory.concepts.indexOf(concept) !== -1;
    });
  }

  // True when something done in `from` can have happened by the time the
  // player is in `to`. Within one scene, only what happens on entering it
  // comes before its text and choices (unless the scene can loop back).
  function comesBefore(graph, from, to, onEntry) {
    if (from === to) return onEntry || graph.after[from].has(from);
    return graph.after[from].has(to);
  }

  function includesCharacter(list, id) {
    return list === "all" || (Array.isArray(list) && list.some(function (who) { return who === id; }));
  }

  // ---- Problems -------------------------------------------------------

  function collectProblems(story, scenes, order, graph, memory) {
    const problems = [];
    const add = function (scene, severity, message) {
      problems.push({ scene: scene, severity: severity, message: message });
    };
    if (!order.some(function (id) { return scenes[id].ending && graph.reachable.has(id); })) {
      add(null, "problem", "No ending can be reached from the start.");
    }
    graph.unreachable.forEach(function (id) {
      add(id, "problem", "No choice leads here from the start.");
    });
    graph.deadEnds.forEach(function (id) {
      add(id, "problem", "No ending can be reached from here.");
    });
    order.forEach(function (id) {
      const scene = scenes[id];
      scene.checks.forEach(function (check) {
        const recall = check.kind === "recall";
        if (check.status === "never") {
          add(id, recall ? "note" : "problem", recall
            ? "Nothing in the story matches “" + check.text + "”, so this recall always falls back."
            : "Never true: nothing in the story remembers what “" + check.text + "” asks about.");
        } else if (check.status === "unseen") {
          add(id, recall ? "note" : "warning", characterName(story, check.perspective) +
            " never sees or hears of anything that fits before here, so " + (recall
            ? "“" + check.text + "” falls back in a single run."
            : "“" + check.text + "” can't be true in a single run."));
        }
      });
      if (scene.present !== null) {
        const missing = [];
        scene.remembers.forEach(function (remembered) {
          if (!Array.isArray(remembered.witnesses)) return;
          remembered.witnesses.forEach(function (who) {
            if (scene.present.indexOf(who) === -1 && missing.indexOf(who) === -1) missing.push(who);
          });
        });
        if (missing.length > 0) {
          add(id, "note", missing.map(function (who) { return characterName(story, who); }).join(", ") +
            (missing.length === 1 ? " sees" : " see") + " something here but " +
            (missing.length === 1 ? "isn't" : "aren't") + " in its present: line.");
        }
      }
    });
    return problems;
  }

  // ---- Statistics -------------------------------------------------------

  function statistics(story, scenes, order, edges, graph) {
    let choices = 0;
    let conditionalChoices = 0;
    let conditionalRoutes = 0;
    let choiceWords = 0;
    order.forEach(function (id) {
      scenes[id].choices.forEach(function (choice) {
        choices += 1;
        choiceWords += countWords(choice.text);
        if (choice.showIf !== null) conditionalChoices += 1;
        if (choice.routes.length > 1) conditionalRoutes += 1;
      });
    });
    const sceneWords = order.map(function (id) { return { id: id, words: scenes[id].words }; })
      .sort(function (a, b) { return a.words - b.words; });
    const textTotal = sceneWords.reduce(function (sum, item) { return sum + item.words; }, 0);
    const conditionalWords = order.reduce(function (sum, id) {
      return sum + textWords(story.nodes[id].text, true);
    }, 0);
    return {
      scenes: order.length,
      endings: order.filter(function (id) { return scenes[id].ending; }).length,
      choices: choices,
      conditionalChoices: conditionalChoices,
      conditionalRoutes: conditionalRoutes,
      words: textTotal + choiceWords,
      sceneWords: {
        min: sceneWords[0],
        median: sceneWords[Math.floor(sceneWords.length / 2)],
        max: sceneWords[sceneWords.length - 1]
      },
      conditionalShare: textTotal === 0 ? 0 : conditionalWords / textTotal,
      characters: Object.keys(story.characters).length,
      traits: Object.keys(story.traits).length,
      shortestRoute: graph.shortestRoute,
      loops: order.filter(function (id) { return graph.after[id].has(id); }).length
    };
  }


  // ---- Describing conditions -----------------------------------------------

  const OPERATORS = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤" };

  function describeCondition(condition, story) {
    if (!condition || typeof condition !== "object") return "";
    const who = function (id) { return id === undefined ? "anyone" : characterName(story, id); };
    switch (condition.type) {
      case "always":
        return "otherwise";
      case "knows":
        return who(condition.perspective) + " knows " + describeAbout(condition.about);
      case "association":
        return (condition.perspective === undefined ? "" : who(condition.perspective) + ": ") +
          condition.a + " linked to " + condition.b + " ≥ " + condition.min;
      case "trait":
        return who(condition.perspective) + " sees " +
          (condition.subject === undefined ? "you" : characterName(story, condition.subject)) + " as " + condition.trait +
          (condition.min !== undefined ? " ≥ " + condition.min : "") +
          (condition.max !== undefined ? " ≤ " + condition.max : "");
      case "dominantTrait":
        return who(condition.perspective) + " sees " +
          (condition.subject === undefined ? "you" : characterName(story, condition.subject)) + " as more " +
          condition.is + " than " + condition.among.filter(function (trait) { return trait !== condition.is; }).join(" or ");
      case "variable":
        return condition.name + " " + (OPERATORS[condition.operator] || condition.operator) + " " + condition.value;
      case "visited":
        return condition.operator === undefined
          ? "visited " + condition.node
          : "visits to " + condition.node + " " + (OPERATORS[condition.operator] || condition.operator) + " " + condition.value;
      case "firstVisit":
        return "first visit";
      case "not":
        return "not (" + describeCondition(condition.condition, story) + ")";
      case "all":
        return condition.conditions.map(function (child) { return describeCondition(child, story); }).join(" and ");
      case "any":
        return condition.conditions.map(function (child) { return describeCondition(child, story); }).join(" or ");
      case "macroCondition": {
        const macro = story.macros[condition.name];
        return condition.name + (macro && macro.tag ? " (" + macro.tag + ")" : "");
      }
      default:
        return condition.type;
    }
  }

  function describeAbout(about) {
    if (about === undefined) return "anything";
    if (about.trait !== undefined) return "something " + about.trait;
    return (about.concepts || []).join(" + ");
  }

  function characterList(story) {
    return Object.keys(story.characters).map(function (id) {
      const character = story.characters[id];
      return { id: id, name: character.name || id, hidden: character.hidden === true };
    });
  }

  function characterName(story, id) {
    if (id === null || id === undefined) return "the world";
    if (id === "player") return "you";
    const character = story.characters[id];
    return character && character.name ? character.name : String(id);
  }

  // ---- Layout -----------------------------------------------------------
  // A layered drawing: the start at the top, endings along the bottom, every
  // choice pointing downwards except the ones that loop back. Long arrows
  // pass through invisible waypoints so they bend around scenes, and the
  // order within each row is chosen to keep crossings down.

  function layout(analysis) {
    const order = analysis.order;
    const scenes = analysis.scenes;
    const edges = analysis.edges.filter(function (edge) {
      return edge.from !== edge.to && hasOwn(scenes, edge.from) && hasOwn(scenes, edge.to);
    });
    const fileIndex = {};
    order.forEach(function (id, index) { fileIndex[id] = index; });

    // 1. Find the arrows that loop back, so the rest form a hierarchy.
    const out = {};
    order.forEach(function (id) { out[id] = []; });
    edges.forEach(function (edge) { out[edge.from].push(edge); });
    const state = {};
    const back = new Set();
    const visit = function (id) {
      state[id] = 1;
      out[id].forEach(function (edge) {
        if (state[edge.to] === 1) back.add(edge.key);
        else if (state[edge.to] === undefined) visit(edge.to);
      });
      state[id] = 2;
    };
    visit(analysis.start);
    order.forEach(function (id) { if (state[id] === undefined) visit(id); });

    // 2. Rows: each scene sits one row below the lowest scene that leads to it.
    const forward = edges.map(function (edge) {
      return back.has(edge.key)
        ? { key: edge.key, upper: edge.to, lower: edge.from, back: true, edge: edge }
        : { key: edge.key, upper: edge.from, lower: edge.to, back: false, edge: edge };
    });
    const rank = {};
    const incoming = {};
    order.forEach(function (id) { incoming[id] = 0; });
    forward.forEach(function (link) { incoming[link.lower] += 1; });
    const ready = order.filter(function (id) { return incoming[id] === 0; });
    ready.forEach(function (id) { rank[id] = 0; });
    while (ready.length > 0) {
      const id = ready.shift();
      forward.forEach(function (link) {
        if (link.upper !== id) return;
        rank[link.lower] = Math.max(rank[link.lower] || 0, rank[id] + 1);
        incoming[link.lower] -= 1;
        if (incoming[link.lower] === 0) ready.push(link.lower);
      });
    }
    order.forEach(function (id) { if (rank[id] === undefined) rank[id] = 0; });
    // The start goes on the top row even if a loop leads back to it.
    let deepest = 0;
    order.forEach(function (id) { deepest = Math.max(deepest, rank[id]); });
    const endingRow = order.some(function (id) { return scenes[id].ending && rank[id] < deepest; })
      ? deepest + 1 : deepest;
    order.forEach(function (id) {
      if (scenes[id].ending) rank[id] = endingRow;
    });
    let rows = 0;
    order.forEach(function (id) { rows = Math.max(rows, rank[id] + 1); });

    // 3. Waypoints for arrows that skip rows.
    const vertices = {};
    const layers = [];
    for (let row = 0; row < rows; row += 1) layers.push([]);
    order.forEach(function (id) {
      vertices[id] = { id: id, real: true, rank: rank[id], width: NODE_W, up: [], down: [], seed: fileIndex[id] };
      layers[rank[id]].push(id);
    });
    const chains = [];
    let dummyCount = 0;
    forward.forEach(function (link) {
      const chain = [link.upper];
      for (let row = rank[link.upper] + 1; row < rank[link.lower]; row += 1) {
        const id = "\u0000" + (dummyCount += 1);
        vertices[id] = { id: id, real: false, rank: row, width: DUMMY_W, up: [], down: [], seed: fileIndex[link.upper] + 0.5 };
        layers[row].push(id);
        chain.push(id);
      }
      chain.push(link.lower);
      for (let index = 0; index + 1 < chain.length; index += 1) {
        vertices[chain[index]].down.push(chain[index + 1]);
        vertices[chain[index + 1]].up.push(chain[index]);
      }
      chains.push({ link: link, chain: chain });
    });

    // 4. Order each row to reduce crossings (barycentre sweeps).
    const position = {};
    const renumber = function (layer) { layer.forEach(function (id, index) { position[id] = index; }); };
    layers.forEach(function (layer) {
      layer.sort(function (a, b) { return vertices[a].seed - vertices[b].seed; });
      renumber(layer);
    });
    for (let row = 1; row < rows; row += 1) sortByNeighbours(layers[row], "up");
    let best = layers.map(function (layer) { return layer.slice(); });
    let bestCrossings = countCrossings(layers);
    for (let sweep = 0; sweep < ORDER_SWEEPS && bestCrossings > 0; sweep += 1) {
      if (sweep % 2 === 0) {
        for (let row = 1; row < rows; row += 1) sortByNeighbours(layers[row], "up");
      } else {
        for (let row = rows - 2; row >= 0; row -= 1) sortByNeighbours(layers[row], "down");
      }
      const crossings = countCrossings(layers);
      if (crossings < bestCrossings) {
        bestCrossings = crossings;
        best = layers.map(function (layer) { return layer.slice(); });
      }
    }
    best.forEach(function (layer, row) {
      layers[row] = layer;
      renumber(layer);
    });

    function sortByNeighbours(layer, side) {
      const weight = {};
      layer.forEach(function (id) {
        const neighbours = vertices[id][side];
        weight[id] = neighbours.length === 0 ? position[id]
          : neighbours.reduce(function (sum, other) { return sum + position[other]; }, 0) / neighbours.length;
      });
      layer.sort(function (a, b) { return weight[a] - weight[b] || position[a] - position[b]; });
      renumber(layer);
    }

    function countCrossings(all) {
      let total = 0;
      for (let row = 0; row + 1 < all.length; row += 1) {
        const segments = [];
        all[row].forEach(function (id) {
          vertices[id].down.forEach(function (other) { segments.push([position[id], position[other]]); });
        });
        for (let i = 0; i < segments.length; i += 1) {
          for (let j = i + 1; j < segments.length; j += 1) {
            if ((segments[i][0] - segments[j][0]) * (segments[i][1] - segments[j][1]) < 0) total += 1;
          }
        }
      }
      return total;
    }

    // 5. Horizontal positions: pull each vertex towards its neighbours while
    // keeping every row in order and spaced out.
    const x = {};
    layers.forEach(function (layer) {
      let cursor = 0;
      layer.forEach(function (id) {
        x[id] = cursor + vertices[id].width / 2;
        cursor += vertices[id].width + H_GAP;
      });
    });
    const widest = Math.max.apply(null, layers.map(function (layer) {
      return layer.reduce(function (sum, id) { return sum + vertices[id].width + H_GAP; }, -H_GAP);
    }).concat([NODE_W]));
    layers.forEach(function (layer) {
      const used = layer.reduce(function (sum, id) { return sum + vertices[id].width + H_GAP; }, -H_GAP);
      layer.forEach(function (id) { x[id] += (widest - used) / 2; });
    });
    for (let sweep = 0; sweep < PLACE_SWEEPS; sweep += 1) {
      const side = sweep % 2 === 0 ? "up" : "down";
      const rowsInOrder = layers.map(function (layer, row) { return row; });
      if (side === "down") rowsInOrder.reverse();
      rowsInOrder.forEach(function (row) {
        const layer = layers[row];
        const wanted = layer.map(function (id) {
          const neighbours = vertices[id][side].concat(sweep > PLACE_SWEEPS / 2 ? vertices[id][side === "up" ? "down" : "up"] : []);
          if (neighbours.length === 0) return x[id];
          return neighbours.reduce(function (sum, other) { return sum + x[other]; }, 0) / neighbours.length;
        });
        placeRow(layer, wanted);
      });
    }

    function placeRow(layer, wanted) {
      const gap = function (index) {
        return (vertices[layer[index - 1]].width + vertices[layer[index]].width) / 2 + H_GAP;
      };
      const left = wanted.slice();
      for (let index = 1; index < layer.length; index += 1) {
        left[index] = Math.max(left[index], left[index - 1] + gap(index));
      }
      const right = wanted.slice();
      for (let index = layer.length - 2; index >= 0; index -= 1) {
        right[index] = Math.min(right[index], right[index + 1] - gap(index + 1));
      }
      layer.forEach(function (id, index) { x[id] = (left[index] + right[index]) / 2; });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    Object.keys(vertices).forEach(function (id) {
      minX = Math.min(minX, x[id] - vertices[id].width / 2);
      maxX = Math.max(maxX, x[id] + vertices[id].width / 2);
    });
    const shift = MARGIN - minX;
    const rowHeight = NODE_H + RANK_GAP;
    const y = function (id) { return MARGIN + NODE_H / 2 + vertices[id].rank * rowHeight; };

    const nodes = {};
    order.forEach(function (id) {
      nodes[id] = { id: id, x: x[id] + shift, y: y(id), w: NODE_W, h: NODE_H, rank: rank[id] };
    });

    // 6. Arrow paths, with the ends spread along each box's edge.
    const ports = {};
    order.forEach(function (id) { ports[id] = { top: [], bottom: [] }; });
    const routed = chains.map(function (item) {
      const points = item.chain.map(function (id) { return { x: x[id] + shift, y: y(id) }; });
      const route = {
        key: item.link.key,
        from: item.link.edge.from,
        to: item.link.edge.to,
        back: item.link.back,
        points: points
      };
      // In layout order the chain runs top to bottom; a loop is drawn from
      // its lower scene back up, so its arrow still points at the target.
      ports[item.chain[0]].bottom.push({ route: route, end: 0, toward: points[1].x });
      ports[item.chain[item.chain.length - 1]].top.push({ route: route, end: points.length - 1, toward: points[points.length - 2].x });
      return route;
    });
    order.forEach(function (id) {
      ["top", "bottom"].forEach(function (side) {
        const list = ports[id][side].sort(function (a, b) { return a.toward - b.toward; });
        const span = Math.min(NODE_W * 0.6, (list.length - 1) * 18);
        list.forEach(function (port, index) {
          const offset = list.length === 1 ? 0 : -span / 2 + span * index / (list.length - 1);
          const point = port.route.points[port.end];
          point.x = nodes[id].x + offset;
          point.y = nodes[id].y + (side === "top" ? -NODE_H / 2 : NODE_H / 2);
        });
      });
    });
    routed.forEach(function (route) {
      if (route.back) route.points.reverse();
    });

    return {
      width: maxX - minX + MARGIN * 2,
      height: MARGIN * 2 + rows * rowHeight - RANK_GAP,
      rows: rows,
      nodes: nodes,
      edges: routed,
      selfLoops: order.filter(function (id) { return scenes[id].selfLoop; }),
      crossings: bestCrossings
    };
  }

  // ---- Helpers ------------------------------------------------------------

  function unique(list) {
    return list.filter(function (item, index) { return list.indexOf(item) === index; });
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  const StoryMap = Object.freeze({
    analyse: analyse,
    layout: layout,
    describeCondition: describeCondition,
    countWords: countWords,
    NODE_W: NODE_W,
    NODE_H: NODE_H
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = StoryMap;
  }
  if (root) {
    root.StoryMap = StoryMap;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
