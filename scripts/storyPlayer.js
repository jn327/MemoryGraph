(function () {
  "use strict";

  const fileInput = document.getElementById("story-files");
  const jsonInput = document.getElementById("story-json-files");
  const folderUploadButton = document.getElementById("folder-upload-button");
  const jsonUploadButton = document.getElementById("json-upload-button");
  const uploadPicker = document.querySelector(".upload-picker");
  const picker = document.getElementById("story-picker");
  const pickerTitle = document.getElementById("story-picker-title");
  const storyOptions = document.getElementById("story-options");
  const storyKicker = document.getElementById("story-kicker");
  const storyTitle = document.getElementById("story-title");
  const storyText = document.getElementById("story-text");
  const nodeCounter = document.getElementById("node-counter");
  const choiceList = document.getElementById("choice-list");
  const endingSummary = document.getElementById("ending-summary");
  const endingTraces = document.getElementById("ending-traces");
  const endingSummaryEmpty = document.getElementById("ending-summary-empty");
  const endingPath = document.getElementById("ending-path");
  const endingPathLabel = document.getElementById("ending-path-label");
  const endingChoices = document.getElementById("ending-choices");
  const endingActions = document.getElementById("ending-actions");
  const restartButton = document.getElementById("restart-button");
  const clearButton = document.getElementById("clear-button");
  const saveButton = document.getElementById("save-button");
  const restoreButton = document.getElementById("restore-button");
  const statusMessage = document.getElementById("status-message");
  const memoryTotal = document.getElementById("memory-total");
  const memoryList = document.getElementById("memory-list");
  const infoButton = document.getElementById("info-button");
  const debugPanel = document.getElementById("debug-panel");
  const debugClose = document.getElementById("debug-close");
  const graphSummary = document.getElementById("graph-summary");
  const graphVisualization = document.getElementById("graph-visualization");
  const graphEmpty = document.getElementById("graph-empty");
  const debugContent = document.getElementById("debug-content");
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  let stories = window.builtInStories.slice().sort(function (a, b) {
    return compareText(a.definition.title, b.definition.title) ||
      compareText(a.fileName, b.fileName);
  });
  let engine = null;
  let selectedStory = null;
  let storageUnavailable = false;
  let transcript = [];

  if (!("webkitdirectory" in fileInput)) {
    folderUploadButton.hidden = true;
  }

  folderUploadButton.addEventListener("click", function () {
    uploadPicker.open = false;
    fileInput.click();
  });
  jsonUploadButton.addEventListener("click", function () {
    uploadPicker.open = false;
    jsonInput.click();
  });
  [fileInput, jsonInput].forEach(function (input) {
    input.addEventListener("change", function () {
      loadStoryFiles(Array.from(input.files || []));
      input.value = "";
    });
  });
  picker.addEventListener("click", function () {
    setPickerOpen(storyOptions.hidden);
  });
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".story-picker")) {
      setPickerOpen(false);
    }
    if (!event.target.closest(".upload-picker")) {
      uploadPicker.open = false;
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !storyOptions.hidden) {
      setPickerOpen(false);
      picker.focus();
    }
  });
  restartButton.addEventListener("click", function () {
    restart(true);
  });
  clearButton.addEventListener("click", function () {
    restart(false);
  });
  if (saveButton) saveButton.addEventListener("click", saveProgress);
  if (restoreButton) restoreButton.addEventListener("click", restoreProgress);
  
  if (infoButton) {
    infoButton.addEventListener("click", function () {
      showDebugInfo();
    });
  }
  if (debugClose && debugPanel) {
    debugClose.addEventListener("click", function () {
      debugPanel.hidden = true;
    });
  }

  renderStoryPicker();
  pickerTitle.textContent = stories.length ? "Choose a story" : "No valid stories found";

  function loadStoryFiles(files) {
    const jsonFiles = files.filter(function (file) {
      return /\.json$/i.test(file.name);
    });
    if (jsonFiles.length === 0) {
      setStatus("No JSON story files were selected.", true);
      return;
    }

    Promise.all(jsonFiles.map(readStoryFile)).then(function (results) {
      const loaded = [];
      const rejected = [];
      for (const result of results) {
        if (result.error) {
          rejected.push(result.file.name + ": " + result.error);
        } else {
          loaded.push(result);
        }
      }

      stories = loaded.sort(function (a, b) {
        return compareText(a.definition.title, b.definition.title) ||
          compareText(a.fileName, b.fileName);
      });
      renderStoryPicker();
      if (stories.length > 0) {
        pickerTitle.textContent = stories[0].definition.title;
        selectStory(stories[0]);
      } else {
        clearPlayer();
      }

      const summary = stories.length + " stor" +
        (stories.length === 1 ? "y" : "ies") + " loaded.";
      setStatus(rejected.length === 0
        ? summary
        : summary + " Skipped " + rejected.length + " invalid file" +
          (rejected.length === 1 ? "" : "s") + ": " + rejected.join(" · "), rejected.length > 0);
    }).catch(function (error) {
      setStatus("Could not read the selected stories: " + error.message, true);
    });
  }

  function readStoryFile(file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const definition = JSON.parse(String(reader.result));
          if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
            throw new TypeError("story JSON must contain an object");
          }
          const graph = new window.MemoryGraph();
          const probe = new window.NarrativeEngine(definition, { graph: graph });
          probe.start();
          resolve({
            fileName: file.name,
            definition: definition
          });
        } catch (error) {
          resolve({ file: file, error: error.message });
        }
      };
      reader.onerror = function () {
        resolve({ file: file, error: "the file could not be read" });
      };
      reader.readAsText(file);
    });
  }

  function renderStoryPicker() {
    setPickerOpen(false);
    storyOptions.replaceChildren();
    if (stories.length === 0) {
      pickerTitle.textContent = "No valid stories found";
      picker.disabled = true;
      return;
    }
    stories.forEach(function (story) {
      const option = document.createElement("button");
      const title = document.createElement("span");
      const synopsis = document.createElement("span");
      option.type = "button";
      option.className = "story-option";
      title.textContent = story.definition.title;
      synopsis.className = "story-synopsis";
      synopsis.textContent = typeof story.definition.synopsis === "string" &&
        story.definition.synopsis.trim()
        ? story.definition.synopsis.trim()
        : "No synopsis provided.";
      option.append(title, synopsis);
      option.addEventListener("click", function () {
        pickerTitle.textContent = story.definition.title;
        selectStory(story);
        setPickerOpen(false);
        picker.focus();
      });
      storyOptions.appendChild(option);
    });
    picker.disabled = false;
  }

  function setPickerOpen(open) {
    storyOptions.hidden = !open;
    picker.setAttribute("aria-expanded", String(open));
  }

  function selectStory(story) {
    selectedStory = story;
    try {
      engine = new window.NarrativeEngine(story.definition);
      const view = engine.start();
      if (saveButton) saveButton.disabled = false;
      updateRestoreButton();
      transcript = [{ type: "story", text: view.text }];
      renderView(view);
      setStatus("A new run is ready.");
    } catch (error) {
      engine = null;
      if (saveButton) saveButton.disabled = true;
      if (restoreButton) restoreButton.disabled = true;
      setStatus(error.message, true);
    }
  }

  function renderView(view) {
    if (storyKicker) storyKicker.textContent = view.ended ? "ENDING" : "STORY IN PROGRESS";
    storyTitle.textContent = selectedStory.definition.title;
    storyText.replaceChildren();
    transcript.forEach(function (entry) {
      const paragraph = document.createElement("p");
      if (entry.type === "choice") paragraph.className = "story-picked-choice";
      paragraph.textContent = entry.text;
      storyText.appendChild(paragraph);
    });
    if (nodeCounter) nodeCounter.textContent = view.nodeId.replace(/[_-]+/g, " ");
    choiceList.replaceChildren();
    endingActions.hidden = !view.ended;

    view.choices.forEach(function (choice) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.text;
      button.addEventListener("click", function () {
        try {
          const nextView = engine.choose(choice.index);
          transcript.push(
            { type: "choice", text: choice.text },
            { type: "story", text: nextView.text }
          );
          renderView(nextView);
          storyText.lastElementChild.scrollIntoView({ block: "nearest", inline: "nearest" });
          updateMemory();
          setStatus("");
        } catch (error) {
          updateMemory();
          setStatus(error.message, true);
        }
      });
      choiceList.appendChild(button);
    });

    renderEndingSummary(view);
    updateMemory();
    updateRestoreButton();
  }

  function renderEndingSummary(view) {
    if (!endingSummary) return;
    endingSummary.hidden = !view.ended;
    if (!view.ended) return;

    endingTraces.replaceChildren();
    const related = engine.graph.related("player", 4);
    if (endingSummaryEmpty) endingSummaryEmpty.hidden = related.length > 0;
    related.forEach(function (item) {
      const trace = document.createElement("span");
      const concept = document.createElement("span");
      const count = document.createElement("span");
      trace.className = "ending-trace";
      concept.textContent = item.concept;
      count.className = "ending-trace-count";
      count.textContent = item.seen + " memor" + (item.seen === 1 ? "y" : "ies");
      trace.append(concept, count);
      endingTraces.appendChild(trace);
    });

    const choices = engine.choiceHistory.map(function (entry) {
      const node = selectedStory.definition.nodes[entry.nodeId];
      return node.choices.find(function (choice) {
        return choice.id === entry.choiceId;
      });
    });
    endingPath.hidden = choices.length === 0;
    endingPathLabel.textContent = "Your choices (" + choices.length + ")";
    endingChoices.replaceChildren();
    choices.forEach(function (choice) {
      const item = document.createElement("li");
      item.textContent = choice.text;
      endingChoices.appendChild(item);
    });
  }

  function restart(keepMemory) {
    if (!engine) {
      return;
    }
    try {
      engine.reset({ keepMemory: keepMemory });
      const view = engine.start();
      transcript = [{ type: "story", text: view.text }];
      renderView(view);
      setStatus(keepMemory
        ? "A new run has started. Earlier memories remain."
        : "Memory cleared. A fresh run has started.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function saveProgress() {
    if (!engine || !selectedStory) {
      return;
    }
    try {
      localStorage.setItem(storageKey(selectedStory), JSON.stringify({
        graph: engine.graph.toJSON(),
        engine: engine.toJSON(),
        transcript: transcript
      }));
      storageUnavailable = false;
      updateRestoreButton();
      setStatus("Progress and memory saved on this device.");
    } catch (error) {
      setStatus("Could not save progress: " + error.message, true);
    }
  }

  function restoreProgress() {
    if (!selectedStory) {
      return;
    }
    try {
      const serialized = localStorage.getItem(storageKey(selectedStory));
      if (!serialized) {
        setStatus("There is no saved progress for this story.", true);
        updateRestoreButton();
        return;
      }
      const saved = JSON.parse(serialized);
      const graph = window.MemoryGraph.fromJSON(saved.graph);
      const restored = new window.NarrativeEngine(selectedStory.definition, {
        graph: graph
      });
      const view = restored.loadState(saved.engine);
      if (!view) {
        throw new Error("The save does not contain a started story.");
      }
      let restoredTranscript;
      if (saved.transcript === undefined) {
        restoredTranscript = [{ type: "story", text: view.text }];
      } else {
        if (!Array.isArray(saved.transcript) || saved.transcript.length === 0 ||
            saved.transcript.length % 2 !== 1 ||
            !saved.transcript.every(function (entry, index) {
              return entry && typeof entry.text === "string" &&
                entry.type === (index % 2 === 0 ? "story" : "choice");
            })) {
          throw new Error("The saved story transcript is invalid.");
        }
        restoredTranscript = saved.transcript.map(function (entry) {
          return { type: entry.type, text: entry.text };
        });
      }
      engine = restored;
      transcript = restoredTranscript;
      renderView(view);
      setStatus(saved.transcript === undefined
        ? "Saved progress restored. Earlier story text is unavailable in this older save."
        : "Saved progress and memory restored.");
    } catch (error) {
      setStatus("Could not restore progress: " + error.message, true);
    }
  }

  function updateRestoreButton() {
    if (!selectedStory || !restoreButton) {
      if (restoreButton) restoreButton.disabled = true;
      return;
    }
    try {
      restoreButton.disabled = localStorage.getItem(storageKey(selectedStory)) === null;
    } catch (error) {
      storageUnavailable = true;
      restoreButton.disabled = true;
      setStatus("Saved progress is unavailable: " + error.message, true);
    }
  }

  function updateMemory() {
    if (!memoryTotal || !memoryList) {
      return;
    }
    if (!engine) {
      memoryTotal.replaceChildren(document.createTextNode("0 "));
      const suffix = document.createElement("span");
      suffix.textContent = "memories recorded";
      memoryTotal.appendChild(suffix);
      memoryList.replaceChildren();
      appendMemoryMessage("Your story is waiting for its first memory.");
      return;
    }

    const events = engine.graph.events;
    memoryTotal.replaceChildren();
    memoryTotal.appendChild(document.createTextNode(String(events.length) + " "));
    const suffix = document.createElement("span");
    suffix.textContent = "memories recorded";
    memoryTotal.appendChild(suffix);

    memoryList.replaceChildren();
    const related = engine.graph.related("player", 6);
    if (related.length > 0) {
      related.forEach(function (item) {
        appendMemoryRow(item.concept, item.score, item.seen);
      });
      return;
    }

    const frequencies = new Map();
    for (const event of events) {
      for (const concept of event.concepts) {
        frequencies.set(concept, (frequencies.get(concept) || 0) + 1);
      }
    }
    const frequent = Array.from(frequencies.entries())
      .sort(function (a, b) {
        return b[1] - a[1] || compareText(a[0], b[0]);
      })
      .slice(0, 6);
    if (frequent.length === 0) {
      appendMemoryMessage("Your story is waiting for its first memory.");
      return;
    }
    frequent.forEach(function (entry) {
      appendMemoryRow(entry[0], entry[1], entry[1]);
    });
  }

  function appendMemoryRow(concept, score, seen) {
    if (!memoryList) return;
    const row = document.createElement("div");
    row.className = "memory-row";
    const name = document.createElement("span");
    name.textContent = concept;
    const strength = document.createElement("span");
    strength.textContent = "×" + score + " · " + seen + " event" + (seen === 1 ? "" : "s");
    row.append(name, strength);
    memoryList.appendChild(row);
  }

  function appendMemoryMessage(message) {
    if (!memoryList) return;
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = message;
    memoryList.appendChild(empty);
  }

  function clearPlayer() {
    selectedStory = null;
    engine = null;
    transcript = [];
    if (storyKicker) storyKicker.textContent = "WAITING FOR A STORY";
    storyTitle.textContent = "The next choice is yours.";
    storyText.textContent = "Choose a story above to step into a world that remembers.";
    if (nodeCounter) nodeCounter.textContent = "";
    choiceList.replaceChildren();
    if (endingSummary) endingSummary.hidden = true;
    endingActions.hidden = true;
    if (saveButton) saveButton.disabled = true;
    if (restoreButton) restoreButton.disabled = true;
    updateMemory();
  }

  function setStatus(message, isError) {
    if (!statusMessage) return;
    const storageNote = storageUnavailable && !isError
      ? " Saved progress is unavailable in this browser."
      : "";
    statusMessage.textContent = (message || "") + storageNote;
    statusMessage.dataset.error = isError ? "true" : "false";
  }

  function storageKey(story) {
    return "memory-graph:" + encodeURIComponent(story.definition.id);
  }

  function compareText(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function showDebugInfo() {
    if (!debugPanel || !debugContent) {
      console.error('Debug panel or content not found');
      return;
    }
    const graphState = engine ? engine.graph.toJSON() : null;
    renderGraphVisualization(graphState);
    const debugData = {
      "Current Story": selectedStory ? selectedStory.definition.title : "None",
      "Story ID": selectedStory ? selectedStory.definition.id : "None",
      "Engine Active": engine !== null,
      "Stories Loaded": stories.length,
      "Stories": stories.map(function (story) {
        return story.definition.title;
      }),
      "Memory Graph": graphState ? {
        "Events Count": graphState.events.length,
        "Events": graphState.events.map(function (event) {
          return {
            "id": event.id,
            "concepts": event.concepts,
            "sequence": event.sequence
          };
        }),
        "Transitions": graphState.transitions
      } : "No engine loaded"
    };
    
    if (engine && engine.graph) {
      const related = engine.graph.related("player", 10);
      debugData["Related Concepts (Player)"] = related.length > 0
        ? related.map(function (item) {
          return { concept: item.concept, score: item.score, seen: item.seen };
        })
        : "None";
    }
    
    debugContent.textContent = JSON.stringify(debugData, null, 2);
    debugPanel.hidden = false;
  }

  function renderGraphVisualization(graphState) {
    if (!graphVisualization || !graphSummary || !graphEmpty) return;

    graphVisualization.replaceChildren();
    const nodesById = new Map();
    const associationsByPair = new Map();
    const events = graphState ? graphState.events : [];
    const transitions = graphState ? graphState.transitions : [];

    events.forEach(function (event) {
      event.concepts.forEach(function (concept) {
        let node = nodesById.get(concept);
        if (!node) {
          node = { id: concept, eventCount: 0 };
          nodesById.set(concept, node);
        }
        node.eventCount += 1;
      });

      for (let i = 0; i < event.concepts.length; i += 1) {
        for (let j = i + 1; j < event.concepts.length; j += 1) {
          const pair = [event.concepts[i], event.concepts[j]].sort(compareText);
          const key = JSON.stringify(pair);
          let edge = associationsByPair.get(key);
          if (!edge) {
            edge = { source: pair[0], target: pair[1], score: 0, seen: 0 };
            associationsByPair.set(key, edge);
          }
          edge.score += event.strength;
          edge.seen += 1;
        }
      }
    });

    transitions.forEach(function (transition) {
      [transition.from, transition.to].forEach(function (concept) {
        if (!nodesById.has(concept)) {
          nodesById.set(concept, { id: concept, eventCount: 0 });
        }
      });
    });

    const nodes = Array.from(nodesById.values())
      .sort(function (a, b) { return compareText(a.id, b.id); })
      .map(function (node) {
        const label = node.id.replace(/[_-]+/g, " ");
        return {
          id: node.id,
          label: label,
          labelLines: wrapGraphLabel(label),
          eventCount: node.eventCount,
          radius: Math.min(25, 13 + Math.sqrt(node.eventCount) * 2)
        };
      });
    const associations = Array.from(associationsByPair.values());
    graphSummary.textContent = [
      formatGraphCount(nodes.length, "concept"),
      formatGraphCount(associations.length, "association"),
      formatGraphCount(transitions.length, "transition")
    ].join(" · ");
    graphEmpty.hidden = nodes.length > 0;
    graphVisualization.hidden = nodes.length === 0;
    if (nodes.length === 0) return;

    const width = Math.max(840, Math.ceil(Math.sqrt(nodes.length) * 210));
    const height = Math.max(560, Math.ceil(Math.sqrt(nodes.length) * 150));
    const positioned = layoutGraphNodes(nodes, associations, transitions, width, height);
    const positionById = new Map(positioned.map(function (node) {
      return [node.id, node];
    }));

    graphVisualization.setAttribute("width", String(width));
    graphVisualization.setAttribute("height", String(height));
    graphVisualization.setAttribute("viewBox", "0 0 " + width + " " + height);
    graphVisualization.setAttribute(
      "aria-label",
      "Memory graph with " + formatGraphCount(nodes.length, "concept") + ", " +
        formatGraphCount(associations.length, "association") + ", and " +
        formatGraphCount(transitions.length, "transition") + "."
    );

    const definitions = createSvgElement("defs");
    const arrow = createSvgElement("marker");
    arrow.setAttribute("id", "memory-graph-arrow");
    arrow.setAttribute("viewBox", "0 0 10 10");
    arrow.setAttribute("refX", "9");
    arrow.setAttribute("refY", "5");
    arrow.setAttribute("markerWidth", "6");
    arrow.setAttribute("markerHeight", "6");
    arrow.setAttribute("orient", "auto-start-reverse");
    const arrowHead = createSvgElement("path");
    arrowHead.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    arrowHead.setAttribute("class", "graph-arrow-head");
    arrow.appendChild(arrowHead);
    definitions.appendChild(arrow);
    graphVisualization.appendChild(definitions);

    const edgeLayer = createSvgElement("g");
    edgeLayer.setAttribute("class", "graph-edge-layer");
    associations.forEach(function (edge) {
      const source = positionById.get(edge.source);
      const target = positionById.get(edge.target);
      const line = createSvgElement("line");
      const vector = unitVector(source, target);
      line.setAttribute("x1", String(source.x + vector.x * source.radius));
      line.setAttribute("y1", String(source.y + vector.y * source.radius));
      line.setAttribute("x2", String(target.x - vector.x * target.radius));
      line.setAttribute("y2", String(target.y - vector.y * target.radius));
      line.setAttribute("class", "graph-association-edge");
      line.setAttribute("stroke-width", String(Math.min(6, 1 + Math.log2(edge.score + 1))));
      const title = createSvgElement("title");
      title.textContent = edge.source + " ↔ " + edge.target +
        " · " + edge.seen + " shared memor" + (edge.seen === 1 ? "y" : "ies");
      line.appendChild(title);
      edgeLayer.appendChild(line);
    });
    transitions.forEach(function (transition, index) {
      const source = positionById.get(transition.from);
      const target = positionById.get(transition.to);
      const path = createSvgElement("path");
      const pathData = transitionPath(source, target, index);
      path.setAttribute("d", pathData);
      path.setAttribute("class", "graph-transition-edge");
      path.setAttribute("marker-end", "url(#memory-graph-arrow)");
      path.setAttribute("stroke-width", String(1.5 + Math.min(3, Math.log2(transition.count + 1))));
      const title = createSvgElement("title");
      title.textContent = transition.type + ": " + transition.from + " → " +
        transition.to + " · " + transition.count;
      path.appendChild(title);
      edgeLayer.appendChild(path);
    });
    graphVisualization.appendChild(edgeLayer);

    const nodeLayer = createSvgElement("g");
    nodeLayer.setAttribute("class", "graph-node-layer");
    positioned.forEach(function (node) {
      const group = createSvgElement("g");
      const classes = ["graph-node"];
      if (node.eventCount === 0) classes.push("graph-transition-only-node");
      if (node.id === "player") classes.push("graph-player-node");
      group.setAttribute("class", classes.join(" "));
      const circle = createSvgElement("circle");
      circle.setAttribute("cx", String(node.x));
      circle.setAttribute("cy", String(node.y));
      circle.setAttribute("r", String(node.radius));
      group.appendChild(circle);
      const label = createSvgElement("text");
      label.setAttribute("x", String(node.x));
      label.setAttribute("y", String(node.y + node.radius + 14));
      label.setAttribute("text-anchor", "middle");
      node.labelLines.forEach(function (line, index) {
        const span = createSvgElement("tspan");
        span.setAttribute("x", String(node.x));
        if (index > 0) span.setAttribute("dy", "13");
        span.textContent = line;
        label.appendChild(span);
      });
      group.appendChild(label);
      const title = createSvgElement("title");
      title.textContent = node.label + " · " + node.eventCount +
        " memor" + (node.eventCount === 1 ? "y event" : "y events");
      group.appendChild(title);
      nodeLayer.appendChild(group);
    });
    graphVisualization.appendChild(nodeLayer);
  }

  function layoutGraphNodes(nodes, associations, transitions, width, height) {
    const columns = Math.ceil(Math.sqrt(nodes.length * width / height));
    const rows = Math.ceil(nodes.length / columns);
    const cellWidth = (width - 180) / columns;
    const cellHeight = (height - 180) / rows;
    const positions = nodes.map(function (node, index) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        id: node.id,
        label: node.label,
        labelLines: node.labelLines,
        eventCount: node.eventCount,
        radius: node.radius,
        x: 90 + cellWidth * (column + 0.5),
        y: 90 + cellHeight * (row + 0.5),
        dx: 0,
        dy: 0
      };
    });
    const nodeById = new Map(positions.map(function (node) {
      return [node.id, node];
    }));
    const links = associations.map(function (edge) {
      return {
        source: nodeById.get(edge.source),
        target: nodeById.get(edge.target),
        weight: 0.8 + Math.min(0.6, Math.log2(edge.score + 1) * 0.12)
      };
    }).concat(transitions.map(function (edge) {
      return {
        source: nodeById.get(edge.from),
        target: nodeById.get(edge.to),
        weight: 0.65 + Math.min(0.35, Math.log2(edge.count + 1) * 0.1)
      };
    }));
    const idealDistance = Math.sqrt(width * height / Math.max(1, nodes.length));
    const iterations = 160;
    const margin = 90;

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      positions.forEach(function (node) {
        node.dx = 0;
        node.dy = 0;
      });

      for (let i = 0; i < positions.length; i += 1) {
        for (let j = i + 1; j < positions.length; j += 1) {
          const left = positions[i];
          const right = positions[j];
          const x = left.x - right.x;
          const y = left.y - right.y;
          const distance = Math.max(0.1, Math.sqrt(x * x + y * y));
          const labelGap = Math.max(left.label.length, right.label.length) * 5;
          const clearance = left.radius + right.radius + labelGap + 12;
          const force = idealDistance * idealDistance / distance +
            Math.max(0, clearance - distance) * 1.8;
          const pushX = x / distance * force;
          const pushY = y / distance * force;
          left.dx += pushX;
          left.dy += pushY;
          right.dx -= pushX;
          right.dy -= pushY;
        }
      }

      links.forEach(function (link) {
        const x = link.target.x - link.source.x;
        const y = link.target.y - link.source.y;
        const distance = Math.max(0.1, Math.sqrt(x * x + y * y));
        const force = distance * distance / idealDistance * link.weight * 0.55;
        const pullX = x / distance * force;
        const pullY = y / distance * force;
        link.source.dx += pullX;
        link.source.dy += pullY;
        link.target.dx -= pullX;
        link.target.dy -= pullY;
      });

      const temperature = Math.min(width, height) * 0.09 *
        (1 - iteration / iterations);
      positions.forEach(function (node) {
        const distance = Math.sqrt(node.dx * node.dx + node.dy * node.dy);
        const movement = Math.min(distance, temperature);
        if (distance > 0) {
          node.x += node.dx / distance * movement;
          node.y += node.dy / distance * movement;
        }
        node.x = Math.max(margin, Math.min(width - margin, node.x));
        node.y = Math.max(margin, Math.min(height - margin, node.y));
      });
    }

    separateGraphLabels(positions, width, height, margin);
    return positions;
  }

  function separateGraphLabels(nodes, width, height, margin) {
    for (let pass = 0; pass < 60; pass += 1) {
      let moved = false;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const left = nodes[i];
          const right = nodes[j];
          const x = right.x - left.x;
          const y = right.y - left.y;
          const distance = Math.sqrt(x * x + y * y);
          const leftWidth = Math.max.apply(null, left.labelLines.map(function (line) {
            return line.length;
          }));
          const rightWidth = Math.max.apply(null, right.labelLines.map(function (line) {
            return line.length;
          }));
          const minimum = left.radius + right.radius +
            Math.max(leftWidth, rightWidth) * 6 + 14;
          if (distance >= minimum) continue;

          const angle = distance > 0
            ? Math.atan2(y, x)
            : (i + j) * Math.PI / nodes.length;
          const adjustment = (minimum - distance) * 0.28;
          const shiftX = Math.cos(angle) * adjustment;
          const shiftY = Math.sin(angle) * adjustment;
          left.x = Math.max(margin, Math.min(width - margin, left.x - shiftX));
          left.y = Math.max(margin, Math.min(height - margin, left.y - shiftY));
          right.x = Math.max(margin, Math.min(width - margin, right.x + shiftX));
          right.y = Math.max(margin, Math.min(height - margin, right.y + shiftY));
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function transitionPath(source, target, index) {
    if (source.id === target.id) {
      return "M " + (source.x - source.radius * 0.55) + " " + (source.y - source.radius * 0.8) +
        " C " + (source.x - 42) + " " + (source.y - 54) + ", " +
        (source.x + 42) + " " + (source.y - 54) + ", " +
        (source.x + source.radius * 0.55) + " " + (source.y - source.radius * 0.8);
    }
    const vector = unitVector(source, target);
    const startX = source.x + vector.x * source.radius;
    const startY = source.y + vector.y * source.radius;
    const endX = target.x - vector.x * target.radius;
    const endY = target.y - vector.y * target.radius;
    const offset = (index % 2 === 0 ? 1 : -1) * (12 + index % 3 * 5);
    const controlX = (startX + endX) / 2 - vector.y * offset;
    const controlY = (startY + endY) / 2 + vector.x * offset;
    return "M " + startX + " " + startY + " Q " + controlX + " " +
      controlY + " " + endX + " " + endY;
  }

  function unitVector(source, target) {
    const x = target.x - source.x;
    const y = target.y - source.y;
    const length = Math.max(0.1, Math.sqrt(x * x + y * y));
    return { x: x / length, y: y / length };
  }

  function wrapGraphLabel(label) {
    const words = label.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach(function (word) {
      if (line && (line.length + word.length + 1) > 14) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function createSvgElement(name) {
    return document.createElementNS(SVG_NAMESPACE, name);
  }

  function formatGraphCount(count, label) {
    return count + " " + label + (count === 1 ? "" : "s");
  }
  
  // Expose globally for testing
  window.storyPlayerDebugInfo = showDebugInfo;
}());
