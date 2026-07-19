/* Settings UI shared by the toolbar popup and options page. */
(() => {
  "use strict";

  const {
    DEFAULTS,
    DISPLAY_MODES,
    ICON_SIZES,
    MARGINS,
    POSITIONS,
    normalizeSettings,
    validHotkey
  } = globalThis.VideoPipSettings;

  const root = document.getElementById("ui");
  const status = document.getElementById("save-status");
  let currentSettings = { ...DEFAULTS };
  let statusTimer = 0;

  function element(tag, properties = {}, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, properties);
    node.append(...children);
    return node;
  }

  function showStatus(message, kind = "success") {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.dataset.kind = kind;
    status.hidden = false;

    if (kind === "success") {
      statusTimer = setTimeout(() => {
        status.hidden = true;
      }, 1200);
    }
  }

  function saveSetting(key, value) {
    currentSettings[key] = value;
    chrome.storage.sync.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        showStatus("Could not save this setting.", "error");
        console.warn("[Video PiP Shortcut] Could not save a setting.", chrome.runtime.lastError);
        return;
      }
      showStatus("Saved");
    });
  }

  function checkbox(id, label, checked, className = "toggle-row") {
    const input = element("input", { checked, id, type: "checkbox" });
    return element(
      "label",
      { className, htmlFor: id },
      input,
      element("span", { className: "control-label", textContent: label })
    );
  }

  function selectField(id, label, values, selectedValue) {
    const select = element("select", { id });
    for (const [value, text] of values) {
      select.append(element("option", {
        selected: String(value) === String(selectedValue),
        textContent: text,
        value
      }));
    }

    return element(
      "label",
      { className: "field", htmlFor: id },
      element("span", { className: "field-label", textContent: label }),
      select
    );
  }

  function section(title, ...children) {
    return element(
      "section",
      { className: "settings-section" },
      element("h2", { textContent: title }),
      ...children
    );
  }

  function shortcutPreview(settings) {
    if (!settings.hotkeyEnabled) return "Shortcut disabled";
    const parts = [];
    if (settings.hotkeyCtrl) parts.push("Ctrl");
    if (settings.hotkeyAlt) parts.push("Alt");
    if (settings.hotkeyShift) parts.push("Shift");
    if (settings.hotkeyMeta) parts.push("Meta");
    parts.push(settings.hotkeyKey.toUpperCase());
    return parts.join(" + ");
  }

  function updateDependentControls() {
    const overlayControls = document.getElementById("overlay-controls");
    const shortcutControls = document.getElementById("shortcut-controls");
    overlayControls.disabled = !currentSettings.buttonEnabled;
    shortcutControls.disabled = !currentSettings.hotkeyEnabled;
    document.getElementById("shortcut-preview").textContent = shortcutPreview(currentSettings);
  }

  function buildUI(settings) {
    currentSettings = settings;
    root.replaceChildren();

    const marginValues = MARGINS.map((value) => [value, `${value} px`]);
    const overlayControls = element(
      "fieldset",
      { className: "control-group", id: "overlay-controls" },
      element("legend", { className: "sr-only", textContent: "Overlay appearance" }),
      selectField("iconSize", "Icon size", ICON_SIZES, settings.iconSize),
      selectField("displayMode", "Visibility", DISPLAY_MODES, settings.displayMode),
      selectField("position", "Position", POSITIONS, settings.position),
      selectField("margin", "Edge margin", marginValues, settings.margin),
      checkbox("clickFeedback", "Click animation", settings.clickFeedback)
    );

    const shortcutControls = element(
      "fieldset",
      { className: "control-group", id: "shortcut-controls" },
      element("legend", { className: "sr-only", textContent: "Shortcut keys" }),
      element(
        "div",
        { className: "modifier-grid" },
        checkbox("hotkeyCtrl", "Ctrl", settings.hotkeyCtrl, "check-row"),
        checkbox("hotkeyAlt", "Alt", settings.hotkeyAlt, "check-row"),
        checkbox("hotkeyShift", "Shift", settings.hotkeyShift, "check-row"),
        checkbox("hotkeyMeta", "Meta", settings.hotkeyMeta, "check-row")
      ),
      element(
        "label",
        { className: "field", htmlFor: "hotkeyKey" },
        element("span", { className: "field-label", textContent: "Key" }),
        element("input", {
          autoComplete: "off",
          id: "hotkeyKey",
          inputMode: "text",
          maxLength: 1,
          spellcheck: false,
          type: "text",
          value: settings.hotkeyKey.toUpperCase()
        })
      ),
      element("output", {
        className: "shortcut-preview",
        id: "shortcut-preview",
        textContent: shortcutPreview(settings)
      })
    );

    root.append(
      section(
        "Overlay",
        checkbox("buttonEnabled", "Show the PiP button", settings.buttonEnabled),
        overlayControls
      ),
      section(
        "Keyboard shortcut",
        checkbox("hotkeyEnabled", "Enable shortcut", settings.hotkeyEnabled),
        shortcutControls
      )
    );

    root.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.addEventListener("change", () => {
        saveSetting(input.id, input.checked);
        updateDependentControls();
      });
    });

    root.querySelectorAll("select").forEach((select) => {
      select.addEventListener("change", () => {
        const value = select.id === "margin" ? Number(select.value) : select.value;
        saveSetting(select.id, value);
      });
    });

    const hotkeyInput = document.getElementById("hotkeyKey");
    hotkeyInput.addEventListener("input", () => {
      const candidate = hotkeyInput.value.slice(-1);
      const normalized = validHotkey(candidate);
      const isValid = candidate.trim() !== "" && normalized === candidate.toLowerCase();

      hotkeyInput.setAttribute("aria-invalid", String(!isValid));
      if (!isValid) {
        showStatus("Enter a single letter, number, or symbol.", "error");
        return;
      }

      hotkeyInput.value = normalized.toUpperCase();
      saveSetting("hotkeyKey", normalized);
      updateDependentControls();
    });
    hotkeyInput.addEventListener("blur", () => {
      if (hotkeyInput.getAttribute("aria-invalid") !== "true") return;
      hotkeyInput.value = currentSettings.hotkeyKey.toUpperCase();
      hotkeyInput.setAttribute("aria-invalid", "false");
    });

    updateDependentControls();
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    if (chrome.runtime.lastError) {
      showStatus("Could not load synced settings.", "error");
      buildUI({ ...DEFAULTS });
      return;
    }
    buildUI(normalizeSettings(stored));
  });
})();
