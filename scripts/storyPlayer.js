(function () {
  "use strict";

  const fileInput = document.getElementById("story-files");
  const jsonInput = document.getElementById("story-json-files");
  const folderUploadButton = document.getElementById("folder-upload-button");
  const jsonUploadButton = document.getElementById("json-upload-button");
  const picker = document.getElementById("story-picker");
  const pickerTitle = document.getElementById("story-picker-title");
  const storyMenu = document.getElementById("story-menu");
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
  const endingReputation = document.getElementById("ending-reputation");
  const endingReputationList = document.getElementById("ending-reputation-list");
  const restartButton = document.getElementById("restart-button");
  const clearButton = document.getElementById("clear-button");
  const saveButton = document.getElementById("save-button");
  const restoreButton = document.getElementById("restore-button");
  const statusMessage = document.getElementById("status-message");
  const memoryTotal = document.getElementById("memory-total");
  const memoryList = document.getElementById("memory-list");
  const infoButton = document.getElementById("info-button");
  const tagsButton = document.getElementById("tags-button");
  const reputationPanel = document.getElementById("reputation-panel");
  const reputationTabs = document.getElementById("reputation-tabs");
  const reputationBody = document.getElementById("reputation-body");
  const debugPanel = document.getElementById("debug-panel");
  const debugClose = document.getElementById("debug-close");
  const graphSummary = document.getElementById("graph-summary");
  const graphVisualization = document.getElementById("graph-visualization");
  const graphEmpty = document.getElementById("graph-empty");
  const debugContent = document.getElementById("debug-content");
  const checkButton = document.getElementById("check-button");
  const checkResults = document.getElementById("check-results");
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  // Built-in stories live in stories/<name>.js, each calling registerStory({...}).
  // Add a file's name here to include it in the picker.
  const STORY_FILES = [
    "anywhere", "the_better_version", "the_distance_between_us",
    "the_house_with_two_kitchens", "the_mountain_accounts", "the_night_ferry",
    "the_places_that_help", "the_quiet_ministry", "the_village_remembers"
  ];

  let stories = [];
  let storiesUploaded = false;
  let engine = null;
  let selectedStory = null;
  let storageUnavailable = false;
  let transcript = [];

  if (!("webkitdirectory" in fileInput)) {
    folderUploadButton.hidden = true;
  }

  folderUploadButton.addEventListener("click", function () {
    setPickerOpen(false);
    fileInput.click();
  });
  jsonUploadButton.addEventListener("click", function () {
    setPickerOpen(false);
    jsonInput.click();
  });
  [fileInput, jsonInput].forEach(function (input) {
    input.addEventListener("change", function () {
      loadStoryFiles(Array.from(input.files || []));
      input.value = "";
    });
  });
  picker.addEventListener("click", function () {
    setPickerOpen(storyMenu.hidden);
  });
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".story-picker")) {
      setPickerOpen(false);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !storyMenu.hidden) {
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
  if (checkButton) {
    checkButton.addEventListener("click", runStoryCheck);
  }
  if (debugClose && debugPanel) {
    debugClose.addEventListener("click", function () {
      debugPanel.hidden = true;
    });
  }
  if (reputationPanel) {
    try { reputationPanel.open = localStorage.getItem("memory-graph:show-reputation") === "1"; } catch (error) { /* closed by default */ }
    reputationPanel.addEventListener("toggle", function () {
      try { localStorage.setItem("memory-graph:show-reputation", reputationPanel.open ? "1" : "0"); } catch (error) { /* per-viewer preference only */ }
    });
  }
  if (tagsButton && document.body && document.body.classList) {
    let showTags = true;
    try { showTags = localStorage.getItem("memory-graph:show-tags") !== "0"; } catch (error) { /* default on */ }
    setTagsVisible(showTags);
    tagsButton.addEventListener("click", function () {
      setTagsVisible(tagsButton.getAttribute("aria-pressed") !== "true");
    });
  }

  picker.disabled = true;
  pickerTitle.textContent = "Loading stories…";
  loadBuiltInStories();

  function loadBuiltInStories() {
    // A classic script's load event fires straight after it runs, so the
    // definition it registered can be paired with its file name there.
    let registered = null;
    window.registerStory = function (definition) {
      registered = definition;
    };

    Promise.all(STORY_FILES.map(function (name) {
      return new Promise(function (resolve) {
        const fileName = name + ".js";
        const script = document.createElement("script");
        script.src = "stories/" + fileName;
        script.onload = function () {
          const definition = registered;
          registered = null;
          if (definition === null) {
            resolve({ fileName: fileName, error: "registerStory was not called (check for syntax errors)" });
            return;
          }
          try {
            resolve(Object.assign({ fileName: fileName }, validateStory(definition)));
          } catch (error) {
            resolve({ fileName: fileName, error: error.message });
          }
        };
        script.onerror = function () {
          resolve({ fileName: fileName, error: "the file could not be loaded" });
        };
        document.head.appendChild(script);
      });
    })).then(function (results) {
      if (storiesUploaded) {
        return;
      }
      const rejected = results.filter(function (result) { return result.error; });
      stories = sortStories(results.filter(function (result) { return !result.error; }));
      renderStoryPicker();
      if (stories.length) {
        pickerTitle.textContent = "Choose a story";
      }
      if (rejected.length) {
        setStatus("Skipped " + rejected.length + " built-in stor" +
          (rejected.length === 1 ? "y" : "ies") + ": " + rejected.map(function (result) {
          return result.fileName + ": " + result.error;
        }).join(" · "), true);
      }
    });
  }

  // Returns { definition, warnings }; throws when the story is invalid.
  function validateStory(definition) {
    if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
      throw new TypeError("story definition must be an object");
    }
    const graph = new window.MemoryGraph();
    const probe = new window.NarrativeEngine(definition, { graph: graph });
    probe.start();
    const warnings = probe.lint();
    if (warnings.length > 0 && typeof console !== "undefined" && console.warn) {
      console.warn("Story '" + definition.id + "' has " + warnings.length + " authoring warning(s):\n" +
        warnings.map(formatWarning).join("\n"));
    }
    return { definition: definition, warnings: warnings };
  }

  function formatWarning(warning) {
    return warning.location + ": " + warning.message;
  }

  function sortStories(list) {
    return list.sort(function (a, b) {
      return compareText(a.definition.title, b.definition.title) ||
        compareText(a.fileName, b.fileName);
    });
  }

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

      storiesUploaded = true;
      stories = sortStories(loaded);
      renderStoryPicker();
      if (stories.length > 0) {
        pickerTitle.textContent = stories[0].definition.title;
        selectStory(stories[0]);
      } else {
        clearPlayer();
      }

      const warningCount = stories.reduce(function (total, story) {
        return total + story.warnings.length;
      }, 0);
      const summary = stories.length + " stor" +
        (stories.length === 1 ? "y" : "ies") + " loaded." + (warningCount === 0 ? "" : " " +
        warningCount + " authoring warning" + (warningCount === 1 ? "" : "s") +
        ": open Graph State (i) to see them.");
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
          resolve(Object.assign({ fileName: file.name },
            validateStory(JSON.parse(String(reader.result)))));
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
    // The menu stays enabled even with no stories so the upload options remain reachable.
    picker.disabled = false;
    storyOptions.hidden = stories.length === 0;
    if (stories.length === 0) {
      pickerTitle.textContent = "No valid stories found";
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
  }

  function setPickerOpen(open) {
    storyMenu.hidden = !open;
    picker.setAttribute("aria-expanded", String(open));
  }

  function selectStory(story) {
    selectedStory = story;
    reputationView = null;
    try {
      engine = new window.NarrativeEngine(story.definition);
      const view = engine.start();
      if (saveButton) saveButton.disabled = false;
      updateRestoreButton();
      transcript = [storyEntry(view)];
      renderView(view);
      setStatus("A new run is ready.");
    } catch (error) {
      engine = null;
      if (saveButton) saveButton.disabled = true;
      if (restoreButton) restoreButton.disabled = true;
      setStatus(error.message, true);
    }
  }

  // ---- Memory tags ----------------------------------------------------
  // Text that appeared because of what characters remember is followed by a
  // coloured (tag); hovering or focusing it lists the acts behind it.

  const TAG_COLORS = ["#a3401d", "#2f5d8a", "#4f6f1f", "#7a3e7a", "#8a5a00", "#1f6f68", "#9b2c4a", "#4a4f9a"];

  function storyEntry(view) {
    const entry = { type: "story", text: view.text };
    if (Array.isArray(view.segments) && view.segments.some(function (s) { return s.cause; })) {
      entry.segments = view.segments;
    }
    if (view.arrival) entry.arrival = view.arrival;
    return entry;
  }

  function choiceEntry(choice, echo) {
    const entry = { type: "choice", text: choice.text };
    if (choice.cause) entry.cause = choice.cause;
    if (echo) entry.echo = echo;
    return entry;
  }

  // Saved transcripts are untrusted; keep tag data only when well-formed.
  function restoreEntry(entry) {
    const restored = { type: entry.type, text: entry.text };
    if (Array.isArray(entry.segments) && entry.segments.every(function (segment) {
      return segment && typeof segment.text === "string" &&
        (segment.cause === undefined || isCause(segment.cause));
    }) && entry.segments.map(function (s) { return s.text; }).join("") === entry.text) {
      restored.segments = entry.segments;
    }
    if (isCause(entry.arrival)) restored.arrival = entry.arrival;
    if (isCause(entry.cause)) restored.cause = entry.cause;
    if (isCause(entry.echo)) restored.echo = entry.echo;
    return restored;
  }

  function isCause(cause) {
    return !!cause && typeof cause.tag === "string" && Array.isArray(cause.explanation) &&
      cause.explanation.every(function (section) {
        return section && typeof section.heading === "string" && Array.isArray(section.items) &&
          section.items.every(function (item) { return typeof item === "string"; });
      });
  }

  function renderEntry(entry) {
    const paragraph = document.createElement("p");
    if (entry.type === "choice") paragraph.className = "story-picked-choice";
    if (!entry.segments && !entry.arrival && !entry.cause && !entry.echo) {
      paragraph.textContent = entry.text;
      return paragraph;
    }
    if (entry.arrival) {
      paragraph.appendChild(createTag(entry.arrival, true));
      paragraph.appendChild(document.createTextNode(" "));
    }
    (entry.segments || [{ text: entry.text }]).forEach(function (segment) {
      paragraph.appendChild(document.createTextNode(segment.text));
      if (segment.cause) {
        paragraph.appendChild(document.createTextNode(" "));
        paragraph.appendChild(createTag(segment.cause, true));
      }
    });
    if (entry.cause) {
      paragraph.appendChild(document.createTextNode(" "));
      paragraph.appendChild(createTag(entry.cause, true));
    }
    if (entry.echo) {
      paragraph.appendChild(document.createTextNode(" "));
      paragraph.appendChild(createTag(entry.echo, true));
    }
    return paragraph;
  }

  // ---- How you're seen ------------------------------------------------
  // A live, per-character view of the player's reputation: diverging bars
  // (toward a trait to the right, away from it to the left) and the act that
  // defines you to them. Hidden characters are left out until the ending.

  let reputationView = null;

  function renderReputationPanel() {
    if (!reputationPanel || !reputationTabs || !reputationBody) return;
    const characters = engine ? engine.knownCharacters() : [];
    const overall = engine ? engine.reputationOf() : null;
    reputationPanel.hidden = !overall || (overall.traits.length === 0 && characters.length === 0);
    if (reputationPanel.hidden) return;
    if (reputationView !== null && characters.indexOf(reputationView) === -1) reputationView = null;

    const views = [null].concat(characters).map(function (id) {
      return id === null ? overall : engine.reputationOf(id);
    });
    // One scale for every view, so bars can be compared between people.
    const scale = Math.max(1, Math.max.apply(null, views.map(function (view) {
      return Math.max.apply(null, [0].concat(view.traits.map(function (t) { return Math.abs(t.score); })));
    })));

    reputationTabs.replaceChildren();
    views.forEach(function (view) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "reputation-tab";
      tab.textContent = view.name === null ? "Overall" : view.name;
      tab.setAttribute("aria-pressed", String(view.character === reputationView));
      tab.addEventListener("click", function () {
        reputationView = view.character;
        renderReputationPanel();
      });
      reputationTabs.appendChild(tab);
    });

    const view = views.find(function (v) { return v.character === reputationView; }) || overall;
    reputationBody.replaceChildren();
    if (view.traits.length === 0) {
      reputationBody.appendChild(reputationNote(view.name === null
        ? "Nothing you've done has defined you yet."
        : view.name + " hasn't made up their mind about you yet."));
      return;
    }
    const list = document.createElement("ul");
    list.className = "reputation-rows";
    view.traits.forEach(function (trait) {
      list.appendChild(reputationRow(trait, scale));
    });
    reputationBody.appendChild(list);
    if (view.memory) {
      reputationBody.appendChild(reputationNote((view.name === null
        ? "What people remember most: you "
        : "What " + view.name + " remembers most: you ") + view.memory + "."));
    }
  }

  function reputationRow(trait, scale) {
    const row = document.createElement("li");
    row.className = "reputation-row";
    const share = Math.abs(trait.score) / scale;
    const strength = share >= 0.66 ? "strongly" : share >= 0.33 ? "clearly" : "slightly";
    const label = document.createElement("span");
    label.className = "reputation-label";
    label.textContent = trait.label;
    const bar = document.createElement("span");
    bar.className = "reputation-bar";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "reputation-fill " + (trait.score > 0 ? "is-toward" : "is-away");
    fill.setAttribute("style", "--rep-size: " + Math.round(share * 50) + "%; --tag-color: " +
      tagColor({ trait: trait.trait, color: trait.color, tag: trait.label }));
    bar.appendChild(fill);
    const words = document.createElement("span");
    words.className = "reputation-words";
    words.textContent = trait.score > 0 ? strength : "against, " + strength;
    row.setAttribute("aria-label", trait.label + ": " + words.textContent);
    row.append(label, bar, words);
    return row;
  }

  function reputationNote(text) {
    const note = document.createElement("p");
    note.className = "reputation-note";
    note.textContent = text;
    return note;
  }

  function createTag(cause, focusable) {
    const tag = document.createElement("span");
    tag.className = "memory-tag";
    tag.setAttribute("data-kind", cause.kind || "memory");
    tag.setAttribute("style", "--tag-color: " + tagColor(cause));
    if (focusable) tag.setAttribute("tabindex", "0");
    const label = document.createElement("span");
    label.className = "memory-tag-label";
    label.textContent = "(" + cause.tag + ")";
    const tip = document.createElement("span");
    tip.className = "memory-tip";
    tip.setAttribute("role", "tooltip");
    cause.explanation.forEach(function (section) {
      const heading = document.createElement("span");
      heading.className = "memory-tip-heading";
      heading.textContent = section.heading;
      tip.appendChild(heading);
      section.items.forEach(function (item) {
        const line = document.createElement("span");
        line.className = "memory-tip-item";
        line.textContent = item;
        tip.appendChild(line);
      });
    });
    if (cause.explanation.length === 0) {
      const heading = document.createElement("span");
      heading.className = "memory-tip-heading";
      heading.textContent = "Shaped by what happened earlier.";
      tip.appendChild(heading);
    }
    tag.append(label, tip);
    return tag;
  }

  function tagColor(cause) {
    if (typeof cause.color === "string" && /^#[0-9a-fA-F]{6}$/.test(cause.color)) return cause.color;
    if (cause.kind === "recall") return "#6b5a4c";
    if (cause.kind === "knows") return "#55606e";
    const key = cause.trait || cause.tag;
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return TAG_COLORS[hash % TAG_COLORS.length];
  }

  function setTagsVisible(visible) {
    document.body.classList.toggle("hide-memory-tags", !visible);
    if (tagsButton) {
      tagsButton.setAttribute("aria-pressed", String(visible));
      tagsButton.textContent = visible ? "Memory tags: on" : "Memory tags: off";
    }
    try { localStorage.setItem("memory-graph:show-tags", visible ? "1" : "0"); } catch (error) { /* per-viewer preference only */ }
  }

  function renderView(view) {
    if (storyKicker) storyKicker.textContent = view.ended ? "ENDING" : "STORY IN PROGRESS";
    storyTitle.textContent = selectedStory.definition.title;
    storyText.replaceChildren();
    transcript.forEach(function (entry) {
      storyText.appendChild(renderEntry(entry));
    });
    if (nodeCounter) nodeCounter.textContent = view.nodeId.replace(/[_-]+/g, " ");
    choiceList.replaceChildren();
    endingActions.hidden = !view.ended;

    view.choices.forEach(function (choice) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.text;
      if (choice.cause) {
        button.appendChild(document.createTextNode(" "));
        button.appendChild(createTag(choice.cause, false));
      }
      button.addEventListener("click", function () {
        try {
          const nextView = engine.choose(choice.index);
          transcript.push(
            choiceEntry(choice, nextView.echo),
            storyEntry(nextView)
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

    renderReputationPanel();
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
    renderReputation();

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

  // Each character's view of the player, built from what they witnessed or heard.
  function renderReputation() {
    if (!endingReputation || !endingReputationList) return;
    const reputation = engine.describeReputation();
    endingReputation.hidden = reputation.length === 0;
    endingReputationList.replaceChildren();
    reputation.forEach(function (entry) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.className = "ending-reputation-name";
      name.textContent = entry.name;
      const verdict = entry.traits.length === 0
        ? " has no settled opinion of you."
        : " remembers you as " + entry.traits.slice(0, 2).map(function (trait) {
          return trait.label;
        }).join(" and ") + ".";
      item.append(name, document.createTextNode(verdict));
      if (entry.memory) {
        const memory = document.createElement("span");
        memory.className = "ending-reputation-memory";
        memory.textContent = "Mostly, that you " + entry.memory + ".";
        item.appendChild(memory);
      }
      endingReputationList.appendChild(item);
    });
  }

  function restart(keepMemory) {
    if (!engine) {
      return;
    }
    try {
      engine.reset({ keepMemory: keepMemory });
      const view = engine.start();
      transcript = [storyEntry(view)];
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
        restoredTranscript = [storyEntry(view)];
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
          return restoreEntry(entry);
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
    if (reputationPanel) reputationPanel.hidden = true;
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
        })
      } : "No engine loaded"
    };
    
    if (engine && engine.graph) {
      const related = engine.graph.related("player", 10);
      debugData["Related Concepts (Player)"] = related.length > 0
        ? related.map(function (item) {
          return { concept: item.concept, score: item.score, seen: item.seen };
        })
        : "None";
      debugData["Perspectives"] = engine.describeReputation().map(function (entry) {
        return {
          character: entry.name,
          knownEvents: entry.knownEvents,
          traits: entry.traits.map(function (trait) {
            return trait.trait + " " + trait.score.toFixed(2);
          }),
          strongestMemory: entry.memory
        };
      });
    }

    debugContent.textContent = JSON.stringify(debugData, null, 2);
    renderCheckResults(null);
    debugPanel.hidden = false;
  }

  // ---- Story check ----------------------------------------------------
  // Authoring warnings for the selected story, and on request a batch of
  // random playthroughs that reports crashes, unreached nodes, and text that
  // never appeared.

  const CHECK_RUNS = 300;

  function runStoryCheck() {
    if (!selectedStory || !window.StoryCheck) return;
    try {
      renderCheckResults(window.StoryCheck.check(selectedStory.definition, { runs: CHECK_RUNS }));
    } catch (error) {
      renderCheckResults(null);
      appendCheckLine("Check failed: " + error.message, true);
    }
  }

  function renderCheckResults(result) {
    if (!checkResults) return;
    checkResults.replaceChildren();
    if (checkButton) checkButton.disabled = !selectedStory || !window.StoryCheck;
    if (!selectedStory) {
      appendCheckLine("Choose a story to check it.");
      return;
    }
    const warnings = result ? result.warnings : selectedStory.warnings;
    appendCheckList(warnings.length === 0
      ? "No authoring warnings."
      : warnings.length + " authoring warning" + (warnings.length === 1 ? "" : "s") + ":",
    warnings.map(formatWarning), warnings.length > 0);
    if (!result) {
      appendCheckLine("Check story plays " + CHECK_RUNS + " random runs and lists anything they never reached.");
      return;
    }
    appendCheckList(result.errors.length === 0
      ? "All " + result.runs + " random runs finished cleanly."
      : result.errors.length + " kind" + (result.errors.length === 1 ? "" : "s") + " of failure:",
    result.errors.map(function (error) { return "Seed " + error.seed + ": " + error.message; }),
    result.errors.length > 0);
    appendCheckList("Endings reached:", Object.keys(result.endings).map(function (id) {
      return id + ": " + result.endings[id] + " run" + (result.endings[id] === 1 ? "" : "s");
    }), Object.keys(result.endings).some(function (id) { return result.endings[id] === 0; }));
    appendCheckList(result.unvisitedNodes.length === 0
      ? "Every node was reached."
      : "Nodes never reached:", result.unvisitedNodes, result.unvisitedNodes.length > 0);
    appendCheckList(result.missedBranches.length === 0
      ? "Every piece of conditional text, choice, and route was used."
      : "Never used in any run (may be unreachable, or just rare):", result.missedBranches,
    result.missedBranches.length > 0);
  }

  function appendCheckLine(text, isProblem) {
    const line = document.createElement("p");
    line.className = "check-line" + (isProblem ? " is-problem" : "");
    line.textContent = text;
    checkResults.appendChild(line);
  }

  function appendCheckList(heading, items, isProblem) {
    appendCheckLine(heading, isProblem);
    if (items.length === 0) return;
    const list = document.createElement("ul");
    list.className = "check-list";
    items.forEach(function (item) {
      const entry = document.createElement("li");
      entry.textContent = item;
      list.appendChild(entry);
    });
    checkResults.appendChild(list);
  }

  function renderGraphVisualization(graphState) {
    if (!graphVisualization || !graphSummary || !graphEmpty) return;

    graphVisualization.replaceChildren();
    const nodesById = new Map();
    const associationsByPair = new Map();
    const events = graphState ? graphState.events : [];

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
      formatGraphCount(associations.length, "association")
    ].join(" · ");
    graphEmpty.hidden = nodes.length > 0;
    graphVisualization.hidden = nodes.length === 0;
    if (nodes.length === 0) return;

    const width = Math.max(840, Math.ceil(Math.sqrt(nodes.length) * 210));
    const height = Math.max(560, Math.ceil(Math.sqrt(nodes.length) * 150));
    const positioned = layoutGraphNodes(nodes, associations, width, height);
    const positionById = new Map(positioned.map(function (node) {
      return [node.id, node];
    }));

    graphVisualization.setAttribute("width", String(width));
    graphVisualization.setAttribute("height", String(height));
    graphVisualization.setAttribute("viewBox", "0 0 " + width + " " + height);
    graphVisualization.setAttribute(
      "aria-label",
      "Memory graph with " + formatGraphCount(nodes.length, "concept") + " and " +
        formatGraphCount(associations.length, "association") + "."
    );

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
    graphVisualization.appendChild(edgeLayer);

    const nodeLayer = createSvgElement("g");
    nodeLayer.setAttribute("class", "graph-node-layer");
    positioned.forEach(function (node) {
      const group = createSvgElement("g");
      const classes = ["graph-node"];
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

  function layoutGraphNodes(nodes, associations, width, height) {
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
    });
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
