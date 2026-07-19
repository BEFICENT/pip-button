const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/youtube.live.spec.js",
  timeout: 90_000,
  workers: 1,
  use: {
    trace: "retain-on-failure"
  }
});

