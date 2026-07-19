/* Shared settings schema for extension pages and content scripts. */
(() => {
  "use strict";

  const POSITIONS = Object.freeze([
    ["center", "Center"],
    ["top-left", "Top-left"],
    ["top", "Top"],
    ["top-right", "Top-right"],
    ["right", "Right"],
    ["bottom-right", "Bottom-right"],
    ["bottom", "Bottom"],
    ["bottom-left", "Bottom-left"],
    ["left", "Left"]
  ]);

  const DISPLAY_MODES = Object.freeze([
    ["fade", "Fade on video hover"],
    ["hover", "Show on video hover"],
    ["always", "Always visible"]
  ]);

  const MARGINS = Object.freeze([0, 4, 8, 12, 16, 24, 32, 48, 64, 100, 200, 400]);
  const ICON_SIZES = Object.freeze([
    ["small", "Small"],
    ["medium", "Medium"],
    ["large", "Large"]
  ]);

  const DEFAULTS = Object.freeze({
    buttonEnabled: true,
    displayMode: "fade",
    clickFeedback: true,
    margin: 12,
    iconSize: "medium",
    hotkeyEnabled: true,
    hotkeyKey: "p",
    hotkeyAlt: true,
    hotkeyCtrl: false,
    hotkeyShift: false,
    hotkeyMeta: false,
    position: "center"
  });

  const positionValues = new Set(POSITIONS.map(([value]) => value));
  const displayModeValues = new Set(DISPLAY_MODES.map(([value]) => value));
  const iconSizeValues = new Set(ICON_SIZES.map(([value]) => value));

  function validBoolean(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  function validChoice(value, choices, fallback) {
    return choices.has(value) ? value : fallback;
  }

  function validMargin(value) {
    const number = Number(value);
    return MARGINS.includes(number) ? number : DEFAULTS.margin;
  }

  function validHotkey(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return Array.from(normalized).length === 1 ? normalized : DEFAULTS.hotkeyKey;
  }

  function normalizeSettings(raw = {}) {
    return {
      buttonEnabled: validBoolean(raw.buttonEnabled, DEFAULTS.buttonEnabled),
      displayMode: validChoice(raw.displayMode, displayModeValues, DEFAULTS.displayMode),
      clickFeedback: validBoolean(raw.clickFeedback, DEFAULTS.clickFeedback),
      margin: validMargin(raw.margin),
      iconSize: validChoice(raw.iconSize, iconSizeValues, DEFAULTS.iconSize),
      hotkeyEnabled: validBoolean(raw.hotkeyEnabled, DEFAULTS.hotkeyEnabled),
      hotkeyKey: validHotkey(raw.hotkeyKey),
      hotkeyAlt: validBoolean(raw.hotkeyAlt, DEFAULTS.hotkeyAlt),
      hotkeyCtrl: validBoolean(raw.hotkeyCtrl, DEFAULTS.hotkeyCtrl),
      hotkeyShift: validBoolean(raw.hotkeyShift, DEFAULTS.hotkeyShift),
      hotkeyMeta: validBoolean(raw.hotkeyMeta, DEFAULTS.hotkeyMeta),
      position: validChoice(raw.position, positionValues, DEFAULTS.position)
    };
  }

  Object.defineProperty(globalThis, "VideoPipSettings", {
    value: Object.freeze({
      DEFAULTS,
      DISPLAY_MODES,
      ICON_SIZES,
      MARGINS,
      POSITIONS,
      normalizeSettings,
      validHotkey
    }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})();
