# Video PiP Shortcut — v 1.11
The simplest way to pop any HTML5 video into Picture‑in‑Picture on Chrome / Brave / Edge.

> **Compatibility and reliability update**
> Everything below is *new or has been improved* in v 1.11.

---

## 🚀 What’s new in v 1.11

| Area | Added / Changed |
|------|-----------------|
| **Overlay button** | • Isolated from website styles <br>• Stays centred while scrolling <br>• Cleans up and recovers as videos change |
| **Compatibility** | Works in matching child frames and handles dynamic single-page sites more reliably |
| **Hover behaviour** | Choose how the icon appears: <br>  ➊ *Show on video hover* <br>  ➋ *Fade on video hover* (default) <br>  ➌ *Always visible* |
| **Positioning** | 9 presets (centre + 8 compass points) |
| **Edge margin** | Quick dropdown (0 – 400 px) keeps the icon from hugging the edge |
| **Keyboard shortcut** | Pick any key + Alt / Ctrl / Shift / Meta<br>(defaults to **Alt + P**) |
| **Click feedback** | Optional zoom‑flash animation |
| **One‑click PiP toggle** | Clicking the overlay toggles PiP on/off for that video |
| **Settings popup** | All options live‑update from the toolbar popup—no page reloads |
| **Quality** | Automated Chromium coverage plus an opt-in live YouTube and ad-blocking test |

---

## ✨ Features

* **Overlay PiP icon** on every HTML5 video  
* **Instant PiP toggle** – click the icon or use the global shortcut  
* **Nine positions** + **edge margin** presets  
* **Icon size presets** (small / medium / large)  
* **Three hover styles** (show on hover, fade, always)
* **Custom shortcut** – pick any key + modifiers  
* **Click animation** (can be turned off)  
* All settings **sync via Chrome Sync** and update live across tabs

---

## 🔭 Future Improvements

* Better compatibility with unusual closed-shadow-root video players
* Site-specific testing for major streaming platforms

---

## 🛠 Installation

### Chrome Web Store

Install [Video PiP Shortcut from the Chrome Web Store](https://chromewebstore.google.com/detail/video-pip-shortcut/fichfjcindepopbfmbgkgnfogknlpgld) for automatic updates.

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

Install the test dependency and run the complete static and Chromium suite:

```bash
npm install
npm test
```

The browser tests load the unpacked extension into an isolated Playwright Chromium profile. They cover real PiP entry and exit, dynamic videos, cleanup, positioning, settings persistence, enable/disable behaviour, and iframe injection.

Run the opt-in live YouTube compatibility test separately:

```bash
npm run test:youtube
```

This test loads Google’s documented sample YouTube player with a small test-only Manifest V3 ad blocker enabled. It verifies that ad requests are blocked before exercising the overlay and real PiP entry and exit. Because it depends on YouTube and an internet connection, it is intentionally excluded from the deterministic default suite.

Create the same minimal ZIP attached to GitHub releases:

```bash
npm run package:extension
```

The package command copies only the runtime files required by the extension and writes the versioned archive to `dist/`.

---

## 🖼 Icon credit

*Playback / PiP icon* by  
[Uniconlabs – Flaticon](https://www.flaticon.com/free-icon/video-player_10619895)  
Licensed for free use with attribution.

---

Made with ❤️ by **BEFICENT** (with a little help from ChatGPT).  
Feel free to fork, improve, and share!
