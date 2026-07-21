/* Video PiP Shortcut — page integration */
(() => {
  "use strict";

  const { DEFAULTS, normalizeSettings } = globalThis.VideoPipSettings;
  const ROOT_ID = "video-pip-shortcut-root";
  const SIZE_MAP = Object.freeze({ small: 40, medium: 50, large: 60 });
  const overlays = new Map();

  let cfg = { ...DEFAULTS };
  let host = null;
  let layer = null;
  let mutationObserver = null;
  let resizeObserver = null;
  let updateFrame = 0;
  let lastInteractedVideo = null;
  let pointer = { active: false, x: 0, y: 0 };

  function logError(message, error) {
    console.warn(`[Video PiP Shortcut] ${message}`, error);
  }

  function ensureOverlayRoot() {
    if (host?.isConnected && layer) return;

    document.getElementById(ROOT_ID)?.remove();

    host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("aria-hidden", "false");
    host.style.setProperty("all", "initial", "important");
    host.style.setProperty("display", "block", "important");
    host.style.setProperty("inset", "0", "important");
    host.style.setProperty("pointer-events", "none", "important");
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("z-index", "2147483647", "important");

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      #layer {
        inset: 0;
        pointer-events: none;
        position: fixed;
      }
      .pip-shortcut-button {
        align-items: center;
        appearance: none;
        background: transparent;
        border: 0;
        border-radius: 8px;
        box-sizing: border-box;
        cursor: pointer;
        display: flex;
        justify-content: center;
        margin: 0;
        opacity: 0;
        padding: 0;
        pointer-events: none;
        position: fixed;
        transform: translate(-50%, -50%);
        transition: opacity 160ms ease, filter 160ms ease;
        visibility: hidden;
      }
      .pip-shortcut-button:hover { filter: brightness(1.08); }
      .pip-shortcut-button:focus-visible {
        outline: 3px solid #4f8cff;
        outline-offset: 3px;
      }
      .pip-shortcut-button[data-error="true"] {
        filter: drop-shadow(0 0 5px #e5484d);
      }
      .pip-shortcut-button img {
        display: block;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        width: 100%;
      }
      @media (prefers-reduced-motion: reduce) {
        .pip-shortcut-button { transition: none; }
      }
    `;

    layer = document.createElement("div");
    layer.id = "layer";
    shadow.append(style, layer);
    document.documentElement.append(host);
  }

  function scheduleUpdate() {
    if (!cfg.buttonEnabled || updateFrame) return;
    updateFrame = requestAnimationFrame(() => {
      updateFrame = 0;
      updateAllOverlays();
    });
  }

  function isPictureInPictureAvailable(video) {
    return typeof video.requestPictureInPicture === "function" &&
      document.pictureInPictureEnabled !== false &&
      !video.disablePictureInPicture;
  }

  function isYouTubePreviewVideo(video) {
    const hostname = location.hostname;
    const isYouTube = hostname === "youtube.com" || hostname.endsWith(".youtube.com");
    return isYouTube && Boolean(video.closest("ytd-video-preview, #inline-preview-player"));
  }

  function isEligibleVideo(video) {
    return !isYouTubePreviewVideo(video) && isPictureInPictureAvailable(video);
  }

  function getVisibleRect(video) {
    if (!video.isConnected || video.getClientRects().length === 0) return null;

    const rect = video.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(window.innerWidth, rect.right);
    const bottom = Math.min(window.innerHeight, rect.bottom);

    if (right - left < 24 || bottom - top < 24) return null;
    return { bottom, height: bottom - top, left, right, top, width: right - left };
  }

  function calculatePosition(rect, size) {
    const half = size / 2;
    const horizontalInset = Math.min(Number(cfg.margin) + half, rect.width / 2);
    const verticalInset = Math.min(Number(cfg.margin) + half, rect.height / 2);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const left = rect.left + horizontalInset;
    const right = rect.right - horizontalInset;
    const top = rect.top + verticalInset;
    const bottom = rect.bottom - verticalInset;

    return {
      center: [centerX, centerY],
      "top-left": [left, top],
      top: [centerX, top],
      "top-right": [right, top],
      right: [right, centerY],
      "bottom-right": [right, bottom],
      bottom: [centerX, bottom],
      "bottom-left": [left, bottom],
      left: [left, centerY]
    }[cfg.position];
  }

  function pointerIsInside(rect) {
    return pointer.active &&
      pointer.x >= rect.left && pointer.x <= rect.right &&
      pointer.y >= rect.top && pointer.y <= rect.bottom;
  }

  function setButtonVisibility(record, eligible) {
    const { button } = record;
    if (!eligible) {
      button.style.opacity = "0";
      button.style.pointerEvents = "none";
      button.style.visibility = "hidden";
      return;
    }

    const touchFirst = window.matchMedia?.("(hover: none)").matches === true;
    const overVideo = record.pointerOverVideo;
    const overButton = record.pointerOverButton || record.buttonFocused;
    const videoFocused = document.activeElement === record.video;
    let opacity = 0;

    if (cfg.displayMode === "always" || touchFirst) opacity = 1;
    else if (overButton || videoFocused) opacity = 1;
    else if (overVideo && cfg.displayMode === "hover") opacity = 1;
    else if (overVideo && cfg.displayMode === "fade") opacity = 0.38;

    const interactive = opacity > 0;
    button.style.opacity = String(opacity);
    button.style.pointerEvents = interactive ? "auto" : "none";
    button.style.visibility = interactive ? "visible" : "hidden";
  }

  function updateButtonState(record) {
    const active = document.pictureInPictureElement === record.video;
    const label = active ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture";
    record.button.setAttribute("aria-label", label);
    record.button.setAttribute("aria-pressed", String(active));
    record.button.title = label;
  }

  function updateOverlay(record) {
    const { button, video } = record;
    if (!video.isConnected) {
      removeOverlay(video);
      return;
    }

    // YouTube keeps hover-preview players connected while navigating between
    // its list and watch views. Remove their overlays even when the underlying
    // video node survives the single-page navigation.
    if (isYouTubePreviewVideo(video)) {
      removeOverlay(video);
      return;
    }

    const visibleRect = getVisibleRect(video);
    const eligible = Boolean(visibleRect) &&
      !document.fullscreenElement &&
      isEligibleVideo(video);

    if (!eligible) {
      record.pointerOverVideo = false;
      setButtonVisibility(record, false);
      return;
    }

    // Visibility is based on the viewport intersection, but positioning must use
    // the complete video bounds. Centering on the clipped rectangle makes the
    // button drift away from the video's center while the page is scrolled.
    const videoRect = video.getBoundingClientRect();
    const desiredSize = SIZE_MAP[cfg.iconSize] ?? SIZE_MAP.medium;
    const availableSize = Math.max(24, Math.min(videoRect.width, videoRect.height) - 2);
    const size = Math.min(desiredSize, availableSize);
    const [left, top] = calculatePosition(videoRect, size);

    button.style.height = `${size}px`;
    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
    button.style.width = `${size}px`;

    record.pointerOverVideo = pointerIsInside(visibleRect);
    if (record.pointerOverVideo) lastInteractedVideo = video;
    updateButtonState(record);
    setButtonVisibility(record, true);
  }

  function updateAllOverlays() {
    if (!host?.isConnected || !layer) {
      ensureOverlayRoot();
      for (const record of overlays.values()) layer.append(record.button);
    }
    for (const record of [...overlays.values()]) updateOverlay(record);
  }

  async function togglePictureInPicture(video, record = overlays.get(video)) {
    const isActive = document.pictureInPictureElement === video;
    if (!video?.isConnected || (!isActive && !isPictureInPictureAvailable(video))) return;

    try {
      if (isActive) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }

      if (record && cfg.clickFeedback && typeof record.button.animate === "function") {
        record.button.animate(
          [
            { transform: "translate(-50%, -50%) scale(1)" },
            { transform: "translate(-50%, -50%) scale(1.18)" },
            { transform: "translate(-50%, -50%) scale(1)" }
          ],
          { duration: 180, easing: "ease-out" }
        );
      }
    } catch (error) {
      if (record) {
        record.button.dataset.error = "true";
        record.button.title = `Picture-in-Picture unavailable: ${error.message || "unknown error"}`;
        setTimeout(() => {
          if (!record.button.isConnected) return;
          delete record.button.dataset.error;
          updateButtonState(record);
        }, 1400);
      }
      logError("Could not toggle Picture-in-Picture.", error);
      return;
    }

    if (record) updateButtonState(record);
  }

  function addOverlay(video) {
    if (!cfg.buttonEnabled || overlays.has(video) || isYouTubePreviewVideo(video)) return;
    ensureOverlayRoot();

    const button = document.createElement("button");
    button.className = "pip-shortcut-button";
    button.dataset.testid = "video-pip-button";
    button.type = "button";

    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.src = chrome.runtime.getURL("icon.png");
    button.append(image);

    const record = {
      button,
      buttonFocused: false,
      pointerOverButton: false,
      pointerOverVideo: false,
      video
    };

    record.onButtonEnter = () => {
      record.pointerOverButton = true;
      lastInteractedVideo = video;
      setButtonVisibility(record, true);
    };
    record.onButtonLeave = () => {
      record.pointerOverButton = false;
      scheduleUpdate();
    };
    record.onButtonFocus = () => {
      record.buttonFocused = true;
      lastInteractedVideo = video;
      setButtonVisibility(record, true);
    };
    record.onButtonBlur = () => {
      record.buttonFocused = false;
      scheduleUpdate();
    };
    record.onClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      lastInteractedVideo = video;
      void togglePictureInPicture(video, record);
    };
    record.onMediaStateChange = scheduleUpdate;

    button.addEventListener("pointerenter", record.onButtonEnter);
    button.addEventListener("pointerleave", record.onButtonLeave);
    button.addEventListener("focus", record.onButtonFocus);
    button.addEventListener("blur", record.onButtonBlur);
    button.addEventListener("click", record.onClick);
    video.addEventListener("enterpictureinpicture", record.onMediaStateChange);
    video.addEventListener("leavepictureinpicture", record.onMediaStateChange);
    video.addEventListener("loadedmetadata", record.onMediaStateChange);
    video.addEventListener("emptied", record.onMediaStateChange);

    overlays.set(video, record);
    resizeObserver?.observe(video);
    layer.append(button);
    updateOverlay(record);
  }

  function removeOverlay(video) {
    const record = overlays.get(video);
    if (!record) return;

    resizeObserver?.unobserve(video);
    video.removeEventListener("enterpictureinpicture", record.onMediaStateChange);
    video.removeEventListener("leavepictureinpicture", record.onMediaStateChange);
    video.removeEventListener("loadedmetadata", record.onMediaStateChange);
    video.removeEventListener("emptied", record.onMediaStateChange);
    record.button.remove();
    overlays.delete(video);

    if (lastInteractedVideo === video) lastInteractedVideo = null;
  }

  function scanForVideos(node) {
    if (!(node instanceof Element || node instanceof DocumentFragment || node instanceof Document)) return;
    if (node instanceof HTMLVideoElement) addOverlay(node);
    node.querySelectorAll?.("video").forEach(addOverlay);
  }

  function removeDisconnectedOverlays() {
    for (const video of [...overlays.keys()]) {
      if (!video.isConnected) removeOverlay(video);
    }
  }

  function startOverlaySystem() {
    if (mutationObserver) return;

    ensureOverlayRoot();
    resizeObserver = new ResizeObserver(scheduleUpdate);
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(scanForVideos);
      }
      removeDisconnectedOverlays();
      scheduleUpdate();
    });
    mutationObserver.observe(document.documentElement, {
      attributeFilter: ["disablepictureinpicture"],
      attributes: true,
      childList: true,
      subtree: true
    });

    scanForVideos(document);
    scheduleUpdate();
  }

  function stopOverlaySystem() {
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    mutationObserver = null;
    resizeObserver = null;

    for (const video of [...overlays.keys()]) removeOverlay(video);
    host?.remove();
    host = null;
    layer = null;

    if (updateFrame) cancelAnimationFrame(updateFrame);
    updateFrame = 0;
  }

  function targetIsEditable(event) {
    const target = event.composedPath()[0];
    return target instanceof HTMLElement &&
      (target.isContentEditable || target.matches("input, textarea, select"));
  }

  function isConfiguredHotkey(event) {
    if (!cfg.hotkeyEnabled || event.repeat) return false;
    if (targetIsEditable(event) && !event.altKey && !event.ctrlKey && !event.metaKey) return false;

    return event.key.toLowerCase() === cfg.hotkeyKey.toLowerCase() &&
      event.altKey === cfg.hotkeyAlt &&
      event.ctrlKey === cfg.hotkeyCtrl &&
      event.shiftKey === cfg.hotkeyShift &&
      event.metaKey === cfg.hotkeyMeta;
  }

  function videoScore(video) {
    const rect = getVisibleRect(video);
    if (!rect || !isEligibleVideo(video)) return -1;
    const playingBonus = !video.paused && !video.ended ? 1_000_000_000 : 0;
    return playingBonus + rect.width * rect.height;
  }

  function chooseVideoForHotkey() {
    if (document.pictureInPictureElement instanceof HTMLVideoElement) {
      return document.pictureInPictureElement;
    }

    if (lastInteractedVideo?.isConnected && videoScore(lastInteractedVideo) >= 0) {
      return lastInteractedVideo;
    }

    let bestVideo = null;
    let bestScore = -1;
    for (const video of document.querySelectorAll("video")) {
      const score = videoScore(video);
      if (score > bestScore) {
        bestScore = score;
        bestVideo = video;
      }
    }
    return bestVideo;
  }

  document.addEventListener("keydown", (event) => {
    if (!isConfiguredHotkey(event)) return;
    const video = chooseVideoForHotkey();
    if (!video) return;

    event.preventDefault();
    lastInteractedVideo = video;
    void togglePictureInPicture(video);
  }, true);

  document.addEventListener("pointermove", (event) => {
    pointer = { active: true, x: event.clientX, y: event.clientY };
    scheduleUpdate();
  }, true);

  document.addEventListener("pointerout", (event) => {
    if (event.relatedTarget) return;
    pointer.active = false;
    scheduleUpdate();
  }, true);

  document.addEventListener("play", (event) => {
    if (event.target instanceof HTMLVideoElement) lastInteractedVideo = event.target;
  }, true);

  document.addEventListener("fullscreenchange", scheduleUpdate);
  document.addEventListener("focusin", scheduleUpdate);
  document.addEventListener("focusout", scheduleUpdate);
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("scroll", scheduleUpdate, true);
  window.visualViewport?.addEventListener("resize", scheduleUpdate);
  window.visualViewport?.addEventListener("scroll", scheduleUpdate);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;

    const next = { ...cfg };
    for (const key of Object.keys(DEFAULTS)) {
      if (key in changes) next[key] = changes[key].newValue ?? DEFAULTS[key];
    }

    const wasEnabled = cfg.buttonEnabled;
    cfg = normalizeSettings(next);

    if (cfg.buttonEnabled !== wasEnabled) {
      if (cfg.buttonEnabled) startOverlaySystem();
      else stopOverlaySystem();
    } else {
      scheduleUpdate();
    }
  });

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    if (chrome.runtime.lastError) {
      logError("Could not load synced settings; defaults will be used.", chrome.runtime.lastError);
      cfg = { ...DEFAULTS };
    } else {
      cfg = normalizeSettings(stored);
    }

    if (cfg.buttonEnabled) startOverlaySystem();
  });
})();
