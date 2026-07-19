const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testIgnore: "**/*.live.spec.js",
  timeout: 30_000,
  workers: 1,
  use: {
    trace: "retain-on-failure"
  }
});
