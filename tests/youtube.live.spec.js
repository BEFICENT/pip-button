const http = require("node:http");
const path = require("node:path");
const { expect, test } = require("@playwright/test");
const { launchExtensionRuntime } = require("./helpers/extension-runtime");

const adBlockerPath = path.resolve(__dirname, "fixtures", "ad-blocker");
let browserContext;
let extensionWorker;
let fixtureServer;
let fixtureUrl;
let runtime;

function startFixtureServer() {
  fixtureServer = http.createServer((request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.url !== "/youtube") {
      response.end("<!doctype html><html><body>Ad-block probe</body></html>");
      return;
    }

    const origin = `http://${request.headers.host}`;
    const playerUrl = new URL("https://www.youtube.com/embed/M7lc1UVf-VE");
    playerUrl.searchParams.set("autoplay", "1");
    playerUrl.searchParams.set("controls", "1");
    playerUrl.searchParams.set("enablejsapi", "1");
    playerUrl.searchParams.set("mute", "1");
    playerUrl.searchParams.set("origin", origin);
    playerUrl.searchParams.set("playsinline", "1");

    response.end(`<!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><title>YouTube PiP test</title></head>
        <body style="margin:0">
          <iframe
            id="youtube-player"
            title="YouTube test player"
            width="960"
            height="540"
            src="${playerUrl}"
            allow="autoplay; picture-in-picture"
          ></iframe>
        </body>
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

test.beforeAll(async () => {
  await startFixtureServer();
  runtime = await launchExtensionRuntime({ additionalExtensionPaths: [adBlockerPath] });
  ({ browserContext, extensionWorker } = runtime);
});

test.afterAll(async () => {
  await runtime?.close();
  await stopFixtureServer();
});

test.beforeEach(async () => {
  await extensionWorker.evaluate(() => new Promise((resolve) => chrome.storage.sync.clear(resolve)));
});

test("works on the real YouTube player with ad blocking enabled", async () => {
  const page = await browserContext.newPage();
  await page.goto(`${fixtureUrl}/probe`);

  const adProbeUrl = `https://googleads.g.doubleclick.net/pagead/pip-test-${Date.now()}.gif`;
  const blockedRequest = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url() === adProbeUrl,
    timeout: 10_000
  });
  await page.evaluate((url) => {
    const image = document.createElement("img");
    image.src = url;
    document.body.append(image);
  }, adProbeUrl);
  const failedRequest = await blockedRequest;
  expect(failedRequest.failure()?.errorText).toContain("ERR_BLOCKED_BY_CLIENT");

  await page.goto(`${fixtureUrl}/youtube`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const youtubeFrame = page.frameLocator("#youtube-player");
  const video = youtubeFrame.locator("video.html5-main-video");
  await video.waitFor({ state: "attached", timeout: 60_000 });
  await expect.poll(() => video.evaluate((element) => element.readyState), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(2);
  await video.evaluate(async (element) => {
    element.muted = true;
    await element.play();
  });

  const button = youtubeFrame.locator("#video-pip-shortcut-root")
    .locator("[data-testid='video-pip-button']");
  await expect(button).toHaveCount(1);
  await video.hover({ force: true, position: { x: 30, y: 30 } });
  await expect(button).toBeVisible();

  await button.click();
  await expect.poll(() => video.evaluate((element) => document.pictureInPictureElement === element))
    .toBe(true);
  await button.click();
  await expect.poll(() => video.evaluate((element) => document.pictureInPictureElement === element))
    .toBe(false);

  await page.close();
});
