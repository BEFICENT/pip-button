const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const projectRoot = path.resolve(__dirname, "..", "..");
const extensionFiles = [
  "content.js",
  "icon-16.png",
  "icon-32.png",
  "icon-48.png",
  "icon.png",
  "manifest.json",
  "options.html",
  "popup.html",
  "settings-config.js",
  "settings.css",
  "settings.js"
];

async function launchExtensionRuntime({ additionalExtensionPaths = [] } = {}) {
  const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), "pip-button-extension-"));
  const profilePath = fs.mkdtempSync(path.join(os.tmpdir(), "pip-button-profile-"));

  for (const file of extensionFiles) {
    fs.copyFileSync(path.join(projectRoot, file), path.join(extensionPath, file));
  }

  const manifestPath = path.join(extensionPath, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.background = { service_worker: "test-background.js" };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(extensionPath, "test-background.js"),
    "chrome.runtime.onInstalled.addListener(() => {});\n"
  );

  const loadedExtensions = [extensionPath, ...additionalExtensionPaths.map((value) => path.resolve(value))];
  const extensionArgument = loadedExtensions.join(",");
  const browserContext = await chromium.launchPersistentContext(profilePath, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionArgument}`,
      `--load-extension=${extensionArgument}`
    ]
  });

  const extensionWorker = browserContext.serviceWorkers()[0] ??
    await browserContext.waitForEvent("serviceworker");
  const extensionId = new URL(extensionWorker.url()).host;

  return {
    browserContext,
    extensionId,
    extensionPath,
    extensionWorker,
    profilePath,
    async close() {
      await browserContext.close();
      fs.rmSync(extensionPath, { force: true, recursive: true });
      fs.rmSync(profilePath, { force: true, recursive: true });
    }
  };
}

module.exports = { launchExtensionRuntime };
