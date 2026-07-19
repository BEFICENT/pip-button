const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { expect, test } = require("@playwright/test");

function loadSettingsApi() {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.resolve(__dirname, "..", "settings-config.js"), "utf8");
  vm.runInContext(source, context);
  return context.VideoPipSettings;
}

test("normalizes invalid synced values without losing valid preferences", () => {
  const settings = loadSettingsApi();
  const normalized = settings.normalizeSettings({
    buttonEnabled: false,
    displayMode: "invalid",
    hotkeyAlt: false,
    hotkeyKey: "K",
    iconSize: "huge",
    margin: 13,
    position: "right"
  });

  expect({ ...normalized }).toEqual({
    ...settings.DEFAULTS,
    buttonEnabled: false,
    hotkeyAlt: false,
    hotkeyKey: "k",
    position: "right"
  });
});

