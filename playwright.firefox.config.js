const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.firefox.spec.js",
  timeout: 30_000,
  workers: 1,
  use: {
    trace: "retain-on-failure"
  }
});
