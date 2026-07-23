# Video PiP Shortcut — v 1.13
The simplest way to pop any HTML5 video into Picture‑in‑Picture on Chromium and Firefox-based desktop browsers.

> **YouTube preview fix**
> v1.13 ignores YouTube hover-preview videos and cleans up their overlays during in-page navigation.

---

## 🚀 What’s new in v 1.13

| Area | Added / Changed |
|------|-----------------|
| **YouTube previews** | Suppresses the PiP button on hover-preview videos in YouTube lists and search results |
| **Navigation cleanup** | Removes stale preview overlays when YouTube reuses video elements during in-page navigation |
| **Keyboard shortcut** | Excludes YouTube previews when selecting the best video for the configured shortcut |
| **Cross-browser copy** | Uses browser-neutral settings text for Chromium and Firefox users |
| **Quality** | Adds deterministic coverage for persistent YouTube preview players |

---

## ✨ Features

* **Overlay PiP icon** on every HTML5 video  
* **Instant PiP toggle** – click the icon or use the global shortcut  
* **Nine positions** + **edge margin** presets  
* **Icon size presets** (small / medium / large)  
* **Three hover styles** (show on hover, fade, always)
* **Custom shortcut** – pick any key + modifiers  
* **Click animation** (can be turned off)  
* All settings **sync via browser storage** and update live across tabs

---

## 🔭 Future Improvements

* Better compatibility with unusual closed-shadow-root video players
* Site-specific testing for major streaming platforms

---

## 🛠 Installation

### Chrome Web Store

Install [Video PiP Shortcut from the Chrome Web Store](https://chromewebstore.google.com/detail/video-pip-shortcut/fichfjcindepopbfmbgkgnfogknlpgld) for automatic updates.

### Firefox Browser Add-ons

Install [Video PiP Shortcut from Firefox Browser Add-ons](https://addons.mozilla.org/en-US/firefox/addon/video-pip-shortcut/) for a Mozilla-reviewed installation and automatic updates.

Firefox support requires **Firefox/Gecko 153 or newer**, where Mozilla first exposed the standard scripted video Picture-in-Picture API on desktop. Firefox-based browsers must incorporate that Gecko version before the extension can trigger PiP.

For development builds, use a Firefox-compatible release ZIP (**v1.12 or newer**), open **about:debugging**, choose **This Firefox**, click **Load Temporary Add-on**, and select the ZIP. Temporary add-ons are removed when Firefox restarts.

### GitHub release

1. Open the [latest GitHub release](https://github.com/BEFICENT/pip-button/releases/latest).
2. Download the release asset named `video-pip-shortcut-vX.Y.zip`—not GitHub's automatically generated "Source code" archives.
3. Extract the downloaded ZIP to a permanent folder.
4. Open **chrome://extensions** (or **brave://extensions**, **edge://extensions**).
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the extracted folder containing `manifest.json`.

Unpacked installations do not update automatically. Download the latest release, replace the extracted files, and click the extension's **Reload** button when upgrading.

### From source

Clone the repository, then follow steps 4–6 above and select the repository root.

Hover any video → click the 🎬 icon **or** press **Alt + P**  
(default shortcut—change it any time).

---

## ⚙️ Options

Open the toolbar popup (or right‑click → *Options*) to tweak:

| Category | Options |
|----------|---------|
| **Overlay** | Enable / disable icon & click animation |
| **Icon size** | Small • Medium • Large |
| **Hover behaviour** | Hover‑only • Fade • Always |
| **Position** | Centre + 8 compass points |
| **Edge margin** | 0, 4, 8, 12, 16, 24, 32, 48, 64, 100, 200, 400 px |
| **Shortcut** | Any key + Alt / Ctrl / Shift / Meta |

Settings are saved instantly and applied to every open tab.

---

## 🧪 Development

Install the test dependencies and run the complete static, Chromium, Firefox-engine, and Firefox add-on validation suites:

```bash
npm install
npm test
```

The Chromium tests load the unpacked extension into an isolated profile. They cover real PiP entry and exit, dynamic videos, cleanup, positioning, settings persistence, enable/disable behaviour, and iframe injection. The Firefox suite exercises the overlay and PiP interaction in Playwright's Firefox engine, while Mozilla's add-ons linter validates the Firefox manifest and packaged APIs.

Run only the Firefox-focused checks:

```bash
npm run check:firefox
npm run test:firefox
```

Run the opt-in live YouTube compatibility test separately:

```bash
npm run test:youtube
```

This test loads Google’s documented sample YouTube player with a small test-only Manifest V3 ad blocker enabled. It verifies that ad requests are blocked before exercising the overlay and real PiP entry and exit. Because it depends on YouTube and an internet connection, it is intentionally excluded from the deterministic default suite.

Create the same minimal ZIP attached to GitHub releases:

```bash
npm run package:extension
```

The package command copies only the runtime files required by the extension, together with its license, and writes the versioned cross-browser archive to `dist/`. It can be loaded unpacked by Chromium browsers, temporarily loaded by Firefox for development, or submitted to Mozilla for signing.

---

## License

The source code is licensed under the [MIT License](LICENSE).

The bundled icon files are third-party assets and are not covered by the MIT License. Their original attribution and license terms are noted below.

## 🖼 Icon credit

*Playback / PiP icon* by  
[Uniconlabs – Flaticon](https://www.flaticon.com/free-icon/video-player_10619895)  
Licensed for free use with attribution.

---

Made with ❤️ by **BEFICENT** (with a little help from ChatGPT).  
Feel free to fork, improve, and share!
