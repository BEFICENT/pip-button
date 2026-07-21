const http = require("node:http");
const { expect, test } = require("@playwright/test");
const { launchExtensionRuntime } = require("./helpers/extension-runtime");

let browserContext;
let extensionId;
let extensionWorker;
let fixtureServer;
let fixtureUrl;
let runtime;

function fixtureDocument(body) {
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; min-height: 2200px; padding: 80px; }
          video { background: #20242e; display: block; height: 270px; width: 480px; }
          #video-pip-shortcut-root { display: none !important; z-index: -1 !important; }
          .pip-shortcut-button { display: none !important; }
        </style>
      </head>
      <body>
        <div class="pip-button">Unrelated site element</div>
        ${body}
      </body>
    </html>`;
}

function startFixtureServer() {
  fixtureServer = http.createServer((request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.url === "/frame") {
      response.end(fixtureDocument('<video id="framed-video" controls></video>'));
      return;
    }
    if (request.url === "/iframe") {
      response.end(fixtureDocument('<iframe title="Video frame" src="/frame" width="640" height="420"></iframe>'));
      return;
    }
    response.end(fixtureDocument('<video id="primary-video" controls></video>'));
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

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await startFixtureServer();
  runtime = await launchExtensionRuntime();
  ({ browserContext, extensionId, extensionWorker } = runtime);
});

test.afterAll(async () => {
  await runtime?.close();
  await stopFixtureServer();
});

test.beforeEach(async () => {
  await extensionWorker.evaluate(() => new Promise((resolve) => chrome.storage.sync.clear(resolve)));
});

test("owns one isolated overlay per video and cleans up dynamic videos", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/`);

  const buttons = page.locator("#video-pip-shortcut-root").locator("[data-testid='video-pip-button']");
  await expect(buttons).toHaveCount(1);

  await page.evaluate(() => {
    const wrapper = document.createElement("section");
    wrapper.id = "dynamic-wrapper";
    wrapper.innerHTML = '<video id="dynamic-one"></video><div><video id="dynamic-two"></video></div>';
    document.body.append(wrapper);
  });
  await expect(buttons).toHaveCount(3);

  await page.locator("#dynamic-one").evaluate((video) => video.remove());
  await expect(buttons).toHaveCount(2);

  await page.locator("#video-pip-shortcut-root").evaluate((root) => root.remove());
  await expect(buttons).toHaveCount(2);
  await page.close();
});

test("ignores YouTube hover previews and removes an overlay if a video becomes one", async () => {
  const page = await browserContext.newPage();
  await page.route("https://www.youtube.com/pip-preview-test", (route) => route.fulfill({
    contentType: "text/html",
    body: fixtureDocument(`
      <video id="main-video" controls></video>
      <ytd-video-preview id="preview">
        <div id="inline-preview-player">
          <video id="preview-video"></video>
        </div>
      </ytd-video-preview>
      <video id="reused-video"></video>
    `)
  }));
  await page.goto("https://www.youtube.com/pip-preview-test");

  const buttons = page.locator("#video-pip-shortcut-root")
    .locator("[data-testid='video-pip-button']");
  await expect(buttons).toHaveCount(2);

  await page.evaluate(() => {
    document.querySelector("#preview").append(document.querySelector("#reused-video"));
  });
  await expect(buttons).toHaveCount(1);

  await page.locator("#preview-video").hover();
  await expect(buttons).toHaveCount(1);
  await page.close();
});

test("reveals the overlay on video hover without allowing page CSS to hide it", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/`);

  const video = page.locator("#primary-video");
  const button = page.locator("#video-pip-shortcut-root").locator("[data-testid='video-pip-button']");
  await expect(button).toBeHidden();
  expect(await button.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  await video.hover({ position: { x: 20, y: 20 } });
  await expect(button).toBeVisible();
  await expect.poll(() => button.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("0.38");

  const styles = await button.evaluate((element) => ({
    opacity: getComputedStyle(element).opacity,
    pointerEvents: getComputedStyle(element).pointerEvents
  }));
  expect(styles).toEqual({ opacity: "0.38", pointerEvents: "auto" });
  await page.close();
});

test("toggles Picture-in-Picture from the overlay", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/`);

  const video = page.locator("#primary-video");
  await video.evaluate(async (element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    canvas.getContext("2d").fillRect(0, 0, canvas.width, canvas.height);
    window.__pipTestCanvas = canvas;
    element.srcObject = canvas.captureStream(1);
    await element.play();
  });

  const button = page.locator("#video-pip-shortcut-root").locator("[data-testid='video-pip-button']");
  await video.hover();
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.id ?? null))
    .toBe("primary-video");

  await button.click();
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.id ?? null))
    .toBeNull();
  await page.close();
});

test("toggles the best visible video with the configured shortcut", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/`);

  await page.locator("#primary-video").evaluate(async (element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    canvas.getContext("2d").fillRect(0, 0, canvas.width, canvas.height);
    window.__pipShortcutTestCanvas = canvas;
    element.srcObject = canvas.captureStream(1);
    await element.play();
  });

  await page.keyboard.press("Alt+P");
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.id ?? null))
    .toBe("primary-video");
  await page.keyboard.press("Alt+P");
  await expect.poll(() => page.evaluate(() => document.pictureInPictureElement?.id ?? null))
    .toBeNull();
  await page.close();
});

test("keeps the overlay centered on the video while scrolling", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/`);

  const video = page.locator("#primary-video");
  const button = page.locator("#video-pip-shortcut-root").locator("[data-testid='video-pip-button']");
  await video.hover();
  await expect(button).toBeVisible();
  const before = await button.boundingBox();

  await page.evaluate(() => window.scrollBy(0, 120));
  await expect.poll(async () => (await button.boundingBox()).y).toBeLessThan(before.y - 100);
  await expect.poll(() => button.evaluate((element) => {
    const videoRect = document.querySelector("#primary-video").getBoundingClientRect();
    const buttonRect = element.getBoundingClientRect();
    const videoCenter = videoRect.top + videoRect.height / 2;
    const buttonCenter = buttonRect.top + buttonRect.height / 2;
    return Math.abs(videoCenter - buttonCenter);
  })).toBeLessThan(1);
  await page.close();
});

test("disables and restores existing overlays from the settings UI", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/`);
  const button = page.locator("#video-pip-shortcut-root").locator("[data-testid='video-pip-button']");
  await expect(button).toHaveCount(1);

  const popup = await browserContext.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const enabled = popup.locator("#buttonEnabled");
  await enabled.uncheck();
  await expect(button).toHaveCount(0);
  await enabled.check();
  await expect(button).toHaveCount(1);

  await popup.close();
  await page.close();
});

test("saves a changed shortcut key", async () => {
  const popup = await browserContext.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  const input = popup.locator("#hotkeyKey");
  await input.fill("K");
  await expect(input).toHaveValue("K");
  await expect.poll(() => extensionWorker.evaluate(() =>
    new Promise((resolve) => chrome.storage.sync.get("hotkeyKey", resolve))
  )).toEqual({ hotkeyKey: "k" });

  await popup.close();
});

test("injects into matching child frames", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/iframe`);

  const frameButton = page.frameLocator("iframe").locator("#video-pip-shortcut-root")
    .locator("[data-testid='video-pip-button']");
  await expect(frameButton).toHaveCount(1);
  await page.close();
});
