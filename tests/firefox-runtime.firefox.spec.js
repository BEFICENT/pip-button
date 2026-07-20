const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { expect, firefox, test } = require("@playwright/test");

const projectRoot = path.resolve(__dirname, "..");
let browser;
let fixtureServer;
let fixtureUrl;

function startFixtureServer() {
  fixtureServer = http.createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; min-height: 1800px; padding: 80px; }
            video { background: #20242e; display: block; height: 270px; width: 480px; }
          </style>
        </head>
        <body><video id="firefox-video" controls></video></body>
      </html>`);
  });

  return new Promise((resolve) => {
    fixtureServer.listen(0, "127.0.0.1", () => {
      const address = fixtureServer.address();
      fixtureUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
}

function stopFixtureServer() {
  return new Promise((resolve, reject) => {
    fixtureServer.close((error) => error ? reject(error) : resolve());
  });
}

async function loadFirefoxRuntime(page) {
  await page.addInitScript(() => {
    const listeners = [];
    const values = {};

    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        runtime: {
          getURL() {
            return "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
          },
          lastError: null
        },
        storage: {
          onChanged: {
            addListener(listener) {
              listeners.push(listener);
            }
          },
          sync: {
            get(defaults, callback) {
              callback({ ...defaults, ...values });
            },
            set(update, callback) {
              const changes = {};
              for (const [key, value] of Object.entries(update)) {
                changes[key] = { newValue: value, oldValue: values[key] };
                values[key] = value;
              }
              listeners.forEach((listener) => listener(changes, "sync"));
              callback?.();
            }
          }
        }
      }
    });

    globalThis.__nativeFirefoxPipApi =
      typeof HTMLVideoElement.prototype.requestPictureInPicture === "function";

    let pictureInPictureElement = null;
    Object.defineProperty(document, "pictureInPictureEnabled", {
      configurable: true,
      get: () => true
    });
    Object.defineProperty(document, "pictureInPictureElement", {
      configurable: true,
      get: () => pictureInPictureElement
    });
    Object.defineProperty(document, "exitPictureInPicture", {
      configurable: true,
      value: async () => {
        const previous = pictureInPictureElement;
        pictureInPictureElement = null;
        previous?.dispatchEvent(new Event("leavepictureinpicture"));
      }
    });
    Object.defineProperty(HTMLVideoElement.prototype, "requestPictureInPicture", {
      configurable: true,
      value: async function requestPictureInPicture() {
        pictureInPictureElement = this;
        this.dispatchEvent(new Event("enterpictureinpicture"));
        return {};
      }
    });
  });

  await page.goto(fixtureUrl);
  await page.addScriptTag({
    content: fs.readFileSync(path.join(projectRoot, "settings-config.js"), "utf8")
  });
  await page.addScriptTag({
    content: fs.readFileSync(path.join(projectRoot, "content.js"), "utf8")
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await startFixtureServer();
  browser = await firefox.launch({ headless: true });
});

test.afterAll(async () => {
  await browser?.close();
  await stopFixtureServer();
});

test("runs the overlay and PiP interaction in the Firefox engine", async () => {
  const page = await browser.newPage();
  await loadFirefoxRuntime(page);

  expect(await page.evaluate(() => navigator.userAgent.includes("Firefox/"))).toBe(true);

  const video = page.locator("#firefox-video");
  const button = page.locator("#video-pip-shortcut-root")
    .locator("[data-testid='video-pip-button']");

  await expect(button).toHaveCount(1);
  await video.hover();
  await expect(button).toBeVisible();

  await button.click();
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.id ?? null))
    .toBe("firefox-video");

  await button.click();
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.id ?? null))
    .toBeNull();

  const before = await button.boundingBox();
  await page.evaluate(() => window.scrollBy(0, 120));
  await expect.poll(async () => (await button.boundingBox()).y).toBeLessThan(before.y - 100);

  await page.close();
});
