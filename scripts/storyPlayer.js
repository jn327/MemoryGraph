(function () {
  "use strict";

  console.log('storyPlayer.js: Script starting');

  const fileInput = document.getElementById("story-files");
  const fileLabel = document.getElementById("folder-button-label");
  const picker = document.getElementById("story-picker");
  const folderHelp = document.getElementById("folder-help");
  const storyKicker = document.getElementById("story-kicker");
  const storyTitle = document.getElementById("story-title");
  const storyText = document.getElementById("story-text");
  const nodeCounter = document.getElementById("node-counter");
  const choiceList = document.getElementById("choice-list");
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
  const debugContent = document.getElementById("debug-content");

  console.log('storyPlayer.js: Elements loaded', {
    infoButton: infoButton ? 'EXISTS' : 'NULL',
    debugPanel: debugPanel ? 'EXISTS' : 'NULL',
    debugClose: debugClose ? 'EXISTS' : 'NULL',
    debugContent: debugContent ? 'EXISTS' : 'NULL'
  });

  let stories = [];
  let engine = null;
  let selectedStory = null;
  let storageUnavailable = false;

  if (folderHelp && !("webkitdirectory" in fileInput)) {
    folderHelp.textContent =
      "Select one or more JSON story files. Directory selection is not supported by this browser.";
    fileLabel.textContent = "Choose JSON story files";
  }

  fileInput.addEventListener("change", function () {
    loadStoryFiles(Array.from(fileInput.files || []));
  });
  picker.addEventListener("change", function () {
    const index = Number(picker.value);
    if (Number.isSafeInteger(index) && stories[index]) {
      selectStory(stories[index]);
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
        picker.value = "0";
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
    picker.replaceChildren();
    if (stories.length === 0) {
      picker.add(new Option("No valid stories found", ""));
      picker.disabled = true;
      return;
    }
    picker.add(new Option("Choose a story", ""));
    stories.forEach(function (story, index) {
      picker.add(new Option(story.definition.title, String(index)));
    });
    picker.disabled = false;
  }

  function selectStory(story) {
    selectedStory = story;
    try {
      engine = new window.NarrativeEngine(story.definition);
      const view = engine.start();
      if (saveButton) saveButton.disabled = false;
      updateRestoreButton();
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
    storyText.textContent = view.text;
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
          renderView(engine.choose(choice.index));
          updateMemory();
          setStatus("");
        } catch (error) {
          updateMemory();
          setStatus(error.message, true);
        }
      });
      choiceList.appendChild(button);
    });

    updateMemory();
    updateRestoreButton();
  }

  function restart(keepMemory) {
    if (!engine) {
      return;
    }
    try {
      engine.reset({ keepMemory: keepMemory });
      renderView(engine.start());
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
        engine: engine.toJSON()
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
      engine = restored;
      renderView(view);
      setStatus("Saved progress and memory restored.");
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
    if (storyKicker) storyKicker.textContent = "WAITING FOR A STORY";
    storyTitle.textContent = "The next choice is yours.";
    storyText.textContent = "Load a story folder above to step into a world that remembers.";
    if (nodeCounter) nodeCounter.textContent = "";
    choiceList.replaceChildren();
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
    
    const debugData = {
      "Current Story": selectedStory ? selectedStory.definition.title : "None",
      "Story ID": selectedStory ? selectedStory.definition.id : "None",
      "Engine Active": engine !== null,
      "Stories Loaded": stories.length,
      "Stories": stories.map(function(s) { return s.definition.title; }),
      "Memory Graph": engine ? {
        "Events Count": engine.graph.events.length,
        "Events": engine.graph.events.map(function(e) {
          return {
            "id": e.id,
            "concepts": e.concepts,
            "timestamp": e.timestamp
          };
        })
      } : "No engine loaded"
    };
    
    if (engine && engine.graph) {
      const related = engine.graph.related("player", 10);
      debugData["Related Concepts (Player)"] = related.length > 0 
        ? related.map(function(r) { 
          return { concept: r.concept, score: r.score, seen: r.seen };
        })
        : "None";
    }
    
    debugContent.textContent = JSON.stringify(debugData, null, 2);
    debugPanel.hidden = false;
  }
  
  // Expose globally for testing
  window.storyPlayerDebugInfo = showDebugInfo;
}());
