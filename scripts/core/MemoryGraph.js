(function (root) {
  "use strict";

  // An append-only log of memory events. Each event groups concepts (plain
  // strings); concepts that appear in the same event are linked, and the
  // links' weights are summed into a small co-occurrence graph.
  class MemoryGraph {
    constructor() {
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
      for (const value of input.concepts) {
        const concept = requireName(value, "concept");
        if (concepts.indexOf(concept) === -1) {
          concepts.push(concept);
        }
      }
      const strength = input.strength === undefined
        ? 1
        : validatePositiveNumber(input.strength, "strength");
      const metadata = input.metadata === undefined
        ? undefined
        : cloneJsonValue(input.metadata, "metadata");

      const sequence = this.sequence + 1;
      const event = {
        id: "event-" + sequence,
        concepts: concepts,
        strength: strength,
        sequence: sequence
      };
      if (metadata !== undefined) {
        event.metadata = metadata;
      }

      this.events.push(event);
      this.sequence = sequence;
      for (let i = 0; i < concepts.length; i += 1) {
        for (let j = i + 1; j < concepts.length; j += 1) {
          this._strengthen(concepts[i], concepts[j], strength);
          this._strengthen(concepts[j], concepts[i], strength);
        }
      }
      return copyEvent(event);
    }

    related(concept, limit) {
      const name = requireName(concept, "concept");
      const count = limit === undefined ? 10 : validateNonNegativeInteger(limit, "limit");
      const neighbours = this.associations.get(name);
      if (!neighbours || count === 0) {
        return [];
      }

      return Array.from(neighbours.entries())
        .map(function (entry) {
          return { concept: entry[0], score: entry[1].score, seen: entry[1].seen };
        })
        .sort(function (a, b) {
          return b.score - a.score || (a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0);
        })
        .slice(0, count);
    }

    associationScore(a, b) {
      const neighbours = this.associations.get(requireName(a, "concept"));
      const edge = neighbours ? neighbours.get(requireName(b, "concept")) : undefined;
      return edge ? edge.score : 0;
    }

    clear() {
      this.events = [];
      this.associations = new Map();
      this.sequence = 0;
    }

    _strengthen(from, to, strength) {
      let neighbours = this.associations.get(from);
      if (!neighbours) {
        neighbours = new Map();
        this.associations.set(from, neighbours);
      }
      const edge = neighbours.get(to) || { score: 0, seen: 0 };
      neighbours.set(to, { score: edge.score + strength, seen: edge.seen + 1 });
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function requireName(value, label) {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
      throw new TypeError(label + " must be a non-empty string without surrounding spaces.");
    }
    return value;
  }

  function validatePositiveNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new TypeError(label + " must be a finite positive number.");
    }
    return value;
  }

  function validateNonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(label + " must be a non-negative safe integer.");
    }
    return value;
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

  if (typeof module !== "undefined" && module.exports) {
    module.exports = MemoryGraph;
  }
  if (root) {
    root.MemoryGraph = MemoryGraph;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
