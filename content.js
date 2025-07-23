/* Video PiP Shortcut */

const POSITIONS = [
  "center", "top-left", "top", "top-right",
  "right", "bottom-right", "bottom",
  "bottom-left", "left"
];

/* --- pixel sizes for presets --- */
const SIZE_MAP = { small: 40, medium: 50, large: 60 };

/* ---------- user settings ---------- */
const DEFAULTS = {
  buttonEnabled: true,
  displayMode: "fade",          // hover | fade | always
  clickFeedback: true,
  margin: 12,                   // px from edge
  iconSize: "medium",           // small | medium | large
  hotkeyEnabled: true,
  hotkeyKey: "p",
  hotkeyAlt: true,
  hotkeyCtrl: false,
  hotkeyShift: false,
  hotkeyMeta: false,
  position: "center"
};

let cfg = { ...DEFAULTS };

/* initial load */
chrome.storage.sync.get(DEFAULTS, (stored) => {
  cfg = stored;
  if (cfg.buttonEnabled) init();
});

/* react to option changes */
chrome.storage.onChanged.addListener((changes) => {
  for (const [k, { newValue }] of Object.entries(changes)) cfg[k] = newValue;

  if (["buttonEnabled", "displayMode", "position", "margin", "iconSize"]
        .some(k => k in changes)) {
    document.querySelectorAll(".pip-button").forEach((btn) => {
      applySize(btn);
      reposition(btn);
    });
    if (cfg.buttonEnabled && !document.querySelector(".pip-button")) init();
  }
});

/* ---------- helpers ---------- */
function applySize(btn) {
  const px = SIZE_MAP[cfg.iconSize] || SIZE_MAP.medium;
  btn.style.width = `${px}px`;
  btn.style.height = `${px}px`;
}

function calcXY(video) {
  const { top, left, width, height } = video.getBoundingClientRect();
  const m = Number(cfg.margin) || 0;

  return {
    "center":       [top + height / 2,      left + width / 2],
    "top-left":     [top + m,               left + m],
    "top":          [top + m,               left + width / 2],
    "top-right":    [top + m,               left + width - m],
    "right":        [top + height / 2,      left + width - m],
    "bottom-right": [top + height - m,      left + width - m],
    "bottom":       [top + height - m,      left + width / 2],
    "bottom-left":  [top + height - m,      left + m],
    "left":         [top + height / 2,      left + m]
  }[cfg.position];
}

function reposition(btn) {
  const [y, x] = calcXY(btn._video);
  btn.style.top  = `${y}px`;
  btn.style.left = `${x}px`;
}

/* ---------- create overlay button ---------- */
function addBtn(video) {
  if (!cfg.buttonEnabled) return;
  if (video.parentElement.querySelector(".pip-button")) return;

  const btn = document.createElement("img");
  btn.className = "pip-button";
  btn._video = video;
  btn.src = "data:image/png;base64,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";

  Object.assign(btn.style, {
    position: "fixed",
    zIndex: "9999",
    cursor: "pointer",
    transition: "opacity .25s ease",
    pointerEvents: "auto",
    transform: "translate(-50%, -50%)",
    opacity: "0"
  });
  applySize(btn);

  /* hover‑opacity logic */
  let vidHover = false, iconHover = false;
  const setOpacity = () => {
    let o = 0;
    if (cfg.displayMode === "always")      o = 1;
    else if (cfg.displayMode === "hover")  o = iconHover ? 1 : 0;
    else { /* fade */
      o = !vidHover && !iconHover ? 0 : (iconHover ? 1 : 0.3);
    }
    btn.style.opacity = o;
  };

  video.addEventListener("mouseenter", () => { vidHover = true;  setOpacity(); });
  video.addEventListener("mouseleave", () => { vidHover = false; iconHover = false; setOpacity(); });
  btn  .addEventListener("mouseenter", () => { iconHover = true; setOpacity(); });
  btn  .addEventListener("mouseleave", () => { iconHover = false; setOpacity(); });

  /* PiP toggle + click feedback */
  btn.addEventListener("click", async () => {
    try {
      if (document.pictureInPictureElement === video)
        await document.exitPictureInPicture();
      else
        await video.requestPictureInPicture();

      if (cfg.clickFeedback) {
        btn.animate(
          [
            { transform: "translate(-50%, -50%) scale(1)",   opacity: btn.style.opacity },
            { transform: "translate(-50%, -50%) scale(1.25)", opacity: 0.6 },
            { transform: "translate(-50%, -50%) scale(1)",   opacity: btn.style.opacity }
          ],
          { duration: 200, easing: "ease-out" }
        );
      }
    } catch (e) { console.error(e); }
  });

  // Hide icon in fullscreen mode
  const handleFullscreenChange = () => {
    const inFullscreen = document.fullscreenElement || document.webkitFullscreenElement || video.webkitDisplayingFullscreen;
    if (inFullscreen) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'block';
      setOpacity();
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
  video.addEventListener('webkitendfullscreen', handleFullscreenChange);
  // Initial check
  handleFullscreenChange();

  document.body.appendChild(btn);
  reposition(btn);
  setOpacity();
}

/* ---------- initialise & observe new videos ---------- */
function init() {
  document.querySelectorAll("video").forEach(addBtn);
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.tagName === "VIDEO") addBtn(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });
}

/* ---------- keyboard shortcut (unchanged) ---------- */
function isHotkey(e) {
  return cfg.hotkeyEnabled &&
    e.key.toLowerCase() === cfg.hotkeyKey.toLowerCase() &&
    e.altKey   === !!cfg.hotkeyAlt &&
    e.ctrlKey  === !!cfg.hotkeyCtrl &&
    e.shiftKey === !!cfg.hotkeyShift &&
    e.metaKey  === !!cfg.hotkeyMeta;
}

let lastHovered = null;
document.addEventListener("mouseenter", e => {
  if (e.target.tagName === "VIDEO") lastHovered = e.target;
}, true);

document.addEventListener("keydown", async e => {
  if (!isHotkey(e)) return;
  const vid = document.pictureInPictureElement || lastHovered;
  if (!vid) return;
  try {
    if (document.pictureInPictureElement === vid)
      await document.exitPictureInPicture();
    else
      await vid.requestPictureInPicture();
  } catch (err) { console.error(err); }
  e.preventDefault();
});
