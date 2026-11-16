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
    "macro"
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
    "macroCondition"
  ];

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
        const text = resolveText(node.text, this);
        const choices = [];
        if (!node.ending) {
          for (const choice of node.choices) {
            if (choice.showIf === undefined || this._evaluateCondition(choice.showIf)) {
              choices.push({
                index: choices.length,
                id: choice.id,
                text: choice.text
              });
            }
          }
          if (choices.length === 0) {
            throw storyError(
              this.story,
              "node '" + this.currentNodeId + "' has no visible choices."
            );
          }
        }
        return {
          nodeId: this.currentNodeId,
          text: text,
          choices: choices,
          ended: node.ending === true
        };
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
      this._executeOperations(choice.do || [], {
        nodeId: nodeId,
        choiceId: choice.id,
        path: "choice operation"
      });

      this.choiceHistory.push({ nodeId: nodeId, choiceId: choice.id });
      let destination;
      try {
        destination = resolveRoute(choice.goto, this);
      } catch (error) {
        throw new Error(
          "Story '" + this.story.id + "', node '" + nodeId + "', choice '" +
          choice.id + "' route failed: " + errorText(error)
        );
      }
      return this._enterNode(destination);
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
      }
      this._clearProgress();
    }

    toJSON() {
      return {
        version: 1,
        currentNodeId: this.currentNodeId,
        nodeVisits: this.nodeVisits.slice(),
        choiceHistory: this.choiceHistory.map(function (entry) {
          return { nodeId: entry.nodeId, choiceId: entry.choiceId };
        }),
        variables: cloneJsonValue(this.variables, "variables"),
        ended: this.ended
      };
    }

    loadState(data) {
      if (!isRecord(data) || data.version !== 1) {
        throw new TypeError("NarrativeEngine state must be a version 1 object.");
      }
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
      this.ended = data.ended;
      return this.currentNodeId === null ? null : this.getView();
    }

    _clearProgress() {
      this.currentNodeId = null;
      this.nodeVisits = [];
      this.choiceHistory = [];
      this.variables = cloneJsonValue(this.initialVariables, "initialVariables");
      this.ended = false;
    }

    _enterNode(nodeId) {
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
        this.graph.remember({
          concepts: operation.concepts,
          strength: operation.strength,
          metadata: operation.metadata
        });
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
          return this.graph.associationScore(condition.a, condition.b) >= condition.min;
        case "activation":
          return this.graph.activateMany(condition.starts, condition.options || {})
            .some(function (item) {
              return item.concept === condition.contains &&
                item.activation >= condition.min;
            });
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
      } else if (type === "activation") {
        validateConcepts(condition.starts, this.story, context.location + " starts");
        normalizeName(condition.contains, context.location + " contains");
        validateNonNegativeNumber(condition.min, context.location + " activation min");
        validateActivationOptions(condition.options, context.location + " options");
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

  function resolveText(definition, engine) {
    if (typeof definition === "string") {
      return definition;
    }
    for (const variant of definition) {
      if (variant.if === undefined || engine._evaluateCondition(variant.if)) {
        return variant.value;
      }
    }
    throw storyError(engine.story, "node '" + engine.currentNodeId + "' has no matching text variant.");
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
      normalizeName(variant.value, context.location + " variant value");
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
      return route;
    }
    for (const entry of route) {
      if (entry.if === undefined || engine._evaluateCondition(entry.if)) {
        return entry.node;
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
