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
Object.values(manifest.icons ?? {}).forEach((file) => referencedFiles.add(file));

for (const file of referencedFiles) {
  if (!file) continue;
  assert(fs.existsSync(path.join(root, file)), `Manifest references missing file: ${file}`);
}

console.log("Manifest validation passed.");

