const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const archivePath = path.join(root, "dist", `video-pip-shortcut-v${manifest.version}.zip`);

if (!fs.existsSync(archivePath)) {
  throw new Error(`Firefox package does not exist: ${archivePath}`);
}

const linterPath = require.resolve("addons-linter/bin/addons-linter");
const result = spawnSync(
  process.execPath,
  [linterPath, "--warnings-as-errors", "--boring", archivePath],
  { stdio: "inherit" }
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
