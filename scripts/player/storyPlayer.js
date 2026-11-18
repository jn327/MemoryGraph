(function () {
  "use strict";

  // The page's elements, looked up once. A missing one is a mistake in
  // index.html, so it fails loudly here rather than quietly later.
  function byId(id) {
    const element = document.getElementById(id);
    if (element === null) {
      throw new Error("index.html has no element with id '" + id + "'.");
    }
    return element;
  }

  // "1 scene", "3 scenes"; pass the plural when it isn't just an added s.
  function plural(count, word, many) {
    return count.toLocaleString("en") + " " + (count === 1 ? word : many === undefined ? word + "s" : many);
  }

  const fileInput = byId("story-files");
  const textInput = byId("story-text-files");
  const folderUploadButton = byId("folder-upload-button");
  const filesUploadButton = byId("files-upload-button");
  const watchFileButton = byId("watch-file-button");
  const picker = byId("story-picker");
  const pickerTitle = byId("story-picker-title");
  const storyMenu = byId("story-menu");
  const storyOptions = byId("story-options");
  const storyTitle = byId("story-title");
  const storyText = byId("story-text");
  const choiceList = byId("choice-list");
  const endingSummary = byId("ending-summary");
  const endingOverall = byId("ending-overall");
  const endingPath = byId("ending-path");
  const endingPathLabel = byId("ending-path-label");
  const endingChoices = byId("ending-choices");
  const endingActions = byId("ending-actions");
  const endingReputationList = byId("ending-reputation-list");
  const restartButton = byId("restart-button");
  const clearButton = byId("clear-button");
  const statusMessage = byId("status-message");
  const infoButton = byId("info-button");
  const tagsButton = byId("tags-button");
  const menuButton = byId("menu-button");
  const appMenu = byId("app-menu");
  const aboutButton = byId("about-button");
  const aboutDialog = byId("about-dialog");
  const aboutClose = byId("about-close");
  const castButton = byId("cast-button");
  const castDot = byId("cast-dot");
  const castDrawer = byId("cast-drawer");
  const castClose = byId("cast-close");
  const castBar = byId("cast-bar");
  const castBarDot = byId("cast-bar-dot");
  const castBarHere = byId("cast-bar-here");
  const castDrawerBody = byId("cast-drawer-body");
  const reputationTabs = byId("reputation-tabs");
  const reputationBody = byId("reputation-body");
  const debugPanel = byId("debug-panel");
  const debugClose = byId("debug-close");
  const graphSummary = byId("graph-summary");
  const graphVisualization = byId("graph-visualization");
  const graphEmpty = byId("graph-empty");
  const debugContent = byId("debug-content");
  const checkButton = byId("check-button");
  const checkResults = byId("check-results");
  const sceneSelect = byId("scene-select");
  const scenePresets = byId("scene-presets");
  const sceneStartButton = byId("scene-start-button");
  const mapButton = byId("map-button");
  const debugTitle = byId("debug-title");
  const mapPane = byId("writer-pane-map");
  // Writer tools' tabs; Story map and Who's in each scene share one pane.
  const WRITER_TABS = ["overview", "map", "cast", "graph"];
  const writerTabs = {};
  WRITER_TABS.forEach(function (tab) { writerTabs[tab] = byId("writer-tab-" + tab); });
  const writerPanes = {
    overview: byId("writer-pane-overview"),
    map: mapPane,
    cast: mapPane,
    graph: byId("writer-pane-graph")
  };
  const glanceResults = byId("glance-results");
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const WATCH_INTERVAL = 1000;
  // Matches the stylesheet: below this width Who's who docks as a bottom
  // bar; at or above it, it's a side column the page makes room for.
  const DOCKED_QUERY = "(max-width: 959px)";

  // Built-in stories are written in stories/<name>.txt. The build script
  // (tools/build-stories.js) wraps each one in stories/built/<name>.js,
  // which calls registerStoryText(), and lists them in manifest.js.
  const STORY_FILES = Array.isArray(window.memoryGraphStoryFiles) ? window.memoryGraphStoryFiles : [];

  let stories = [];
  let storiesUploaded = false;
  let engine = null;
  let selectedStory = null;
  let transcript = [];
  // Whether the current run can be shared as a list of choices: true when it
  // began from the opening scene with no memories of earlier runs.
  let runLinkable = false;
  let watched = null;
  // The last Story check, kept for the story map's Reach view. It belongs to
  // one loaded story object, so a reload or another story drops it.
  let lastCheck = null;
  let writerTab = "overview";

  if (!("webkitdirectory" in fileInput)) {
    folderUploadButton.hidden = true;
  }

  folderUploadButton.addEventListener("click", function () {
    setPickerOpen(false);
    fileInput.click();
  });
  filesUploadButton.addEventListener("click", function () {
    setPickerOpen(false);
    textInput.click();
  });
  // Needs the File System Access API (Chrome and Edge, including file://).
  watchFileButton.hidden = typeof window.showOpenFilePicker !== "function";
  watchFileButton.addEventListener("click", function () {
    setPickerOpen(false);
    watchStoryFile();
  });
  sceneStartButton.addEventListener("click", startFromScene);
  [fileInput, textInput].forEach(function (input) {
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
    if (!event.target.closest(".app-menu-wrap")) {
      setMenuOpen(false);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!appMenu.hidden) {
      setMenuOpen(false);
      menuButton.focus();
    } else if (!storyMenu.hidden) {
      setPickerOpen(false);
      picker.focus();
    } else if (!debugPanel.hidden) {
      closeWriterTools();
    } else if (castOpen) {
      closeCast();
    }
  });
  restartButton.addEventListener("click", function () {
    restart(true);
  });
  clearButton.addEventListener("click", function () {
    restart(false);
  });
  // ---- The ⋯ menu ------------------------------------------------------
  // Memory tags (a switch, so the menu stays open to show it change), How
  // memory works, and Writer tools.
  setMenuOpen(false);
  menuButton.addEventListener("click", function () {
    setMenuOpen(appMenu.hidden);
    if (!appMenu.hidden) tagsButton.focus();
  });
  infoButton.addEventListener("click", function () {
    setMenuOpen(false);
    showDebugInfo();
  });
  mapButton.addEventListener("click", function () { setWriterTab("map", true); });
  WRITER_TABS.forEach(function (tab) {
    writerTabs[tab].addEventListener("click", function () { setWriterTab(tab); });
    // Arrow keys move between the tabs, as in any tab list.
    writerTabs[tab].addEventListener("keydown", function (event) {
      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = WRITER_TABS[(WRITER_TABS.indexOf(tab) + step + WRITER_TABS.length) % WRITER_TABS.length];
      setWriterTab(next, true);
    });
  });
  aboutButton.addEventListener("click", function () {
    setMenuOpen(false);
    // A native modal dialog: it traps focus, closes on Escape, and puts
    // focus back on the menu button when it closes.
    if (typeof aboutDialog.showModal === "function") aboutDialog.showModal();
    else aboutDialog.setAttribute("open", "");
  });
  aboutDialog.addEventListener("close", function () {
    menuButton.focus();
  });
  // A click on the backdrop lands on the dialog itself.
  aboutDialog.addEventListener("click", function (event) {
    if (event.target === aboutDialog) aboutDialog.close();
  });
  aboutClose.addEventListener("click", function () { aboutDialog.close(); });

  function setMenuOpen(open) {
    appMenu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
  }
  checkButton.addEventListener("click", runStoryCheck);
  debugClose.addEventListener("click", closeWriterTools);
  castButton.addEventListener("click", function () {
    if (castOpen) {
      closeCast();
    } else {
      openCast(null, castButton);
    }
  });
  castClose.addEventListener("click", closeCast);
  castBar.addEventListener("click", function () {
    if (castOpen) {
      closeCast();
    } else {
      openCast(reputationView, castBar);
    }
  });
  // Moving between the docked and side layouts (rotating, resizing) re-renders it.
  if (typeof window.matchMedia === "function") {
    const dockedQuery = window.matchMedia(DOCKED_QUERY);
    const relayout = function () { renderReputationPanel(); };
    if (typeof dockedQuery.addEventListener === "function") dockedQuery.addEventListener("change", relayout);
    else if (typeof dockedQuery.addListener === "function") dockedQuery.addListener(relayout);
  }
  let showTags = true;
  try { showTags = localStorage.getItem("memory-graph:show-tags") !== "0"; } catch (error) { /* default on */ }
  setTagsVisible(showTags);
  tagsButton.addEventListener("click", function () {
    setTagsVisible(tagsButton.getAttribute("aria-checked") !== "true");
  });

  picker.disabled = true;
  pickerTitle.textContent = "Loading stories…";
  loadBuiltInStories();

  function loadBuiltInStories() {
    // A classic script's load event fires straight after it runs, so the
    // text it registered can be paired with its file there.
    let registered = null;
    window.registerStoryText = function (fileName, lines) {
      registered = { fileName: fileName, text: Array.isArray(lines) ? lines.join("\n") : String(lines) };
    };
    if (STORY_FILES.length === 0) {
      stories = [];
      renderStoryPicker();
      setStatus("No built-in stories were found. Run node tools/build-stories.js to build them.", true);
      return;
    }

    Promise.all(STORY_FILES.map(function (name) {
      return new Promise(function (resolve) {
        const script = document.createElement("script");
        script.src = "stories/built/" + name + ".js";
        script.onload = function () {
          const source = registered;
          registered = null;
          if (source === null) {
            resolve({ fileName: name + ".txt", error: "the built file did not register a story (run node tools/build-stories.js)" });
            return;
          }
          try {
            resolve(prepareStory(source.text, source.fileName));
          } catch (error) {
            resolve({ fileName: source.fileName, error: error.message });
          }
        };
        script.onerror = function () {
          resolve({ fileName: name + ".txt", error: "stories/built/" + name + ".js could not be loaded (run node tools/build-stories.js)" });
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
      const linked = linkedStory();
      if (linked) {
        // Read the path first: starting the story rewrites the address bar
        // to match the new run, which has no choices yet.
        const path = linkParam("path");
        pickerTitle.textContent = linked.definition.title;
        selectStory(linked);
        replayLinkedPath(path);
      }
      if (rejected.length) {
        setStatus("Skipped " + plural(rejected.length, "built-in story", "built-in stories") + ": " +
          rejected.map(function (result) { return result.fileName + ": " + result.error; }).join(" · "), true);
      }
    });
  }

  // Reads a story's text. Returns { fileName, definition, warnings, lines,
  // todos }; throws, naming the line, when the story can't be played.
  function prepareStory(text, fileName) {
    let parsed;
    try {
      parsed = window.StoryText.parse(text, { fileName: fileName });
    } catch (error) {
      throw new Error(error.line === undefined ? error.message : "line " + error.line + ": " + error.reason);
    }
    const definition = parsed.story;
    try {
      const probe = new window.NarrativeEngine(definition);
      probe.start();
      const story = {
        fileName: fileName,
        definition: definition,
        lines: parsed.lines,
        todos: parsed.todos,
        warnings: probe.lint()
      };
      if (story.warnings.length > 0 && typeof console !== "undefined" && console.warn) {
        console.warn(fileName + " has " + story.warnings.length + " authoring warning(s):\n" +
          story.warnings.map(function (warning) { return formatWarning(warning, story); }).join("\n"));
      }
      return story;
    } catch (error) {
      const line = window.StoryText.lineFor(parsed.lines, error.message);
      throw new Error((line === null ? "" : "line " + line + ": ") + error.message);
    }
  }

  // ---- Story links -----------------------------------------------------
  // index.html?story=the_night_ferry opens that built-in story straight away,
  // and &path=0.2.1 then makes those choices: each number is the choice's
  // position among all the choices written in its scene. The address bar
  // always holds the link to what's on screen. The path is left off when the
  // run can't be rebuilt from choices alone (it kept earlier memories, began
  // at a chosen scene, or was restored from a save).

  function storyName(story) {
    return story.fileName.replace(/\.txt$/i, "");
  }

  function linkParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (error) {
      return null; // no URL to read
    }
  }

  function linkedStory() {
    let wanted = linkParam("story");
    if (!wanted) {
      return null;
    }
    wanted = wanted.trim().replace(/\.txt$/i, "").toLowerCase();
    const found = stories.find(function (story) {
      return storyName(story).toLowerCase() === wanted || story.definition.id === wanted;
    });
    if (!found) {
      setStatus("There is no story called \"" + wanted + "\". Choose one from the list.", true);
    }
    return found || null;
  }

  function replayLinkedPath(path) {
    if (!engine || !path) {
      return;
    }
    if (!/^\d+(\.\d+)*$/.test(path)) {
      setStatus("This link's path isn't valid, so the story starts from the beginning.", true);
      return;
    }
    const positions = path.split(".").map(Number);
    const replayed = replay(positions.map(function (position) {
      return function (view) {
        const choice = selectedStory.definition.nodes[view.nodeId].choices[position];
        return choice ? choice.id : null;
      };
    }));
    setStatus(replayed === positions.length
      ? "Opened from a link: replayed " + plural(replayed, "choice") + "."
      : "Opened from a link: replayed " + replayed + " of " + positions.length +
        " choices. The story has changed since the link was made.", replayed !== positions.length);
  }

  function linkPath() {
    if (!runLinkable || !engine) {
      return null;
    }
    const nodes = selectedStory.definition.nodes;
    return engine.choiceHistory.map(function (entry) {
      return nodes[entry.nodeId].choices.findIndex(function (choice) {
        return choice.id === entry.choiceId;
      });
    }).join(".") || null;
  }

  function updateLink() {
    try {
      const url = new URL(window.location.href);
      const shareable = selectedStory && !storiesUploaded;
      const path = shareable ? linkPath() : null;
      if (shareable) {
        url.searchParams.set("story", storyName(selectedStory));
      } else {
        url.searchParams.delete("story");
      }
      if (path) {
        url.searchParams.set("path", path);
      } else {
        url.searchParams.delete("path");
      }
      if (url.href !== window.location.href) {
        window.history.replaceState(null, "", url.href);
      }
    } catch (error) { /* the link is a convenience; playing doesn't need it */ }
  }

  function formatWarning(warning, story) {
    const line = story && story.lines ? window.StoryText.lineFor(story.lines, warning.location) : null;
    return (line === null ? "" : "line " + line + ", ") + warning.location + ": " + warning.message;
  }

  function sortStories(list) {
    return list.sort(function (a, b) {
      return compareText(a.definition.title, b.definition.title) ||
        compareText(a.fileName, b.fileName);
    });
  }

  function loadStoryFiles(files) {
    const textFiles = files.filter(function (file) {
      return /\.txt$/i.test(file.name);
    });
    if (textFiles.length === 0) {
      setStatus("No story files were selected. Stories are .txt files.", true);
      return;
    }
    stopWatching();

    Promise.all(textFiles.map(readStoryFile)).then(function (results) {
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
      const summary = plural(stories.length, "story", "stories") + " loaded." + warningNote(warningCount);
      setStatus(rejected.length === 0
        ? summary
        : summary + " Skipped " + plural(rejected.length, "invalid file") + ": " + rejected.join(" · "), rejected.length > 0);
    }).catch(function (error) {
      setStatus("Could not read the selected stories: " + error.message, true);
    });
  }

  function warningNote(count) {
    return count === 0 ? "" : " " + plural(count, "authoring warning") + ": see Writer tools in the ⋯ menu.";
  }

  function readStoryFile(file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(prepareStory(String(reader.result), file.name));
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

  // ---- Watching a story file -----------------------------------------
  // In browsers with the File System Access API, a writer can pick their
  // story file once. The page checks it every second; after each save it
  // reloads the story and replays the choices made so far, so they stay at
  // the same point. A file that doesn't parse leaves the current run alone.

  function watchStoryFile() {
    window.showOpenFilePicker({
      types: [{ description: "Story text", accept: { "text/plain": [".txt"] } }]
    }).then(function (handles) {
      const handle = handles[0];
      return handle.getFile().then(function (file) {
        return file.text().then(function (text) {
          stopWatching();
          watched = { handle: handle, lastModified: file.lastModified, timer: null, busy: false };
          storiesUploaded = true;
          loadWatchedText(text, file.name, false);
          watched.timer = setInterval(checkWatchedFile, WATCH_INTERVAL);
        });
      });
    }).catch(function (error) {
      if (error && error.name === "AbortError") return;
      setStatus("Could not open the story file: " + (error && error.message ? error.message : error), true);
    });
  }

  function stopWatching() {
    if (watched !== null && watched.timer !== null) clearInterval(watched.timer);
    watched = null;
  }

  function checkWatchedFile() {
    if (watched === null || watched.busy) return;
    const current = watched;
    current.busy = true;
    current.handle.getFile().then(function (file) {
      if (file.lastModified === current.lastModified) return null;
      current.lastModified = file.lastModified;
      return file.text().then(function (text) {
        if (watched === current) loadWatchedText(text, file.name, true);
      });
    }).catch(function (error) {
      setStatus("Stopped watching the story file: " + (error && error.message ? error.message : error), true);
      stopWatching();
    }).then(function () {
      current.busy = false;
    });
  }

  function loadWatchedText(text, fileName, isReload) {
    let story;
    try {
      story = prepareStory(text, fileName);
    } catch (error) {
      setStatus(fileName + " " + error.message + (isReload ? " The last working version is still playing." : ""), true);
      return;
    }
    const history = isReload && engine ? engine.choiceHistory.slice() : [];
    stories = [story];
    renderStoryPicker();
    pickerTitle.textContent = story.definition.title + " (watching for changes)";
    selectStory(story);
    const replayed = replayChoices(history);
    // A map left open redraws from the saved file.
    if (!debugPanel.hidden) showDebugInfo();
    setStatus((isReload
      ? "Reloaded " + fileName + (history.length === 0 ? "." : replayed === history.length
        ? " and replayed your " + plural(history.length, "choice") + "."
        : " and replayed " + replayed + " of your " + history.length + " choices; the next one changed.")
      : "Watching " + fileName + ". Save it in your editor and the story reloads here.") + warningNote(story.warnings.length),
    false);
  }

  // Makes the same choices again, by id, until one is no longer offered.
  // Returns how many were replayed.
  function replayChoices(history) {
    return replay(history.map(function (entry) {
      return function (view) { return view.nodeId === entry.nodeId ? entry.choiceId : null; };
    }));
  }

  // Each step is given the current view and names the id of the choice to
  // make; replaying stops at the first step whose choice isn't offered.
  function replay(steps) {
    let count = 0;
    for (const step of steps) {
      const view = engine.getView();
      const choiceId = step(view);
      const choice = view.choices.find(function (option) { return option.id === choiceId; });
      if (choiceId === null || choice === undefined) break;
      try {
        const next = engine.choose(choice.index);
        transcript.push(choiceEntry(choice, next.echo), storyEntry(next));
      } catch (error) {
        setStatus(error.message, true);
        break;
      }
      count += 1;
    }
    if (count > 0) renderView(engine.getView());
    return count;
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
    runLinkable = false;
    try {
      engine = new window.NarrativeEngine(story.definition);
      beginRun(engine.start(), true, true);
      setStatus("A new run is ready.");
    } catch (error) {
      engine = null;
      updateLink();
      setStatus(error.message, true);
    }
  }

  // Shows the opening view of a new run. linkable: the run can be shared as
  // a list of choices. newCast: forget which views of you have been seen.
  function beginRun(view, linkable, newCast) {
    if (newCast) {
      reputationView = null;
      seenViews = {};
    }
    runLinkable = linkable;
    transcript = [storyEntry(view)];
    renderView(view);
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
    if (Array.isArray(view.present) && view.present.length > 0) {
      entry.present = view.present.map(function (character) { return character.id; });
    }
    return entry;
  }

  function choiceEntry(choice, echo) {
    const entry = { type: "choice", text: choice.text };
    if (choice.cause) entry.cause = choice.cause;
    if (echo) entry.echo = echo;
    return entry;
  }

  function renderEntry(entry, isCurrent) {
    const paragraph = document.createElement("p");
    if (entry.type === "choice") paragraph.className = "story-picked-choice";
    // Each character's first mention in a passage can be hovered to see who they are.
    const linked = new Set();
    if (entry.type === "story" && entry.present && engine) {
      const here = document.createElement("span");
      here.className = "story-here";
      here.appendChild(document.createTextNode("Here: "));
      entry.present.forEach(function (id, index) {
        if (index > 0) {
          // The names show as chips, so the comma is for screen readers only.
          const separator = document.createElement("span");
          separator.className = "visually-hidden";
          separator.textContent = ", ";
          here.appendChild(separator);
        }
        linked.add(id);
        const name = createCharacterName(id, engine.characterName(id), isCurrent);
        if (isCurrent && !engine.ended && reputationChanged(id)) name.className += " is-changed";
        here.appendChild(name);
      });
      paragraph.appendChild(here);
    }
    if (entry.arrival) {
      paragraph.appendChild(createTag(entry.arrival, true));
      paragraph.appendChild(document.createTextNode(" "));
    }
    (entry.segments || [{ text: entry.text }]).forEach(function (segment) {
      appendRichText(paragraph, segment.text, entry.type === "story" ? linked : null, isCurrent);
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

  // Story text with *italics*, and (when `linked` is given) each character's
  // first mention by name made hoverable.
  function appendRichText(parent, text, linked, isCurrent) {
    text.split(/(\*[^*\n]+\*)/).forEach(function (piece) {
      if (/^\*[^*\n]+\*$/.test(piece)) {
        const emphasis = document.createElement("em");
        appendNames(emphasis, piece.slice(1, -1), linked, isCurrent);
        parent.appendChild(emphasis);
      } else if (piece.length > 0) {
        appendNames(parent, piece, linked, isCurrent);
      }
    });
  }

  function appendNames(parent, text, linked, isCurrent) {
    const matcher = linked ? nameMatcher() : null;
    if (matcher === null) {
      parent.appendChild(document.createTextNode(text));
      return;
    }
    let last = 0;
    matcher.pattern.lastIndex = 0;
    let match;
    while ((match = matcher.pattern.exec(text)) !== null) {
      const id = matcher.ids[match[2]];
      if (linked.has(id)) continue;
      linked.add(id);
      const start = match.index + match[1].length;
      if (start > last) parent.appendChild(document.createTextNode(text.slice(last, start)));
      parent.appendChild(createCharacterName(id, match[2], isCurrent));
      last = start + match[2].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  // Matches characters' names in text: the full name, and also a
  // capitalised last word that no one else shares ("Hale" for "Captain Hale").
  let matcherCache = { story: null, matcher: null };
  function nameMatcher() {
    if (!selectedStory) return null;
    if (matcherCache.story === selectedStory) return matcherCache.matcher;
    const ids = {};
    const lastWords = {};
    const characters = selectedStory.definition.characters || {};
    Object.keys(characters).forEach(function (id) {
      const name = characters[id].name === undefined ? id : characters[id].name;
      ids[name] = id;
      const words = name.split(/\s+/);
      const last = words[words.length - 1];
      if (words.length > 1 && /^[A-Z][\w'-]{2,}$/.test(last)) {
        lastWords[last] = lastWords[last] === undefined ? id : null;
      }
    });
    Object.keys(lastWords).forEach(function (word) {
      if (lastWords[word] !== null && ids[word] === undefined) ids[word] = lastWords[word];
    });
    const names = Object.keys(ids).sort(function (a, b) { return b.length - a.length; });
    const matcher = names.length === 0 ? null : {
      ids: ids,
      pattern: new RegExp("(^|[^\\w'’])(" + names.map(escapeRegExp).join("|") + ")(?![\\w’])", "g")
    };
    matcherCache = { story: selectedStory, matcher: matcher };
    return matcher;
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // A character's name with a tooltip: who they are, whether they're here,
  // and how they see you now (kept secret for hidden characters).
  function createCharacterName(id, text, isCurrent) {
    const name = document.createElement("span");
    name.className = "character-name";
    name.setAttribute("tabindex", "0");
    name.appendChild(document.createTextNode(text));
    const tip = document.createElement("span");
    tip.className = "memory-tip character-tip";
    tip.setAttribute("role", "tooltip");
    characterLines(id, isCurrent).forEach(function (line, index) {
      const part = document.createElement("span");
      part.className = index === 0 ? "memory-tip-heading" : "character-tip-line";
      part.textContent = line;
      tip.appendChild(part);
    });
    name.appendChild(tip);
    // Clicking (or Enter on) a name opens Who's who on that person, once
    // they're in the cast.
    const open = function () {
      if (engine && !engine.ended && castCharacters().indexOf(id) !== -1) openCast(id, name);
    };
    name.addEventListener("click", open);
    name.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    return name;
  }

  function characterLines(id, isCurrent) {
    const lines = [engine.characterName(id)];
    const description = engine.characterDescription(id);
    if (description) lines.push(description);
    if (isCurrent && currentPresent().indexOf(id) !== -1) lines.push("Here now.");
    lines.push(opinionOf(id));
    return lines;
  }

  // ---- How people see you, in words ------------------------------------
  // One set of phrasings for the tooltips, Who's who, and the ending: "Sees
  // you as" while playing, "Will remember you as" at an ending.

  function isHidden(id) {
    return id !== null && selectedStory.definition.characters[id].hidden === true;
  }

  function opinionOf(id, atEnding) {
    if (isHidden(id)) return "You can't tell what they make of you.";
    return verdict(engine.reputationOf(id).traits, atEnding);
  }

  function traitList(traits) {
    return traits.filter(function (trait) { return trait.score > 0; }).slice(0, 2)
      .map(function (trait) { return trait.label; }).join(" and ");
  }

  function verdict(traits, atEnding) {
    const list = traitList(traits);
    if (list === "") return atEnding ? "Has no settled opinion of you." : "Hasn't made up their mind about you.";
    return (atEnding ? "Will remember you as " : "Sees you as ") + list + ".";
  }

  function overallVerdict(traits, atEnding) {
    const list = traitList(traits);
    if (list === "") return atEnding ? "Nothing you did here defined you." : "Nothing you've done has defined you yet.";
    return (atEnding ? "You leave seen as " : "So far you're seen as ") + list + ".";
  }

  function memoryLine(name, memory, atEnding) {
    if (atEnding) return name === null ? "What people will remember most: you " + memory + "." : "Mostly, that you " + memory + ".";
    return (name === null ? "What people remember most: you " : "What " + name + " remembers most: you ") + memory + ".";
  }

  function currentPresent() {
    if (!engine || engine.currentNodeId === null) return [];
    return selectedStory.definition.nodes[engine.currentNodeId].present || [];
  }

  // ---- Who's who ------------------------------------------------------
  // The cast so far: everyone who has been in a scene with you or knows
  // something about you, with whoever is here now listed first. Each tab
  // shows who they are and a live view of your reputation with them:
  // diverging bars (toward a trait to the right, away from it to the left)
  // and the act that defines you to them. Hidden characters appear once
  // they've been in a scene, but what they think of you stays secret.

  // The drawer doesn't block the page: choices can still be made with it
  // open, and it updates as they are. A dot on the button, a tab, or a name
  // in the "Here:" line marks a view of you that changed since you last
  // looked at it.

  let reputationView = null;
  let castOpen = false;
  let castOpener = null;
  let seenViews = {};
  let wantCastOpen = false;
  try {
    // Reopen it only as a side column; the docked bar always starts collapsed.
    wantCastOpen = localStorage.getItem("memory-graph:show-reputation") === "1" && !isDocked();
  } catch (error) { /* closed by default */ }

  function isDocked() {
    return typeof window.matchMedia === "function" && window.matchMedia(DOCKED_QUERY).matches;
  }

  function castAvailable() {
    if (!engine || engine.ended) return false;
    return engine.reputationOf().traits.length > 0 || castCharacters().length > 0;
  }

  function openCast(id, opener) {
    if (!castAvailable()) return;
    reputationView = id;
    castOpener = opener || castButton;
    setCastOpen(true);
    // On phones the bar stays where it was tapped, so focus stays on it.
    (isDocked() ? castBar : castClose).focus();
  }

  function closeCast() {
    setCastOpen(false);
    // The name that opened it may have been re-rendered since. On phones the
    // title-row button is hidden, and the bar takes its place.
    const fallback = isDocked() ? castBar : castButton;
    const target = castOpener && castOpener.isConnected !== false && castOpener !== castButton ? castOpener : fallback;
    castOpener = null;
    if (!target.hidden) target.focus();
  }

  function setCastOpen(open) {
    castOpen = open;
    wantCastOpen = open;
    try { localStorage.setItem("memory-graph:show-reputation", open ? "1" : "0"); } catch (error) { /* per-viewer preference only */ }
    renderReputationPanel();
  }

  // What would count as news about a view: which traits it has, which way
  // each points, and the act behind it. (Not the exact scores, which drift
  // as old memories fade.)
  function viewSignature(id) {
    if (isHidden(id)) return "|";
    const view = engine.reputationOf(id === null ? undefined : id);
    return view.traits.map(function (trait) {
      return trait.trait + (trait.score > 0 ? "+" : "-");
    }).join(",") + "|" + (view.memory || "");
  }

  function reputationChanged(id) {
    if (!engine) return false;
    const key = id === null ? "" : id;
    const seen = seenViews[key] === undefined ? "|" : seenViews[key];
    return viewSignature(id) !== seen;
  }

  function markSeen(id) {
    seenViews[id === null ? "" : id] = viewSignature(id);
  }

  function castCharacters() {
    const story = selectedStory.definition;
    const met = new Set(engine.knownCharacters());
    engine.nodeVisits.forEach(function (nodeId) {
      (story.nodes[nodeId].present || []).forEach(function (id) { met.add(id); });
    });
    return hereFirst(Array.from(met));
  }

  // Characters sorted with whoever is here now first, then in story order.
  function hereFirst(ids) {
    const here = currentPresent();
    const order = Object.keys(selectedStory.definition.characters);
    return ids.sort(function (a, b) {
      return (here.indexOf(b) !== -1) - (here.indexOf(a) !== -1) || order.indexOf(a) - order.indexOf(b);
    });
  }

  function renderReputationPanel() {
    const available = castAvailable();
    // On phones it's always there as a bar while there's a cast (docked),
    // and open means expanded. Wider, it's a drawer that's shown or not.
    const docked = available && isDocked();
    castButton.hidden = !available;
    castOpen = available && wantCastOpen;
    castDrawer.hidden = !(castOpen || docked);
    castDrawer.className = "cast-drawer" + (docked ? " is-docked" : "") + (docked && !castOpen ? " is-collapsed" : "");
    castDrawerBody.hidden = !castOpen;
    castButton.setAttribute("aria-expanded", String(castOpen));
    castBar.setAttribute("aria-expanded", String(castOpen));
    document.body.classList.toggle("cast-open", castOpen);
    document.body.classList.toggle("cast-docked", docked);
    if (!available) {
      castDot.hidden = true;
      castBarDot.hidden = true;
      return;
    }
    const characters = castCharacters();
    if (reputationView !== null && characters.indexOf(reputationView) === -1) reputationView = null;
    if (castOpen) markSeen(reputationView);
    const ids = [null].concat(characters);
    const unseen = !castOpen && ids.some(reputationChanged);
    castDot.hidden = !unseen;
    castBarDot.hidden = !unseen;

    const here = currentPresent();
    castBarHere.textContent = here.length === 0 ? "" : "Here: " + here.map(function (id) {
      return engine.characterName(id);
    }).join(", ");
    const views = ids.map(function (id) { return engine.reputationOf(id === null ? undefined : id); });
    const scale = sharedScale(views);

    reputationTabs.replaceChildren();
    views.forEach(function (view, index) {
      const id = ids[index];
      const tab = document.createElement("button");
      tab.type = "button";
      const changed = reputationChanged(id);
      tab.className = "reputation-tab" + (changed ? " is-changed" : "");
      const isHere = id !== null && here.indexOf(id) !== -1;
      tab.textContent = id === null ? "Overall" : view.name + (isHere ? " · here" : "");
      if (changed) tab.setAttribute("aria-label", tab.textContent + ", changed");
      tab.setAttribute("aria-pressed", String(id === reputationView));
      tab.addEventListener("click", function () {
        reputationView = id;
        renderReputationPanel();
      });
      reputationTabs.appendChild(tab);
    });

    const view = views[ids.indexOf(reputationView)];
    reputationBody.replaceChildren();
    if (reputationView !== null) {
      const description = engine.characterDescription(reputationView);
      if (description) reputationBody.appendChild(reputationNote(description, "reputation-description"));
      if (isHidden(reputationView)) {
        reputationBody.appendChild(reputationNote(opinionOf(reputationView)));
        return;
      }
    }
    appendReputation(reputationBody, view, scale, false);
  }

  // One scale for every view, so bars can be compared between people.
  function sharedScale(views) {
    return Math.max(1, Math.max.apply(null, views.map(function (view) {
      return Math.max.apply(null, [0].concat(view.traits.map(function (t) { return Math.abs(t.score); })));
    })));
  }

  // A view's bars and the act behind it, or a line saying there's no view yet.
  function appendReputation(parent, view, scale, atEnding) {
    if (view.traits.length === 0) {
      parent.appendChild(reputationNote(view.name === null
        ? overallVerdict(view.traits, atEnding)
        : view.name + " hasn't made up their mind about you yet."));
      return;
    }
    if (atEnding) parent.appendChild(reputationNote(overallVerdict(view.traits, true), "reputation-description"));
    const list = document.createElement("ul");
    list.className = "reputation-rows";
    view.traits.forEach(function (trait) {
      list.appendChild(reputationRow(trait, scale));
    });
    parent.appendChild(list);
    if (view.memory) parent.appendChild(reputationNote(memoryLine(view.name, view.memory, atEnding)));
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

  function reputationNote(text, className) {
    const note = document.createElement("p");
    note.className = className || "reputation-note";
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
    tagsButton.setAttribute("aria-checked", String(visible));
    try { localStorage.setItem("memory-graph:show-tags", visible ? "1" : "0"); } catch (error) { /* per-viewer preference only */ }
  }

  function renderView(view) {
    storyTitle.textContent = selectedStory.definition.title;
    // The view open in Who's who updates in front of you, so it isn't news.
    if (castOpen && castAvailable()) markSeen(reputationView);
    storyText.replaceChildren();
    transcript.forEach(function (entry, index) {
      storyText.appendChild(renderEntry(entry, index === transcript.length - 1));
    });
    updateLink();
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
          setStatus("");
        } catch (error) {
          setStatus(error.message, true);
        }
      });
      choiceList.appendChild(button);
    });

    renderReputationPanel();
    renderEndingSummary(view);
  }

  function renderEndingSummary(view) {
    endingSummary.hidden = !view.ended;
    if (!view.ended) return;

    // Who knows anything about you, whoever is here at the end first.
    const people = hereFirst(engine.knownCharacters({ includeHidden: true }));
    const overall = engine.reputationOf();
    const views = people.map(function (id) { return engine.reputationOf(id); });
    const scale = sharedScale([overall].concat(views.filter(function (v) { return !isHidden(v.character); })));
    endingOverall.replaceChildren();
    appendReputation(endingOverall, overall, scale, true);
    renderEndingPeople(views);

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

  // A card for each person: their verdict on you and the act behind it,
  // built from what they witnessed or heard. Hidden characters keep it secret.
  function renderEndingPeople(views) {
    endingReputationList.hidden = views.length === 0;
    endingReputationList.replaceChildren();
    views.forEach(function (view) {
      const item = document.createElement("li");
      item.className = "ending-person";
      const name = document.createElement("span");
      name.className = "ending-person-name";
      name.textContent = view.name;
      const opinion = document.createElement("span");
      opinion.className = "ending-person-verdict";
      opinion.textContent = opinionOf(view.character, true);
      item.append(name, opinion);
      if (view.memory && !isHidden(view.character)) {
        const memory = document.createElement("span");
        memory.className = "ending-person-memory";
        memory.textContent = memoryLine(view.name, view.memory, true);
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
      beginRun(engine.start(), !keepMemory, false);
      setStatus(keepMemory
        ? "A new run has started. Earlier memories remain."
        : "Memory cleared. A fresh run has started.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function clearPlayer() {
    selectedStory = null;
    engine = null;
    transcript = [];
    runLinkable = false;
    updateLink();
    storyTitle.textContent = "The next choice is yours.";
    storyText.textContent = "Choose a story above to step into a world that remembers.";
    choiceList.replaceChildren();
    endingSummary.hidden = true;
    renderReputationPanel();
    endingActions.hidden = true;
  }

  function setStatus(message, isError) {
    statusMessage.textContent = message || "";
    statusMessage.dataset.error = isError ? "true" : "false";
  }

  function compareText(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function showDebugInfo() {
    renderGraphVisualization();
    const debugData = {
      "Current Story": selectedStory ? selectedStory.definition.title : "None",
      "Story ID": selectedStory ? selectedStory.definition.id : "None",
      "Engine Active": engine !== null,
      "Stories Loaded": stories.length,
      "Stories": stories.map(function (story) {
        return story.definition.title;
      }),
      "Memory Graph": engine ? {
        "Events Count": engine.graph.events.length,
        "Events": engine.graph.events.map(function (event) {
          return {
            "id": event.id,
            "concepts": event.concepts,
            "sequence": event.sequence
          };
        })
      } : "No engine loaded"
    };
    
    if (engine) {
      const related = engine.graph.related("player", 10);
      debugData["Related Concepts (Player)"] = related.length > 0
        ? related.map(function (item) {
          return { concept: item.concept, score: item.score, seen: item.seen };
        })
        : "None";
      debugData["Perspectives"] = engine.knownCharacters({ includeHidden: true }).map(function (id) {
        const view = engine.reputationOf(id);
        return {
          character: view.name,
          knownEvents: Object.keys(engine.knowledge[id]).length,
          traits: view.traits.map(function (trait) {
            return trait.trait + " " + trait.score.toFixed(2);
          }),
          strongestMemory: view.memory
        };
      });
    }

    debugContent.textContent = JSON.stringify(debugData, null, 2);
    renderGlance();
    renderCheckResults(null);
    renderSceneStart();
    debugTitle.textContent = "Writer tools" + (selectedStory ? " · " + selectedStory.definition.title : "");
    const opening = debugPanel.hidden;
    debugPanel.hidden = false;
    setWriterTab(writerTab, opening);
  }

  // ---- Start from a scene ----------------------------------------------
  // For writers testing a late scene: pick it, tick the memories and
  // variables that should already be in place, and the run starts there.

  function presetOperations(story) {
    const presets = [];
    const seen = new Set();
    const add = function (nodeId, operation) {
      if (operation.type !== "set" && !(operation.type === "remember" && operation.summary !== undefined)) return;
      const key = JSON.stringify(operation);
      if (seen.has(key)) return;
      seen.add(key);
      presets.push({ nodeId: nodeId, operation: operation });
    };
    Object.keys(story.nodes).forEach(function (nodeId) {
      const node = story.nodes[nodeId];
      (node.onEnter || []).forEach(function (operation) { add(nodeId, operation); });
      (node.choices || []).forEach(function (choice) {
        (choice.do || []).forEach(function (operation) { add(nodeId, operation); });
      });
    });
    return presets;
  }

  function presetLabel(preset) {
    const operation = preset.operation;
    if (operation.type === "set") {
      return operation.variable + " = " + JSON.stringify(operation.value);
    }
    const who = operation.subject === undefined
      ? (operation.concepts.indexOf("player") === -1 ? "" : "you ")
      : engine.subjectName(operation.subject) + " ";
    const witnesses = operation.witnesses === undefined ? "no one"
      : operation.witnesses === "all" ? "everyone"
        : operation.witnesses.map(function (id) { return engine.characterName(id); }).join(", ");
    return who + operation.summary.replace(/\{name:([^{}]+)\}/g, function (match, id) {
      return engine.characterName(id.trim());
    }) + " (seen by " + witnesses + ")";
  }

  function renderSceneStart() {
    sceneSelect.replaceChildren();
    scenePresets.replaceChildren();
    sceneStartButton.disabled = !selectedStory || !engine;
    if (!selectedStory || !engine) return;
    const story = selectedStory.definition;
    Object.keys(story.nodes).forEach(function (nodeId) {
      const option = document.createElement("option");
      option.value = nodeId;
      option.textContent = nodeId.replace(/_/g, " ") + (story.nodes[nodeId].ending ? " (ending)" : "");
      sceneSelect.appendChild(option);
    });
    if (engine.currentNodeId !== null) sceneSelect.value = engine.currentNodeId;
    presetOperations(story).forEach(function (preset, index) {
      const label = document.createElement("label");
      label.className = "scene-preset";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = String(index);
      const scene = document.createElement("span");
      scene.className = "scene-preset-scene";
      scene.textContent = preset.nodeId.replace(/_/g, " ");
      label.append(box, scene, document.createTextNode(" " + presetLabel(preset)));
      scenePresets.appendChild(label);
    });
  }

  function startFromScene() {
    if (!selectedStory) return;
    const presets = presetOperations(selectedStory.definition);
    const chosen = Array.from(scenePresets.querySelectorAll("input:checked")).map(function (box) {
      return presets[Number(box.value)].operation;
    });
    try {
      const fresh = new window.NarrativeEngine(selectedStory.definition);
      fresh.apply(chosen);
      const view = fresh.start(sceneSelect.value);
      engine = fresh;
      beginRun(view, false, true);
      debugPanel.hidden = true;
      setStatus("Started at " + sceneSelect.value.replace(/_/g, " ") + " with " +
        plural(chosen.length, "thing") + " already in place.");
    } catch (error) {
      setStatus("Could not start there: " + error.message + " Tick what the scene needs, such as the variables it shows.", true);
    }
  }

  // ---- Story check ----------------------------------------------------
  // Authoring warnings for the selected story, and on request a batch of
  // random playthroughs that reports crashes, unreached nodes, and text that
  // never appeared.

  const CHECK_RUNS = 300;

  function runStoryCheck() {
    if (!selectedStory) return;
    try {
      const result = checkSelectedStory();
      renderCheckResults(result);
      renderGlance();
    } catch (error) {
      renderCheckResults(null);
      checkLine(checkResults, "Check failed: " + error.message, true);
    }
  }

  function checkSelectedStory() {
    const result = window.StoryCheck.check(selectedStory.definition, { runs: CHECK_RUNS });
    lastCheck = { story: selectedStory, result: result };
    return result;
  }

  function currentCheck() {
    return lastCheck !== null && lastCheck.story === selectedStory ? lastCheck.result : null;
  }

  // ---- Story at a glance and the story map ------------------------------
  // The numbers come from StoryMap.js; the map itself is storyMapView.js.

  function renderGlance() {
    glanceResults.replaceChildren();
    mapButton.disabled = !selectedStory;
    if (!selectedStory) return;
    let analysis;
    try {
      analysis = window.StoryMap.analyse(selectedStory.definition, { lines: selectedStory.lines, todos: selectedStory.todos });
    } catch (error) {
      checkLine(glanceResults, "Couldn't measure this story: " + error.message, true);
      return;
    }
    const stats = analysis.stats;
    checkLine(glanceResults, plural(stats.scenes, "scene") + ", " + plural(stats.endings, "ending") + ", " +
      plural(stats.choices, "choice") + " and " + plural(stats.characters, "character") + ". " +
      stats.words.toLocaleString("en") + " words, " + Math.round(stats.conditionalShare * 100) +
      "% of them shown only sometimes.");
    checkLine(glanceResults, "Scenes run from " + plural(stats.sceneWords.min.words, "word") + " (" +
      stats.sceneWords.min.id.replace(/_/g, " ") + ") to " + plural(stats.sceneWords.max.words, "word") + " (" +
      stats.sceneWords.max.id.replace(/_/g, " ") + "), about " + plural(stats.sceneWords.median.words, "word") + " typically." +
      (stats.shortestRoute === null ? "" : " The shortest route to an ending is " + plural(stats.shortestRoute, "choice") + "."));
    const check = currentCheck();
    if (check !== null && check.lengths.choices) {
      checkLine(glanceResults, "In " + check.runs + " random runs a playthrough took " + check.lengths.choices.min + "–" +
        check.lengths.choices.max + " choices and " + check.lengths.words.min.toLocaleString("en") + "–" +
        check.lengths.words.max.toLocaleString("en") + " words (usually about " +
        check.lengths.words.median.toLocaleString("en") + ").");
    }
    const problems = analysis.problems.filter(function (problem) { return problem.severity !== "note"; });
    if (problems.length > 0) {
      checkLine(glanceResults, plural(problems.length, "structure or memory problem") +
        ": open the story map to see where.", true);
    }
  }

  function checkLine(parent, text, isProblem) {
    const line = document.createElement("p");
    line.className = "check-line" + (isProblem ? " is-problem" : "");
    line.textContent = text;
    parent.appendChild(line);
  }

  // Shows one of Writer tools' tabs. The map is drawn when its tab opens,
  // so it always reflects the current run and the latest check.
  function setWriterTab(tab, focus) {
    writerTab = WRITER_TABS.indexOf(tab) === -1 ? "overview" : tab;
    WRITER_TABS.forEach(function (id) {
      writerTabs[id].setAttribute("aria-selected", String(id === writerTab));
      writerTabs[id].tabIndex = id === writerTab ? 0 : -1;
    });
    Object.keys(writerPanes).forEach(function (id) {
      writerPanes[id].hidden = writerPanes[id] !== writerPanes[writerTab];
    });
    mapPane.setAttribute("aria-labelledby", "writer-tab-" + (writerTab === "cast" ? "cast" : "map"));
    if ((writerTab === "map" || writerTab === "cast") && selectedStory) {
      window.StoryMapView.show(mapPane, storyMapOptions(), writerTab);
    } else if (writerTab === "map" || writerTab === "cast") {
      mapPane.replaceChildren();
      const note = document.createElement("p");
      note.className = "check-line writer-empty";
      note.textContent = "Choose a story to see its map.";
      mapPane.appendChild(note);
    }
    if (focus) writerTabs[writerTab].focus();
  }

  function closeWriterTools() {
    if (debugPanel.hidden) return;
    debugPanel.hidden = true;
    menuButton.focus();
  }

  function storyMapOptions() {
    return {
      story: selectedStory,
      check: currentCheck(),
      path: engine ? { nodes: engine.nodeVisits.slice(), current: engine.currentNodeId } : null,
      runCheck: function () {
        const result = checkSelectedStory();
        renderGlance();
        return result;
      },
      startAt: startFromMap,
      showTab: function (tab) { setWriterTab(tab); }
    };
  }

  // The map's "Start from this scene…": opens Start from a scene in Writer
  // tools with that scene chosen, so the writer can tick what came before.
  function startFromMap(sceneId) {
    setWriterTab("overview");
    sceneSelect.value = sceneId;
    sceneSelect.closest(".scene-start").scrollIntoView({ block: "start" });
    sceneSelect.focus();
  }

  function renderCheckResults(result) {
    checkResults.replaceChildren();
    checkButton.disabled = !selectedStory;
    if (!selectedStory) {
      checkLine(checkResults, "Choose a story to check it.");
      return;
    }
    const warnings = result ? result.warnings : selectedStory.warnings;
    appendCheckList(warnings.length === 0
      ? "No authoring warnings."
      : plural(warnings.length, "authoring warning") + ":",
    warnings.map(function (warning) { return formatWarning(warning, selectedStory); }), warnings.length > 0);
    const todos = selectedStory.todos || [];
    if (todos.length > 0) {
      appendCheckList(plural(todos.length, "TODO note") + ":", todos.map(function (todo) {
        return "line " + todo.line + ": " + (todo.text || "(no note)");
      }), false);
    }
    if (!result) {
      checkLine(checkResults, "Check story plays " + CHECK_RUNS + " random runs and lists anything they never reached.");
      return;
    }
    appendCheckList(result.errors.length === 0
      ? "All " + result.runs + " random runs finished cleanly."
      : plural(result.errors.length, "kind") + " of failure:",
    result.errors.map(function (error) { return "Seed " + error.seed + ": " + error.message; }),
    result.errors.length > 0);
    appendCheckList("Endings reached:", Object.keys(result.endings).map(function (id) {
      return id + ": " + plural(result.endings[id], "run");
    }), Object.keys(result.endings).some(function (id) { return result.endings[id] === 0; }));
    appendCheckList(result.unvisitedNodes.length === 0
      ? "Every node was reached."
      : "Nodes never reached:", result.unvisitedNodes, result.unvisitedNodes.length > 0);
    appendCheckList(result.missedBranches.length === 0
      ? "Every piece of conditional text, choice, and route was used."
      : "Never used in any run (may be unreachable, or just rare):", result.missedBranches,
    result.missedBranches.length > 0);
  }

  function appendCheckList(heading, items, isProblem) {
    checkLine(checkResults, heading, isProblem);
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

  function renderGraphVisualization() {
    graphVisualization.replaceChildren();
    const nodesById = new Map();
    const associations = [];
    if (engine) {
      engine.graph.events.forEach(function (event) {
        event.concepts.forEach(function (concept) {
          let node = nodesById.get(concept);
          if (!node) {
            node = { id: concept, eventCount: 0 };
            nodesById.set(concept, node);
          }
          node.eventCount += 1;
        });
      });
      // The graph keeps each link both ways; draw it once.
      engine.graph.associations.forEach(function (neighbours, source) {
        neighbours.forEach(function (edge, target) {
          if (source < target) associations.push({ source: source, target: target, score: edge.score, seen: edge.seen });
        });
      });
    }

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
    graphSummary.textContent = plural(nodes.length, "concept") + " · " + plural(associations.length, "association");
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
      "Memory graph with " + plural(nodes.length, "concept") + " and " +
        plural(associations.length, "association") + "."
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
        " · " + plural(edge.seen, "shared memory", "shared memories");
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
      title.textContent = node.label + " · " + plural(node.eventCount, "memory event");
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
}());
