(function () {
  "use strict";

  // The Story map and Who's in each scene tabs of Writer tools: every scene
  // as a box, every choice as an arrow, with the start at the top and the
  // endings along the bottom. It can colour the map by structure, by how
  // often Story check's random runs reached each scene, by the run being
  // played, or by where a memory is set up and where it pays off. The cast
  // tab lists who is in each scene.
  //
  //   StoryMapView.show(host, { story, check, path, runCheck, startAt, showTab }, tab)
  //     host      the element to draw into (Writer tools' map pane)
  //     story     the player's story record ({ definition, lines, todos })
  //     check     a StoryCheck result, or null
  //     path      { nodes: [...visited ids], current } for the run on screen
  //     runCheck  function () -> StoryCheck result
  //     startAt   function (sceneId), to set up Start from a scene there
  //     showTab   function ("map"), when a link here switches tabs
  //     tab       "map" or "cast"
  //
  // The analysis and layout come from StoryMap.js.

  const SVG = "http://www.w3.org/2000/svg";
  const MODES = [
    { id: "structure", label: "Structure" },
    { id: "reach", label: "Reach" },
    { id: "path", label: "Your path" },
    { id: "memory", label: "Memory" }
  ];
  // More arcs than this tangle into a knot, so then only the selected
  // scene's are drawn.
  const MAX_ARCS = 12;
  const ZOOM_STEPS = [0.35, 0.5, 0.65, 0.8, 1, 1.25, 1.5];

  let ui = null;
  let state = null;
  let options = null;

  function show(host, settings, tab) {
    options = settings;
    const story = settings.story;
    const same = state !== null && state.storyId === story.definition.id;
    // Analysing is quick, but skip it when only the run or the check changed.
    const analysis = same && state.definition === story.definition ? state.analysis
      : window.StoryMap.analyse(story.definition, { lines: story.lines, todos: story.todos });
    const layout = same && state.analysis === analysis ? state.layout : window.StoryMap.layout(analysis);
    state = {
      storyId: story.definition.id,
      definition: story.definition,
      analysis: analysis,
      layout: layout,
      check: settings.check || null,
      path: settings.path || null,
      tab: tab === "cast" ? "cast" : "map",
      mode: same ? state.mode : "structure",
      selected: same && state.selected !== null && analysis.scenes[state.selected] ? state.selected : null,
      memoryKey: same ? state.memoryKey : null,
      zoom: same ? state.zoom : null
    };
    if (state.memoryKey !== null && !memoryRecord(state.memoryKey)) state.memoryKey = null;
    build(host);
    render();
  }

  // ---- Building the pane ------------------------------------------------

  function build(host) {
    if (ui !== null && ui.host === host) return;
    host.replaceChildren();

    const toolbar = element("div", "map-toolbar");
    const modes = element("div", "map-modes");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Colour the map by");
    const modeButtons = {};
    MODES.forEach(function (mode) {
      const button = element("button", "map-mode");
      button.type = "button";
      button.textContent = mode.label;
      button.addEventListener("click", function () {
        state.mode = mode.id;
        if (mode.id === "memory" && state.memoryKey === null) state.memoryKey = defaultMemoryKey();
        render();
      });
      modeButtons[mode.id] = button;
      modes.appendChild(button);
    });

    const memoryLabel = element("label", "map-memory-label");
    memoryLabel.textContent = "Memory ";
    const memorySelect = element("select", "map-memory-select");
    memorySelect.addEventListener("change", function () {
      state.memoryKey = memorySelect.value;
      render();
    });
    memoryLabel.appendChild(memorySelect);

    const zoom = element("div", "map-zoom");
    zoom.setAttribute("role", "group");
    zoom.setAttribute("aria-label", "Zoom");
    const zoomOut = zoomButton("−", "Zoom out", function () { stepZoom(-1); });
    const zoomFit = zoomButton("Fit", "Fit the whole map", function () { setZoom(fitZoom(false)); });
    const zoomIn = zoomButton("+", "Zoom in", function () { stepZoom(1); });
    zoom.append(zoomOut, zoomFit, zoomIn);

    toolbar.append(modes, memoryLabel, zoom);

    const stats = element("p", "map-stats");
    const main = element("div", "map-main");
    const viewport = element("div", "map-viewport");
    viewport.tabIndex = -1;
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "map-svg");
    svg.setAttribute("role", "group");
    viewport.appendChild(svg);
    const cast = element("div", "map-cast");
    cast.hidden = true;
    const side = element("aside", "map-side");
    side.setAttribute("aria-live", "polite");
    main.append(viewport, cast, side);
    host.append(toolbar, stats, main);

    // Escape first lets go of the selected scene; the next one reaches
    // Writer tools and closes it.
    host.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.selected !== null) {
        event.preventDefault();
        event.stopPropagation();
        state.selected = null;
        render();
      }
    });
    enablePanning(viewport);

    ui = {
      host: host, toolbar: toolbar, modes: modes, modeButtons: modeButtons, memoryLabel: memoryLabel,
      memorySelect: memorySelect, zoom: zoom, stats: stats, viewport: viewport, svg: svg, cast: cast, side: side
    };
  }

  function zoomButton(text, label, onClick) {
    const button = element("button", "map-zoom-button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.addEventListener("click", onClick);
    return button;
  }

  // Drag the background to move around a large map.
  function enablePanning(viewport) {
    let drag = null;
    viewport.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || (event.target.closest && event.target.closest(".map-node"))) return;
      drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false };
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointermove", function (event) {
      if (drag === null) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      viewport.scrollLeft = drag.left - dx;
      viewport.scrollTop = drag.top - dy;
      if (drag.moved) viewport.classList.add("is-panning");
    });
    const end = function () {
      if (drag !== null && !drag.moved && state.selected !== null) {
        state.selected = null;
        render();
      }
      drag = null;
      viewport.classList.remove("is-panning");
    };
    viewport.addEventListener("pointerup", end);
    viewport.addEventListener("pointercancel", function () {
      drag = null;
      viewport.classList.remove("is-panning");
    });
  }

  function fitZoom(widthOnly) {
    const width = Math.max(200, (ui.viewport.clientWidth || 700) - 8);
    const height = Math.max(200, (ui.viewport.clientHeight || 500) - 8);
    const scale = widthOnly
      ? width / state.layout.width
      : Math.min(width / state.layout.width, height / state.layout.height);
    return Math.max(ZOOM_STEPS[0], Math.min(1, scale));
  }

  function stepZoom(direction) {
    const current = state.zoom;
    const next = direction > 0
      ? ZOOM_STEPS.find(function (step) { return step > current + 0.001; })
      : ZOOM_STEPS.slice().reverse().find(function (step) { return step < current - 0.001; });
    if (next !== undefined) setZoom(next);
  }

  function setZoom(zoom) {
    const viewport = ui.viewport;
    const centreX = (viewport.scrollLeft + viewport.clientWidth / 2) / state.zoom;
    const centreY = (viewport.scrollTop + viewport.clientHeight / 2) / state.zoom;
    state.zoom = zoom;
    applyZoom();
    viewport.scrollLeft = centreX * zoom - viewport.clientWidth / 2;
    viewport.scrollTop = centreY * zoom - viewport.clientHeight / 2;
  }

  function applyZoom() {
    ui.svg.setAttribute("width", String(Math.round(state.layout.width * state.zoom)));
    ui.svg.setAttribute("height", String(Math.round(state.layout.height * state.zoom)));
  }

  // ---- Rendering ------------------------------------------------------------

  function render() {
    const onMap = state.tab === "map";
    MODES.forEach(function (mode) {
      ui.modeButtons[mode.id].setAttribute("aria-pressed", String(state.mode === mode.id));
    });
    ui.modes.hidden = !onMap;
    ui.zoom.hidden = !onMap;
    ui.memoryLabel.hidden = !onMap || state.mode !== "memory";
    ui.viewport.hidden = !onMap;
    ui.cast.hidden = onMap;
    renderStats();
    if (onMap) {
      // The first time the map shows, fit its width to the space it has.
      if (state.zoom === null) state.zoom = fitZoom(true);
      renderMemorySelect();
      renderMap();
    } else {
      renderCast();
    }
    renderSide();
  }

  function renderStats() {
    const stats = state.analysis.stats;
    const parts = [
      count(stats.scenes, "scene"),
      count(stats.endings, "ending"),
      count(stats.choices, "choice") + (stats.conditionalChoices > 0 ? " (" + stats.conditionalChoices + " only sometimes offered)" : ""),
      formatNumber(stats.words) + " words",
      Math.round(stats.conditionalShare * 100) + "% of the text depends on memory or variables"
    ];
    if (stats.shortestRoute !== null) parts.push("shortest route to an ending: " + count(stats.shortestRoute, "choice"));
    ui.stats.textContent = parts.join(" · ");
  }

  function renderMemorySelect() {
    const memory = state.analysis.memory;
    const select = ui.memorySelect;
    select.replaceChildren();
    const group = function (label, table, prefix) {
      const keys = Object.keys(table).filter(function (key) {
        return table[key].checks.length > 0 || table[key].setups.length > 0;
      }).sort();
      if (keys.length === 0) return;
      const optgroup = document.createElement("optgroup");
      optgroup.label = label;
      keys.forEach(function (key) {
        const option = document.createElement("option");
        option.value = prefix + key;
        const record = table[key];
        option.textContent = key.replace(/_/g, " ") + " (" + record.setups.length + " set up, " + record.checks.length + " checked)";
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    };
    group("Traits", memory.traits, "trait:");
    group("Concepts", memory.concepts, "concept:");
    if (state.memoryKey !== null) select.value = state.memoryKey;
  }

  function defaultMemoryKey() {
    const traits = state.analysis.memory.traits;
    const keys = Object.keys(traits).filter(function (key) { return traits[key].checks.length > 0; });
    if (keys.length > 0) return "trait:" + keys.sort()[0];
    const concepts = Object.keys(state.analysis.memory.concepts).sort();
    return concepts.length > 0 ? "concept:" + concepts[0] : null;
  }

  function memoryRecord(key) {
    if (key === null) return null;
    const split = key.indexOf(":");
    const table = key.slice(0, split) === "trait" ? state.analysis.memory.traits : state.analysis.memory.concepts;
    const name = key.slice(split + 1);
    return Object.prototype.hasOwnProperty.call(table, name) ? table[name] : null;
  }

  function memoryName(key) {
    const split = key.indexOf(":");
    return (key.slice(0, split) === "trait" ? "the trait " : "the concept ") + "‘" + key.slice(split + 1).replace(/_/g, " ") + "’";
  }

  // What each scene looks like in the current mode.
  function sceneLook(id) {
    const analysis = state.analysis;
    const scene = analysis.scenes[id];
    const classes = ["map-node"];
    if (scene.ending) classes.push("is-ending");
    if (scene.start) classes.push("is-start");
    if (state.selected === id) classes.push("is-selected");
    let meta = scene.ending
      ? "ending · " + formatNumber(scene.words) + " words"
      : formatNumber(scene.words) + " words · " + count(scene.choices.length, "choice");
    let fill = null;
    const problems = analysis.problems.filter(function (problem) {
      return problem.scene === id && problem.severity !== "note";
    });
    if (state.mode === "structure" && problems.length > 0) classes.push("has-problem");

    if (state.mode === "reach") {
      if (state.check === null) {
        classes.push("is-muted");
      } else {
        const runs = state.check.nodeRuns[id] || 0;
        const share = runs / state.check.runs;
        if (runs === 0) {
          classes.push("is-unreached");
          meta = "never reached";
        } else {
          fill = heat(share);
          meta = percent(share) + " of runs" + (scene.ending ? " ended here" : "");
          if (scene.ending) meta = percent((state.check.endings[id] || 0) / state.check.runs) + " of runs end here";
        }
      }
    } else if (state.mode === "path") {
      const visits = pathVisits(id);
      if (visits.length === 0) {
        classes.push("is-faded");
        meta = "not visited";
      } else {
        classes.push("on-path");
        meta = (visits.length === 1 ? "visit " : "visits ") + visits.join(", ");
      }
      if (state.path && state.path.current === id) {
        classes.push("is-current");
        meta = "you are here · " + meta;
      }
    } else if (state.mode === "memory") {
      const record = memoryRecord(state.memoryKey);
      const setsUp = record !== null && record.setups.indexOf(id) !== -1;
      const checks = record === null ? [] : record.checks.filter(function (item) { return item.scene === id; });
      const roles = [];
      if (setsUp) {
        classes.push("sets-up");
        roles.push("sets up");
      }
      if (checks.length > 0) {
        classes.push("checks");
        roles.push(checks.length === 1 ? "checks it" : "checks it ×" + checks.length);
        if (checks.some(function (item) { return item.check.status === "unseen" || item.check.status === "never"; })) {
          classes.push("has-problem");
        } else if (checks.some(function (item) { return item.check.status === "earlier"; })) {
          classes.push("is-earlier");
          roles.push("earlier runs");
        }
      }
      if (roles.length === 0) classes.push("is-faded");
      meta = roles.length > 0 ? roles.join(" · ") : "—";
    }
    return { classes: classes, meta: meta, fill: fill, problems: problems };
  }

  function pathVisits(id) {
    if (!state.path) return [];
    const visits = [];
    state.path.nodes.forEach(function (node, index) {
      if (node === id) visits.push(index + 1);
    });
    return visits;
  }

  function pathRoutes() {
    const routes = new Set();
    if (!state.path) return routes;
    for (let index = 0; index + 1 < state.path.nodes.length; index += 1) {
      routes.add(state.path.nodes[index] + ">" + state.path.nodes[index + 1]);
    }
    return routes;
  }

  function renderMap() {
    const analysis = state.analysis;
    const layout = state.layout;
    const svg = ui.svg;
    svg.replaceChildren();
    svg.setAttribute("viewBox", "0 0 " + layout.width + " " + layout.height);
    svg.setAttribute("aria-label", "Story map: " + count(analysis.order.length, "scene") + ". Select a scene for details.");
    applyZoom();

    const defs = svgElement("defs");
    ["plain", "loop", "accent", "faint", "arc"].forEach(function (kind) {
      // Sized in map units so thick arrows in the Reach view keep small heads.
      const marker = svgElement("marker", { id: "map-arrow-" + kind, viewBox: "0 0 10 10", refX: "9", refY: "5",
        markerWidth: "9", markerHeight: "9", markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" });
      marker.appendChild(svgElement("path", { d: "M0,0 L10,5 L0,10 z", class: "map-arrowhead is-" + kind }));
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    const edgeById = {};
    analysis.edges.forEach(function (edge) { edgeById[edge.key] = edge; });
    const traffic = state.check ? state.check.routeRuns : null;
    const maxTraffic = traffic === null ? 1 : Math.max.apply(null, [1].concat(Object.keys(traffic).map(function (key) { return traffic[key]; })));
    const walked = pathRoutes();
    const record = state.mode === "memory" ? memoryRecord(state.memoryKey) : null;

    const edgeLayer = svgElement("g", { class: "map-edges" });
    layout.edges.forEach(function (route) {
      const edge = edgeById[route.key];
      const classes = ["map-edge"];
      let marker = route.back ? "loop" : "plain";
      let width = null;
      if (route.back) classes.push("is-back");
      if (edge.conditional) classes.push("is-conditional");
      if (state.mode === "reach" && traffic !== null) {
        const runs = traffic[route.key] || 0;
        if (runs === 0) {
          classes.push("is-unused");
          marker = "faint";
        } else {
          width = 1.2 + 5 * runs / maxTraffic;
        }
      } else if (state.mode === "path") {
        if (walked.has(route.key)) {
          classes.push("on-path");
          marker = "accent";
        } else {
          classes.push("is-faded");
          marker = "faint";
        }
      } else if (state.mode === "memory" && record !== null) {
        classes.push("is-faded");
        marker = "faint";
      } else if (state.mode === "reach") {
        classes.push("is-faded");
        marker = "faint";
      }
      const path = svgElement("path", { d: curve(route.points), class: classes.join(" "), "marker-end": "url(#map-arrow-" + marker + ")" });
      if (width !== null) path.style.strokeWidth = width.toFixed(1) + "px";
      const title = svgElement("title");
      title.textContent = edge.from.replace(/_/g, " ") + " → " + edge.to.replace(/_/g, " ") + "\n" +
        edge.choices.map(function (text) { return "• " + text; }).join("\n") +
        (edge.conditional ? "\n(only sometimes)" : "") +
        (traffic !== null && state.mode === "reach" ? "\n" + percent((traffic[route.key] || 0) / state.check.runs) + " of runs" : "");
      path.appendChild(title);
      edgeLayer.appendChild(path);
    });
    layout.selfLoops.forEach(function (id) {
      const node = layout.nodes[id];
      const x = node.x + node.w / 2;
      const path = svgElement("path", {
        d: "M" + x + "," + (node.y - 10) + " C" + (x + 34) + "," + (node.y - 30) + " " + (x + 34) + "," + (node.y + 30) + " " + x + "," + (node.y + 10),
        class: "map-edge is-back" + (state.mode === "structure" ? "" : " is-faded"),
        "marker-end": "url(#map-arrow-" + (state.mode === "structure" ? "loop" : "faint") + ")"
      });
      const title = svgElement("title");
      title.textContent = id.replace(/_/g, " ") + " loops back to itself";
      path.appendChild(title);
      edgeLayer.appendChild(path);
    });
    svg.appendChild(edgeLayer);

    if (record !== null) svg.appendChild(memoryArcs(record));

    const nodeLayer = svgElement("g", { class: "map-nodes" });
    const maxWords = Math.max.apply(null, [1].concat(analysis.order.map(function (id) { return analysis.scenes[id].words; })));
    analysis.order.forEach(function (id) {
      nodeLayer.appendChild(sceneNode(id, maxWords));
    });
    svg.appendChild(nodeLayer);
  }

  function sceneNode(id, maxWords) {
    const scene = state.analysis.scenes[id];
    const box = state.layout.nodes[id];
    const look = sceneLook(id);
    const group = svgElement("g", {
      class: look.classes.join(" "),
      transform: "translate(" + (box.x - box.w / 2) + "," + (box.y - box.h / 2) + ")",
      tabindex: "0",
      role: "button",
      "aria-pressed": String(state.selected === id),
      "aria-label": sceneLabel(id) + ", " + look.meta
    });
    const rect = svgElement("rect", { width: String(box.w), height: String(box.h), rx: scene.ending ? String(box.h / 2) : "6" });
    if (look.fill !== null) rect.style.fill = look.fill;
    group.appendChild(rect);
    const name = svgElement("text", { x: String(box.w / 2), y: "22", class: "map-node-name" });
    name.textContent = shorten(sceneLabel(id), 24);
    const meta = svgElement("text", { x: String(box.w / 2), y: "38", class: "map-node-meta" });
    meta.textContent = shorten(look.meta, 30);
    group.append(name, meta);
    const barWidth = Math.max(2, (box.w - 24) * scene.words / maxWords);
    group.appendChild(svgElement("rect", {
      class: "map-word-bar", x: "12", y: String(box.h - 9), width: barWidth.toFixed(1), height: "3", rx: "1.5"
    }));

    const badges = [];
    if (scene.start) badges.push({ text: "start", className: "is-start" });
    if (state.mode === "structure" && state.analysis.graph.chokePoints.indexOf(id) !== -1) {
      badges.push({ text: "every route", className: "is-choke" });
    }
    if (scene.todos.length > 0) badges.push({ text: "TODO " + scene.todos.length, className: "is-todo" });
    if (look.problems.length > 0 && state.mode === "structure") badges.push({ text: "!", className: "is-problem" });
    let badgeX = 8;
    badges.forEach(function (badge) {
      const width = 10 + badge.text.length * 5.6;
      const tag = svgElement("g", { class: "map-badge " + badge.className, transform: "translate(" + badgeX + ",-8)" });
      tag.appendChild(svgElement("rect", { width: width.toFixed(1), height: "15", rx: "7.5" }));
      const label = svgElement("text", { x: (width / 2).toFixed(1), y: "11" });
      label.textContent = badge.text;
      tag.appendChild(label);
      group.appendChild(tag);
      badgeX += width + 4;
    });

    const title = svgElement("title");
    title.textContent = sceneLabel(id) + (scene.line !== null ? " (line " + scene.line + ")" : "") + "\n" + look.meta +
      look.problems.map(function (problem) { return "\n! " + problem.message; }).join("");
    group.appendChild(title);
    const choose = function () {
      state.selected = state.selected === id ? null : id;
      render();
    };
    group.addEventListener("click", choose);
    group.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
        const again = ui.svg.querySelector(".map-node.is-selected");
        if (again) again.focus();
      }
    });
    return group;
  }

  // Every (set-up scene, checking scene) pair where the set-up can make the
  // check true later in the same run.
  function memoryPairs(record) {
    const pairs = [];
    record.checks.forEach(function (item) {
      (item.check.setups || []).forEach(function (from) {
        if (from === item.scene) return;
        const key = from + ">" + item.scene;
        if (pairs.indexOf(key) === -1) pairs.push(key);
      });
    });
    return pairs;
  }

  // The pairs worth drawing: all of them when there are only a few, or
  // just the selected scene's.
  function shownPairs(record) {
    const pairs = memoryPairs(record);
    if (state.selected !== null) {
      return pairs.filter(function (key) {
        const ends = key.split(">");
        return ends[0] === state.selected || ends[1] === state.selected;
      });
    }
    return pairs.length <= MAX_ARCS ? pairs : [];
  }

  // Dotted arcs from each scene that sets a memory up to each scene that
  // checks it and can come after it.
  function memoryArcs(record) {
    const layer = svgElement("g", { class: "map-arcs" });
    shownPairs(record).forEach(function (key) {
      const ends = key.split(">");
      const a = state.layout.nodes[ends[0]];
      const b = state.layout.nodes[ends[1]];
      const x1 = a.x + a.w / 2;
      const x2 = b.x + b.w / 2;
      const bow = Math.max(x1, x2) + 28 + Math.min(160, Math.abs(b.y - a.y) * 0.18);
      const path = svgElement("path", {
        d: "M" + x1 + "," + a.y + " C" + bow + "," + a.y + " " + bow + "," + b.y + " " + x2 + "," + b.y,
        class: "map-arc",
        "marker-end": "url(#map-arrow-arc)"
      });
      const title = svgElement("title");
      title.textContent = "Set up in " + ends[0].replace(/_/g, " ") + ", checked in " + ends[1].replace(/_/g, " ");
      path.appendChild(title);
      layer.appendChild(path);
    });
    return layer;
  }

  // A smooth path through the points, leaving and entering each vertically.
  function curve(points) {
    let d = "M" + points[0].x.toFixed(1) + "," + points[0].y.toFixed(1);
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const middle = (a.y + b.y) / 2;
      d += " C" + a.x.toFixed(1) + "," + middle.toFixed(1) + " " + b.x.toFixed(1) + "," + middle.toFixed(1) + " " +
        b.x.toFixed(1) + "," + b.y.toFixed(1);
    }
    return d;
  }

  // ---- Side panel -------------------------------------------------------------

  function renderSide() {
    const side = ui.side;
    side.replaceChildren();
    if (state.selected !== null) {
      renderScene(side, state.selected);
      return;
    }
    if (state.tab === "cast") {
      heading(side, "Who's in each scene");
      paragraph(side, "A shaded cell means the scene's present: line lists them. A dot means they witness something there.");
      paragraph(side, "A ! means they witness something but aren't listed as present. That's fine for someone watching from a distance; otherwise add them to present: so the Here line shows them.");
      paragraph(side, "Select a scene name to see it on the map.");
      return;
    }
    if (state.mode === "structure") renderStructureSide(side);
    else if (state.mode === "reach") renderReachSide(side);
    else if (state.mode === "path") renderPathSide(side);
    else renderMemorySide(side);
  }

  function renderStructureSide(side) {
    const analysis = state.analysis;
    heading(side, "Structure");
    legend(side, [
      ["map-key-box", "Scene. The bar along the bottom shows how many words it has."],
      ["map-key-box is-ending", "Ending"],
      ["map-key-line", "Choice"],
      ["map-key-line is-conditional", "Choice that is only sometimes offered or taken"],
      ["map-key-line is-back", "Choice that loops back"],
      ["map-key-badge is-choke", "Every route to an ending passes through here"]
    ]);
    const problems = analysis.problems;
    heading(side, problems.length === 0 ? "Nothing to look at" : "Things to look at", "h5");
    if (problems.length === 0) {
      paragraph(side, "Every scene can be reached, every scene can lead to an ending, and every memory check can come true in a single run.");
    } else {
      problemList(side, problems);
    }
    const earlier = earlierChecks();
    if (earlier.length > 0) {
      heading(side, "Payoffs from earlier runs", "h5");
      paragraph(side, "Nothing earlier in a single run can make these true, so they only fire when the player begins again and keeps memory:");
      const list = element("ul", "map-list");
      earlier.forEach(function (item) {
        list.appendChild(sceneItem(item.scene, item.check.text));
      });
      side.appendChild(list);
    }
  }

  function earlierChecks() {
    const found = [];
    const seen = new Set();
    state.analysis.order.forEach(function (id) {
      state.analysis.scenes[id].checks.forEach(function (check) {
        const key = id + "\n" + check.text;
        if (check.status === "earlier" && !seen.has(key)) {
          seen.add(key);
          found.push({ scene: id, check: check });
        }
      });
    });
    return found;
  }

  function renderReachSide(side) {
    heading(side, "Reach");
    if (state.check === null) {
      paragraph(side, "Story check plays the story many times with random choices. The map then shows how often each scene and route came up.");
      side.appendChild(runCheckButton("Run story check"));
      return;
    }
    const check = state.check;
    paragraph(side, "Out of " + check.runs + " random runs. Darker scenes and thicker arrows came up more often.");
    legend(side, [
      ["map-key-box is-heat-high", "Reached in most runs"],
      ["map-key-box is-heat-low", "Reached in a few runs"],
      ["map-key-box is-unreached", "Never reached"],
      ["map-key-line is-unused", "Route never taken"]
    ]);
    if (check.lengths && check.lengths.choices) {
      heading(side, "A playthrough", "h5");
      paragraph(side, rangeText(check.lengths.choices, "choice") + ", " + rangeText(check.lengths.words, "word") + " read.");
    }
    heading(side, "Endings", "h5");
    const list = element("ul", "map-list map-bars");
    Object.keys(check.endings).sort(function (a, b) { return check.endings[b] - check.endings[a]; }).forEach(function (id) {
      const share = check.endings[id] / check.runs;
      const item = sceneItem(id, percent(share));
      const bar = element("span", "map-bar");
      bar.style.width = Math.max(1, share * 100).toFixed(1) + "%";
      item.appendChild(bar);
      list.appendChild(item);
    });
    side.appendChild(list);
    if (check.unvisitedNodes.length > 0) {
      heading(side, "Never reached", "h5");
      const missed = element("ul", "map-list");
      check.unvisitedNodes.forEach(function (id) { missed.appendChild(sceneItem(id, "")); });
      side.appendChild(missed);
    }
    side.appendChild(runCheckButton("Run it again"));
  }

  function runCheckButton(label) {
    const button = element("button", "button button-quiet map-run-check");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", function () {
      button.disabled = true;
      button.textContent = "Checking…";
      setTimeout(function () {
        try {
          state.check = options.runCheck();
        } catch (error) {
          state.check = null;
        }
        render();
      }, 20);
    });
    return button;
  }

  function renderPathSide(side) {
    heading(side, "Your path");
    if (!state.path || state.path.nodes.length === 0) {
      paragraph(side, "Start playing and the scenes you pass through light up here.");
      return;
    }
    const visited = state.path.nodes.filter(function (id, index, all) { return all.indexOf(id) === index; });
    paragraph(side, "This run has visited " + visited.length + " of " + count(state.analysis.order.length, "scene") +
      " in " + count(state.path.nodes.length - 1, "choice") + ".");
    const list = element("ol", "map-list");
    state.path.nodes.forEach(function (id, index) {
      list.appendChild(sceneItem(id, index === state.path.nodes.length - 1 && state.path.current === id ? "you are here" : ""));
    });
    side.appendChild(list);
  }

  function renderMemorySide(side) {
    const record = memoryRecord(state.memoryKey);
    heading(side, "Memory");
    if (record === null) {
      paragraph(side, "This story doesn't remember anything yet.");
      return;
    }
    paragraph(side, "Where " + memoryName(state.memoryKey) + " is set up, and where the story checks it. Dotted arcs join a set-up to the checks it can make true later in the same run." +
      (memoryPairs(record).length > MAX_ARCS ? " There are too many to draw at once, so select a scene to see its arcs." : ""));
    legend(side, [
      ["map-key-box sets-up", "Sets it up (remembers it)"],
      ["map-key-box checks", "Checks it"],
      ["map-key-arc", "Can make that check true"]
    ]);
    heading(side, "Set up in", "h5");
    if (record.setups.length === 0) {
      paragraph(side, "Nowhere: nothing in the story remembers it.", true);
    } else {
      const list = element("ul", "map-list");
      record.setups.forEach(function (id) { list.appendChild(sceneItem(id, "")); });
      side.appendChild(list);
    }
    heading(side, "Checked in", "h5");
    if (record.checks.length === 0) {
      paragraph(side, "Nowhere yet. Remembering it still shapes how people see you if it belongs to a trait.");
    } else {
      const list = element("ul", "map-list");
      const shown = new Set();
      record.checks.forEach(function (item) {
        const text = item.check.text + (item.check.negated ? " (when it hasn't happened)" : "") +
          " · " + whereLabel(item.check.where);
        if (shown.has(item.scene + "\n" + text)) return;
        shown.add(item.scene + "\n" + text);
        const li = sceneItem(item.scene, text);
        const note = statusNote(item.check);
        if (note !== null) {
          const span = element("span", "map-status is-" + item.check.status);
          span.textContent = note;
          li.appendChild(span);
        }
        list.appendChild(li);
      });
      side.appendChild(list);
    }
  }

  // Where in its scene a check sits: the text, whether a choice is offered,
  // or where a choice leads.
  function whereLabel(where) {
    if (/ route$/.test(where)) return "where a choice leads";
    if (/^choice /.test(where)) return "offers a choice";
    return "in the text";
  }

  function statusNote(check) {
    switch (check.status) {
      case "never": return "nothing remembers this, so it is never true";
      case "earlier": return "only from an earlier run";
      case "unseen": return characterName(check.perspective) + " never sees or hears of it first";
      default: return null;
    }
  }

  function renderScene(side, id) {
    const analysis = state.analysis;
    const scene = analysis.scenes[id];
    const header = element("div", "map-scene-header");
    const title = element("h4", "map-side-heading");
    title.textContent = sceneLabel(id);
    const back = element("button", "map-link");
    back.type = "button";
    back.textContent = "Back to overview";
    back.addEventListener("click", function () {
      state.selected = null;
      render();
    });
    header.append(title, back);
    side.appendChild(header);

    const facts = [];
    if (scene.start) facts.push("the start");
    if (scene.ending) facts.push("an ending");
    if (scene.line !== null) facts.push("line " + scene.line);
    facts.push(formatNumber(scene.words) + " words");
    if (state.check !== null) facts.push(percent((state.check.nodeRuns[id] || 0) / state.check.runs) + " of runs");
    const visits = pathVisits(id);
    if (visits.length > 0) facts.push("visited this run");
    paragraph(side, facts.join(" · "));

    analysis.problems.filter(function (problem) { return problem.scene === id; }).forEach(function (problem) {
      paragraph(side, problem.message, problem.severity !== "note");
    });
    if (analysis.graph.chokePoints.indexOf(id) !== -1) {
      paragraph(side, "Every route to an ending passes through here.");
    }
    if (scene.todos.length > 0) {
      heading(side, "TODO", "h5");
      const list = element("ul", "map-list");
      scene.todos.forEach(function (todo) {
        const li = element("li");
        li.textContent = "line " + todo.line + ": " + (todo.text || "(no note)");
        list.appendChild(li);
      });
      side.appendChild(list);
    }
    if (scene.present !== null) {
      heading(side, "Here", "h5");
      paragraph(side, scene.present.map(characterName).join(", ") || "no one");
    }
    const into = analysis.graph.into[id].filter(function (from) { return from !== id; });
    if (into.length > 0) {
      heading(side, "Arrived at from", "h5");
      const list = element("ul", "map-list");
      into.forEach(function (from) { list.appendChild(sceneItem(from, "")); });
      side.appendChild(list);
    }
    if (scene.choices.length > 0) {
      heading(side, "Choices", "h5");
      const list = element("ul", "map-list map-choices");
      scene.choices.forEach(function (choice) {
        const li = element("li");
        const text = element("span", "map-choice-text");
        text.textContent = choice.text + (choice.once ? " (once)" : "");
        li.appendChild(text);
        if (choice.showIf !== null) li.appendChild(condition("offered if " + (choice.tag || choice.showIf)));
        choice.routes.forEach(function (route) {
          const line = element("span", "map-route");
          line.appendChild(document.createTextNode("→ "));
          line.appendChild(sceneButton(route.node));
          if (route.condition !== null) line.appendChild(document.createTextNode(" if " + route.condition));
          li.appendChild(line);
        });
        list.appendChild(li);
      });
      side.appendChild(list);
    }
    if (scene.conditions.length > 0) {
      heading(side, "Text that adapts", "h5");
      const list = element("ul", "map-list");
      scene.conditions.forEach(function (item) {
        const li = element("li");
        li.textContent = item.text;
        list.appendChild(li);
      });
      side.appendChild(list);
    }
    if (scene.remembers.length > 0) {
      heading(side, "Remembers", "h5");
      const list = element("ul", "map-list");
      scene.remembers.forEach(function (memory) {
        const li = element("li");
        li.textContent = (memory.summary || memory.concepts.join(", ")) +
          (memory.witnesses === "all" ? " · seen by everyone"
            : memory.witnesses.length > 0 ? " · seen by " + memory.witnesses.map(characterName).join(", ") : " · unseen") +
          (memory.choice !== null ? " (if you " + lowerFirst(shorten(memory.choice, 40)) + ")" : "");
        list.appendChild(li);
      });
      side.appendChild(list);
    }
    const checks = scene.checks.filter(function (check) { return statusNote(check) !== null; });
    if (checks.length > 0) {
      heading(side, "Memory checks to look at", "h5");
      const list = element("ul", "map-list");
      checks.forEach(function (check) {
        const li = element("li");
        li.textContent = check.text;
        const span = element("span", "map-status is-" + check.status);
        span.textContent = statusNote(check);
        li.appendChild(span);
        list.appendChild(li);
      });
      side.appendChild(list);
    }
    if (typeof options.startAt === "function") {
      const button = element("button", "button button-quiet map-start");
      button.type = "button";
      button.textContent = "Start from this scene…";
      button.addEventListener("click", function () {
        options.startAt(id);
      });
      side.appendChild(button);
    }
  }

  function condition(text) {
    const span = element("span", "map-condition");
    span.textContent = text;
    return span;
  }

  // ---- Who's in each scene ----------------------------------------------------

  function renderCast() {
    const analysis = state.analysis;
    const cast = ui.cast;
    cast.replaceChildren();
    const characters = analysis.characters;
    if (characters.length === 0) {
      paragraph(cast, "This story has no characters.");
      return;
    }
    const rows = analysis.order.slice().sort(function (a, b) {
      const na = state.layout.nodes[a];
      const nb = state.layout.nodes[b];
      return na.rank - nb.rank || na.x - nb.x;
    });
    const table = element("table", "map-cast-table");
    const head = element("thead");
    const headRow = element("tr");
    headRow.appendChild(element("th"));
    characters.forEach(function (character) {
      const th = element("th", "map-cast-name");
      th.scope = "col";
      const label = element("span");
      label.textContent = character.name + (character.hidden ? " (hidden)" : "");
      th.appendChild(label);
      headRow.appendChild(th);
    });
    head.appendChild(headRow);
    table.appendChild(head);
    const body = element("tbody");
    const totals = {};
    rows.forEach(function (id) {
      const scene = analysis.scenes[id];
      const tr = element("tr");
      const th = element("th");
      th.scope = "row";
      th.appendChild(sceneButton(id));
      tr.appendChild(th);
      const witnesses = new Set();
      scene.remembers.forEach(function (memory) {
        if (memory.witnesses === "all") characters.forEach(function (character) { witnesses.add(character.id); });
        else memory.witnesses.forEach(function (who) { witnesses.add(who.trim()); });
      });
      characters.forEach(function (character) {
        const present = scene.present !== null && scene.present.indexOf(character.id) !== -1;
        const sees = witnesses.has(character.id);
        const td = element("td", "map-cast-cell" + (present ? " is-present" : "") +
          (sees && !present && scene.present !== null ? " is-missing" : ""));
        td.textContent = sees ? (present || scene.present === null ? "●" : "!") : "";
        td.title = character.name + " in " + sceneLabel(id) + ": " +
          (present ? "here" : "not listed as here") + (sees ? ", witnesses something" : "");
        if (present || sees) totals[character.id] = (totals[character.id] || 0) + 1;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    const foot = element("tfoot");
    const footRow = element("tr");
    const footLabel = element("th");
    footLabel.scope = "row";
    footLabel.textContent = "Scenes";
    footRow.appendChild(footLabel);
    characters.forEach(function (character) {
      const td = element("td", "map-cast-cell");
      td.textContent = String(totals[character.id] || 0);
      footRow.appendChild(td);
    });
    foot.appendChild(footRow);
    table.appendChild(foot);
    cast.appendChild(table);
  }

  // ---- Small pieces -----------------------------------------------------------

  function problemList(side, problems) {
    const list = element("ul", "map-list");
    problems.forEach(function (problem) {
      const li = problem.scene === null ? element("li") : sceneItem(problem.scene, "");
      const text = element("span", "map-status is-" + problem.severity);
      text.textContent = problem.message;
      li.appendChild(text);
      list.appendChild(li);
    });
    side.appendChild(list);
  }

  function sceneItem(id, note) {
    const li = element("li");
    li.appendChild(sceneButton(id));
    if (note) {
      const span = element("span", "map-item-note");
      span.textContent = " " + note;
      li.appendChild(span);
    }
    return li;
  }

  function sceneButton(id) {
    const button = element("button", "map-link");
    button.type = "button";
    button.textContent = sceneLabel(id);
    button.addEventListener("click", function () { focusScene(id); });
    return button;
  }

  // Selects a scene and scrolls the map to it.
  function focusScene(id) {
    if (!state.analysis.scenes[id]) return;
    if (state.tab !== "map" && typeof options.showTab === "function") options.showTab("map");
    state.tab = "map";
    state.selected = id;
    render();
    const box = state.layout.nodes[id];
    const viewport = ui.viewport;
    viewport.scrollLeft = box.x * state.zoom - viewport.clientWidth / 2;
    viewport.scrollTop = box.y * state.zoom - viewport.clientHeight / 2;
    const node = ui.svg.querySelector(".map-node.is-selected");
    if (node && typeof node.focus === "function") node.focus({ preventScroll: true });
  }

  function legend(parent, items) {
    const list = element("ul", "map-legend");
    items.forEach(function (item) {
      const li = element("li");
      li.appendChild(element("span", item[0]));
      li.appendChild(document.createTextNode(item[1]));
      list.appendChild(li);
    });
    parent.appendChild(list);
  }

  function heading(parent, text, level) {
    const node = element(level || "h4", "map-side-heading");
    node.textContent = text;
    parent.appendChild(node);
  }

  function paragraph(parent, text, isProblem) {
    const node = element("p", "map-side-text" + (isProblem ? " is-problem" : ""));
    node.textContent = text;
    parent.appendChild(node);
  }

  function heat(share) {
    // From pale sand to a deep teal, so the colour never competes with the
    // red used for problems.
    const from = [246, 241, 233];
    const to = [138, 188, 177];
    const t = Math.sqrt(Math.max(0, Math.min(1, share)));
    return "rgb(" + from.map(function (value, index) {
      return Math.round(value + (to[index] - value) * t);
    }).join(",") + ")";
  }

  function rangeText(range, unit) {
    if (!range) return "";
    if (range.min === range.max) return count(range.min, unit);
    return formatNumber(range.min) + "–" + formatNumber(range.max) + " " + unit + "s (usually about " + formatNumber(range.median) + ")";
  }

  function sceneLabel(id) {
    return id.replace(/_/g, " ");
  }

  function characterName(id) {
    if (id === null || id === undefined) return "the world";
    const characters = state.analysis.characters;
    const found = characters.find(function (character) { return character.id === String(id).trim(); });
    return found ? found.name : String(id);
  }

  function shorten(text, length) {
    return text.length <= length ? text : text.slice(0, length - 1) + "…";
  }

  function lowerFirst(text) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  function percent(share) {
    if (share > 0 && share < 0.01) return "<1%";
    return Math.round(share * 100) + "%";
  }

  function count(value, unit) {
    return formatNumber(value) + " " + unit + (value === 1 ? "" : "s");
  }

  function formatNumber(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function element(name, className) {
    const node = document.createElement(name);
    if (className) node.className = className;
    return node;
  }

  function svgElement(name, attributes) {
    const node = document.createElementNS(SVG, name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  window.StoryMapView = Object.freeze({ show: show });
})();
