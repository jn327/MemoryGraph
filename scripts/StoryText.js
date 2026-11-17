(function (root) {
  "use strict";

  // Reads a story written in the Memory Graph text format (see
  // docs/writing-stories.md) and builds the story object NarrativeEngine
  // plays. It depends on nothing else: it checks names and syntax, and
  // leaves the story's rules to the engine.

  const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const RESERVED_CHARACTERS = ["all", "everyone", "world", "you", "player"];
  const HEADER_KEYS = ["title", "id", "synopsis", "start", "half-life"];
  const SECTIONS = ["characters", "traits", "macros"];
  const COMPARISONS = { "==": "eq", "!=": "neq", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" };
  const CHOICE_ID_WORDS = 5;

  class StoryTextError extends Error {
    constructor(message, line) {
      super(line === undefined ? message : "line " + line + ": " + message);
      this.name = "StoryTextError";
      this.line = line;
      this.reason = message;
    }
  }

  // Returns { story, lines, todos }. `lines` maps engine locations such as
  // "node 'deck' choice 'run'" to source line numbers (see lineFor), and
  // `todos` lists the file's "// TODO" notes. Throws StoryTextError.
  function parse(source, options) {
    if (typeof source !== "string") {
      throw new TypeError("Story text must be a string.");
    }
    const settings = options === undefined ? {} : options;
    return new Parser(source, settings.fileName).parse();
  }

  // The source line for an engine location or message: the line of the
  // longest known location it mentions, or null.
  function lineFor(lines, text) {
    let best = null;
    let bestLength = -1;
    for (const [location, line] of Object.entries(lines || {})) {
      if (location.length > bestLength && String(text).indexOf(location) !== -1) {
        best = line;
        bestLength = location.length;
      }
    }
    return best;
  }

  // The closest of `names` to `word`, if it is close enough to be a typo.
  function suggest(word, names) {
    let best = null;
    let bestDistance = Infinity;
    for (const name of names) {
      const distance = editDistance(word.toLowerCase(), name.toLowerCase());
      if (distance < bestDistance) {
        best = name;
        bestDistance = distance;
      }
    }
    const allowed = Math.max(1, Math.floor(word.length / 3));
    return best !== null && bestDistance <= allowed ? best : null;
  }

  // Edits to turn a into b: insertions, deletions, substitutions, and swaps
  // of neighbouring letters ("lopo" is one edit from "loop").
  function editDistance(a, b) {
    let before = null;
    let previous = Array.from({ length: b.length + 1 }, function (unused, index) { return index; });
    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      for (let j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(previous[j] + 1, current[j - 1] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (before !== null && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          current[j] = Math.min(current[j], before[j - 2] + 1);
        }
      }
      before = previous;
      previous = current;
    }
    return previous[b.length];
  }

  class Parser {
    constructor(source, fileName) {
      this.fileName = fileName;
      this.todos = [];
      this.lines = {};
      this.lineList = [];
      source.replace(/^﻿/, "").split(/\r\n|\r|\n/).forEach((text, index) => {
        const number = index + 1;
        const trimmed = text.trim();
        if (trimmed.indexOf("//") === 0) {
          const todo = /^\/\/\s*TODO\b:?\s*(.*)$/i.exec(trimmed);
          if (todo) {
            this.todos.push({ line: number, text: todo[1] });
          }
          return;
        }
        this.lineList.push({ number: number, text: text.replace(/\s+$/, ""), indent: indentOf(text) });
      });
    }

    parse() {
      const blocks = this.splitBlocks();
      this.characterIds = new Set();
      this.traitIds = new Set();
      this.macroIds = new Set();
      this.sceneIds = new Set();
      this.variableNames = new Set();
      for (const block of blocks.sections) {
        for (const item of groupItems(block.lines)) {
          const match = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(item.head.text.trim());
          const name = match ? match[1] : null;
          if (name === null) {
            continue;
          }
          const ids = block.kind === "characters" ? this.characterIds
            : block.kind === "traits" ? this.traitIds : this.macroIds;
          if (ids.has(name)) {
            this.fail("'" + name + "' is defined twice in == " + block.kind + ".", item.head.number);
          }
          ids.add(name);
        }
      }
      for (const scene of blocks.scenes) {
        if (this.sceneIds.has(scene.id)) {
          this.fail("there are two scenes called '" + scene.id + "'.", scene.line);
        }
        this.sceneIds.add(scene.id);
      }

      const story = this.parseHeader(blocks.header);
      story.characters = {};
      story.traits = {};
      story.macros = {};
      story.nodes = {};
      for (const block of blocks.sections) {
        if (block.kind === "characters") {
          this.parseCharacters(block.lines, story.characters);
        } else if (block.kind === "traits") {
          this.parseTraits(block.lines, story.traits);
        }
      }
      for (const block of blocks.sections) {
        if (block.kind === "macros") {
          this.parseMacros(block.lines, story.macros);
        }
      }
      if (blocks.scenes.length === 0) {
        this.fail("the story has no scenes. Start one with a line like '=== harbour'.", undefined);
      }
      for (const scene of blocks.scenes) {
        story.nodes[scene.id] = this.parseScene(scene);
      }
      if (story.start === undefined) {
        story.start = blocks.scenes[0].id;
      } else {
        this.checkName(story.start, this.sceneIds, "scene", this.startLine);
      }
      return { story: story, lines: this.lines, todos: this.todos };
    }

    fail(message, line) {
      throw new StoryTextError(message, line);
    }

    // Header lines, the == sections, and the === scenes, in file order.
    splitBlocks() {
      const header = [];
      const sections = [];
      const scenes = [];
      let current = header;
      for (const line of this.lineList) {
        const heading = line.indent === 0 ? /^(={2,})\s*(.*?)\s*=*\s*$/.exec(line.text) : null;
        if (heading === null) {
          current.push(line);
          continue;
        }
        if (heading[1].length === 2) {
          const kind = heading[2].toLowerCase();
          if (SECTIONS.indexOf(kind) === -1) {
            const close = suggest(kind, SECTIONS);
            this.fail("unknown section '== " + heading[2] + "'. Sections are == characters, == traits and == macros" +
              (close ? " (did you mean == " + close + "?)" : "") + ". Scenes start with ===.", line.number);
          }
          current = [];
          sections.push({ kind: kind, lines: current });
          continue;
        }
        const scene = /^([A-Za-z_][A-Za-z0-9_]*)\s*(\(\s*ending\s*\))?$/i.exec(heading[2]);
        if (scene === null) {
          this.fail("a scene heading should be '=== scene_name', or '=== scene_name (ending)'. Scene names use letters, digits and underscores.", line.number);
        }
        current = [];
        scenes.push({ id: scene[1], ending: scene[2] !== undefined, line: line.number, lines: current });
      }
      return { header: header, sections: sections, scenes: scenes };
    }

    parseHeader(lines) {
      const story = {};
      for (const item of groupItems(lines)) {
        const match = /^([A-Za-z][A-Za-z -]*?)\s*:\s*(.*)$/.exec(item.head.text.trim());
        if (match === null) {
          this.fail("before the first section, each line should be 'title: …', 'synopsis: …', 'start: …', 'id: …' or 'half-life: …'.", item.head.number);
        }
        const key = match[1].toLowerCase().replace(/\s+/g, "-");
        const value = [match[2]].concat(item.rest.map(function (line) { return line.text.trim(); }))
          .filter(function (part) { return part.length > 0; }).join(" ");
        if (HEADER_KEYS.indexOf(key) === -1) {
          const close = suggest(key, HEADER_KEYS);
          this.fail("unknown setting '" + match[1] + "'" + (close ? " (did you mean '" + close + "'?)" : "") + ".", item.head.number);
        }
        if (value.length === 0) {
          this.fail("'" + key + "' needs a value.", item.head.number);
        }
        if (key === "half-life") {
          const number = Number(value);
          if (!Number.isFinite(number) || number <= 0) {
            this.fail("half-life should be a positive number of events.", item.head.number);
          }
          story.memory = { halfLife: number };
        } else if (key === "id" || key === "start") {
          if (!IDENT.test(value)) {
            this.fail(key + " should be a single name made of letters, digits and underscores.", item.head.number);
          }
          story[key] = value;
          if (key === "start") {
            this.startLine = item.head.number;
          }
        } else {
          story[key] = unescapeText(value);
        }
      }
      if (story.title === undefined) {
        this.fail("the story needs a title. Add a line like 'title: The Night Ferry' at the top.", 1);
      }
      if (story.id === undefined) {
        const base = typeof this.fileName === "string"
          ? this.fileName.replace(/^.*[\\/]/, "").replace(/(\.story)?\.txt$/i, "").replace(/\.[^.]*$/, "")
          : "";
        const id = base.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
        if (id.length === 0) {
          this.fail("the story needs an id. Add a line like 'id: the_night_ferry' at the top.", 1);
        }
        story.id = /^[0-9]/.test(id) ? "story_" + id : id;
      }
      const ordered = { id: story.id, title: story.title };
      for (const key of ["synopsis", "start", "memory"]) {
        if (story[key] !== undefined) {
          ordered[key] = story[key];
        }
      }
      return ordered;
    }

    parseCharacters(lines, characters) {
      for (const item of groupItems(lines)) {
        const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*?)\s*(\(\s*hidden\s*\))?$/i.exec(item.head.text.trim());
        if (match === null) {
          this.fail("a character should be written 'id: Name', for example 'hale: Captain Hale'.", item.head.number);
        }
        const id = match[1];
        if (RESERVED_CHARACTERS.indexOf(id) !== -1) {
          this.fail("'" + id + "' is a reserved word and can't be a character id.", item.head.number);
        }
        const character = {};
        if (match[2].length > 0) {
          character.name = unescapeText(match[2]);
        }
        if (match[3] !== undefined) {
          character.hidden = true;
        }
        const description = item.rest.map(function (line) { return line.text.trim(); })
          .filter(function (text) { return text.length > 0; }).join(" ");
        if (description.length > 0) {
          character.description = unescapeText(description);
        }
        characters[id] = character;
        this.lines["character '" + id + "'"] = item.head.number;
      }
    }

    parseTraits(lines, traits) {
      for (const item of groupItems(lines)) {
        const text = [item.head.text.trim()].concat(item.rest.map(function (line) { return line.text.trim(); })).join(" ");
        const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^()]*)\))?\s*(#[0-9a-fA-F]{6})?\s*:\s*(.*)$/.exec(text);
        if (match === null) {
          this.fail("a trait should be written 'name (label): concept +1, concept -1', for example 'deceptive (a liar): lie, cheat'.", item.head.number);
        }
        const trait = {};
        if (match[2] !== undefined) {
          if (match[2].trim().length === 0) {
            this.fail("trait '" + match[1] + "' has an empty label.", item.head.number);
          }
          trait.label = match[2].trim();
        }
        if (match[3] !== undefined) {
          trait.color = match[3];
        }
        trait.concepts = {};
        const entries = match[4].split(",").map(function (entry) { return entry.trim(); });
        for (const entry of entries) {
          const weight = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+([+-]?\s*\d+(?:\.\d+)?))?$/.exec(entry);
          if (weight === null) {
            this.fail("in trait '" + match[1] + "', '" + entry + "' should be a concept with an optional weight, like 'lie' or 'admit +1.5'.", item.head.number);
          }
          const value = weight[2] === undefined ? 1 : Number(weight[2].replace(/\s+/g, ""));
          if (value === 0) {
            this.fail("in trait '" + match[1] + "', the weight for '" + weight[1] + "' can't be 0.", item.head.number);
          }
          trait.concepts[weight[1]] = value;
        }
        traits[match[1]] = trait;
        this.lines["trait '" + match[1] + "'"] = item.head.number;
      }
    }

    parseMacros(lines, macros) {
      for (const item of groupItems(lines)) {
        const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(item.head.text.trim());
        if (match === null) {
          this.fail("a macro should be written 'name: condition', for example 'haleTrustsYou: hale sees you as honest >= 1'.", item.head.number);
        }
        const name = match[1];
        const macro = {};
        let conditionText = match[2];
        const operationLines = [];
        for (const line of item.rest) {
          if (line.text.trim().indexOf("~") === 0 || operationLines.length > 0) {
            operationLines.push(line);
          } else {
            conditionText += " " + line.text.trim();
          }
        }
        if (conditionText.trim().length > 0) {
          const split = splitTag(conditionText);
          macro.condition = this.parseCondition(split.text, item.head.number);
          if (split.tag !== undefined) {
            macro.tag = this.tagText(split.tag, item.head.number);
          }
        }
        if (operationLines.length > 0) {
          macro.do = this.parseOperations(groupItems(operationLines), null);
        }
        if (macro.condition === undefined && macro.do === undefined) {
          this.fail("macro '" + name + "' needs a condition after the colon, or ~ actions on the lines below.", item.head.number);
        }
        macros[name] = macro;
        this.lines["macro '" + name + "'"] = item.head.number;
      }
    }

    parseScene(scene) {
      const node = {};
      const prefix = "node '" + scene.id + "'";
      this.lines[prefix] = scene.line;
      this.scene = { id: scene.id, present: undefined, remembers: [] };
      const textLines = [];
      const onEnter = [];
      const choices = [];
      let index = 0;
      const lines = scene.lines;
      while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.text.trim();
        if (line.indent === 0 && trimmed.indexOf("*") === 0) {
          const end = nextAtIndent(lines, index + 1);
          choices.push({ head: line, rest: lines.slice(index + 1, end) });
          index = end;
          continue;
        }
        if (choices.length > 0 && trimmed.length > 0) {
          this.fail("this line comes after the scene's choices. Put all of a scene's text and ~ actions before its first choice" +
            (line.indent === 0 ? "" : ", and indent a choice's actions under it") + ".", line.number);
        }
        if (line.indent === 0 && /^present\s*:/i.test(trimmed)) {
          if (this.scene.present !== undefined) {
            this.fail("this scene already has a present: line.", line.number);
          }
          this.scene.present = this.characterList(trimmed.replace(/^present\s*:/i, ""), line.number, false);
          node.present = this.scene.present;
          index += 1;
        } else if (line.indent === 0 && trimmed.indexOf("~") === 0) {
          const end = nextAtIndent(lines, index + 1);
          onEnter.push({ head: line, rest: lines.slice(index + 1, end) });
          index = end;
        } else if (line.indent === 0 && trimmed.indexOf("->") === 0) {
          this.fail("'->' only works inside a choice. Indent it under the choice it belongs to.", line.number);
        } else {
          textLines.push(line);
          index += 1;
        }
      }

      const ordered = {};
      if (scene.ending) {
        ordered.ending = true;
      }
      const text = this.parseSceneText(textLines, scene, prefix);
      ordered.text = text;
      if (node.present !== undefined) {
        ordered.present = node.present;
      }
      if (onEnter.length > 0) {
        ordered.onEnter = this.parseOperations(onEnter, prefix + " onEnter");
      }
      if (scene.ending && choices.length > 0) {
        this.fail("scene '" + scene.id + "' is an ending, so it can't have choices. Remove (ending) from its heading or remove the choices.", choices[0].head.number);
      }
      if (!scene.ending) {
        if (choices.length === 0) {
          this.fail("scene '" + scene.id + "' has no choices. Add some lines starting with *, or mark it '=== " + scene.id + " (ending)'.", scene.line);
        }
        const ids = new Set();
        ordered.choices = choices.map((choice) => this.parseChoice(choice, prefix, ids));
      }
      this.resolveWitnesses();
      this.scene = null;
      return ordered;
    }

    parseSceneText(lines, scene, prefix) {
      const content = lines.filter(function (line) { return line.text.trim().length > 0; });
      if (content.length === 0) {
        this.fail("scene '" + scene.id + "' has no text.", scene.line);
      }
      const opener = content.findIndex(function (line) { return line.text.trim() === "{"; });
      if (opener === -1) {
        const built = this.buildPassage(lines, prefix + " text variant 0");
        return built;
      }
      if (opener !== 0) {
        this.fail("a { … } block of alternatives must be the scene's whole text. To vary part of a passage, use {condition: text} inside it.", content[opener].number);
      }
      const start = lines.indexOf(content[0]);
      const close = lines.findIndex(function (line, at) { return at > start && line.text.trim() === "}"; });
      if (close === -1) {
        this.fail("this { block of alternatives is never closed. End it with a line containing just }.", content[0].number);
      }
      if (lines.slice(close + 1).some(function (line) { return line.text.trim().length > 0; })) {
        this.fail("a { … } block of alternatives must be the scene's whole text, but there is more text after its closing }.", content[content.length - 1].number);
      }
      const variants = [];
      let current = null;
      for (const line of lines.slice(start + 1, close)) {
        const trimmed = line.text.trim();
        const branch = /^-\s+(.*?):\s*(#.*)?$/.exec(trimmed);
        if (branch !== null) {
          current = { line: line.number, condition: branch[1], tag: branch[2], lines: [] };
          variants.push(current);
          continue;
        }
        if (trimmed === "{") {
          this.fail("blocks of alternatives can't be nested. Use {condition: text} inside the passage instead.", line.number);
        }
        if (current === null) {
          if (trimmed.length === 0) {
            continue;
          }
          this.fail("inside a { block, each alternative starts with a line like '- condition:' or '- else:'.", line.number);
        }
        current.lines.push(line);
      }
      if (variants.length === 0) {
        this.fail("this { block has no alternatives. Start each one with '- condition:', and the last with '- else:'.", content[0].number);
      }
      const last = variants[variants.length - 1];
      if (last.condition.trim().toLowerCase() !== "else") {
        this.fail("the last alternative in a { block must be '- else:', so there is always something to show.", last.line);
      }
      return variants.map((variant, index) => {
        const where = prefix + " text variant " + index;
        this.lines[where] = variant.line;
        const entry = {};
        const isElse = variant.condition.trim().toLowerCase() === "else";
        if (isElse && index !== variants.length - 1) {
          this.fail("'- else:' must be the last alternative in its block.", variant.line);
        }
        if (!isElse) {
          entry.if = this.parseCondition(variant.condition, variant.line);
        }
        if (variant.tag !== undefined) {
          if (isElse) {
            this.fail("'- else:' can't have a tag, because nothing in memory caused it.", variant.line);
          }
          entry.tag = this.tagText(variant.tag.slice(1), variant.line);
        }
        if (!variant.lines.some(function (line) { return line.text.trim().length > 0; })) {
          this.fail("this alternative has no text. Write it on the lines below '- …:'.", variant.line);
        }
        const value = this.buildPassage(variant.lines, where);
        entry.value = typeof value === "string" ? value : value[0].value;
        return entry;
      });
    }

    // A passage: paragraphs separated by blank lines, lines within a
    // paragraph joined with spaces, with {…} parts inside. Returns a string
    // when nothing in it is conditional, else a one-variant text array.
    buildPassage(lines, where) {
      const paragraphs = [];
      let current = null;
      for (const line of lines) {
        const trimmed = line.text.trim();
        if (trimmed.length === 0) {
          current = null;
          continue;
        }
        if (trimmed === "}" || trimmed === "{") {
          this.fail("'" + trimmed + "' on its own line belongs to a { block of alternatives, which must be the scene's whole text.", line.number);
        }
        if (current === null) {
          current = { text: "", offsets: [] };
          paragraphs.push(current);
        }
        if (current.text.length > 0) {
          current.text += " ";
        }
        current.offsets.push({ at: current.text.length, line: line.number });
        current.text += trimmed;
      }
      const parts = [];
      paragraphs.forEach((paragraph, index) => {
        if (index > 0) {
          parts.push("\n\n");
        }
        for (const piece of this.scanPassage(paragraph, where, parts)) {
          parts.push(piece);
        }
      });
      if (parts.every(function (part) { return typeof part === "string"; })) {
        return parts.join("");
      }
      return [{ value: parts }];
    }

    // Splits one paragraph into literal strings and {…} part objects.
    scanPassage(paragraph, where, existing) {
      const text = paragraph.text;
      const lineAt = function (position) {
        let line = paragraph.offsets[0].line;
        for (const offset of paragraph.offsets) {
          if (offset.at <= position) {
            line = offset.line;
          }
        }
        return line;
      };
      const pieces = [];
      let literal = "";
      const flush = function () {
        const trimmed = literal.trim();
        if (trimmed.length > 0) {
          pieces.push(trimmed);
        }
        literal = "";
      };
      let index = 0;
      while (index < text.length) {
        const char = text[index];
        if (char === "\\" && index + 1 < text.length) {
          literal += text[index + 1];
          index += 2;
          continue;
        }
        if (char === "}") {
          this.fail("there is a } without a matching {. Write \\} for a literal brace.", lineAt(index));
        }
        if (char !== "{") {
          literal += char;
          index += 1;
          continue;
        }
        const end = matchingBrace(text, index);
        if (end === -1) {
          this.fail("this { is never closed with }.", lineAt(index));
        }
        const body = text.slice(index + 1, end);
        const line = lineAt(index);
        if (IDENT.test(body.trim())) {
          literal += this.placeholder(body.trim(), line);
        } else {
          flush();
          const partIndex = existing.length + pieces.length;
          this.lines[where + " part " + partIndex] = line;
          pieces.push(this.parsePart(body, line));
        }
        index = end + 1;
      }
      flush();
      return pieces;
    }

    parsePart(body, line) {
      const trimmed = body.trim();
      if (/^(name|var)\s*:/.test(trimmed)) {
        this.fail("write {" + trimmed.replace(/^(name|var)\s*:\s*/, "").trim() + "} instead of {" + trimmed + "}.", line);
      }
      // {head: text | otherwise # tag}; the tag comes last, then the else.
      const split = splitTag(body);
      const options = splitElse(split.text);
      const colon = topLevelIndex(options.text, ":", true);
      const head = colon === -1 ? options.text : options.text.slice(0, colon);
      const text = colon === -1 ? undefined : options.text.slice(colon + 1).trim();
      if (/^recall\b/.test(trimmed)) {
        // {recall hale among kind, cruel if condition: format}
        const condition = /\bif\b/.exec(head);
        const spec = condition === null ? head : head.slice(0, condition.index);
        const part = {};
        if (condition !== null) {
          part.if = this.parseCondition(head.slice(condition.index + 2), line);
        }
        part.recall = this.parseRecall(spec.trim().replace(/^recall\b/, ""), line);
        if (text !== undefined && text.length > 0) {
          part.format = this.template(text, line, true);
        }
        if (options.otherwise !== undefined) {
          // The fallback shows whenever the recall doesn't: its condition is
          // false, or nothing fits.
          const otherwise = this.template(options.otherwise.trim(), line, false);
          if (part.if !== undefined) {
            part.else = otherwise;
          }
          part.otherwise = otherwise;
        }
        if (split.tag !== undefined) {
          part.tag = this.tagText(split.tag, line);
        }
        return part;
      }
      if (colon === -1) {
        this.fail("{" + trimmed + "} isn't a placeholder or a condition. Placeholders are a single name like {hale}; conditional text is {condition: text}.", line);
      }
      const part = { if: this.parseCondition(head, line) };
      if (text.length === 0) {
        this.fail("{" + head.trim() + ": …} has no text after the colon.", line);
      }
      part.text = this.template(text, line, false);
      if (options.otherwise !== undefined) {
        part.else = this.template(options.otherwise.trim(), line, false);
      }
      if (split.tag !== undefined) {
        part.tag = this.tagText(split.tag, line);
      }
      return part;
    }

    parseRecall(text, line) {
      const tokens = this.tokenize(text, line);
      const reader = new TokenReader(tokens, line, this);
      const spec = {};
      if (reader.peekWord("world")) {
        reader.next();
      } else if (reader.peekIdent() && this.characterIds.has(reader.peek().value)) {
        spec.perspective = reader.next().value;
      }
      while (!reader.done()) {
        const word = reader.expectIdent("'of', 'about', 'among' or 'rank'");
        if (word === "of") {
          spec.subject = reader.subject();
        } else if (word === "about") {
          spec.about = reader.about();
        } else if (word === "among") {
          spec.among = reader.traitList();
        } else if (word === "rank") {
          spec.rank = reader.number();
        } else {
          const close = suggest(word, ["of", "about", "among", "rank"].concat(Array.from(this.characterIds)));
          this.fail("in {recall …}, '" + word + "' isn't understood" + (close ? " (did you mean '" + close + "'?)" : "") +
            ". Write {recall hale among kind, cruel: …} or {recall hale about trait kind: …}.", line);
        }
      }
      return spec;
    }

    parseChoice(choice, prefix, ids) {
      const line = choice.head.number;
      let text = choice.head.text.trim().slice(1).trim();
      const result = {};
      let id;
      const label = /^\(([a-z0-9_]+)\)\s*/.exec(text);
      if (label !== null) {
        id = label[1];
        text = text.slice(label[0].length);
      }
      let showIf;
      let tag;
      if (text.indexOf("{") === 0) {
        const end = matchingBrace(text, 0);
        if (end === -1) {
          this.fail("this choice's { condition } is never closed.", line);
        }
        const split = splitTag(text.slice(1, end));
        showIf = this.parseCondition(split.text, line);
        if (split.tag !== undefined) {
          tag = this.tagText(split.tag, line);
        }
        text = text.slice(end + 1).trim();
      }
      let inlineRoute;
      const route = /\s*->\s*(\S+)\s*$/.exec(text);
      if (route !== null) {
        inlineRoute = route[1];
        text = text.slice(0, route.index).trim();
      }
      if (text.length === 0) {
        this.fail("this choice has no text.", line);
      }
      result.text = this.template(text, line, false);
      if (id === undefined) {
        id = choiceId(result.text);
      }
      let unique = id;
      for (let count = 2; ids.has(unique); count += 1) {
        unique = id + "_" + count;
      }
      if (unique !== id && label !== null) {
        this.fail("two choices in this scene are labelled (" + id + ").", line);
      }
      ids.add(unique);
      const where = prefix + " choice '" + unique + "'";
      this.lines[where] = line;
      const ordered = { id: unique, text: result.text };
      if (showIf !== undefined) {
        ordered.showIf = showIf;
      }
      if (tag !== undefined) {
        ordered.tag = tag;
      }

      const operations = [];
      const routes = [];
      for (const item of groupItems(choice.rest)) {
        const trimmed = item.head.text.trim();
        if (trimmed.indexOf("~") === 0) {
          operations.push(item);
        } else if (/^and\b/.test(trimmed) && operations.length > 0) {
          operations[operations.length - 1].rest.push(item.head);
          item.rest.forEach(function (rest) { operations[operations.length - 1].rest.push(rest); });
        } else if (trimmed.indexOf("->") === 0) {
          if (item.rest.length > 0) {
            this.fail("a '->' route must fit on one line.", item.rest[0].number);
          }
          routes.push(item.head);
        } else {
          this.fail("inside a choice, lines should start with ~ (something that happens) or -> (where it goes)." +
            (/^\s*\*/.test(trimmed) ? " Choices can't be nested." : ""), item.head.number);
        }
      }
      if (operations.length > 0) {
        ordered.do = this.parseOperations(operations, where + " do");
      }
      if (inlineRoute !== undefined && routes.length > 0) {
        this.fail("this choice has a '->' on its own line and another one below. Use one or the other.", line);
      }
      if (inlineRoute !== undefined) {
        this.checkName(inlineRoute, this.sceneIds, "scene", line);
        ordered.goto = inlineRoute;
      } else if (routes.length === 0) {
        this.fail("this choice doesn't say where it goes. End it with '-> scene_name'.", line);
      } else {
        ordered.goto = this.parseRoutes(routes, where);
      }
      return ordered;
    }

    parseRoutes(lines, where) {
      const entries = lines.map((line, index) => {
        const text = line.text.trim().slice(2).trim();
        const match = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+if\s+([\s\S]*))?$/.exec(text);
        if (match === null) {
          this.fail("a route should be '-> scene_name' or '-> scene_name if condition'.", line.number);
        }
        this.checkName(match[1], this.sceneIds, "scene", line.number);
        const entry = {};
        if (match[2] !== undefined) {
          const split = splitTag(match[2]);
          entry.if = this.parseCondition(split.text, line.number);
          if (split.tag !== undefined) {
            entry.tag = this.tagText(split.tag, line.number);
          }
        } else if (index !== lines.length - 1) {
          this.fail("only the last '->' can go without 'if'. Routes are tried in order, so the lines after this one could never be used.", line.number);
        }
        entry.node = match[1];
        this.lines[where + " goto " + index] = line.number;
        return entry;
      });
      if (entries[entries.length - 1].if !== undefined) {
        this.fail("the last '->' needs no 'if', so the choice always has somewhere to go.", lines[lines.length - 1].number);
      }
      if (entries.length === 1) {
        return entries[0].node;
      }
      return entries.map(function (entry) {
        const ordered = {};
        if (entry.if !== undefined) {
          ordered.if = entry.if;
        }
        ordered.node = entry.node;
        if (entry.tag !== undefined) {
          ordered.tag = entry.tag;
        }
        return ordered;
      });
    }

    // Each item is a "~ …" line plus its indented continuation lines; a
    // continuation starting with "and" adds a linked remember.
    parseOperations(items, where) {
      const operations = [];
      for (const item of items) {
        const pieces = [{ line: item.head.number, text: item.head.text.trim().replace(/^~\s*/, "") }];
        for (const line of item.rest) {
          const trimmed = line.text.trim();
          if (/^and\b/.test(trimmed)) {
            pieces.push({ line: line.number, text: trimmed, linked: true });
          } else if (trimmed.indexOf("~") === 0) {
            this.fail("each ~ action starts its own line at the same indent as the one above.", line.number);
          } else {
            pieces[pieces.length - 1].text += " " + trimmed;
          }
        }
        let previous = null;
        for (const piece of pieces) {
          if (piece.linked) {
            if (previous === null || previous.type !== "remember") {
              this.fail("an 'and …' line adds to the ~ remember above it.", piece.line);
            }
            const operation = this.parseRemember(piece.text.replace(/^and\b/, ""), piece.line, previous);
            operations.push(operation);
            previous = operation;
          } else {
            const operation = this.parseOperation(piece.text, piece.line);
            operations.push(operation);
            previous = operation;
          }
          if (where !== null) {
            this.lines[where + " operation " + (operations.length - 1)] = piece.line;
          }
        }
      }
      return operations;
    }

    parseOperation(text, line) {
      const word = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
      if (word === null) {
        this.fail("'~ " + text + "' isn't an action. Actions start with remember, gossip, reveal, doubt, describe, do, or a variable like '~ coins = 3'.", line);
      }
      const rest = text.slice(word[0].length).trim();
      const assignment = /^(\+=|-=|=)\s*([\s\S]*)$/.exec(rest);
      if (assignment !== null) {
        this.variableNames.add(word[1]);
        if (assignment[1] === "=") {
          return { type: "set", variable: word[1], value: this.value(assignment[2].trim(), line) };
        }
        const amount = Number(assignment[2].trim());
        if (assignment[2].trim().length === 0 || !Number.isFinite(amount) || amount <= 0) {
          this.fail("'" + word[1] + " " + assignment[1] + "' needs a positive number after it.", line);
        }
        const operation = { type: assignment[1] === "+=" ? "inc" : "dec", variable: word[1] };
        if (amount !== 1) {
          operation.amount = amount;
        }
        return operation;
      }
      switch (word[1]) {
        case "remember":
          return this.parseRemember(rest, line, null);
        case "gossip": {
          const reader = new TokenReader(this.tokenize(rest, line), line, this);
          const operation = { type: "gossip", from: reader.character() };
          reader.expectWord("to");
          operation.to = reader.targets();
          this.aboutAndBelief(reader, operation, false);
          return operation;
        }
        case "reveal": {
          const reader = new TokenReader(this.tokenize(rest, line), line, this);
          reader.expectWord("to");
          const operation = { type: "reveal", to: reader.targets() };
          this.aboutAndBelief(reader, operation, false);
          return operation;
        }
        case "doubt": {
          const reader = new TokenReader(this.tokenize(rest, line), line, this);
          const operation = { type: "doubt", to: reader.targets() };
          this.aboutAndBelief(reader, operation, true);
          return operation;
        }
        case "do": {
          const name = rest.trim();
          this.checkName(name, this.macroIds, "macro", line);
          return { type: "macro", name: name };
        }
        case "describe": {
          const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]+)$/.exec(rest);
          if (match === null) {
            this.fail("write '~ describe grey: the man who took the brooch'.", line);
          }
          this.checkName(match[1], this.characterIds, "character", line);
          return { type: "describe", character: match[1], description: this.template(match[2].trim(), line, false) };
        }
        default: {
          const close = suggest(word[1], ["remember", "gossip", "reveal", "doubt", "describe", "do"]);
          this.fail("'" + word[1] + "' isn't an action" + (close ? " (did you mean '" + close + "'?)" : "") +
            ". To change a variable, write '~ " + word[1] + " = value', '+= 1' or '-= 1'.", line);
        }
      }
      return null;
    }

    aboutAndBelief(reader, operation, aboutRequired) {
      if (reader.peekWord("about")) {
        reader.next();
        operation.about = reader.about();
      } else if (aboutRequired) {
        this.fail("doubt needs to say what is doubted: '~ doubt hale about jory, suspected'.", reader.line);
      }
      if (reader.peekSymbol("(")) {
        reader.next();
        reader.expectWord("belief");
        operation.belief = reader.number();
        reader.expectSymbol(")");
      }
      reader.end();
    }

    // ~ remember [subject:] concepts [(seen by …)] [(strength n)] ["summary"]
    parseRemember(text, line, linkedTo) {
      let rest = text.trim();
      const operation = { type: "remember" };
      let subject;
      const prefix = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/.exec(rest);
      if (prefix !== null) {
        subject = prefix[1];
        rest = rest.slice(prefix[0].length);
      }
      const concepts = [];
      let witnesses;
      let summary;
      while (rest.length > 0) {
        const concept = /^([A-Za-z_][A-Za-z0-9_]*)\s*,?\s*/.exec(rest);
        if (concept !== null && summary === undefined && witnesses === undefined && operation.strength === undefined) {
          concepts.push(concept[1]);
          rest = rest.slice(concept[0].length);
          continue;
        }
        if (rest[0] === "(") {
          const end = rest.indexOf(")");
          if (end === -1) {
            this.fail("this ( is never closed.", line);
          }
          const group = rest.slice(1, end).trim();
          rest = rest.slice(end + 1).trim();
          const seen = /^seen\s+by\s+([\s\S]*)$/i.exec(group);
          const strength = /^strength\s+(\S+)$/i.exec(group);
          if (seen !== null) {
            if (witnesses !== undefined) {
              this.fail("this remember has two (seen by …) groups.", line);
            }
            const who = seen[1].trim().toLowerCase();
            witnesses = who === "no one" || who === "nobody" || who === "noone" ? null
              : this.targetsFromText(seen[1], line);
          } else if (strength !== null) {
            const value = Number(strength[1]);
            if (!Number.isFinite(value) || value <= 0) {
              this.fail("strength should be a positive number.", line);
            }
            operation.strength = value;
          } else {
            this.fail("'(" + group + ")' isn't understood here. A remember can have (seen by …) and (strength 2).", line);
          }
          continue;
        }
        if (rest[0] === "\"") {
          if (summary !== undefined) {
            this.fail("this remember has two summaries.", line);
          }
          const end = closingQuote(rest);
          if (end === -1) {
            this.fail("this summary's opening \" is never closed.", line);
          }
          summary = rest.slice(1, end).replace(/\\"/g, "\"");
          rest = rest.slice(end + 1).trim();
          continue;
        }
        this.fail("'" + rest + "' isn't understood. A remember is '~ remember concepts (seen by …) \"summary\"'.", line);
      }
      if (concepts.length === 0) {
        this.fail("remember needs at least one concept, for example '~ remember help, ines'.", line);
      }
      if (subject === undefined) {
        operation.concepts = concepts.indexOf("player") === -1 ? ["player"].concat(concepts) : concepts;
      } else if (subject === "world") {
        operation.concepts = concepts;
      } else {
        operation.concepts = concepts.indexOf(subject) === -1 ? [subject].concat(concepts) : concepts;
        operation.subject = subject;
      }
      if (summary !== undefined) {
        operation.summary = this.template(summary.trim(), line, false);
      }
      const ordered = { type: "remember", concepts: operation.concepts };
      for (const key of ["subject", "strength", "summary"]) {
        if (operation[key] !== undefined) {
          ordered[key] = operation[key];
        }
      }
      if (this.scene) {
        this.scene.remembers.push({ operation: ordered, witnesses: witnesses, linkedTo: linkedTo, line: line });
      } else if (witnesses !== undefined && witnesses !== null) {
        ordered.witnesses = witnesses;
      }
      return ordered;
    }

    // Remembers without (seen by …) are seen by the scene's present:
    // characters, or by the same people as the remember they're linked to.
    resolveWitnesses() {
      const resolved = new Map();
      for (const entry of this.scene.remembers) {
        let witnesses = entry.witnesses;
        if (witnesses === undefined) {
          witnesses = entry.linkedTo !== null && resolved.has(entry.linkedTo)
            ? resolved.get(entry.linkedTo)
            : this.scene.present === undefined ? null : this.scene.present.slice();
        }
        resolved.set(entry.operation, witnesses);
        if (witnesses !== null) {
          const ordered = {};
          for (const [key, value] of Object.entries(entry.operation)) {
            ordered[key] = value;
            if (key === "concepts") {
              ordered.witnesses = Array.isArray(witnesses) ? witnesses.slice() : witnesses;
            }
          }
          for (const key of Object.keys(entry.operation)) {
            delete entry.operation[key];
          }
          Object.assign(entry.operation, ordered);
        }
      }
    }

    targetsFromText(text, line) {
      const reader = new TokenReader(this.tokenize(text, line), line, this);
      const targets = reader.targets();
      reader.end();
      return targets;
    }

    characterList(text, line) {
      const names = text.split(",").map(function (name) { return name.trim(); }).filter(function (name) { return name.length > 0; });
      if (names.length === 0) {
        this.fail("list at least one character.", line);
      }
      for (const name of names) {
        this.checkName(name, this.characterIds, "character", line);
      }
      return names;
    }

    value(text, line) {
      if (/^-?\d+(\.\d+)?$/.test(text)) {
        return Number(text);
      }
      if (text === "true" || text === "false") {
        return text === "true";
      }
      if (text === "null") {
        return null;
      }
      if (/^"(?:[^"\\]|\\.)*"$/.test(text)) {
        return JSON.parse(text);
      }
      this.fail("'" + text + "' isn't a value. Use a number, true, false, or text in double quotes.", line);
      return null;
    }

    // Choice text, summaries and formats: {name} placeholders only.
    template(text, line, isFormat) {
      let output = "";
      let index = 0;
      while (index < text.length) {
        const char = text[index];
        if (char === "\\" && index + 1 < text.length) {
          output += text[index + 1];
          index += 2;
          continue;
        }
        if (char === "{") {
          const end = text.indexOf("}", index);
          const body = end === -1 ? "" : text.slice(index + 1, end).trim();
          if (!IDENT.test(body)) {
            this.fail("only placeholders like {hale} or {coins} can go here" +
              (end === -1 ? ", and this { is never closed" : ", not {" + body + "}") + ".", line);
          }
          output += body === "summary" && isFormat ? "{summary}" : this.placeholder(body, line);
          index = end + 1;
          continue;
        }
        output += char;
        index += 1;
      }
      return output;
    }

    placeholder(name, line) {
      if (this.characterIds.has(name)) {
        return "{name:" + name + "}";
      }
      if (name === "summary") {
        return "{summary}";
      }
      if (this.macroIds.has(name) || this.sceneIds.has(name)) {
        this.fail("{" + name + "} is a " + (this.macroIds.has(name) ? "macro" : "scene") + ", not a character or variable. For conditional text, write {" + name + ": text}.", line);
      }
      return "{var:" + name + "}";
    }

    tagText(text, line) {
      const tag = text.trim();
      if (tag.length === 0) {
        this.fail("there is a # with no tag after it.", line);
      }
      return tag;
    }

    checkName(name, names, kind, line) {
      if (!names.has(name)) {
        const close = suggest(name, Array.from(names));
        this.fail("there is no " + kind + " called '" + name + "'" + (close ? " (did you mean '" + close + "'?)" : "") + ".", line);
      }
      return name;
    }

    tokenize(text, line) {
      const tokens = [];
      const pattern = /\s*(?:(-?\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|("(?:[^"\\]|\\.)*")|(>=|<=|==|!=|>|<|,|\(|\)))/y;
      let index = 0;
      while (index < text.length) {
        if (/^\s*$/.test(text.slice(index))) {
          break;
        }
        pattern.lastIndex = index;
        const match = pattern.exec(text);
        if (match === null) {
          const bad = text.slice(index).trim();
          this.fail("'" + bad.split(/\s+/)[0] + "' isn't understood here" +
            (/^=(?!=)/.test(bad) ? " (to compare, use ==)" : "") + ".", line);
        }
        if (match[1] !== undefined) {
          tokens.push({ kind: "number", value: Number(match[1]) });
        } else if (match[2] !== undefined) {
          tokens.push({ kind: "ident", value: match[2] });
        } else if (match[3] !== undefined) {
          tokens.push({ kind: "string", value: JSON.parse(match[3]) });
        } else {
          tokens.push({ kind: "symbol", value: match[4] });
        }
        index = pattern.lastIndex;
      }
      return tokens;
    }

    parseCondition(text, line) {
      if (text.trim().length === 0) {
        this.fail("a condition is missing.", line);
      }
      const reader = new TokenReader(this.tokenize(text, line), line, this);
      const condition = reader.expression();
      reader.end();
      return condition;
    }
  }

  // Recursive-descent reading of conditions and action arguments.
  class TokenReader {
    constructor(tokens, line, parser) {
      this.tokens = tokens;
      this.index = 0;
      this.line = line;
      this.parser = parser;
    }

    peek(offset) { return this.tokens[this.index + (offset || 0)]; }
    next() { return this.tokens[this.index++]; }
    done() { return this.index >= this.tokens.length; }
    peekIdent(offset) { const token = this.peek(offset); return token !== undefined && token.kind === "ident"; }
    peekWord(word, offset) { const token = this.peek(offset); return token !== undefined && token.kind === "ident" && token.value === word; }
    peekSymbol(symbol, offset) { const token = this.peek(offset); return token !== undefined && token.kind === "symbol" && token.value === symbol; }
    fail(message) { this.parser.fail(message, this.line); }

    describe(token) {
      return token === undefined ? "the end" : token.kind === "string" ? JSON.stringify(token.value) : "'" + token.value + "'";
    }

    end() {
      if (!this.done()) {
        this.fail("unexpected " + this.describe(this.peek()) + ".");
      }
    }

    expectIdent(what) {
      const token = this.next();
      if (token === undefined || token.kind !== "ident") {
        this.fail("expected " + what + " but found " + this.describe(token) + ".");
      }
      return token.value;
    }

    expectWord(word) {
      const token = this.next();
      if (token === undefined || token.kind !== "ident" || token.value !== word) {
        this.fail("expected '" + word + "' but found " + this.describe(token) + ".");
      }
    }

    expectSymbol(symbol) {
      const token = this.next();
      if (token === undefined || token.kind !== "symbol" || token.value !== symbol) {
        this.fail("expected '" + symbol + "' but found " + this.describe(token) + ".");
      }
    }

    number() {
      const token = this.next();
      if (token === undefined || token.kind !== "number") {
        this.fail("expected a number but found " + this.describe(token) + ".");
      }
      return token.value;
    }

    character() {
      const name = this.expectIdent("a character");
      return this.parser.checkName(name, this.parser.characterIds, "character", this.line);
    }

    trait() {
      const name = this.expectIdent("a trait");
      return this.parser.checkName(name, this.parser.traitIds, "trait", this.line);
    }

    traitList() {
      const traits = [this.trait()];
      while (this.peekSymbol(",")) {
        this.next();
        traits.push(this.trait());
      }
      return traits;
    }

    subject() {
      const name = this.expectIdent("who: 'you' or a name");
      return name === "you" ? undefined : name;
    }

    // "everyone", or characters separated by commas.
    targets() {
      if (this.peekWord("everyone")) {
        this.next();
        return "all";
      }
      const names = [this.character()];
      while (this.peekSymbol(",")) {
        this.next();
        names.push(this.character());
      }
      return names;
    }

    // "trait kind", or concepts separated by commas.
    about() {
      if (this.peekWord("trait") && this.peekIdent(1)) {
        this.next();
        return { trait: this.trait() };
      }
      const concepts = [this.expectIdent("a concept")];
      while (this.peekSymbol(",")) {
        this.next();
        concepts.push(this.expectIdent("a concept"));
      }
      return { concepts: concepts };
    }

    expression() {
      const first = this.conjunction();
      if (!this.peekWord("or")) {
        return first;
      }
      const conditions = [first];
      while (this.peekWord("or")) {
        this.next();
        conditions.push(this.conjunction());
      }
      return { type: "any", conditions: conditions };
    }

    conjunction() {
      const first = this.negation();
      if (!this.peekWord("and")) {
        return first;
      }
      const conditions = [first];
      while (this.peekWord("and")) {
        this.next();
        conditions.push(this.negation());
      }
      return { type: "all", conditions: conditions };
    }

    negation() {
      if (this.peekWord("not")) {
        this.next();
        return { type: "not", condition: this.negation() };
      }
      if (this.peekSymbol("(")) {
        this.next();
        const inner = this.expression();
        this.expectSymbol(")");
        return inner;
      }
      return this.atom();
    }

    atom() {
      const token = this.peek();
      if (token === undefined || token.kind !== "ident") {
        this.fail("expected a condition but found " + this.describe(token) + ".");
      }
      const parser = this.parser;
      const word = token.value;
      if (word === "always") {
        this.next();
        return { type: "always" };
      }
      if (word === "visited") {
        this.next();
        const node = this.expectIdent("a scene");
        parser.checkName(node, parser.sceneIds, "scene", this.line);
        return { type: "visited", node: node };
      }
      const following = this.peek(1);
      if (following !== undefined && following.kind === "symbol" && hasOwn(COMPARISONS, following.value)) {
        this.next();
        this.next();
        const value = this.next();
        if (value === undefined || value.kind === "symbol" ||
            value.kind === "ident" && ["true", "false", "null"].indexOf(value.value) === -1) {
          this.fail("compare '" + word + "' with a number, true, false, or text in double quotes.");
        }
        const operand = value.kind === "ident" ? (value.value === "null" ? null : value.value === "true") : value.value;
        const operator = COMPARISONS[following.value];
        if (operator !== "eq" && operator !== "neq" && typeof operand !== "number") {
          this.fail("'" + following.value + "' needs a number to compare with.");
        }
        return { type: "variable", name: word, operator: operator, value: operand };
      }
      if (this.peekWord("with", 1)) {
        this.next();
        this.next();
        const other = this.expectIdent("a concept");
        this.expectSymbol(">=");
        const condition = { type: "association", a: word, b: other, min: this.number() };
        if (this.peekWord("for")) {
          this.next();
          condition.perspective = this.character();
        }
        return condition;
      }
      if (this.peekWord("knows", 1)) {
        this.next();
        this.next();
        parser.checkName(word, parser.characterIds, "character", this.line);
        const condition = { type: "knows", perspective: word, about: this.about() };
        if (this.peekSymbol("(") && this.peekWord("belief", 1)) {
          this.next();
          this.next();
          condition.min = this.number();
          this.expectSymbol(")");
        }
        return condition;
      }
      if (this.peekWord("sees", 1)) {
        this.next();
        this.next();
        const perspective = word === "world" ? undefined
          : parser.checkName(word, parser.characterIds, "character", this.line);
        const subject = this.subject();
        this.expectWord("as");
        if (this.peekWord("more") && this.peekIdent(1) && this.peekWord("than", 2)) {
          this.next();
          const is = this.trait();
          this.expectWord("than");
          const among = [is].concat(this.traitList());
          const condition = { type: "dominantTrait", among: among, is: is };
          if (perspective !== undefined) {
            condition.perspective = perspective;
          }
          if (subject !== undefined) {
            condition.subject = subject;
          }
          if (this.peekWord("by")) {
            this.next();
            condition.margin = this.number();
          }
          return condition;
        }
        const condition = { type: "trait", trait: this.trait() };
        if (perspective !== undefined) {
          condition.perspective = perspective;
        }
        if (subject !== undefined) {
          condition.subject = subject;
        }
        while (this.peekSymbol(">=") || this.peekSymbol("<=")) {
          const bound = this.next().value === ">=" ? "min" : "max";
          if (condition[bound] !== undefined) {
            this.fail("this condition has two " + (bound === "min" ? ">=" : "<=") + " limits.");
          }
          condition[bound] = this.number();
        }
        if (condition.min === undefined && condition.max === undefined) {
          this.fail("say how strongly, for example '" + word + " sees you as " + condition.trait + " >= 1'.");
        }
        return condition;
      }
      this.next();
      if (parser.macroIds.has(word)) {
        return { type: "macroCondition", name: word };
      }
      if (parser.characterIds.has(word)) {
        this.fail("after a character, write 'knows …' or 'sees you as …'.");
      }
      const close = suggest(word, Array.from(parser.macroIds));
      this.fail("'" + word + "' isn't a macro" + (close ? " (did you mean '" + close + "'?)" : "") +
        ". For a variable, compare it: '" + word + " == true'.");
      return null;
    }
  }

  function indentOf(text) {
    let width = 0;
    for (const char of text) {
      if (char === " ") {
        width += 1;
      } else if (char === "\t") {
        width += 4;
      } else {
        break;
      }
    }
    return text.trim().length === 0 ? -1 : width;
  }

  // Groups lines into items: a line, plus the more-indented lines under it.
  function groupItems(lines) {
    const items = [];
    let current = null;
    for (const line of lines) {
      if (line.indent === -1) {
        continue;
      }
      if (current !== null && line.indent > current.head.indent) {
        current.rest.push(line);
        continue;
      }
      current = { head: line, rest: [] };
      items.push(current);
    }
    return items;
  }

  // The index of the next line at indent 0 (or the end).
  function nextAtIndent(lines, from) {
    let index = from;
    while (index < lines.length && (lines[index].indent !== 0)) {
      index += 1;
    }
    return index;
  }

  function matchingBrace(text, start) {
    let depth = 0;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (char === "\\") {
        index += 1;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return index;
        }
      }
    }
    return -1;
  }

  // The first `symbol` outside nested braces (and, when `quotes` is set,
  // outside double-quoted text), ignoring escaped characters.
  function topLevelIndex(text, symbol, quotes) {
    let depth = 0;
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "\\") {
        index += 1;
      } else if (quotes && char === "\"") {
        quoted = !quoted;
      } else if (quoted) {
        continue;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
      } else if (depth === 0 && char === symbol) {
        return index;
      }
    }
    return -1;
  }

  function splitTag(text) {
    const index = topLevelIndex(text, "#", false);
    if (index === -1) {
      return { text: text, tag: undefined };
    }
    return { text: text.slice(0, index), tag: text.slice(index + 1) };
  }

  function splitElse(text) {
    const index = topLevelIndex(text, "|", false);
    if (index === -1) {
      return { text: text, otherwise: undefined };
    }
    return { text: text.slice(0, index), otherwise: text.slice(index + 1) };
  }

  function closingQuote(text) {
    for (let index = 1; index < text.length; index += 1) {
      if (text[index] === "\\") {
        index += 1;
      } else if (text[index] === "\"") {
        return index;
      }
    }
    return -1;
  }

  function unescapeText(text) {
    return text.replace(/\\(.)/g, "$1");
  }

  // A readable, stable id from the choice's first few words.
  function choiceId(text) {
    const words = text.replace(/\{[^{}]*:([^{}]*)\}/g, "$1").toLowerCase()
      .replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(function (word) { return word.length > 0; });
    const id = words.slice(0, CHOICE_ID_WORDS).join("_");
    return id.length === 0 ? "choice" : /^[0-9]/.test(id) ? "choice_" + id : id;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  const StoryText = {
    parse: parse,
    lineFor: lineFor,
    suggest: suggest,
    StoryTextError: StoryTextError
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = StoryText;
  }
  if (root) {
    root.StoryText = StoryText;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
