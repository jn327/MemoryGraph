(function (root) {
  "use strict";

  class MemoryGraph {
    constructor(options) {
      const settings = options === undefined ? {} : options;
      if (!isRecord(settings)) {
        throw new TypeError("MemoryGraph options must be an object.");
      }

      this.maxEvents = settings.maxEvents === undefined
        ? null
        : validateNonNegativeInteger(settings.maxEvents, "maxEvents");
      this.clear();
    }

    remember(input) {
      if (!isRecord(input)) {
        throw new TypeError("remember() input must be an object.");
      }

      if (!Array.isArray(input.concepts)) {
        throw new TypeError("remember() concepts must be an array.");
      }

      const concepts = [];
      const uniqueConcepts = new Set();
      for (const value of input.concepts) {
        const concept = normalizeName(value, "concept");
        if (!uniqueConcepts.has(concept)) {
          uniqueConcepts.add(concept);
          concepts.push(concept);
        }
      }

      const strength = input.strength === undefined
        ? 1
        : validatePositiveNumber(input.strength, "strength");

      if (this.maxEvents !== null && this.events.length >= this.maxEvents) {
        throw new Error("MemoryGraph has reached its maxEvents capacity.");
      }
      if (!Number.isSafeInteger(this.idCounter + 1) ||
          !Number.isSafeInteger(this.sequence + 1)) {
        throw new RangeError("MemoryGraph event counters are exhausted.");
      }

      const metadata = input.metadata === undefined
        ? undefined
        : cloneJsonValue(input.metadata, "metadata");
      const nextSequence = this.sequence + 1;
      const updates = [];

      for (let i = 0; i < concepts.length; i += 1) {
        for (let j = i + 1; j < concepts.length; j += 1) {
          const left = concepts[i];
          const right = concepts[j];
          const current = this._association(left, right);
          const score = (current ? current.score : 0) + strength;
          const seen = (current ? current.seen : 0) + 1;
          if (!Number.isFinite(score) || !Number.isSafeInteger(seen)) {
            throw new RangeError("Association counters would exceed their supported range.");
          }
          updates.push({ left, right, score, seen, lastSeen: nextSequence });
        }
      }

      const event = {
        id: "event-" + (this.idCounter + 1),
        concepts: concepts,
        strength: strength,
        sequence: nextSequence
      };
      if (metadata !== undefined) {
        event.metadata = metadata;
      }

      this.events.push(event);
      this.eventById.set(event.id, event);
      for (const concept of concepts) {
        let eventIds = this.eventsByConcept.get(concept);
        if (!eventIds) {
          eventIds = [];
          this.eventsByConcept.set(concept, eventIds);
        }
        eventIds.push(event.id);
      }

      for (const update of updates) {
        this._setAssociation(update.left, update.right, update);
        this._setAssociation(update.right, update.left, update);
      }

      this.idCounter += 1;
      this.sequence = nextSequence;
      return copyEvent(event);
    }

    related(concept, limit) {
      const name = normalizeName(concept, "concept");
      const count = validateLimit(limit, 10, "limit");
      const neighbours = this.associations.get(name);
      if (!neighbours || count === 0) {
        return [];
      }

      return Array.from(neighbours.entries())
        .map(function (entry) {
          return {
            concept: entry[0],
            score: entry[1].score,
            seen: entry[1].seen,
            lastSeen: entry[1].lastSeen
          };
        })
        .sort(compareAssociations)
        .slice(0, count);
    }

    associationScore(a, b) {
      const left = normalizeName(a, "concept");
      const right = normalizeName(b, "concept");
      const edge = this._association(left, right);
      return edge ? edge.score : 0;
    }

    learnTransition(type, from, to, amount) {
      const transitionType = normalizeName(type, "transition type");
      const source = normalizeName(from, "transition source");
      const destination = normalizeName(to, "transition destination");
      const increment = amount === undefined
        ? 1
        : validatePositiveNumber(amount, "amount");
      const current = this._transition(transitionType, source, destination);
      const updated = (current || 0) + increment;
      if (!Number.isFinite(updated)) {
        throw new RangeError("Transition count would exceed its supported range.");
      }

      let bySource = this.transitions.get(transitionType);
      if (!bySource) {
        bySource = new Map();
        this.transitions.set(transitionType, bySource);
      }
      let byDestination = bySource.get(source);
      if (!byDestination) {
        byDestination = new Map();
        bySource.set(source, byDestination);
      }
      byDestination.set(destination, updated);
      return updated;
    }

    transitionCount(type, from, to) {
      const transitionType = normalizeName(type, "transition type");
      const source = normalizeName(from, "transition source");
      const destination = normalizeName(to, "transition destination");
      return this._transition(transitionType, source, destination) || 0;
    }

    predictNext(type, from, limit) {
      const transitionType = normalizeName(type, "transition type");
      const source = normalizeName(from, "transition source");
      const count = validateLimit(limit, 10, "limit");
      const destinations = this._transitionDestinations(transitionType, source);
      if (!destinations || count === 0) {
        return [];
      }

      return Array.from(destinations.entries())
        .map(function (entry) {
          return { concept: entry[0], score: entry[1] };
        })
        .sort(function (a, b) {
          return b.score - a.score || compareNames(a.concept, b.concept);
        })
        .slice(0, count);
    }

    activate(start, options) {
      return this._spreadActivation(
        [normalizeName(start, "start concept")],
        options
      );
    }

    activateMany(starts, options) {
      if (!Array.isArray(starts)) {
        throw new TypeError("activateMany() starts must be an array.");
      }
      const normalizedStarts = [];
      const uniqueStarts = new Set();
      for (const value of starts) {
        const concept = normalizeName(value, "start concept");
        if (!uniqueStarts.has(concept)) {
          uniqueStarts.add(concept);
          normalizedStarts.push(concept);
        }
      }
      return this._spreadActivation(normalizedStarts, options);
    }

    findMemories(concept, limit) {
      const name = normalizeName(concept, "concept");
      const count = validateLimit(limit, 20, "limit");
      const eventIds = this.eventsByConcept.get(name);
      if (!eventIds || count === 0) {
        return [];
      }

      const start = Math.max(0, eventIds.length - count);
      const results = [];
      for (let i = eventIds.length - 1; i >= start; i -= 1) {
        results.push(copyEvent(this.eventById.get(eventIds[i])));
      }
      return results;
    }

    toJSON() {
      const transitions = [];
      for (const [type, bySource] of this.transitions) {
        for (const [from, destinations] of bySource) {
          for (const [to, count] of destinations) {
            transitions.push({ type: type, from: from, to: to, count: count });
          }
        }
      }
      transitions.sort(function (a, b) {
        return compareNames(a.type, b.type) ||
          compareNames(a.from, b.from) ||
          compareNames(a.to, b.to);
      });

      return {
        version: 1,
        maxEvents: this.maxEvents,
        idCounter: this.idCounter,
        sequence: this.sequence,
        events: this.events.map(copyEvent),
        transitions: transitions
      };
    }

    static fromJSON(data) {
      if (!isRecord(data)) {
        throw new TypeError("MemoryGraph data must be an object.");
      }
      if (data.version !== 1) {
        throw new Error("Unsupported MemoryGraph data version.");
      }
      if (data.maxEvents !== null &&
          !Number.isSafeInteger(data.maxEvents)) {
        throw new TypeError("MemoryGraph maxEvents must be null or a non-negative integer.");
      }
      if (!Array.isArray(data.events) || !Array.isArray(data.transitions)) {
        throw new TypeError("MemoryGraph data must include events and transitions arrays.");
      }
      const idCounter = validateNonNegativeInteger(data.idCounter, "idCounter");
      const sequence = validateNonNegativeInteger(data.sequence, "sequence");
      const graph = new MemoryGraph({ maxEvents: data.maxEvents === null ? undefined : data.maxEvents });
      if (graph.maxEvents !== null && data.events.length > graph.maxEvents) {
        throw new Error("MemoryGraph data exceeds its maxEvents capacity.");
      }

      let previousSequence = 0;
      let highestId = 0;
      const ids = new Set();
      for (const sourceEvent of data.events) {
        if (!isRecord(sourceEvent)) {
          throw new TypeError("Each MemoryGraph event must be an object.");
        }
        if (typeof sourceEvent.id !== "string" || !/^event-[1-9]\d*$/.test(sourceEvent.id)) {
          throw new TypeError("MemoryGraph event IDs must use the event-N format.");
        }
        if (ids.has(sourceEvent.id)) {
          throw new Error("MemoryGraph event IDs must be unique.");
        }
        ids.add(sourceEvent.id);
        const numericId = Number(sourceEvent.id.slice(6));
        if (!Number.isSafeInteger(numericId)) {
          throw new TypeError("MemoryGraph event IDs must be safe integers.");
        }
        highestId = Math.max(highestId, numericId);

        if (!Array.isArray(sourceEvent.concepts)) {
          throw new TypeError("MemoryGraph event concepts must be an array.");
        }
        const concepts = [];
        const seenConcepts = new Set();
        for (const value of sourceEvent.concepts) {
          const concept = normalizeName(value, "event concept");
          if (concept !== value || seenConcepts.has(concept)) {
            throw new Error("Saved event concepts must be trimmed and unique.");
          }
          seenConcepts.add(concept);
          concepts.push(concept);
        }
        const strength = validatePositiveNumber(sourceEvent.strength, "event strength");
        const eventSequence = validateNonNegativeInteger(sourceEvent.sequence, "event sequence");
        if (eventSequence === 0 || eventSequence <= previousSequence) {
          throw new Error("Saved event sequences must be positive and strictly increasing.");
        }
        previousSequence = eventSequence;

        const event = {
          id: sourceEvent.id,
          concepts: concepts,
          strength: strength,
          sequence: eventSequence
        };
        if (Object.prototype.hasOwnProperty.call(sourceEvent, "metadata")) {
          event.metadata = cloneJsonValue(sourceEvent.metadata, "event metadata");
        }
        graph._restoreEvent(event);
      }
      if (idCounter < highestId || sequence < previousSequence) {
        throw new Error("MemoryGraph counters cannot be lower than saved event counters.");
      }
      graph.idCounter = idCounter;
      graph.sequence = sequence;

      for (const transition of data.transitions) {
        if (!isRecord(transition)) {
          throw new TypeError("Each MemoryGraph transition must be an object.");
        }
        const type = normalizeName(transition.type, "transition type");
        const from = normalizeName(transition.from, "transition source");
        const to = normalizeName(transition.to, "transition destination");
        const count = validatePositiveNumber(transition.count, "transition count");
        if (graph._transition(type, from, to) !== undefined) {
          throw new Error("Saved MemoryGraph transitions must be unique.");
        }
        graph.learnTransition(type, from, to, count);
      }

      return graph;
    }

    clear() {
      this.events = [];
      this.eventById = new Map();
      this.eventsByConcept = new Map();
      this.associations = new Map();
      this.transitions = new Map();
      this.idCounter = 0;
      this.sequence = 0;
    }

    _spreadActivation(starts, options) {
      const settings = options === undefined ? {} : options;
      if (!isRecord(settings)) {
        throw new TypeError("Activation options must be an object.");
      }
      const depth = settings.depth === undefined
        ? 2
        : validateNonNegativeInteger(settings.depth, "depth");
      const decay = settings.decay === undefined
        ? 0.7
        : validatePositiveNumber(settings.decay, "decay");
      if (decay > 1) {
        throw new RangeError("decay must be in the interval (0, 1].");
      }
      const edgeK = settings.edgeK === undefined
        ? 1
        : validatePositiveNumber(settings.edgeK, "edgeK");
      const minActivation = settings.minActivation === undefined
        ? 0.01
        : validateNonNegativeNumber(settings.minActivation, "minActivation");
      const limit = validateLimit(settings.limit, 20, "limit");
      const maxExpansions = settings.maxExpansions === undefined
        ? 10000
        : validateNonNegativeInteger(settings.maxExpansions, "maxExpansions");
      const includeStart = settings.includeStart === undefined
        ? true
        : settings.includeStart;
      if (typeof includeStart !== "boolean") {
        throw new TypeError("includeStart must be a boolean.");
      }

      if (starts.length === 0 || limit === 0 || minActivation > 1) {
        return [];
      }

      const bestByConcept = new Map();
      let frontier = new Map();
      for (const start of starts) {
        frontier.set(start, 1);
        bestByConcept.set(start, 1);
      }
      let expansions = 0;
      for (let currentDepth = 0;
        currentDepth < depth && frontier.size > 0;
        currentDepth += 1) {
        const nextFrontier = new Map();
        const currentConcepts = Array.from(frontier.keys()).sort(compareNames);
        for (const concept of currentConcepts) {
          const neighbours = this.associations.get(concept);
          if (!neighbours) {
            continue;
          }
          const orderedNeighbours = Array.from(neighbours.entries())
            .sort(function (a, b) {
              return compareNames(a[0], b[0]);
            });
          for (const [neighbour, edge] of orderedNeighbours) {
            if (expansions >= maxExpansions) {
              throw new Error("Activation exceeded maxExpansions (" + maxExpansions + ").");
            }
            expansions += 1;
            const scale = Math.max(edge.score, edgeK);
            let influence = (edge.score / scale) /
              ((edge.score / scale) + (edgeK / scale));
            if (influence >= 1) {
              influence = 1 - Number.EPSILON;
            }
            const activation = frontier.get(concept) * decay * influence;
            if (activation < minActivation || activation === 0) {
              continue;
            }
            const existing = nextFrontier.get(neighbour) || 0;
            if (activation > existing) {
              nextFrontier.set(neighbour, activation);
            }
            const previous = bestByConcept.get(neighbour) || 0;
            if (activation > previous) {
              bestByConcept.set(neighbour, activation);
            }
          }
        }
        frontier = nextFrontier;
      }

      const results = [];
      for (const [concept, activation] of bestByConcept) {
        if ((includeStart || starts.indexOf(concept) === -1) &&
            activation >= minActivation) {
          results.push({ concept: concept, activation: activation });
        }
      }
      results.sort(function (a, b) {
        return b.activation - a.activation || compareNames(a.concept, b.concept);
      });
      return results.slice(0, limit);
    }

    _restoreEvent(event) {
      this.events.push(event);
      this.eventById.set(event.id, event);
      for (const concept of event.concepts) {
        let eventIds = this.eventsByConcept.get(concept);
        if (!eventIds) {
          eventIds = [];
          this.eventsByConcept.set(concept, eventIds);
        }
        eventIds.push(event.id);
      }
      for (let i = 0; i < event.concepts.length; i += 1) {
        for (let j = i + 1; j < event.concepts.length; j += 1) {
          const left = event.concepts[i];
          const right = event.concepts[j];
          const current = this._association(left, right);
          const score = (current ? current.score : 0) + event.strength;
          const seen = (current ? current.seen : 0) + 1;
          if (!Number.isFinite(score) || !Number.isSafeInteger(seen)) {
            throw new RangeError("Saved associations exceed their supported range.");
          }
          const update = {
            score: score,
            seen: seen,
            lastSeen: event.sequence
          };
          this._setAssociation(left, right, update);
          this._setAssociation(right, left, update);
        }
      }
    }

    _association(left, right) {
      const neighbours = this.associations.get(left);
      return neighbours ? neighbours.get(right) : undefined;
    }

    _setAssociation(left, right, edge) {
      let neighbours = this.associations.get(left);
      if (!neighbours) {
        neighbours = new Map();
        this.associations.set(left, neighbours);
      }
      neighbours.set(right, {
        score: edge.score,
        seen: edge.seen,
        lastSeen: edge.lastSeen
      });
    }

    _transition(type, from, to) {
      const destinations = this._transitionDestinations(type, from);
      return destinations ? destinations.get(to) : undefined;
    }

    _transitionDestinations(type, from) {
      const bySource = this.transitions.get(type);
      return bySource ? bySource.get(from) : undefined;
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeName(value, label) {
    if (typeof value !== "string") {
      throw new TypeError(label + " must be a string.");
    }
    const name = value.trim();
    if (name.length === 0) {
      throw new TypeError(label + " must not be empty.");
    }
    return name;
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

  function validateLimit(value, defaultValue, label) {
    return value === undefined
      ? defaultValue
      : validateNonNegativeInteger(value, label);
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
    if (typeof value !== "object") {
      throw new TypeError(label + " must contain only JSON-compatible values.");
    }

    const seen = ancestors || [];
    if (seen.indexOf(value) !== -1) {
      throw new TypeError(label + " must not contain circular references.");
    }
    const nextAncestors = seen.concat([value]);
    if (Array.isArray(value)) {
      const result = [];
      for (let i = 0; i < value.length; i += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, i)) {
          throw new TypeError(label + " must not contain sparse arrays.");
        }
        result.push(cloneJsonValue(value[i], label, nextAncestors));
      }
      return result;
    }
    if (!isRecord(value)) {
      throw new TypeError(label + " must contain only plain objects.");
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(label + " must contain only plain objects.");
    }
    const result = {};
    for (const key of Object.keys(value)) {
      Object.defineProperty(result, key, {
        value: cloneJsonValue(value[key], label, nextAncestors),
        enumerable: true,
        writable: true,
        configurable: true
      });
    }
    return result;
  }

  function copyEvent(event) {
    const result = {
      id: event.id,
      concepts: event.concepts.slice(),
      strength: event.strength,
      sequence: event.sequence
    };
    if (Object.prototype.hasOwnProperty.call(event, "metadata")) {
      result.metadata = cloneJsonValue(event.metadata, "event metadata");
    }
    return result;
  }

  function compareNames(a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }

  function compareAssociations(a, b) {
    return b.score - a.score || compareNames(a.concept, b.concept);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = MemoryGraph;
  }
  if (root) {
    root.MemoryGraph = MemoryGraph;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
