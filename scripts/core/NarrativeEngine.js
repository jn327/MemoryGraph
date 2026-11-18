(function (root) {
  "use strict";

  const CONDITION_OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte"];
  const OPERATIONS = [
    "remember",
    "set",
    "inc",
    "dec",
    "macro",
    "gossip",
    "reveal",
    "doubt",
    "describe"
  ];
  const CONDITIONS = [
    "always",
    "association",
    "variable",
    "visited",
    "firstVisit",
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
      if (!isPlainRecord(settings)) {
        throw new TypeError("NarrativeEngine options must be an object.");
      }
      if (!root || typeof root.MemoryGraph !== "function") {
        throw new Error("MemoryGraph must be loaded before NarrativeEngine.");
      }

      this.story = cloneJsonValue(storyDefinition, "story definition");
      this.graph = new root.MemoryGraph();

      if (settings.onBranch !== undefined && typeof settings.onBranch !== "function") {
        throw new TypeError("onBranch must be a function.");
      }
      // Called with a branch ID (see branches()) whenever text, a choice, or
      // a route is used. For coverage tools; it must not change engine state.
      this.onBranch = settings.onBranch === undefined ? null : settings.onBranch;
      this._validateStory();
      this.knowledge = {};
      this._recording = null;
      this._clearProgress();
    }

    start(nodeId) {
      if (this.currentNodeId !== null) {
        throw new Error("Story '" + this.story.id + "' has already started; reset it first.");
      }
      const target = nodeId === undefined
        ? this.story.start
        : requireName(nodeId, "start node ID");
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
            if ((choice.once !== true || !this._chosen(this.currentNodeId, choice.id)) &&
                (choice.showIf === undefined || this._evaluateCondition(choice.showIf))) {
              this._branch(branchId(this.currentNodeId, "choice '" + choice.id + "' offered"));
              const entry = {
                index: choices.length,
                id: choice.id,
                text: substitute(choice.text, this)
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
        if (node.present !== undefined) {
          view.present = node.present.map((id) => ({
            id: id,
            name: this.characterName(id),
            description: this.characterDescription(id)
          }));
        }
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
      const records = [];
      this._recording = records;
      try {
        this._executeOperations(choice.do || [], {
          nodeId: nodeId,
          choiceId: choice.id,
          path: "choice operation"
        });
      } finally {
        this._recording = null;
      }
      const echo = this._echo(records);

      this.choiceHistory.push({ nodeId: nodeId, choiceId: choice.id });
      let destination;
      let arrival = null;
      try {
        const route = resolveRoute(choice.goto, this);
        destination = route.node;
        if (route.entry !== null) {
          this._branch(branchId(nodeId, "choice '" + choice.id + "' goto " + route.index));
          if (route.entry.if !== undefined) {
            arrival = this._cause(route.entry.if, route.entry.tag);
          }
        }
      } catch (error) {
        throw new Error(
          "Story '" + this.story.id + "', node '" + nodeId + "', choice '" +
          choice.id + "' route failed: " + errorText(error)
        );
      }
      return this._enterNode(destination, arrival, echo);
    }

    reset(options) {
      const settings = options === undefined ? {} : options;
      if (!isPlainRecord(settings)) {
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
      }
      this._clearProgress();
    }

    characterName(id) {
      const character = this._character(id);
      return character.name === undefined ? character.id : character.name;
    }

    // The character's description as the story currently has it: the latest
    // `describe` this run, else the one in `characters`, else null.
    characterDescription(id) {
      const character = this._character(id);
      if (hasOwn(this.descriptions, character.id)) {
        return this.descriptions[character.id];
      }
      const description = this.story.characters[character.id].description;
      return description === undefined ? null : description;
    }

    // Runs operations outside any choice, before or during a run: for
    // authoring tools that set up a scene, such as starting partway through
    // with some memories already in place.
    apply(operations) {
      this._validateOperations(operations, {
        macroStack: [],
        location: "applied operations"
      });
      this._executeOperations(operations, {
        nodeId: this.currentNodeId === null ? "(none)" : this.currentNodeId,
        choiceId: null,
        path: "applied operation"
      });
    }

    // How text refers to a subject: "you" for the player, a character's name,
    // or the concept itself with underscores as spaces.
    subjectName(subject) {
      if (subject === DEFAULT_SUBJECT) {
        return "you";
      }
      return hasOwn(this.story.characters, subject) ? this.characterName(subject) : displayName(subject);
    }

    // How strongly a perspective links two concepts: the summed weight of the
    // events it knows that contain both. Omit perspective for the world view,
    // which knows every event. See _eventWeight for how events are weighted.
    linkWeight(a, b, perspective) {
      return this._linkWeight(
        this._perspectiveKey(perspective),
        requireName(a, "concept"),
        requireName(b, "concept")
      );
    }

    // Σ weight(concept) × linkWeight(subject, concept), from one perspective.
    traitScore(trait, perspective, subject) {
      const definition = this._trait(trait);
      const who = subject === undefined ? DEFAULT_SUBJECT : requireName(subject, "subject");
      const key = this._perspectiveKey(perspective);
      let total = 0;
      for (const concept of Object.keys(definition.concepts).sort()) {
        total += definition.concepts[concept] * this._linkWeight(key, who, concept);
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
        : requireName(settings.subject, "recall subject");
      const rank = settings.rank === undefined ? 1 : settings.rank;
      let about = settings.about;
      if (settings.among !== undefined) {
        const trait = this._dominantAmong(settings.among, settings.perspective, subject);
        if (trait === null) {
          return null;
        }
        about = { trait: trait };
      }
      const candidates = this._rankEvents(key,
        (event) => this._eventSubject(event) === subject,
        (event) => this._recallWeight(event, about) *
          // Things done to or with the remembering character weigh more.
          (key !== WORLD_PERSPECTIVE && event.concepts.indexOf(key) !== -1 ? PERSONAL_RECALL_BONUS : 1));
      const pick = candidates[rank - 1];
      return pick === undefined ? null : {
        eventId: pick.event.id,
        summary: pick.event.metadata.summary,
        score: pick.score,
        belief: pick.belief
      };
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
          color: this._traitColor(trait),
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

    _traitColor(trait) {
      const color = this.story.traits[trait].color;
      return color === undefined ? null : color;
    }

    _character(id) {
      const name = requireName(id, "character");
      if (!hasOwn(this.story.characters, name)) {
        throw storyError(this.story, "unknown character '" + name + "'.");
      }
      return { id: name, name: this.story.characters[name].name };
    }

    _trait(trait) {
      const name = requireName(trait, "trait");
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

    // An event's weight from one perspective: its strength × how much the
    // perspective believes it × how recent it is (when memory.halfLife is set).
    _eventWeight(key, event) {
      return event.strength * this._belief(key, event.id) *
        this._recency(event.sequence, this.graph.sequence);
    }

    // Remembered events with a summary that `keep` accepts, scored by their
    // weight from the perspective × `relevance`, strongest (then newest)
    // first. Events scoring zero are left out.
    _rankEvents(key, keep, relevance) {
      const ranked = [];
      for (const event of this.graph.events) {
        if (!hasSummary(event)) {
          continue;
        }
        const belief = this._belief(key, event.id);
        if (!keep(event, belief)) {
          continue;
        }
        const score = this._eventWeight(key, event) * relevance(event);
        if (score > 0) {
          ranked.push({ event: event, score: score, belief: belief });
        }
      }
      return ranked.sort(function (a, b) {
        return b.score - a.score || b.event.sequence - a.event.sequence;
      });
    }

    _linkWeight(key, a, b) {
      if (a === b) {
        return 0;
      }
      let total = 0;
      for (const event of this.graph.events) {
        if (event.concepts.indexOf(a) !== -1 && event.concepts.indexOf(b) !== -1) {
          total += this._eventWeight(key, event);
        }
      }
      return total;
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
      return this.graph.events.some((event) =>
        this._concerns(event, condition.about) && this._belief(key, event.id) >= min
      );
    }

    // ---- Explanations -------------------------------------------------
    // A cause tells the player which remembered acts made a piece of text,
    // a choice, or a route appear. Only memory conditions (trait,
    // dominantTrait, knows, and association) produce one;
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
        color: primary !== undefined && primary.trait !== undefined ? this._traitColor(primary.trait) : null,
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
        for (const trait of Object.keys(this.story.traits)) {
          const weight = this._recallWeight(record.event, { trait: trait });
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
        .filter((record) => hasSummary(record.event) && this._eventSubject(record.event) === DEFAULT_SUBJECT)
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
        color: primary === undefined ? null : this._traitColor(primary),
        explanation: explanation
      };
    }

    _recallCause(spec, memory) {
      const key = this._perspectiveKey(spec.perspective);
      const who = key === WORLD_PERSPECTIVE ? null : this.characterName(key);
      const subject = spec.subject === undefined ? DEFAULT_SUBJECT : requireName(spec.subject, "subject");
      return {
        tag: who === null ? "remembered" : who + " remembers",
        kind: "recall",
        trait: null,
        color: null,
        explanation: [{
          heading: (who === null ? "Remembered" : who + " remembers") + " that " + this.subjectName(subject) + ":",
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
      const concept = fact.b.replace(/_/g, " ");
      return who === null ? concept : who + ": " + concept;
    }

    _explainFact(fact) {
      const who = fact.perspective === undefined ? null : this.characterName(fact.perspective);
      if (fact.kind === "trait") {
        const subject = fact.subject === undefined ? DEFAULT_SUBJECT : fact.subject;
        const label = this.traitLabel(fact.trait);
        const target = this.subjectName(subject);
        const stem = who === null
          ? capitalise(target) + (subject === DEFAULT_SUBJECT ? " are" : " is") + " seen as " + label
          : who + " sees " + target + " as " + label;
        return this._evidenceSection(stem, ", because", this._evidence(fact.perspective, subject,
          (event) => this._recallWeight(event, { trait: fact.trait })));
      }
      if (fact.kind === "knows") {
        return this._evidenceSection(who === null ? "It is known" : who + " knows", " that",
          this._evidence(fact.perspective, null, (event) =>
            this._concerns(event, fact.about) ? 1 : 0, fact.min), " about this.");
      }
      const pair = fact.a === DEFAULT_SUBJECT
        ? "you with “" + fact.b.replace(/_/g, " ") + "”"
        : "“" + fact.a.replace(/_/g, " ") + "” with “" + fact.b.replace(/_/g, " ") + "”";
      return this._evidenceSection((who === null ? "Memory links " : who + " links ") + pair, ", because",
        this._evidence(fact.perspective, null, (event) =>
          event.concepts.indexOf(fact.a) !== -1 && event.concepts.indexOf(fact.b) !== -1 ? 1 : 0));
    }

    // "Mira sees you as a liar, because you:" followed by bare summaries when
    // every act is the player's; otherwise "…, because:" with each act
    // phrased with its own subject ("you accused Jory", "Jory took the brooch").
    _evidenceSection(stem, joiner, entries, emptyEnding) {
      if (entries.length === 0) {
        return { heading: stem + (emptyEnding === undefined ? "." : emptyEnding), items: [] };
      }
      const allPlayer = entries.every(function (entry) { return entry.subject === DEFAULT_SUBJECT; });
      return {
        heading: stem + joiner + (allPlayer ? " you:" : ":"),
        items: entries.map((entry) => (allPlayer || entry.subject === null
          ? entry.summary
          : this.subjectName(entry.subject) + " " + entry.summary) + entry.note)
      };
    }

    // The remembered acts that most support a fact, strongest first, noting
    // when a character only heard about one secondhand.
    _evidence(perspective, subject, relevance, minBelief) {
      const key = this._perspectiveKey(perspective);
      const ranked = this._rankEvents(key, function (event, belief) {
        return (subject === null || event.concepts.indexOf(subject) !== -1) &&
          (minBelief === undefined || belief >= minBelief);
      }, relevance);
      return ranked.slice(0, MAX_EXPLANATION_ITEMS).map((entry) => ({
        subject: this._eventSubject(entry.event),
        summary: entry.event.metadata.summary,
        note: key === WORLD_PERSPECTIVE ? "" : beliefNote(entry.belief)
      }));
    }

    // Whose act an event's summary describes: remember's `subject`, else the
    // player when the event involves them, else null.
    _eventSubject(event) {
      if (isPlainRecord(event.metadata) && typeof event.metadata.subject === "string") {
        return event.metadata.subject;
      }
      return event.concepts.indexOf(DEFAULT_SUBJECT) !== -1 ? DEFAULT_SUBJECT : null;
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
      this.variables = {};
      this.descriptions = {};
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
          this._executeOperation(operation, source);
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

    _executeOperation(operation, source) {
      if (operation.type === "remember") {
        const metadata = {};
        if (operation.summary !== undefined) {
          metadata.summary = substitute(operation.summary, this);
        }
        if (operation.subject !== undefined) {
          metadata.subject = operation.subject;
        }
        const event = this.graph.remember({
          concepts: operation.concepts,
          strength: operation.strength,
          metadata: Object.keys(metadata).length === 0 ? undefined : metadata
        });
        const witnesses = operation.witnesses === undefined ? [] : this._characters(operation.witnesses);
        for (const character of witnesses) {
          this._learn(character, event.id, 1);
        }
        if (this._recording !== null) {
          this._recording.push({ event: event, witnesses: witnesses });
        }
      } else if (operation.type === "gossip") {
        const from = this._character(operation.from).id;
        const factor = operation.belief === undefined ? DEFAULT_GOSSIP_BELIEF : operation.belief;
        const listeners = this._characters(operation.to).filter(function (id) {
          return id !== from;
        });
        for (const event of this.graph.events) {
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
        for (const event of this.graph.events) {
          if (this._concerns(event, operation.about)) {
            for (const listener of listeners) {
              this._learn(listener, event.id, belief);
            }
          }
        }
      } else if (operation.type === "doubt") {
        // Talked out of it: belief in matching events drops to at most
        // `belief`; at 0 the character no longer counts the event at all.
        const ceiling = operation.belief === undefined ? 0 : operation.belief;
        for (const character of this._characters(operation.to)) {
          const known = this.knowledge[character];
          if (known === undefined) {
            continue;
          }
          for (const event of this.graph.events) {
            if (hasOwn(known, event.id) && known[event.id] > ceiling &&
                this._concerns(event, operation.about)) {
              if (ceiling === 0) {
                delete known[event.id];
              } else {
                defineValue(known, event.id, ceiling);
              }
            }
          }
        }
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
      } else if (operation.type === "describe") {
        defineValue(this.descriptions, this._character(operation.character).id,
          substitute(operation.description, this));
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
      switch (condition.type) {
        case "always":
          return true;
        case "association":
          // Without a perspective this reads the raw graph (no recency fade).
          return (condition.perspective === undefined
            ? this.graph.associationScore(condition.a, condition.b)
            : this.linkWeight(condition.a, condition.b, condition.perspective)) >= condition.min;
        case "trait": {
          const score = this.traitScore(condition.trait, condition.perspective, condition.subject);
          return (condition.min === undefined || score >= condition.min) &&
            (condition.max === undefined || score <= condition.max);
        }
        case "dominantTrait":
          return this._dominantTrait(condition);
        case "knows":
          return this._knows(condition);
        case "variable":
          return this._compareVariable(condition);
        case "visited":
          return condition.operator === undefined
            ? this.nodeVisits.indexOf(condition.node) !== -1
            : compare(this._visitCount(condition.node), condition.operator, condition.value);
        case "firstVisit":
          return this.currentNodeId !== null && this._visitCount(this.currentNodeId) === 1;
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

    // How many times a scene has been entered this run, counting the current
    // visit, so inside a scene "visited shop >= 2" means "back again".
    _visitCount(nodeId) {
      return this.nodeVisits.reduce(function (count, id) { return id === nodeId ? count + 1 : count; }, 0);
    }

    // True when the player has already picked this choice in this run. A
    // choice marked once is hidden after that.
    _chosen(nodeId, choiceId) {
      return this.choiceHistory.some(function (entry) {
        return entry.nodeId === nodeId && entry.choiceId === choiceId;
      });
    }

    // An unset variable makes every comparison false, and only numbers are
    // ordered: "count >= 1" is false when count holds "1".
    _compareVariable(condition) {
      if (!hasOwn(this.variables, condition.name)) {
        return false;
      }
      const actual = this.variables[condition.name];
      const ordered = condition.operator !== "eq" && condition.operator !== "neq";
      return (!ordered || typeof actual === "number" && Number.isFinite(actual)) &&
        compare(actual, condition.operator, condition.value);
    }

    _validateStory() {
      const story = this.story;
      if (!isPlainRecord(story)) {
        throw new TypeError("Story definition must be a plain object.");
      }
      requireName(story.id, "story id");
      requireText(story.title, "story title");
      requireName(story.start, "story start");
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
        requireName(macroName, "macro name");
        if (!isPlainRecord(macro)) {
          throw storyError(story, "macro '" + macroName + "' must be an object.");
        }
        if (macro.do !== undefined) {
          this._validateOperations(macro.do, {
            macroStack: [macroName],
            location: "macro '" + macroName + "'"
          });
        }
        if (macro.condition !== undefined) {
          this._validateCondition(macro.condition, {
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
        requireName(nodeId, "node ID");
        if (!isPlainRecord(node)) {
          throw storyError(story, "node '" + nodeId + "' must be an object.");
        }
        validateText(node.text, this, {
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
        if (node.present !== undefined) {
          if (!Array.isArray(node.present) || new Set(node.present).size !== node.present.length) {
            throw storyError(story, "node '" + nodeId + "' present must list each character once.");
          }
          this._validateCharacters(node.present, "node '" + nodeId + "' present");
        }
        if (node.onEnter !== undefined) {
          this._validateOperations(node.onEnter, {
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
          const choiceId = requireName(choice.id, "choice ID");
          if (choiceIds.has(choiceId)) {
            throw storyError(story, "node '" + nodeId + "' has duplicate choice ID '" + choiceId + "'.");
          }
          choiceIds.add(choiceId);
          requireText(choice.text, "choice text");
          this._validateTemplate(choice.text, "node '" + nodeId + "' choice '" + choiceId + "' text");
          validateTag(choice.tag, story, "node '" + nodeId + "' choice '" + choiceId + "'");
          if (choice.once !== undefined && typeof choice.once !== "boolean") {
            throw storyError(story, "node '" + nodeId + "' choice '" + choiceId + "' once must be a boolean.");
          }
          if (choice.showIf !== undefined) {
            this._validateCondition(choice.showIf, {
              macroStack: [],
              location: "node '" + nodeId + "' choice '" + choiceId + "' showIf"
            });
          }
          if (choice.do !== undefined) {
            this._validateOperations(choice.do, {
              macroStack: [],
              location: "node '" + nodeId + "' choice '" + choiceId + "' do"
            });
          }
          if (!ending) {
            if (choice.goto === undefined) {
              throw storyError(story, "node '" + nodeId + "' choice '" + choiceId + "' requires goto.");
            }
            validateRoute(choice.goto, story, this, {
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

    _branch(id) {
      if (this.onBranch !== null) {
        this.onBranch(id);
      }
    }

    // Every branch ID that onBranch can report: each text variant, each
    // conditional text part's outcomes, each choice being offered, and each
    // conditional route entry. Coverage tools compare this with what fired.
    branches() {
      const ids = [];
      for (const [nodeId, node] of Object.entries(this.story.nodes)) {
        if (Array.isArray(node.text)) {
          node.text.forEach(function (variant, index) {
            const where = "text variant " + index;
            ids.push(branchId(nodeId, where));
            if (!Array.isArray(variant.value)) {
              return;
            }
            variant.value.forEach(function (part, partIndex) {
              if (typeof part === "string") {
                return;
              }
              const at = where + " part " + partIndex + " (";
              if (part.else !== undefined) {
                ids.push(branchId(nodeId, at + "else)"));
              }
              if (part.text !== undefined) {
                ids.push(branchId(nodeId, at + "text)"));
              } else {
                ids.push(branchId(nodeId, at + "recall)"));
                if (part.otherwise !== undefined) {
                  ids.push(branchId(nodeId, at + "otherwise)"));
                }
              }
            });
          });
        }
        for (const choice of node.choices || []) {
          ids.push(branchId(nodeId, "choice '" + choice.id + "' offered"));
          if (Array.isArray(choice.goto)) {
            choice.goto.forEach(function (entry, index) {
              ids.push(branchId(nodeId, "choice '" + choice.id + "' goto " + index));
            });
          }
        }
      }
      return ids;
    }

    // ---- Authoring warnings ----------------------------------------------
    // lint() reports things that are valid but almost certainly mistakes,
    // such as a concept that is checked for but never remembered (usually a
    // typo). It returns [{ location, message }] and never throws for them.

    lint() {
      const story = this.story;
      const found = this._collect();
      const warnings = [];
      const warn = function (location, message) {
        warnings.push({ location: location, message: message });
      };
      const remembered = new Set();
      for (const { operation } of found.remembers) {
        for (const concept of operation.concepts) {
          remembered.add(concept);
        }
      }
      const unremembered = function (concepts, location, consequence) {
        for (const concept of concepts) {
          if (!remembered.has(concept)) {
            const close = closestName(concept, remembered);
            warn(location, "concept '" + concept + "' is never remembered, so " + consequence +
              (close === null ? "." : " (did you mean '" + close + "'?)."));
          }
        }
      };

      for (const [name, trait] of Object.entries(story.traits)) {
        const concepts = Object.keys(trait.concepts);
        const missing = concepts.filter(function (concept) { return !remembered.has(concept); });
        if (missing.length === concepts.length) {
          warn("trait '" + name + "'", "none of its concepts is ever remembered, so it can never score.");
        } else {
          unremembered(missing, "trait '" + name + "'", "it never counts toward this trait");
        }
      }

      const traitConcepts = new Set();
      for (const trait of Object.values(story.traits)) {
        Object.keys(trait.concepts).forEach(function (concept) { traitConcepts.add(concept); });
      }
      for (const { operation, location } of found.remembers) {
        const concepts = operation.concepts;
        const hasSubject = operation.subject !== undefined || concepts.indexOf(DEFAULT_SUBJECT) !== -1;
        if (operation.summary === undefined) {
          if (hasSubject && concepts.some(function (concept) { return traitConcepts.has(concept); })) {
            warn(location, "this act counts toward a trait but has no summary, so recalls and memory tags can't mention it.");
          }
          continue;
        }
        const summary = operation.summary;
        if (!hasSubject) {
          warn(location, "summary has no subject: add \"subject\" (or include \"player\") so the story knows whose act it describes.");
        }
        if (/^you\b/i.test(summary)) {
          warn(location, "summaries already complete \"you …\"; drop the leading \"you\".");
        }
        if (/[.!]$/.test(summary)) {
          warn(location, "summaries are used mid-sentence; drop the final punctuation.");
        }
      }

      const learners = new Set();
      const learn = function (who) {
        (who === "all" ? Object.keys(story.characters) : who).forEach(function (id) { learners.add(id); });
      };
      for (const { operation } of found.remembers) {
        if (operation.witnesses !== undefined) {
          learn(operation.witnesses);
        }
      }
      for (const { operation, location } of found.operations) {
        if (operation.type === "gossip" || operation.type === "reveal") {
          learn(operation.to);
        }
        if ((operation.type === "gossip" || operation.type === "reveal" || operation.type === "doubt") &&
            operation.about !== undefined && operation.about.concepts !== undefined) {
          unremembered(operation.about.concepts, location, "this never matches anything");
        }
        if (operation.type === "set" || operation.type === "inc" || operation.type === "dec") {
          found.variablesSet.add(operation.variable);
        }
      }
      for (const id of Object.keys(story.characters)) {
        if (!learners.has(id)) {
          warn("character '" + id + "'", "never witnesses or hears about anything, so they never form a view of anyone.");
        }
      }

      for (const { condition, location } of found.conditions) {
        if (condition.type === "knows" && condition.about !== undefined && condition.about.concepts !== undefined) {
          unremembered(condition.about.concepts, location, "this condition is never true");
        } else if (condition.type === "association") {
          unremembered([condition.a, condition.b], location, "this condition is never true");
        } else if ((condition.type === "trait" || condition.type === "dominantTrait") &&
            condition.subject !== undefined) {
          unremembered([condition.subject], location, "this subject never gains a reputation");
        } else if (condition.type === "variable") {
          found.variablesRead.push({ name: condition.name, location: location });
        }
      }
      for (const { spec, location } of found.recalls) {
        if (spec.about !== undefined && spec.about.concepts !== undefined) {
          unremembered(spec.about.concepts, location, "this recall never finds anything");
        }
      }

      for (const { text, location, isFormat } of found.templates) {
        for (const match of text.matchAll(/\{([A-Za-z]+)(?::([^{}]*))?\}/g)) {
          if (match[1] === "var" && match[2] !== undefined && match[2].length > 0) {
            found.variablesRead.push({ name: match[2], location: location });
          } else if (match[1] === "summary" && match[2] === undefined) {
            if (!isFormat) {
              warn(location, "{summary} only works in a recall part's format.");
            }
          } else if (match[1] !== "name" || match[2] === undefined) {
            warn(location, "'" + match[0] + "' is not a placeholder; use {name:character} or {var:variable}.");
          }
        }
      }
      for (const { name, location } of found.variablesRead) {
        if (!found.variablesSet.has(name)) {
          warn(location, "variable '" + name + "' is never set, inc'd, or dec'd.");
        }
      }
      for (const name of Object.keys(story.macros)) {
        if (!found.macroUses.has(name)) {
          warn("macro '" + name + "'", "is never used.");
        }
      }
      for (const [nodeId, node] of Object.entries(story.nodes)) {
        const choices = node.choices || [];
        const loops = choices.some(function (choice) {
          return choice.goto !== undefined && routeDestinations(choice.goto).indexOf(nodeId) !== -1;
        });
        if (!node.ending && loops &&
            choices.every(function (choice) { return choice.once === true; })) {
          warn("node '" + nodeId + "'", "loops back to itself but every choice is (once), so the player " +
            "is stuck once they have all been taken. Add a way out that isn't (once).");
        }
      }
      return warnings;
    }

    // Gathers every operation, condition, recall, and text template in the
    // story, with a readable location for each.
    _collect() {
      const story = this.story;
      const found = {
        operations: [],
        remembers: [],
        conditions: [],
        recalls: [],
        templates: [],
        macroUses: new Set(),
        variablesSet: new Set(),
        variablesRead: []
      };
      const operations = (list, location) => {
        (list || []).forEach(function (operation, index) {
          const where = location + " operation " + index;
          found.operations.push({ operation: operation, location: where });
          if (operation.type === "remember") {
            found.remembers.push({ operation: operation, location: where });
            if (operation.summary !== undefined) {
              found.templates.push({ text: operation.summary, location: where + " summary" });
            }
          } else if (operation.type === "macro") {
            found.macroUses.add(operation.name);
          } else if (operation.type === "describe") {
            found.templates.push({ text: operation.description, location: where + " description" });
          }
        });
      };
      const condition = (value, location) => {
        if (!isPlainRecord(value)) {
          return;
        }
        found.conditions.push({ condition: value, location: location });
        if (value.type === "not") {
          condition(value.condition, location);
        } else if (value.type === "all" || value.type === "any") {
          value.conditions.forEach(function (child) { condition(child, location); });
        } else if (value.type === "macroCondition") {
          found.macroUses.add(value.name);
        }
      };
      const template = (text, location, isFormat) => {
        if (typeof text === "string") {
          found.templates.push({ text: text, location: location, isFormat: isFormat === true });
        }
      };
      const text = (value, location) => {
        if (typeof value === "string") {
          template(value, location);
          return;
        }
        value.forEach(function (variant, index) {
          const where = location + " variant " + index;
          condition(variant.if, where);
          if (typeof variant.value === "string") {
            template(variant.value, where);
            return;
          }
          variant.value.forEach(function (part, partIndex) {
            const at = where + " part " + partIndex;
            if (typeof part === "string") {
              template(part, at);
              return;
            }
            condition(part.if, at);
            template(part.text, at);
            template(part.else, at + " else");
            template(part.otherwise, at + " otherwise");
            template(part.format, at + " format", true);
            if (part.recall !== undefined) {
              found.recalls.push({ spec: part.recall, location: at });
            }
          });
        });
      };

      for (const [name, macro] of Object.entries(story.macros)) {
        operations(macro.do, "macro '" + name + "'");
        condition(macro.condition, "macro '" + name + "'");
      }
      for (const [nodeId, node] of Object.entries(story.nodes)) {
        text(node.text, "node '" + nodeId + "' text");
        operations(node.onEnter, "node '" + nodeId + "' onEnter");
        for (const choice of node.choices || []) {
          const where = "node '" + nodeId + "' choice '" + choice.id + "'";
          template(choice.text, where + " text");
          condition(choice.showIf, where + " showIf");
          operations(choice.do, where + " do");
          if (Array.isArray(choice.goto)) {
            choice.goto.forEach(function (entry, index) { condition(entry.if, where + " goto " + index); });
          }
        }
      }
      return found;
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
        requireName(id, "character ID");
        if (id === "all") {
          throw storyError(story, "'all' is reserved and cannot be a character ID.");
        }
        if (!isPlainRecord(character)) {
          throw storyError(story, "character '" + id + "' must be an object.");
        }
        if (character.name !== undefined) {
          requireText(character.name, "character '" + id + "' name");
        }
        if (character.hidden !== undefined && typeof character.hidden !== "boolean") {
          throw storyError(story, "character '" + id + "' hidden must be a boolean.");
        }
        if (character.description !== undefined) {
          requireText(character.description, "character '" + id + "' description");
        }
      }
      for (const [name, trait] of Object.entries(story.traits)) {
        requireName(name, "trait name");
        if (!isPlainRecord(trait) || !isPlainRecord(trait.concepts) ||
            Object.keys(trait.concepts).length === 0) {
          throw storyError(story, "trait '" + name + "' must define a non-empty concepts object.");
        }
        for (const [concept, weight] of Object.entries(trait.concepts)) {
          requireName(concept, "trait '" + name + "' concept");
          if (typeof weight !== "number" || !Number.isFinite(weight) || weight === 0) {
            throw storyError(story, "trait '" + name + "' weight for '" + concept +
              "' must be a finite non-zero number.");
          }
        }
        if (trait.color !== undefined && (typeof trait.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(trait.color))) {
          throw storyError(story, "trait '" + name + "' color must be a #rrggbb hex string.");
        }
        if (trait.label !== undefined) {
          requireText(trait.label, "trait '" + name + "' label");
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
      const name = requireName(id, location + " character");
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
      const name = requireName(trait, location + " trait");
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

    _validateTemplate(text, location) {
      for (const match of text.matchAll(PLACEHOLDER)) {
        if (match[1] === "name") {
          this._validateCharacter(match[2], location + " {name:…}");
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
        requireName(spec.subject, location + " subject");
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
        const type = requireName(operation.type, "operation type");
        if (OPERATIONS.indexOf(type) === -1) {
          throw storyError(this.story, location + " has unknown type '" + type + "'.");
        }
        if (type === "remember") {
          validateConcepts(operation.concepts, this.story, location + " concepts");
          if (operation.strength !== undefined) {
            validatePositiveNumber(operation.strength, location + " strength");
          }
          if (operation.summary !== undefined) {
            requireText(operation.summary, location + " summary");
          }
          if (operation.witnesses !== undefined) {
            this._validateCharacters(operation.witnesses, location + " witnesses");
          }
          if (operation.subject !== undefined) {
            const subject = requireName(operation.subject, location + " subject");
            if (operation.concepts.indexOf(subject) === -1) {
              throw storyError(this.story, location + " subject '" + subject + "' must be one of its concepts.");
            }
          }
          if (operation.summary !== undefined) {
            this._validateTemplate(operation.summary, location + " summary");
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
        } else if (type === "doubt") {
          this._validateCharacters(operation.to, location + " to");
          this._validateAbout(operation.about, location, true);
          if (operation.belief !== undefined && (typeof operation.belief !== "number" ||
              !Number.isFinite(operation.belief) || operation.belief < 0 || operation.belief >= 1)) {
            throw storyError(this.story, location + " doubt belief must be a number in [0, 1).");
          }
        } else if (type === "set") {
          requireName(operation.variable, location + " variable");
          cloneJsonValue(operation.value, location + " value");
        } else if (type === "inc" || type === "dec") {
          requireName(operation.variable, location + " variable");
          if (operation.amount !== undefined) {
            validatePositiveNumber(operation.amount, location + " amount");
          }
        } else if (type === "describe") {
          this._validateCharacter(operation.character, location + " describe");
          requireText(operation.description, location + " description");
          this._validateTemplate(operation.description, location + " description");
        } else if (type === "macro") {
          const name = requireName(operation.name, location + " macro name");
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
      const type = requireName(condition.type, context.location + " condition type");
      if (CONDITIONS.indexOf(type) === -1) {
        throw storyError(this.story, context.location + " has unknown condition type '" + type + "'.");
      }
      if (type === "always") {
        return;
      }
      if (type === "association") {
        requireName(condition.a, context.location + " association a");
        requireName(condition.b, context.location + " association b");
        validateNonNegativeNumber(condition.min, context.location + " association min");
        this._validatePerspective(condition.perspective, context.location);
      } else if (type === "trait") {
        this._validateTraitName(condition.trait, context.location);
        this._validatePerspective(condition.perspective, context.location);
        if (condition.subject !== undefined) {
          requireName(condition.subject, context.location + " subject");
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
          requireName(condition.subject, context.location + " subject");
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
      } else if (type === "variable") {
        requireName(condition.name, context.location + " variable name");
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
        requireName(condition.node, context.location + " visited node");
        if (!hasOwn(this.story.nodes, condition.node)) {
          throw storyError(this.story, context.location + " references unknown node '" + condition.node + "'.");
        }
        if ((condition.operator === undefined) !== (condition.value === undefined)) {
          throw storyError(this.story, context.location + " visited needs both operator and value, or neither.");
        }
        if (condition.operator !== undefined) {
          if (CONDITION_OPERATORS.indexOf(condition.operator) === -1) {
            throw storyError(this.story, context.location + " has an invalid visited operator.");
          }
          if (!Number.isSafeInteger(condition.value) || condition.value < 0) {
            throw storyError(this.story, context.location + " visited count must be a non-negative integer.");
          }
        }
      } else if (type === "firstVisit") {
        // No fields: it is about whichever scene the player is in.
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
        const name = requireName(condition.name, context.location + " macro name");
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
      const text = substitute(definition, engine);
      return { text: text, segments: [{ text: text }] };
    }
    for (let index = 0; index < definition.length; index += 1) {
      const variant = definition[index];
      if (variant.if === undefined || engine._evaluateCondition(variant.if)) {
        const where = "text variant " + index;
        engine._branch(branchId(engine.currentNodeId, where));
        const cause = variant.if === undefined ? null : engine._cause(variant.if, variant.tag);
        const segments = typeof variant.value === "string"
          ? [{ text: substitute(variant.value, engine) }]
          : composeParts(variant.value, engine, where);
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
  // whitespace (for example "\n\n" for a paragraph break), or that starts
  // with closing punctuation, is joined as-is.
  // Each joined part becomes a segment that carries its own separator.
  function composeParts(parts, engine, where) {
    const segments = [];
    let output = "";
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const branch = function (outcome) {
        engine._branch(branchId(engine.currentNodeId, where + " part " + index + " (" + outcome + ")"));
      };
      let piece;
      let cause = null;
      if (typeof part === "string") {
        piece = substitute(part, engine);
      } else if (part.if !== undefined && !engine._evaluateCondition(part.if)) {
        piece = part.else === undefined ? "" : substitute(part.else, engine);
        if (part.else !== undefined) {
          branch("else");
        }
      } else if (part.text !== undefined) {
        branch("text");
        piece = substitute(part.text, engine);
        if (part.if !== undefined) {
          cause = engine._cause(part.if, part.tag);
        }
      } else {
        const memory = engine.recall(part.recall);
        if (memory === null) {
          piece = part.otherwise === undefined ? "" : substitute(part.otherwise, engine);
          if (part.otherwise !== undefined) {
            branch("otherwise");
          }
        } else {
          branch("recall");
          piece = substitute(part.format === undefined ? "{summary}" : part.format, engine)
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
      // No space before a piece that carries on the sentence, as in "{…}." or "{…},".
      const joined = output.length === 0 || /\s$/.test(output) || /^[\s.,;:!?)\u2019\u201d]/.test(piece)
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

  // {name:mira} becomes a character's name and {var:coins} a variable's
  // current value. Other braces, including recall's {summary}, are left as-is.
  const PLACEHOLDER = /\{(name|var):([^{}]+)\}/g;

  function substitute(text, engine) {
    return text.replace(PLACEHOLDER, function (match, kind, name) {
      if (kind === "name") {
        return engine.characterName(name);
      }
      if (!hasOwn(engine.variables, name)) {
        throw storyError(engine.story, "text uses {var:" + name + "} before the variable is set.");
      }
      const current = engine.variables[name];
      if (!isScalar(current)) {
        throw storyError(engine.story, "{var:" + name + "} must hold a string, number, boolean, or null.");
      }
      return String(current);
    });
  }

  function branchId(nodeId, detail) {
    return "node '" + nodeId + "' " + detail;
  }

  function hasSummary(event) {
    return isPlainRecord(event.metadata) && typeof event.metadata.summary === "string";
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
        engine._validateTemplate(part, location);
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
        if (part[key] !== undefined) {
          if (typeof part[key] !== "string") {
            throw storyError(engine.story, location + " " + key + " must be a string.");
          }
          engine._validateTemplate(part[key], location + " " + key);
        }
      }
      if (part.text === undefined && part.recall !== undefined) {
        engine._validateRecall(part.recall, location);
      } else if (part.format !== undefined || part.otherwise !== undefined) {
        throw storyError(engine.story, location + " format and otherwise only apply to recall parts.");
      }
      if (part.if !== undefined) {
        engine._validateCondition(part.if, { macroStack: context.macroStack, location: location });
      } else if (part.else !== undefined) {
        throw storyError(engine.story, location + " else requires if.");
      }
    }
  }

  function validateText(text, engine, context) {
    if (typeof text === "string") {
      requireText(text, context.location);
      engine._validateTemplate(text, context.location);
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
        requireText(variant.value, context.location + " variant value");
        engine._validateTemplate(variant.value, context.location + " variant " + index);
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
      const nodeId = requireName(entry.node, context.location + " destination");
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
      return { node: route, entry: null, index: null };
    }
    for (let index = 0; index < route.length; index += 1) {
      const entry = route[index];
      if (entry.if === undefined || engine._evaluateCondition(entry.if)) {
        return { node: entry.node, entry: entry, index: index };
      }
    }
    throw storyError(engine.story, "node '" + engine.currentNodeId + "' has no matching route.");
  }

  function compare(actual, operator, expected) {
    switch (operator) {
      case "eq": return actual === expected;
      case "neq": return actual !== expected;
      case "gt": return actual > expected;
      case "gte": return actual >= expected;
      case "lt": return actual < expected;
      case "lte": return actual <= expected;
      default: return false;
    }
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
      requireName(concept, location + " concept");
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

  // Names (ids, concepts, variables) are used exactly as written, so one
  // with spaces around it would never match its uses.
  function requireName(value, label) {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
      throw new TypeError(label + " must be a non-empty string without surrounding spaces.");
    }
    return value;
  }

  function requireText(value, label) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(label + " must be a non-empty string.");
    }
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

  // The closest of `names` to `word`, when it is near enough to be a typo.
  function closestName(word, names) {
    let best = null;
    let bestDistance = Infinity;
    for (const name of names) {
      // Edit distance, counting a swap of neighbouring letters as one edit.
      let before = null;
      let previous = Array.from({ length: name.length + 1 }, function (unused, index) { return index; });
      for (let i = 1; i <= word.length; i += 1) {
        const current = [i];
        for (let j = 1; j <= name.length; j += 1) {
          current[j] = Math.min(previous[j] + 1, current[j - 1] + 1,
            previous[j - 1] + (word[i - 1] === name[j - 1] ? 0 : 1));
          if (before !== null && j > 1 && word[i - 1] === name[j - 2] && word[i - 2] === name[j - 1]) {
            current[j] = Math.min(current[j], before[j - 2] + 1);
          }
        }
        before = previous;
        previous = current;
      }
      if (previous[name.length] < bestDistance) {
        best = name;
        bestDistance = previous[name.length];
      }
    }
    return best !== null && bestDistance <= Math.max(1, Math.floor(word.length / 3)) ? best : null;
  }

  function compareNames(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function storyError(story, message) {
    const id = isPlainRecord(story) && typeof story.id === "string"
      ? story.id
      : "unknown";
    return new Error("Story '" + id + "': " + message);
  }

  function errorText(error) {
    return error && typeof error.message === "string"
      ? error.message
      : String(error);
  }


  if (typeof module !== "undefined" && module.exports) {
    module.exports = NarrativeEngine;
  }
  if (root) {
    root.NarrativeEngine = NarrativeEngine;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
