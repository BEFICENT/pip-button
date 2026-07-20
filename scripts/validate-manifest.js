const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(manifest.manifest_version === 3, "manifest_version must be 3");
assert(Array.isArray(manifest.content_scripts), "content_scripts must be an array");
assert(manifest.content_scripts.length > 0, "At least one content script is required");

const geckoSettings = manifest.browser_specific_settings?.gecko;
assert(geckoSettings, "Firefox browser_specific_settings.gecko must be declared");
assert(geckoSettings.id === "video-pip-shortcut@beficent.github.io",
  "Firefox add-on ID must remain stable for storage.sync and updates");
assert(Number.parseFloat(geckoSettings.strict_min_version) >= 153,
  "Firefox 153 or newer is required for the scripted Picture-in-Picture API");
assert(Array.isArray(geckoSettings.data_collection_permissions?.required) &&
  geckoSettings.data_collection_permissions.required.length === 1 &&
  geckoSettings.data_collection_permissions.required[0] === "none",
  "Firefox data collection disclosure must declare no data collection");

const referencedFiles = new Set();
for (const contentScript of manifest.content_scripts) {
  assert(Array.isArray(contentScript.matches) && contentScript.matches.length > 0,
    "Each content script must declare matches");
  assert(Array.isArray(contentScript.js) && contentScript.js.length > 0,
    "Each content script must declare JavaScript files");
  contentScript.js.forEach((file) => referencedFiles.add(file));
}

referencedFiles.add(manifest.action?.default_popup);
referencedFiles.add(manifest.options_page);
Object.values(manifest.action?.default_icon ?? {}).forEach((file) => referencedFiles.add(file));
Object.values(manifest.icons ?? {}).forEach((file) => referencedFiles.add(file));

for (const file of referencedFiles) {
  if (!file) continue;
  assert(fs.existsSync(path.join(root, file)), `Manifest references missing file: ${file}`);
}

console.log("Manifest validation passed.");
