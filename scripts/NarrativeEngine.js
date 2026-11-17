(function (root) {
  "use strict";

  const CONDITION_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte"];
  const BUILTIN_OPERATIONS = [
    "remember",
    "learnTransition",
    "activate",
    "set",
    "inc",
    "dec",
    "macro",
    "gossip",
    "reveal"
  ];
  const BUILTIN_CONDITIONS = [
    "always",
    "association",
    "activation",
    "transition",
    "variable",
    "visited",
    "not",
    "all",
    "any",
    "macroCondition",
    "trait",
    "dominantTrait",
    "knows"
  ];
  const DEFAULT_SUBJECT = "player";
  const WORLD_PERSPECTIVE = "\u0000world";
  const DEFAULT_GOSSIP_BELIEF = 0.5;
  const DEFAULT_REVEAL_BELIEF = 1;
  const PERSONAL_RECALL_BONUS = 1.5;
  const MAX_EXPLANATION_ITEMS = 3;

  class NarrativeEngine {
    constructor(storyDefinition, options) {
      const settings = options === undefined ? {} : options;
      if (!isRecord(settings)) {
        throw new TypeError("NarrativeEngine options must be an object.");
      }
      if (!root || typeof root.MemoryGraph !== "function") {
        throw new Error("MemoryGraph must be loaded before NarrativeEngine.");
      }

      this.story = cloneJsonValue(storyDefinition, "story definition");
      this.graph = settings.graph === undefined
        ? new root.MemoryGraph()
        : settings.graph;
      if (!this.graph || typeof this.graph.remember !== "function" ||
          typeof this.graph.associationScore !== "function" ||
          typeof this.graph.activateMany !== "function" ||
          typeof this.graph.learnTransition !== "function" ||
          typeof this.graph.transitionCount !== "function" ||
          typeof this.graph.clear !== "function") {
        throw new TypeError("graph must be a compatible MemoryGraph instance.");
      }

      this.operationHandlers = new Map();
      this.conditionHandlers = new Map();
      this.operations = createRegistry(
        "operation",
        this.operationHandlers,
        BUILTIN_OPERATIONS
      );
      this.conditions = createRegistry(
        "condition",
        this.conditionHandlers,
        BUILTIN_CONDITIONS
      );
      registerInitialHandlers(
        settings.operationHandlers,
        this.operations,
        "operation"
      );
      registerInitialHandlers(
        settings.conditionHandlers,
        this.conditions,
        "condition"
      );

      this.initialVariables = settings.initialVariables === undefined
        ? {}
        : isPlainRecord(settings.initialVariables)
          ? cloneJsonValue(settings.initialVariables, "initialVariables")
          : invalidInitialVariables();
      this._validateStory(true);
      this.knowledge = {};
      this._knowledgeRevision = 0;
      this._perspectiveCache = new Map();
      this._recording = null;
      this._clearProgress();
    }

    start(nodeId) {
      this._validateStory(false);
      if (this.currentNodeId !== null) {
        throw new Error("Story '" + this.story.id + "' has already started; reset it first.");
      }
      const target = nodeId === undefined
        ? this.story.start
        : normalizeName(nodeId, "start node ID");
      if (!hasOwn(this.story.nodes, target)) {
        throw storyError(this.story, "unknown start node '" + target + "'.");
      }
      return this._enterNode(target);
    }

    getView() {
      if (this.currentNodeId === null) {
        throw new Error("Story '" + this.story.id + "' has not started.");
      }
      const node = this.story.nodes[this.currentNodeId];
      try {
        const resolved = resolveText(node.text, this);
        const choices = [];
        if (!node.ending) {
          for (const choice of node.choices) {
            if (choice.showIf === undefined || this._evaluateCondition(choice.showIf)) {
              const entry = {
                index: choices.length,
                id: choice.id,
                text: choice.text
              };
              const cause = choice.showIf === undefined
                ? null
                : this._cause(choice.showIf, choice.tag);
              if (cause !== null) {
                entry.cause = cause;
              }
              choices.push(entry);
            }
          }
          if (choices.length === 0) {
            throw storyError(
              this.story,
              "node '" + this.currentNodeId + "' has no visible choices."
            );
          }
        }
        const view = {
          nodeId: this.currentNodeId,
          text: resolved.text,
          segments: resolved.segments,
          choices: choices,
          ended: node.ending === true
        };
        if (this.choiceEcho !== null) {
          view.echo = cloneJsonValue(this.choiceEcho, "choice echo");
        }
        if (this.arrivalCause !== null) {
          view.arrival = cloneJsonValue(this.arrivalCause, "arrival cause");
        }
        return view;
      } catch (error) {
        if (error && typeof error.message === "string" &&
            error.message.indexOf("Story '" + this.story.id + "'") === 0) {
          throw error;
        }
        throw new Error(
          "Story '" + this.story.id + "', node '" + this.currentNodeId +
          "' view failed: " + errorText(error)
        );
      }
    }

    choose(index) {
      if (this.currentNodeId === null) {
        throw new Error("Story '" + this.story.id + "' has not started.");
      }
      if (!Number.isSafeInteger(index) || index < 0) {
        throw new TypeError("Choice index must be a non-negative integer.");
      }

      const view = this.getView();
      const visibleChoice = view.choices[index];
      if (!visibleChoice) {
        throw storyError(
          this.story,
          "node '" + this.currentNodeId + "' has no visible choice at index " + index + "."
        );
      }

      const nodeId = this.currentNodeId;
      const node = this.story.nodes[nodeId];
      const choice = node.choices.find(function (item) {
        return item.id === visibleChoice.id;
      });
      this._recording = [];
      try {
        this._executeOperations(choice.do || [], {
          nodeId: nodeId,
          choiceId: choice.id,
          path: "choice operation"
        });
      } finally {
        this._choiceRecords = this._recording;
        this._recording = null;
      }
      const echo = this._echo(this._choiceRecords);

      this.choiceHistory.push({ nodeId: nodeId, choiceId: choice.id });
      let destination;
      let arrival = null;
      try {
        const route = resolveRoute(choice.goto, this);
        destination = route.node;
        if (route.entry !== null && route.entry.if !== undefined) {
          arrival = this._cause(route.entry.if, route.entry.tag);
        }
      } catch (error) {
        throw new Error(
          "Story '" + this.story.id + "', node '" + nodeId + "', choice '" +
          choice.id + "' route failed: " + errorText(error)
        );
      }
      return this._enterNode(destination, arrival, echo);
    }

    goTo(nodeId) {
      if (this.currentNodeId === null) {
        throw new Error("Story '" + this.story.id + " has not started.");
      }
      const target = normalizeName(nodeId, "destination node ID");
      if (!hasOwn(this.story.nodes, target)) {
        throw storyError(this.story, "cannot navigate to unknown node '" + target + "'.");
      }
      return this._enterNode(target);
    }

    reset(options) {
      const settings = options === undefined ? {} : options;
      if (!isRecord(settings)) {
        throw new TypeError("reset() options must be an object.");
      }
      const keepMemory = settings.keepMemory === undefined
        ? false
        : settings.keepMemory;
      if (typeof keepMemory !== "boolean") {
        throw new TypeError("reset() keepMemory must be a boolean.");
      }
      if (!keepMemory) {
        this.graph.clear();
        this.knowledge = {};
        this._knowledgeRevision += 1;
      }
      this._perspectiveCache.clear();
      this._clearProgress();
    }

    characterName(id) {
      const character = this._character(id);
      return character.name === undefined ? character.id : character.name;
    }

    // Returns a MemoryGraph containing only what one character knows, with
    // each event weighted by that character's belief and, when the story
    // sets memory.halfLife, by how recently it happened. Omit perspective for
    // the whole world's (recency-weighted) view. Treat the result as read-only.
    perspectiveGraph(perspective) {
      const key = this._perspectiveKey(perspective);
      const revision = this._memoryRevision();
      const cached = this._perspectiveCache.get(key);
      if (cached && revision !== null && cached.revision === revision) {
        return cached.graph;
      }
      const snapshot = this._memorySnapshot();
      const graph = new root.MemoryGraph();
      for (const event of snapshot.events) {
        const weight = event.strength * this._belief(key, event.id) *
          this._recency(event.sequence, snapshot.sequence);
        if (weight > 0) {
          graph.remember({
            concepts: event.concepts,
            strength: weight,
            metadata: event.metadata
          });
        }
      }
      this._perspectiveCache.set(key, { revision: revision, graph: graph });
      return graph;
    }

    traitScore(trait, perspective, subject) {
      const definition = this._trait(trait);
      const who = subject === undefined ? DEFAULT_SUBJECT : normalizeName(subject, "subject");
      const graph = this.perspectiveGraph(perspective);
      let total = 0;
      for (const concept of Object.keys(definition.concepts).sort()) {
        total += definition.concepts[concept] * graph.associationScore(who, concept);
      }
      return total;
    }

    traitScores(perspective, subject) {
      const scores = {};
      for (const trait of Object.keys(this.story.traits)) {
        defineValue(scores, trait, this.traitScore(trait, perspective, subject));
      }
      return scores;
    }

    // Finds the remembered event (with a summary) that best matches `about`
    // from a perspective. Returns null when nothing matches.
    recall(spec) {
      const settings = spec === undefined ? {} : spec;
      const key = this._perspectiveKey(settings.perspective);
      const subject = settings.subject === undefined
        ? DEFAULT_SUBJECT
        : normalizeName(settings.subject, "recall subject");
      const rank = settings.rank === undefined ? 1 : settings.rank;
      let about = settings.about;
      if (settings.among !== undefined) {
        const trait = this._dominantAmong(settings.among, settings.perspective, subject);
        if (trait === null) {
          return null;
        }
        about = { trait: trait };
      }
      const snapshot = this._memorySnapshot();
      const candidates = [];
      for (const event of snapshot.events) {
        if (!isRecord(event.metadata) || typeof event.metadata.summary !== "string" ||
            event.concepts.indexOf(subject) === -1) {
          continue;
        }
        const relevance = this._recallWeight(event, about);
        const belief = this._belief(key, event.id);
        // Things done to or with the remembering character weigh more.
        const personal = key !== WORLD_PERSPECTIVE && event.concepts.indexOf(key) !== -1
          ? PERSONAL_RECALL_BONUS
          : 1;
        const score = event.strength * belief * relevance * personal *
          this._recency(event.sequence, snapshot.sequence);
        if (score > 0) {
          candidates.push({ event: event, score: score, belief: belief });
        }
      }
      candidates.sort(function (a, b) {
        return b.score - a.score || b.event.sequence - a.event.sequence;
      });
      const pick = candidates[rank - 1];
      return pick === undefined ? null : {
        eventId: pick.event.id,
        summary: pick.event.metadata.summary,
        score: pick.score,
        belief: pick.belief
      };
    }

    // Plain-data summary of how each character remembers the subject.
    describeReputation(subject) {
      const result = [];
      for (const id of Object.keys(this.story.characters)) {
        const known = this.knowledge[id];
        const eventCount = known === undefined ? 0 : Object.keys(known).length;
        if (eventCount === 0) {
          continue;
        }
        const scores = this.traitScores(id, subject);
        const traits = Object.keys(scores)
          .filter(function (trait) { return scores[trait] > 0; })
          .sort(function (a, b) { return scores[b] - scores[a] || compareNames(a, b); })
          .map((trait) => ({ trait: trait, label: this.traitLabel(trait), score: scores[trait] }));
        const memory = this.recall({
          perspective: id,
          subject: subject,
          among: Object.keys(this.story.traits)
        });
        result.push({
          character: id,
          name: this.characterName(id),
          hidden: this.story.characters[id].hidden === true,
          knownEvents: eventCount,
          traits: traits,
          memory: memory === null ? null : memory.summary
        });
      }
      return result;
    }

    // One perspective's full view of the subject, for live displays: every
    // non-zero trait score (negative ones included) and the defining memory.
    // Omit perspective for the overall (world) view.
    reputationOf(perspective, subject) {
      const key = this._perspectiveKey(perspective);
      const scores = this.traitScores(perspective, subject);
      const traits = Object.keys(scores)
        .filter(function (trait) { return Math.abs(scores[trait]) >= 0.05; })
        .sort(function (a, b) {
          return Math.abs(scores[b]) - Math.abs(scores[a]) || compareNames(a, b);
        })
        .map((trait) => ({
          trait: trait,
          label: this.traitLabel(trait),
          color: this.story.traits[trait].color === undefined ? null : this.story.traits[trait].color,
          score: scores[trait]
        }));
      const memory = this.recall({
        perspective: perspective,
        subject: subject,
        among: Object.keys(this.story.traits)
      });
      return {
        character: key === WORLD_PERSPECTIVE ? null : key,
        name: key === WORLD_PERSPECTIVE ? null : this.characterName(key),
        traits: traits,
        memory: memory === null ? null : memory.summary
      };
    }

    // Characters who know at least one event, in story order. Hidden
    // characters (such as a secret police file) are left out unless asked for.
    knownCharacters(options) {
      const includeHidden = options !== undefined && options.includeHidden === true;
      return Object.keys(this.story.characters).filter((id) => {
        const known = this.knowledge[id];
        return known !== undefined && Object.keys(known).length > 0 &&
          (includeHidden || this.story.characters[id].hidden !== true);
      });
    }

    traitLabel(trait) {
      const definition = this._trait(trait);
      return definition.label === undefined ? trait.replace(/_/g, " ") : definition.label;
    }

    toJSON() {
      return {
        version: 2,
        currentNodeId: this.currentNodeId,
        nodeVisits: this.nodeVisits.slice(),
        choiceHistory: this.choiceHistory.map(function (entry) {
          return { nodeId: entry.nodeId, choiceId: entry.choiceId };
        }),
        variables: cloneJsonValue(this.variables, "variables"),
        knowledge: cloneJsonValue(this.knowledge, "knowledge"),
        ended: this.ended
      };
    }

    loadState(data) {
      if (!isRecord(data) || (data.version !== 1 && data.version !== 2)) {
        throw new TypeError("NarrativeEngine state must be a version 1 or 2 object.");
      }
      const knowledge = data.version === 1 ? {} : this._validateKnowledge(data.knowledge);
      if (data.currentNodeId !== null &&
          (typeof data.currentNodeId !== "string" ||
           !hasOwn(this.story.nodes, data.currentNodeId))) {
        throw new Error("Saved current node does not exist in story '" + this.story.id + "'.");
      }
      if (!Array.isArray(data.nodeVisits) || !Array.isArray(data.choiceHistory)) {
        throw new TypeError("Saved state must include nodeVisits and choiceHistory arrays.");
      }
      const nodeVisits = data.nodeVisits.map((nodeId) => {
        if (typeof nodeId !== "string" || !hasOwn(this.story.nodes, nodeId)) {
          throw new Error("Saved visit history contains an unknown node.");
        }
        return nodeId;
      });
      const choiceHistory = data.choiceHistory.map((entry) => {
        if (!isRecord(entry) || typeof entry.nodeId !== "string" ||
            typeof entry.choiceId !== "string" ||
            !hasOwn(this.story.nodes, entry.nodeId)) {
          throw new Error("Saved choice history contains an invalid entry.");
        }
        const node = this.story.nodes[entry.nodeId];
        if (!node.choices.some(function (choice) {
          return choice.id === entry.choiceId;
        })) {
          throw new Error("Saved choice history references an unknown choice.");
        }
        return { nodeId: entry.nodeId, choiceId: entry.choiceId };
      });
      if ((data.currentNodeId === null &&
           (nodeVisits.length > 0 || data.ended !== false)) ||
          (data.currentNodeId !== null &&
           (nodeVisits.length === 0 ||
            nodeVisits[nodeVisits.length - 1] !== data.currentNodeId))) {
        throw new Error("Saved current node and visit history are inconsistent.");
      }
      if (typeof data.ended !== "boolean" ||
          (data.currentNodeId !== null &&
           data.ended !== (this.story.nodes[data.currentNodeId].ending === true))) {
        throw new Error("Saved ended state does not match the current story node.");
      }
      if (!isPlainRecord(data.variables)) {
        throw new TypeError("Saved variables must be a plain object.");
      }
      const variables = cloneJsonValue(data.variables, "saved variables");

      this.currentNodeId = data.currentNodeId;
      this.nodeVisits = nodeVisits;
      this.choiceHistory = choiceHistory;
      this.variables = variables;
      this.knowledge = knowledge;
      this._knowledgeRevision += 1;
      this._perspectiveCache.clear();
      this.arrivalCause = null;
      this.choiceEcho = null;
      this.ended = data.ended;
      return this.currentNodeId === null ? null : this.getView();
    }

    _validateKnowledge(value) {
      if (!isPlainRecord(value)) {
        throw new TypeError("Saved knowledge must be a plain object.");
      }
      const knowledge = {};
      for (const [character, events] of Object.entries(value)) {
        if (!hasOwn(this.story.characters, character)) {
          throw new Error("Saved knowledge references unknown character '" + character + "'.");
        }
        if (!isPlainRecord(events)) {
          throw new TypeError("Saved knowledge for '" + character + "' must be a plain object.");
        }
        const entries = {};
        for (const [eventId, belief] of Object.entries(events)) {
          if (!/^event-[1-9]\d*$/.test(eventId)) {
            throw new TypeError("Saved knowledge event IDs must use the event-N format.");
          }
          defineValue(entries, eventId, validateBelief(belief, "saved belief"));
        }
        defineValue(knowledge, character, entries);
      }
      return knowledge;
    }

    _character(id) {
      const name = normalizeName(id, "character");
      if (!hasOwn(this.story.characters, name)) {
        throw storyError(this.story, "unknown character '" + name + "'.");
      }
      return { id: name, name: this.story.characters[name].name };
    }

    _trait(trait) {
      const name = normalizeName(trait, "trait");
      if (!hasOwn(this.story.traits, name)) {
        throw storyError(this.story, "unknown trait '" + name + "'.");
      }
      return this.story.traits[name];
    }

    _perspectiveKey(perspective) {
      return perspective === undefined ? WORLD_PERSPECTIVE : this._character(perspective).id;
    }

    _belief(key, eventId) {
      if (key === WORLD_PERSPECTIVE) {
        return 1;
      }
      const known = this.knowledge[key];
      return known !== undefined && hasOwn(known, eventId) ? known[eventId] : 0;
    }

    _recency(sequence, now) {
      const halfLife = this.story.memory.halfLife;
      return halfLife === undefined ? 1 : Math.pow(0.5, (now - sequence) / halfLife);
    }

    _memoryRevision() {
      return typeof this.graph.sequence === "number"
        ? this.graph.sequence + ":" + this._knowledgeRevision
        : null;
    }

    _memorySnapshot() {
      if (typeof this.graph.toJSON !== "function") {
        throw new TypeError("Perspective features require a graph with toJSON().");
      }
      const data = this.graph.toJSON();
      return { events: data.events, sequence: data.sequence };
    }

    _learn(character, eventId, belief) {
      let known = this.knowledge[character];
      if (known === undefined) {
        known = {};
        defineValue(this.knowledge, character, known);
      }
      const current = hasOwn(known, eventId) ? known[eventId] : 0;
      if (belief > current) {
        defineValue(known, eventId, belief);
        this._knowledgeRevision += 1;
      }
    }

    _characters(value) {
      if (value === "all") {
        return Object.keys(this.story.characters);
      }
      return value.map((id) => this._character(id).id);
    }

    // True when an event is about the topic at all (any trait concept, or all
    // listed concepts). Used to decide what gets passed on or revealed.
    _concerns(event, about) {
      if (about === undefined) {
        return true;
      }
      if (about.trait !== undefined) {
        const weights = this._trait(about.trait).concepts;
        return event.concepts.some(function (concept) { return hasOwn(weights, concept); });
      }
      return about.concepts.every(function (concept) {
        return event.concepts.indexOf(concept) !== -1;
      });
    }

    // How strongly an event exemplifies the topic, for recall ranking.
    _recallWeight(event, about) {
      if (about === undefined) {
        return 1;
      }
      if (about.trait !== undefined) {
        const weights = this._trait(about.trait).concepts;
        let total = 0;
        for (const concept of event.concepts) {
          if (hasOwn(weights, concept)) {
            total += weights[concept];
          }
        }
        return total;
      }
      return this._concerns(event, about) ? 1 : 0;
    }

    _knows(condition) {
      const key = this._perspectiveKey(condition.perspective);
      const min = condition.min === undefined ? Number.MIN_VALUE : condition.min;
      return this._memorySnapshot().events.some((event) =>
        this._concerns(event, condition.about) && this._belief(key, event.id) >= min
      );
    }

    // ---- Explanations -------------------------------------------------
    // A cause tells the player which remembered acts made a piece of text,
    // a choice, or a route appear. Only memory conditions (trait,
    // dominantTrait, knows, and association/activation) produce one;
    // variables, visits and negations do not, unless the author tags them.

    _cause(condition, tag) {
      const found = this._facts(condition, []);
      const macroTag = found.length > 0 ? found[0].macroTag : undefined;
      const facts = found.filter(function (fact) { return fact.kind !== "macro"; });
      const label = tag !== undefined ? tag
        : macroTag !== undefined ? macroTag
          : facts.length > 0 ? this._defaultTag(facts[0]) : undefined;
      if (label === undefined) {
        return null;
      }
      const primary = facts[0];
      return {
        tag: label,
        kind: primary === undefined ? "author" : primary.kind,
        trait: primary !== undefined && primary.trait !== undefined ? primary.trait : null,
        color: primary !== undefined && primary.trait !== undefined &&
          this.story.traits[primary.trait].color !== undefined
          ? this.story.traits[primary.trait].color
          : null,
        explanation: facts.map((fact) => this._explainFact(fact))
      };
    }

    // After a choice: which traits its remembered acts push toward or away
    // from, and who (that the player could know about) saw them. Hidden
    // characters are never named. Returns a cause-shaped object or null.
    _echo(records) {
      const own = records.filter(function (record) {
        return record.event.concepts.indexOf(DEFAULT_SUBJECT) !== -1;
      });
      if (own.length === 0) {
        return null;
      }
      const deltas = {};
      for (const record of own) {
        for (const [trait, definition] of Object.entries(this.story.traits)) {
          let weight = 0;
          for (const concept of record.event.concepts) {
            if (hasOwn(definition.concepts, concept)) {
              weight += definition.concepts[concept];
            }
          }
          if (weight !== 0) {
            deltas[trait] = (deltas[trait] || 0) + weight * record.event.strength;
          }
        }
      }
      const changes = Object.keys(deltas)
        .filter(function (trait) { return deltas[trait] !== 0; })
        .sort(function (a, b) { return Math.abs(deltas[b]) - Math.abs(deltas[a]) || compareNames(a, b); });
      const witnesses = [];
      for (const record of own) {
        for (const id of record.witnesses) {
          if (this.story.characters[id].hidden !== true && witnesses.indexOf(id) === -1) {
            witnesses.push(id);
          }
        }
      }
      if (changes.length === 0 && witnesses.length === 0) {
        return null;
      }
      const names = witnesses.map((id) => this.characterName(id));
      const arrow = (trait) => (deltas[trait] > 0 ? "↑ " : "↓ ") + this.traitLabel(trait);
      const seen = names.length === 0 ? "no one saw"
        : names.length <= 2 ? names.join(" and ") + " saw"
          : names.length + " people saw";
      const tag = changes.slice(0, 2).map(arrow).concat([seen]).join(" · ");
      const summaries = own
        .filter(function (record) { return isRecord(record.event.metadata) && typeof record.event.metadata.summary === "string"; })
        .map(function (record) { return "you " + record.event.metadata.summary + "."; });
      const explanation = [];
      if (summaries.length > 0) {
        explanation.push({ heading: "Remembered as:", items: summaries });
      }
      explanation.push(names.length === 0
        ? { heading: "No one saw it. For now.", items: [] }
        : { heading: "Seen by:", items: names });
      if (changes.length > 0) {
        explanation.push({ heading: "Pushes how you're seen:", items: changes.map(arrow) });
      }
      const primary = changes[0];
      return {
        tag: tag,
        kind: "echo",
        trait: primary === undefined ? null : primary,
        color: primary !== undefined && this.story.traits[primary].color !== undefined
          ? this.story.traits[primary].color
          : null,
        explanation: explanation
      };
    }

    _recallCause(spec, memory) {
      const key = this._perspectiveKey(spec.perspective);
      const who = key === WORLD_PERSPECTIVE ? null : this.characterName(key);
      return {
        tag: who === null ? "remembered" : who + " remembers",
        kind: "recall",
        trait: null,
        color: null,
        explanation: [{
          heading: (who === null ? "Remembered" : who + " remembers") + " that you:",
          items: [memory.summary + beliefNote(memory.belief)]
        }]
      };
    }

    // Collects the true memory-based leaves of a condition.
    _facts(condition, macroStack) {
      switch (condition.type) {
        case "trait":
          return condition.min !== undefined && this._evaluateCondition(condition)
            ? [{ kind: "trait", trait: condition.trait, perspective: condition.perspective, subject: condition.subject }]
            : [];
        case "dominantTrait":
          return this._evaluateCondition(condition)
            ? [{ kind: "trait", trait: condition.is, perspective: condition.perspective, subject: condition.subject }]
            : [];
        case "knows":
          return this._evaluateCondition(condition)
            ? [{ kind: "knows", perspective: condition.perspective, about: condition.about, min: condition.min }]
            : [];
        case "association":
          return this._evaluateCondition(condition)
            ? [{ kind: "association", a: condition.a, b: condition.b, perspective: condition.perspective }]
            : [];
        case "activation":
          return this._evaluateCondition(condition)
            ? [{ kind: "activation", contains: condition.contains, perspective: condition.perspective }]
            : [];
        case "all":
          return condition.conditions.reduce((facts, child) =>
            facts.concat(this._facts(child, macroStack)), []);
        case "any": {
          for (const child of condition.conditions) {
            if (this._evaluateCondition(child)) {
              return this._facts(child, macroStack);
            }
          }
          return [];
        }
        case "macroCondition": {
          const macro = this.story.macros[condition.name];
          const facts = this._facts(macro.condition, macroStack.concat([condition.name]));
          if (macro.tag === undefined) {
            return facts;
          }
          // A tagged macro is shown whenever it holds, even if it holds only
          // because something never happened.
          if (facts.length === 0) {
            return this._evaluateCondition(condition) ? [{ kind: "macro", macroTag: macro.tag }] : [];
          }
          facts[0] = Object.assign({}, facts[0], { macroTag: macro.tag });
          return facts;
        }
        default:
          return [];
      }
    }

    _defaultTag(fact) {
      const who = fact.perspective === undefined ? null : this.characterName(fact.perspective);
      if (fact.kind === "trait") {
        const label = this.traitLabel(fact.trait);
        return who === null ? label : who + ": " + label;
      }
      if (fact.kind === "knows") {
        return (who === null ? "known" : who + " knows");
      }
      const concept = (fact.kind === "association" ? fact.b : fact.contains).replace(/_/g, " ");
      return who === null ? concept : who + ": " + concept;
    }

    _explainFact(fact) {
      const who = fact.perspective === undefined ? null : this.characterName(fact.perspective);
      const subject = fact.subject === undefined ? DEFAULT_SUBJECT : fact.subject;
      const aboutPlayer = subject === DEFAULT_SUBJECT;
      if (fact.kind === "trait") {
        const label = this.traitLabel(fact.trait);
        const items = aboutPlayer
          ? this._evidence(fact.perspective, subject, (event) => this._recallWeight(event, { trait: fact.trait }))
          : [];
        const target = aboutPlayer ? "you" : displayName(subject);
        const heading = (who === null
          ? capitalise(target) + (aboutPlayer ? " are" : " is") + " seen as " + label
          : who + " sees " + target + " as " + label) + (items.length > 0 ? ", because you:" : ".");
        return { heading: heading, items: items };
      }
      if (fact.kind === "knows") {
        const items = this._evidence(fact.perspective, null, (event) =>
          this._concerns(event, fact.about) ? 1 : 0, fact.min);
        return {
          heading: (who === null ? "It is known" : who + " knows") + (items.length > 0 ? " that you:" : " about this."),
          items: items
        };
      }
      if (fact.kind === "association") {
        const items = this._evidence(fact.perspective, null, (event) =>
          event.concepts.indexOf(fact.a) !== -1 && event.concepts.indexOf(fact.b) !== -1 ? 1 : 0);
        const pair = fact.a === DEFAULT_SUBJECT
          ? "you with “" + fact.b.replace(/_/g, " ") + "”"
          : "“" + fact.a.replace(/_/g, " ") + "” with “" + fact.b.replace(/_/g, " ") + "”";
        return {
          heading: (who === null ? "Memory links " : who + " links ") + pair + (items.length > 0 ? ", because you:" : "."),
          items: items
        };
      }
      return {
        heading: "“" + fact.contains.replace(/_/g, " ") + "” comes to " +
          (who === null ? "mind" : who + "'s mind") + ".",
        items: []
      };
    }

    // Summaries of the remembered acts that most support a fact, strongest
    // first, noting when a character only heard about one secondhand.
    _evidence(perspective, subject, relevance, minBelief) {
      const key = this._perspectiveKey(perspective);
      const snapshot = this._memorySnapshot();
      const ranked = [];
      for (const event of snapshot.events) {
        if (!isRecord(event.metadata) || typeof event.metadata.summary !== "string" ||
            (subject !== null && event.concepts.indexOf(subject) === -1)) {
          continue;
        }
        const belief = this._belief(key, event.id);
        if (minBelief !== undefined && belief < minBelief) {
          continue;
        }
        const weight = relevance(event);
        const score = event.strength * belief * weight *
          this._recency(event.sequence, snapshot.sequence);
        if (score > 0) {
          ranked.push({ event: event, score: score, belief: belief });
        }
      }
      ranked.sort(function (a, b) {
        return b.score - a.score || b.event.sequence - a.event.sequence;
      });
      return ranked.slice(0, MAX_EXPLANATION_ITEMS).map(function (entry) {
        return entry.event.metadata.summary + (key === WORLD_PERSPECTIVE ? "" : beliefNote(entry.belief));
      });
    }

    // The highest-scoring trait among `traits` (ties broken by name), or null
    // when none scores above zero.
    _dominantAmong(traits, perspective, subject) {
      let best = null;
      let bestScore = 0;
      for (const trait of traits.slice().sort(compareNames)) {
        const score = this.traitScore(trait, perspective, subject);
        if (score > bestScore) {
          best = trait;
          bestScore = score;
        }
      }
      return best;
    }

    _dominantTrait(condition) {
      const target = this.traitScore(condition.is, condition.perspective, condition.subject);
      const margin = condition.margin === undefined ? 0 : condition.margin;
      if (!(target > 0)) {
        return false;
      }
      return condition.among.every((trait) =>
        trait === condition.is ||
        target > this.traitScore(trait, condition.perspective, condition.subject) + margin
      );
    }

    _clearProgress() {
      this.arrivalCause = null;
      this.choiceEcho = null;
      this.currentNodeId = null;
      this.nodeVisits = [];
      this.choiceHistory = [];
      this.variables = cloneJsonValue(this.initialVariables, "initialVariables");
      this.ended = false;
    }

    // `arrival` explains a memory-driven route into this node (or null). It
    // is presentation-only and is not part of saved state.
    _enterNode(nodeId, arrival, echo) {
      this.arrivalCause = arrival === undefined ? null : arrival;
      this.choiceEcho = echo === undefined ? null : echo;
      this.currentNodeId = nodeId;
      this.nodeVisits.push(nodeId);
      this.ended = this.story.nodes[nodeId].ending === true;
      this._executeOperations(this.story.nodes[nodeId].onEnter || [], {
        nodeId: nodeId,
        choiceId: null,
        path: "onEnter operation"
      });
      return this.getView();
    }

    _executeOperations(operations, source) {
      for (let index = 0; index < operations.length; index += 1) {
        const operation = operations[index];
        try {
          if (BUILTIN_OPERATIONS.indexOf(operation.type) !== -1) {
            this._executeBuiltin(operation, source);
          } else {
            const handler = this.operationHandlers.get(operation.type);
            if (!handler) {
              throw new Error("No handler is registered for operation '" + operation.type + "'.");
            }
            handler(operation, this._context());
          }
        } catch (error) {
          const choiceDetails = source.choiceId === null
            ? ""
            : ", choice '" + source.choiceId + "'";
          throw new Error(
            "Story '" + this.story.id + "', node '" + source.nodeId + "'" +
            choiceDetails + ", " + source.path + " " + index +
            " (" + operation.type + ") failed: " + errorText(error)
          );
        }
      }
    }

    _executeBuiltin(operation, source) {
      if (operation.type === "remember") {
        let metadata = operation.metadata;
        if (operation.summary !== undefined) {
          metadata = Object.assign({}, metadata || {}, { summary: operation.summary });
        }
        const event = this.graph.remember({
          concepts: operation.concepts,
          strength: operation.strength,
          metadata: metadata
        });
        const witnesses = [];
        if (operation.witnesses !== undefined) {
          if (!event || typeof event.id !== "string") {
            throw new TypeError("witnesses require a graph whose remember() returns the event.");
          }
          for (const character of this._characters(operation.witnesses)) {
            this._learn(character, event.id, 1);
            witnesses.push(character);
          }
        }
        if (this._recording !== null && event && Array.isArray(event.concepts)) {
          this._recording.push({ event: event, witnesses: witnesses });
        }
      } else if (operation.type === "gossip") {
        const from = this._character(operation.from).id;
        const factor = operation.belief === undefined ? DEFAULT_GOSSIP_BELIEF : operation.belief;
        const listeners = this._characters(operation.to).filter(function (id) {
          return id !== from;
        });
        for (const event of this._memorySnapshot().events) {
          const belief = this._belief(from, event.id);
          if (belief > 0 && this._concerns(event, operation.about)) {
            for (const listener of listeners) {
              this._learn(listener, event.id, belief * factor);
            }
          }
        }
      } else if (operation.type === "reveal") {
        const belief = operation.belief === undefined ? DEFAULT_REVEAL_BELIEF : operation.belief;
        const listeners = this._characters(operation.to);
        for (const event of this._memorySnapshot().events) {
          if (this._concerns(event, operation.about)) {
            for (const listener of listeners) {
              this._learn(listener, event.id, belief);
            }
          }
        }
      } else if (operation.type === "learnTransition") {
        this.graph.learnTransition(
          operation.transitionType,
          operation.from,
          operation.to,
          operation.amount
        );
      } else if (operation.type === "activate") {
        const values = this.graph.activateMany(
          operation.starts,
          operation.options || {}
        );
        defineValue(this.variables, operation.storeAs, values);
      } else if (operation.type === "set") {
        defineValue(
          this.variables,
          operation.variable,
          cloneJsonValue(operation.value, "set operation value")
        );
      } else if (operation.type === "inc" || operation.type === "dec") {
        const current = hasOwn(this.variables, operation.variable)
          ? this.variables[operation.variable]
          : 0;
        if (typeof current !== "number" || !Number.isFinite(current)) {
          throw new TypeError("variable '" + operation.variable + "' must be numeric.");
        }
        const amount = operation.amount === undefined ? 1 : operation.amount;
        const updated = current + (operation.type === "inc" ? amount : -amount);
        if (!Number.isFinite(updated)) {
          throw new RangeError("variable '" + operation.variable + "' exceeds the numeric range.");
        }
        defineValue(this.variables, operation.variable, updated);
      } else if (operation.type === "macro") {
        const macro = this.story.macros[operation.name];
        this._executeOperations(macro.do || [], {
          nodeId: source.nodeId,
          choiceId: source.choiceId,
          path: source.path + " macro '" + operation.name + "'"
        });
      }
    }

    _evaluateCondition(condition) {
      if (BUILTIN_CONDITIONS.indexOf(condition.type) === -1) {
        const handler = this.conditionHandlers.get(condition.type);
        if (!handler) {
          throw new Error("No handler is registered for condition '" + condition.type + "'.");
        }
        const result = handler(condition, this._context());
        if (typeof result !== "boolean") {
          throw new TypeError("Custom condition '" + condition.type + "' must return a boolean.");
        }
        return result;
      }

      switch (condition.type) {
        case "always":
          return true;
        case "association":
          return this._conditionGraph(condition)
            .associationScore(condition.a, condition.b) >= condition.min;
        case "activation":
          return this._conditionGraph(condition)
            .activateMany(condition.starts, condition.options || {})
            .some(function (item) {
              return item.concept === condition.contains &&
                item.activation >= condition.min;
            });
        case "trait": {
          const score = this.traitScore(condition.trait, condition.perspective, condition.subject);
          return (condition.min === undefined || score >= condition.min) &&
            (condition.max === undefined || score <= condition.max);
        }
        case "dominantTrait":
          return this._dominantTrait(condition);
        case "knows":
          return this._knows(condition);
        case "transition":
          return this.graph.transitionCount(
            condition.transitionType,
            condition.from,
            condition.to
          ) >= condition.min;
        case "variable":
          return this._compareVariable(condition);
        case "visited":
          return this.nodeVisits.indexOf(condition.node) !== -1;
        case "not":
          return !this._evaluateCondition(condition.condition);
        case "all":
          return condition.conditions.every((child) =>
            this._evaluateCondition(child)
          );
        case "any":
          return condition.conditions.some((child) =>
            this._evaluateCondition(child)
          );
        case "macroCondition":
          return this._evaluateCondition(this.story.macros[condition.name].condition);
        default:
          throw new Error("Unsupported condition type '" + condition.type + "'.");
      }
    }

    _conditionGraph(condition) {
      return condition.perspective === undefined
        ? this.graph
        : this.perspectiveGraph(condition.perspective);
    }

    _compareVariable(condition) {
      if (!hasOwn(this.variables, condition.name)) {
        return false;
      }
      const actual = this.variables[condition.name];
      switch (condition.operator) {
        case "eq":
          return actual === condition.value;
        case "neq":
          return actual !== condition.value;
        case "gt":
          return typeof actual === "number" && Number.isFinite(actual) &&
            actual > condition.value;
        case "gte":
          return typeof actual === "number" && Number.isFinite(actual) &&
            actual >= condition.value;
        case "lt":
          return typeof actual === "number" && Number.isFinite(actual) &&
            actual < condition.value;
        case "lte":
          return typeof actual === "number" && Number.isFinite(actual) &&
            actual <= condition.value;
        default:
          return false;
      }
    }

    _context() {
      return {
        engine: this,
        graph: this.graph,
        variables: this.variables,
        currentNode: this.currentNodeId,
        setVariable: (name, value) => {
          defineValue(
            this.variables,
            normalizeName(name, "variable name"),
            cloneJsonValue(value, "variable value")
          );
        }
      };
    }

    _validateStory(allowUnregistered) {
      const story = this.story;
      if (!isPlainRecord(story)) {
        throw new TypeError("Story definition must be a plain object.");
      }
      normalizeName(story.id, "story id");
      normalizeName(story.title, "story title");
      normalizeName(story.start, "story start");
      if (!isPlainRecord(story.nodes) || Object.keys(story.nodes).length === 0) {
        throw storyError(story, "nodes must be a non-empty object.");
      }
      if (story.macros === undefined) {
        story.macros = {};
      }
      if (!isPlainRecord(story.macros)) {
        throw storyError(story, "macros must be an object.");
      }
      if (!hasOwn(story.nodes, story.start)) {
        throw storyError(story, "start node '" + story.start + "' does not exist.");
      }
      this._validateMemoryModel();

      for (const [macroName, macro] of Object.entries(story.macros)) {
        normalizeName(macroName, "macro name");
        if (!isPlainRecord(macro)) {
          throw storyError(story, "macro '" + macroName + "' must be an object.");
        }
        if (macro.do !== undefined) {
          this._validateOperations(macro.do, {
            allowUnregistered: allowUnregistered,
            macroStack: [macroName],
            location: "macro '" + macroName + "'"
          });
        }
        if (macro.condition !== undefined) {
          this._validateCondition(macro.condition, {
            allowUnregistered: allowUnregistered,
            macroStack: [macroName],
            location: "macro '" + macroName + "'"
          });
        }
        validateTag(macro.tag, story, "macro '" + macroName + "'");
        if (macro.do === undefined && macro.condition === undefined) {
          throw storyError(story, "macro '" + macroName + "' must define do or condition.");
        }
      }

      let explicitEndings = 0;
      for (const [nodeId, node] of Object.entries(story.nodes)) {
        normalizeName(nodeId, "node ID");
        if (!isPlainRecord(node)) {
          throw storyError(story, "node '" + nodeId + "' must be an object.");
        }
        validateText(node.text, this, {
          allowUnregistered: allowUnregistered,
          macroStack: [],
          location: "node '" + nodeId + "' text"
        });
        if (node.ending !== undefined && typeof node.ending !== "boolean") {
          throw storyError(story, "node '" + nodeId + "' ending must be a boolean.");
        }
        const ending = node.ending === true;
        if (ending) {
          explicitEndings += 1;
        }
        if (node.choices !== undefined && !Array.isArray(node.choices)) {
          throw storyError(story, "node '" + nodeId + "' choices must be an array.");
        }
        const choices = node.choices || [];
        if (ending && choices.length !== 0) {
          throw storyError(story, "ending node '" + nodeId + "' cannot have choices.");
        }
        if (!ending && choices.length === 0) {
          throw storyError(story, "non-ending node '" + nodeId + "' must have at least one choice.");
        }
        if (node.onEnter !== undefined) {
          this._validateOperations(node.onEnter, {
            allowUnregistered: allowUnregistered,
            macroStack: [],
            location: "node '" + nodeId + "' onEnter"
          });
        }

        const choiceIds = new Set();
        for (let index = 0; index < choices.length; index += 1) {
          const choice = choices[index];
          if (!isPlainRecord(choice)) {
            throw storyError(story, "node '" + nodeId + "' choice " + index + " must be an object.");
          }
          const choiceId = normalizeName(choice.id, "choice ID");
          if (choiceIds.has(choiceId)) {
            throw storyError(story, "node '" + nodeId + "' has duplicate choice ID '" + choiceId + "'.");
          }
          choiceIds.add(choiceId);
          normalizeName(choice.text, "choice text");
          validateTag(choice.tag, story, "node '" + nodeId + "' choice '" + choiceId + "'");
          if (choice.showIf !== undefined) {
            this._validateCondition(choice.showIf, {
              allowUnregistered: allowUnregistered,
              macroStack: [],
              location: "node '" + nodeId + "' choice '" + choiceId + "' showIf"
            });
          }
          if (choice.do !== undefined) {
            this._validateOperations(choice.do, {
              allowUnregistered: allowUnregistered,
              macroStack: [],
              location: "node '" + nodeId + "' choice '" + choiceId + "' do"
            });
          }
          if (!ending) {
            if (choice.goto === undefined) {
              throw storyError(story, "node '" + nodeId + "' choice '" + choiceId + "' requires goto.");
            }
            validateRoute(choice.goto, story, this, {
              allowUnregistered: allowUnregistered,
              macroStack: [],
              location: "node '" + nodeId + "' choice '" + choiceId + "' goto"
            });
          }
        }
      }

      if (explicitEndings === 0) {
        throw storyError(story, "must contain at least one explicitly marked ending.");
      }
      const reachable = new Set([story.start]);
      const pending = [story.start];
      while (pending.length > 0) {
        const node = story.nodes[pending.pop()];
        for (const choice of node.choices || []) {
          for (const destination of routeDestinations(choice.goto)) {
            if (!reachable.has(destination)) {
              reachable.add(destination);
              pending.push(destination);
            }
          }
        }
      }
      const reachesEnding = Array.from(reachable).some(function (nodeId) {
        return story.nodes[nodeId].ending === true;
      });
      if (!reachesEnding) {
        throw storyError(story, "has no reachable explicitly marked ending.");
      }
    }

    _validateMemoryModel() {
      const story = this.story;
      for (const field of ["characters", "traits", "memory"]) {
        if (story[field] === undefined) {
          story[field] = {};
        }
        if (!isPlainRecord(story[field])) {
          throw storyError(story, field + " must be an object.");
        }
      }
      for (const [id, character] of Object.entries(story.characters)) {
        normalizeName(id, "character ID");
        if (id === "all") {
          throw storyError(story, "'all' is reserved and cannot be a character ID.");
        }
        if (!isPlainRecord(character)) {
          throw storyError(story, "character '" + id + "' must be an object.");
        }
        if (character.name !== undefined) {
          normalizeName(character.name, "character '" + id + "' name");
        }
        if (character.hidden !== undefined && typeof character.hidden !== "boolean") {
          throw storyError(story, "character '" + id + "' hidden must be a boolean.");
        }
      }
      for (const [name, trait] of Object.entries(story.traits)) {
        normalizeName(name, "trait name");
        if (!isPlainRecord(trait) || !isPlainRecord(trait.concepts) ||
            Object.keys(trait.concepts).length === 0) {
          throw storyError(story, "trait '" + name + "' must define a non-empty concepts object.");
        }
        for (const [concept, weight] of Object.entries(trait.concepts)) {
          normalizeName(concept, "trait '" + name + "' concept");
          if (typeof weight !== "number" || !Number.isFinite(weight) || weight === 0) {
            throw storyError(story, "trait '" + name + "' weight for '" + concept +
              "' must be a finite non-zero number.");
          }
        }
        if (trait.color !== undefined && (typeof trait.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(trait.color))) {
          throw storyError(story, "trait '" + name + "' color must be a #rrggbb hex string.");
        }
        if (trait.label !== undefined) {
          normalizeName(trait.label, "trait '" + name + "' label");
        }
      }
      if (story.memory.halfLife !== undefined) {
        validatePositiveNumber(story.memory.halfLife, "memory halfLife");
      }
    }

    _validateCharacters(value, location) {
      if (value === "all") {
        return;
      }
      if (!Array.isArray(value) || value.length === 0) {
        throw storyError(this.story, location + " must be 'all' or a non-empty array of characters.");
      }
      for (const id of value) {
        this._validateCharacter(id, location);
      }
    }

    _validateCharacter(id, location) {
      const name = normalizeName(id, location + " character");
      if (!hasOwn(this.story.characters, name)) {
        throw storyError(this.story, location + " references unknown character '" + name + "'.");
      }
    }

    _validatePerspective(perspective, location) {
      if (perspective !== undefined) {
        this._validateCharacter(perspective, location + " perspective");
      }
    }

    _validateTraitName(trait, location) {
      const name = normalizeName(trait, location + " trait");
      if (!hasOwn(this.story.traits, name)) {
        throw storyError(this.story, location + " references unknown trait '" + name + "'.");
      }
    }

    _validateAbout(about, location, required) {
      if (about === undefined && !required) {
        return;
      }
      if (!isPlainRecord(about) || (about.trait === undefined) === (about.concepts === undefined)) {
        throw storyError(this.story, location + " about must define exactly one of trait or concepts.");
      }
      if (about.trait !== undefined) {
        this._validateTraitName(about.trait, location + " about");
      } else {
        validateConcepts(about.concepts, this.story, location + " about concepts");
        if (about.concepts.length === 0) {
          throw storyError(this.story, location + " about concepts must be non-empty.");
        }
      }
    }

    _validateBeliefOption(value, location) {
      if (value !== undefined) {
        validateBelief(value, location + " belief");
      }
    }

    _validateRecall(spec, location) {
      if (!isPlainRecord(spec)) {
        throw storyError(this.story, location + " recall must be an object.");
      }
      this._validatePerspective(spec.perspective, location);
      if (spec.subject !== undefined) {
        normalizeName(spec.subject, location + " subject");
      }
      this._validateAbout(spec.about, location, false);
      if (spec.among !== undefined) {
        if (spec.about !== undefined) {
          throw storyError(this.story, location + " recall cannot combine about and among.");
        }
        if (!Array.isArray(spec.among) || spec.among.length === 0) {
          throw storyError(this.story, location + " recall among must be a non-empty array of traits.");
        }
        for (const trait of spec.among) {
          this._validateTraitName(trait, location + " among");
        }
      }
      if (spec.rank !== undefined && (!Number.isSafeInteger(spec.rank) || spec.rank < 1)) {
        throw storyError(this.story, location + " rank must be a positive integer.");
      }
    }

    _validateOperations(operations, context) {
      if (!Array.isArray(operations)) {
        throw storyError(this.story, context.location + " must be an array.");
      }
      for (let index = 0; index < operations.length; index += 1) {
        const operation = operations[index];
        const location = context.location + " operation " + index;
        if (!isPlainRecord(operation)) {
          throw storyError(this.story, location + " must be an object.");
        }
        const type = normalizeName(operation.type, "operation type");
        if (BUILTIN_OPERATIONS.indexOf(type) === -1 &&
            !this.operationHandlers.has(type)) {
          if (context.allowUnregistered) {
            continue;
          }
          throw storyError(this.story, location + " has unknown type '" + type + "'.");
        }
        if (type === "remember") {
          validateConcepts(operation.concepts, this.story, location + " concepts");
          if (operation.strength !== undefined) {
            validatePositiveNumber(operation.strength, location + " strength");
          }
          if (operation.metadata !== undefined) {
            cloneJsonValue(operation.metadata, location + " metadata");
          }
          if (operation.summary !== undefined) {
            normalizeName(operation.summary, location + " summary");
            if (operation.metadata !== undefined && !isPlainRecord(operation.metadata)) {
              throw storyError(this.story, location + " metadata must be an object when summary is used.");
            }
          }
          if (operation.witnesses !== undefined) {
            this._validateCharacters(operation.witnesses, location + " witnesses");
          }
        } else if (type === "gossip") {
          this._validateCharacter(operation.from, location + " from");
          this._validateCharacters(operation.to, location + " to");
          this._validateAbout(operation.about, location, false);
          this._validateBeliefOption(operation.belief, location);
        } else if (type === "reveal") {
          this._validateCharacters(operation.to, location + " to");
          this._validateAbout(operation.about, location, false);
          this._validateBeliefOption(operation.belief, location);
        } else if (type === "learnTransition") {
          normalizeName(operation.transitionType, location + " transitionType");
          normalizeName(operation.from, location + " from");
          normalizeName(operation.to, location + " to");
          if (operation.amount !== undefined) {
            validatePositiveNumber(operation.amount, location + " amount");
          }
        } else if (type === "activate") {
          validateConcepts(operation.starts, this.story, location + " starts");
          validateActivationOptions(operation.options, location + " options");
          normalizeName(operation.storeAs, location + " storeAs");
        } else if (type === "set") {
          normalizeName(operation.variable, location + " variable");
          cloneJsonValue(operation.value, location + " value");
        } else if (type === "inc" || type === "dec") {
          normalizeName(operation.variable, location + " variable");
          if (operation.amount !== undefined) {
            validatePositiveNumber(operation.amount, location + " amount");
          }
        } else if (type === "macro") {
          const name = normalizeName(operation.name, location + " macro name");
          if (!hasOwn(this.story.macros, name)) {
            throw storyError(this.story, location + " references unknown macro '" + name + "'.");
          }
          if (context.macroStack.indexOf(name) !== -1) {
            throw storyError(
              this.story,
              "recursive action macro: " + context.macroStack.concat([name]).join(" -> ") + "."
            );
          }
          const macro = this.story.macros[name];
          if (!Array.isArray(macro.do)) {
            throw storyError(this.story, "action macro '" + name + "' must define a do array.");
          }
          this._validateOperations(macro.do, {
            allowUnregistered: context.allowUnregistered,
            macroStack: context.macroStack.concat([name]),
            location: "macro '" + name + "'"
          });
        }
      }
    }

    _validateCondition(condition, context) {
      if (!isPlainRecord(condition)) {
        throw storyError(this.story, context.location + " condition must be an object.");
      }
      const type = normalizeName(condition.type, context.location + " condition type");
      if (BUILTIN_CONDITIONS.indexOf(type) === -1 &&
          !this.conditionHandlers.has(type)) {
        if (context.allowUnregistered) {
          return;
        }
        throw storyError(this.story, context.location + " has unknown condition type '" + type + "'.");
      }
      if (type === "always") {
        return;
      }
      if (type === "association") {
        normalizeName(condition.a, context.location + " association a");
        normalizeName(condition.b, context.location + " association b");
        validateNonNegativeNumber(condition.min, context.location + " association min");
        this._validatePerspective(condition.perspective, context.location);
      } else if (type === "activation") {
        validateConcepts(condition.starts, this.story, context.location + " starts");
        normalizeName(condition.contains, context.location + " contains");
        validateNonNegativeNumber(condition.min, context.location + " activation min");
        validateActivationOptions(condition.options, context.location + " options");
        this._validatePerspective(condition.perspective, context.location);
      } else if (type === "trait") {
        this._validateTraitName(condition.trait, context.location);
        this._validatePerspective(condition.perspective, context.location);
        if (condition.subject !== undefined) {
          normalizeName(condition.subject, context.location + " subject");
        }
        if (condition.min === undefined && condition.max === undefined) {
          throw storyError(this.story, context.location + " trait condition needs min or max.");
        }
        for (const bound of ["min", "max"]) {
          if (condition[bound] !== undefined &&
              (typeof condition[bound] !== "number" || !Number.isFinite(condition[bound]))) {
            throw storyError(this.story, context.location + " trait " + bound + " must be a finite number.");
          }
        }
      } else if (type === "dominantTrait") {
        if (!Array.isArray(condition.among) || condition.among.length < 2) {
          throw storyError(this.story, context.location + " dominantTrait among needs at least two traits.");
        }
        for (const trait of condition.among) {
          this._validateTraitName(trait, context.location);
        }
        if (condition.among.indexOf(condition.is) === -1) {
          throw storyError(this.story, context.location + " dominantTrait is must be listed in among.");
        }
        this._validatePerspective(condition.perspective, context.location);
        if (condition.subject !== undefined) {
          normalizeName(condition.subject, context.location + " subject");
        }
        if (condition.margin !== undefined) {
          validateNonNegativeNumber(condition.margin, context.location + " margin");
        }
      } else if (type === "knows") {
        this._validateCharacter(condition.perspective, context.location + " perspective");
        this._validateAbout(condition.about, context.location, true);
        if (condition.min !== undefined) {
          validateBelief(condition.min, context.location + " knows min");
        }
      } else if (type === "transition") {
        normalizeName(condition.transitionType, context.location + " transitionType");
        normalizeName(condition.from, context.location + " from");
        normalizeName(condition.to, context.location + " to");
        validateNonNegativeNumber(condition.min, context.location + " transition min");
      } else if (type === "variable") {
        normalizeName(condition.name, context.location + " variable name");
        if (CONDITION_OPERATORS.indexOf(condition.operator) === -1) {
          throw storyError(this.story, context.location + " has an invalid variable operator.");
        }
        if (condition.operator === "eq" || condition.operator === "neq") {
          if (!isScalar(condition.value)) {
            throw storyError(this.story, context.location + " equality value must be a JSON scalar.");
          }
        } else if (typeof condition.value !== "number" || !Number.isFinite(condition.value)) {
          throw storyError(this.story, context.location + " relational value must be a finite number.");
        }
      } else if (type === "visited") {
        normalizeName(condition.node, context.location + " visited node");
        if (!hasOwn(this.story.nodes, condition.node)) {
          throw storyError(this.story, context.location + " references unknown node '" + condition.node + "'.");
        }
      } else if (type === "not") {
        this._validateCondition(condition.condition, context);
      } else if (type === "all" || type === "any") {
        if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) {
          throw storyError(this.story, context.location + " " + type + " conditions must be non-empty.");
        }
        for (const child of condition.conditions) {
          this._validateCondition(child, context);
        }
      } else if (type === "macroCondition") {
        const name = normalizeName(condition.name, context.location + " macro name");
        if (!hasOwn(this.story.macros, name)) {
          throw storyError(this.story, context.location + " references unknown macro '" + name + "'.");
        }
        if (context.macroStack.indexOf(name) !== -1) {
          throw storyError(
            this.story,
            "recursive condition macro: " + context.macroStack.concat([name]).join(" -> ") + "."
          );
        }
        const macro = this.story.macros[name];
        if (macro.condition === undefined) {
          throw storyError(this.story, "condition macro '" + name + "' must define a condition.");
        }
        this._validateCondition(macro.condition, {
          allowUnregistered: context.allowUnregistered,
          macroStack: context.macroStack.concat([name]),
          location: "macro '" + name + "' condition"
        });
      }
    }
  }

  // Returns { text, segments }. Segments concatenate to exactly `text`; a
  // segment has a `cause` when memory made it appear.
  function resolveText(definition, engine) {
    if (typeof definition === "string") {
      return { text: definition, segments: [{ text: definition }] };
    }
    for (const variant of definition) {
      if (variant.if === undefined || engine._evaluateCondition(variant.if)) {
        const cause = variant.if === undefined ? null : engine._cause(variant.if, variant.tag);
        const segments = typeof variant.value === "string"
          ? [{ text: variant.value }]
          : composeParts(variant.value, engine);
        const text = segments.map(function (segment) { return segment.text; }).join("");
        if (text.trim().length === 0) {
          throw storyError(engine.story, "node '" + engine.currentNodeId + "' text resolved to nothing.");
        }
        if (cause !== null) {
          // A variant's cause belongs to its opening passage.
          segments[0] = Object.assign({}, segments[0], { cause: segments[0].cause || cause });
        }
        return { text: text, segments: segments };
      }
    }
    throw storyError(engine.story, "node '" + engine.currentNodeId + "' has no matching text variant.");
  }

  // Text parts are joined with single spaces; a part that starts or ends with
  // whitespace (for example "\n\n" for a paragraph break) is joined as-is.
  // Each joined part becomes a segment that carries its own separator.
  function composeParts(parts, engine) {
    const segments = [];
    let output = "";
    for (const part of parts) {
      let piece;
      let cause = null;
      if (typeof part === "string") {
        piece = part;
      } else if (part.if !== undefined && !engine._evaluateCondition(part.if)) {
        piece = part.else === undefined ? "" : part.else;
      } else if (part.text !== undefined) {
        piece = part.text;
        if (part.if !== undefined) {
          cause = engine._cause(part.if, part.tag);
        }
      } else {
        const memory = engine.recall(part.recall);
        if (memory === null) {
          piece = part.otherwise === undefined ? "" : part.otherwise;
        } else {
          piece = (part.format === undefined ? "{summary}" : part.format)
            .split("{summary}").join(memory.summary);
          cause = engine._recallCause(part.recall, memory);
          if (part.tag !== undefined) {
            cause.tag = part.tag;
          }
        }
      }
      if (piece.length === 0) {
        continue;
      }
      const joined = output.length === 0 || /\s$/.test(output) || /^\s/.test(piece)
        ? piece
        : " " + piece;
      output += joined;
      const segment = { text: joined };
      if (cause !== null) {
        segment.cause = cause;
      }
      segments.push(segment);
    }
    return segments.length === 0 ? [{ text: "" }] : segments;
  }

  function beliefNote(belief) {
    return belief < 1 ? " (heard secondhand)" : "";
  }

  function displayName(id) {
    return capitalise(id.replace(/_/g, " "));
  }

  function capitalise(text) {
    return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
  }

  function validateParts(parts, engine, context) {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw storyError(engine.story, context.location + " parts must be a non-empty array.");
    }
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const location = context.location + " part " + index;
      if (typeof part === "string") {
        continue;
      }
      if (!isPlainRecord(part)) {
        throw storyError(engine.story, location + " must be a string or an object.");
      }
      if ((part.text === undefined) === (part.recall === undefined)) {
        throw storyError(engine.story, location + " must define exactly one of text or recall.");
      }
      validateTag(part.tag, engine.story, location);
      for (const key of ["text", "else", "format", "otherwise"]) {
        if (part[key] !== undefined && typeof part[key] !== "string") {
          throw storyError(engine.story, location + " " + key + " must be a string.");
        }
      }
      if (part.text === undefined && part.recall !== undefined) {
        engine._validateRecall(part.recall, location);
      } else if (part.format !== undefined || part.otherwise !== undefined) {
        throw storyError(engine.story, location + " format and otherwise only apply to recall parts.");
      }
      if (part.if !== undefined) {
        engine._validateCondition(part.if, { allowUnregistered: context.allowUnregistered,
          macroStack: context.macroStack, location: location });
      } else if (part.else !== undefined) {
        throw storyError(engine.story, location + " else requires if.");
      }
    }
  }

  function validateText(text, engine, context) {
    if (typeof text === "string") {
      normalizeName(text, context.location);
      return;
    }
    if (!Array.isArray(text) || text.length === 0) {
      throw storyError(engine.story, context.location + " must be a non-empty string or variant array.");
    }
    let fallbacks = 0;
    for (let index = 0; index < text.length; index += 1) {
      const variant = text[index];
      if (!isPlainRecord(variant)) {
        throw storyError(engine.story, context.location + " variant " + index + " must be an object.");
      }
      if (Array.isArray(variant.value)) {
        validateParts(variant.value, engine, context);
      } else {
        normalizeName(variant.value, context.location + " variant value");
      }
      validateTag(variant.tag, engine.story, context.location + " variant " + index);
      if (variant.if === undefined) {
        fallbacks += 1;
        if (index !== text.length - 1) {
          throw storyError(engine.story, context.location + " fallback must be the final variant.");
        }
      } else {
        engine._validateCondition(variant.if, context);
      }
    }
    if (fallbacks !== 1) {
      throw storyError(engine.story, context.location + " must have exactly one final fallback.");
    }
  }

  function validateRoute(route, story, engine, context) {
    if (typeof route === "string") {
      if (!hasOwn(story.nodes, route)) {
        throw storyError(story, context.location + " targets unknown node '" + route + "'.");
      }
      return;
    }
    if (!Array.isArray(route) || route.length === 0) {
      throw storyError(story, context.location + " must be a node ID or non-empty route array.");
    }
    let fallbacks = 0;
    for (let index = 0; index < route.length; index += 1) {
      const entry = route[index];
      if (!isPlainRecord(entry)) {
        throw storyError(story, context.location + " route " + index + " must be an object.");
      }
      const nodeId = normalizeName(entry.node, context.location + " destination");
      validateTag(entry.tag, story, context.location + " route " + index);
      if (!hasOwn(story.nodes, nodeId)) {
        throw storyError(story, context.location + " targets unknown node '" + nodeId + "'.");
      }
      if (entry.if === undefined) {
        fallbacks += 1;
        if (index !== route.length - 1) {
          throw storyError(story, context.location + " fallback must be the final route.");
        }
      } else {
        engine._validateCondition(entry.if, context);
      }
    }
    if (fallbacks !== 1) {
      throw storyError(story, context.location + " must have exactly one final fallback route.");
    }
  }

  function resolveRoute(route, engine) {
    if (typeof route === "string") {
      return { node: route, entry: null };
    }
    for (const entry of route) {
      if (entry.if === undefined || engine._evaluateCondition(entry.if)) {
        return { node: entry.node, entry: entry };
      }
    }
    throw storyError(engine.story, "node '" + engine.currentNodeId + "' has no matching route.");
  }

  function routeDestinations(route) {
    if (typeof route === "string") {
      return [route];
    }
    return route.map(function (entry) {
      return entry.node;
    });
  }

  function validateConcepts(concepts, story, location) {
    if (!Array.isArray(concepts)) {
      throw storyError(story, location + " must be an array.");
    }
    for (const concept of concepts) {
      normalizeName(concept, location + " concept");
    }
  }

  function validateActivationOptions(options, location) {
    if (options === undefined) {
      return;
    }
    if (!isPlainRecord(options)) {
      throw new TypeError(location + " must be an object.");
    }
    if (options.depth !== undefined) {
      validateNonNegativeInteger(options.depth, location + " depth");
    }
    if (options.decay !== undefined) {
      const decay = validatePositiveNumber(options.decay, location + " decay");
      if (decay > 1) {
        throw new RangeError(location + " decay must be in (0, 1].");
      }
    }
    if (options.edgeK !== undefined) {
      validatePositiveNumber(options.edgeK, location + " edgeK");
    }
    if (options.minActivation !== undefined) {
      validateNonNegativeNumber(options.minActivation, location + " minActivation");
    }
    if (options.limit !== undefined) {
      validateNonNegativeInteger(options.limit, location + " limit");
    }
    if (options.maxExpansions !== undefined) {
      validateNonNegativeInteger(options.maxExpansions, location + " maxExpansions");
    }
    if (options.includeStart !== undefined && typeof options.includeStart !== "boolean") {
      throw new TypeError(location + " includeStart must be a boolean.");
    }
  }

  function createRegistry(label, handlers, builtins) {
    return Object.freeze({
      register: function (name, handler) {
        const key = normalizeName(name, label + " name");
        if (builtins.indexOf(key) !== -1) {
          throw new Error("Cannot replace built-in " + label + " '" + key + "'.");
        }
        if (typeof handler !== "function") {
          throw new TypeError(label + " handler must be a function.");
        }
        handlers.set(key, handler);
      }
    });
  }

  function registerInitialHandlers(source, registry, label) {
    if (source === undefined) {
      return;
    }
    if (!isPlainRecord(source)) {
      throw new TypeError(label + "Handlers must be an object of functions.");
    }
    for (const [name, handler] of Object.entries(source)) {
      registry.register(name, handler);
    }
  }

  function cloneJsonValue(value, label, ancestors) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new TypeError(label + " must contain only finite numbers.");
      }
      return value;
    }
    if (typeof value !== "object" || !isPlainRecord(value) && !Array.isArray(value)) {
      throw new TypeError(label + " must contain only JSON-compatible values.");
    }
    const seen = ancestors || [];
    if (seen.indexOf(value) !== -1) {
      throw new TypeError(label + " must not contain circular references.");
    }
    const next = seen.concat([value]);
    if (Array.isArray(value)) {
      const array = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!hasOwn(value, index)) {
          throw new TypeError(label + " must not contain sparse arrays.");
        }
        array.push(cloneJsonValue(value[index], label, next));
      }
      return array;
    }
    const object = {};
    for (const key of Object.keys(value)) {
      defineValue(object, key, cloneJsonValue(value[key], label, next));
    }
    return object;
  }

  function isPlainRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isScalar(value) {
    return value === null || typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number" && Number.isFinite(value);
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function defineValue(object, key, value) {
    Object.defineProperty(object, key, {
      value: value,
      enumerable: true,
      writable: true,
      configurable: true
    });
  }

  function normalizeName(value, label) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(label + " must be a non-empty string.");
    }
    return value.trim();
  }

  function validatePositiveNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new TypeError(label + " must be a finite positive number.");
    }
    return value;
  }

  function validateNonNegativeNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TypeError(label + " must be a finite non-negative number.");
    }
    return value;
  }

  function validateNonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(label + " must be a non-negative safe integer.");
    }
    return value;
  }

  function validateTag(tag, story, location) {
    if (tag !== undefined && (typeof tag !== "string" || tag.trim().length === 0)) {
      throw storyError(story, location + " tag must be a non-empty string.");
    }
  }

  function validateBelief(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) {
      throw new TypeError(label + " must be a number in (0, 1].");
    }
    return value;
  }

  function compareNames(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function storyError(story, message) {
    const id = isRecord(story) && typeof story.id === "string"
      ? story.id
      : "unknown";
    return new Error("Story '" + id + "': " + message);
  }

  function errorText(error) {
    return error && typeof error.message === "string"
      ? error.message
      : String(error);
  }

  function invalidInitialVariables() {
    throw new TypeError("initialVariables must be a plain object.");
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = NarrativeEngine;
  }
  if (root) {
    root.NarrativeEngine = NarrativeEngine;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
