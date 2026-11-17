"use strict";

// Opens index.html over file:// in a real headless Chrome or Edge and checks
// that every built-in story loads. Skipped when no browser is found; set
// CHROME_PATH to point at a Chromium-based browser if it is not detected.

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const url = require("node:url");

const root = path.join(__dirname, "..");

function findBrowser() {
  const programFiles = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"],
    process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = [process.env.CHROME_PATH].concat(
    programFiles.map(function (dir) { return path.join(dir, "Google", "Chrome", "Application", "chrome.exe"); }),
    programFiles.map(function (dir) { return path.join(dir, "Microsoft", "Edge", "Application", "msedge.exe"); }),
    [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge"
    ]
  );
  return candidates.find(function (candidate) {
    return candidate && fs.existsSync(candidate);
  }) || null;
}

function dumpDom(browser, pageUrl) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "memorygraph-browser-"));
  try {
    return childProcess.execFileSync(browser, [
      "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      "--user-data-dir=" + profile, "--virtual-time-budget=5000", "--dump-dom", pageUrl
    ], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "ignore"] });
  } finally {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

const browser = findBrowser();

test("built-in stories load when index.html is opened over file://", {
  skip: browser ? false : "no Chrome or Edge found (set CHROME_PATH to enable)"
}, function () {
  const dom = dumpDom(browser, url.pathToFileURL(path.join(root, "index.html")).href);
  const storyCount = fs.readdirSync(path.join(root, "stories")).filter(function (name) {
    return name.endsWith(".txt");
  }).length;

  const text = function (id) {
    const match = dom.match(new RegExp('id="' + id + '"[^>]*>([^<]*)<'));
    return match ? match[1] : null;
  };

  assert.equal(text("status-message"), "", "no built-in story should be reported as skipped");
  assert.equal(text("story-picker-title"), "Choose a story");
  assert.equal((dom.match(/class="story-option"/g) || []).length, storyCount);
  assert.doesNotMatch(dom.match(/<button[^>]*id="story-picker"[^>]*>/)[0], /disabled/);
});
