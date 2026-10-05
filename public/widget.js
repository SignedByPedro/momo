(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var key = (script.getAttribute("data-agent") || "").trim();
  if (!key) {
    console.error("[Momo] Missing data-agent on widget script.");
    return;
  }

  var scriptUrl;
  try {
    scriptUrl = new URL(script.src, window.location.href);
  } catch {
    return;
  }

  var momoOrigin = scriptUrl.origin;
  var existing = document.querySelector('iframe[data-momo-agent="' + key + '"]');
  if (existing) return;

  var iframe = document.createElement("iframe");
  iframe.src = momoOrigin + "/embed/" + encodeURIComponent(key);
  iframe.title = "Customer support chat";
  iframe.setAttribute("data-momo-agent", key);
  iframe.setAttribute("aria-label", "Customer support chat");
  iframe.style.position = "fixed";
  iframe.style.bottom = "0";
  iframe.style.right = "0";
  iframe.style.width = "116px";
  iframe.style.height = "116px";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.colorScheme = "normal";
  iframe.style.zIndex = "2147483000";
  iframe.style.overflow = "hidden";
  // Do not animate iframe dimensions. Resizing the browsing context on every
  // animation frame makes the embedded UI feel less fluid on host websites.
  // The visible chat panel handles the opening animation inside the iframe.
  iframe.style.transition = "none";
  iframe.style.filter = "none";

  // The hover label lives in the host document rather than inside the iframe.
  // This avoids clipping without making a large transparent iframe block the site.
  var hoverLabel = document.createElement("div");
  hoverLabel.setAttribute("data-momo-hover-label", key);
  hoverLabel.style.position = "fixed";
  hoverLabel.style.zIndex = "2147483001";
  hoverLabel.style.pointerEvents = "none";
  hoverLabel.style.whiteSpace = "nowrap";
  hoverLabel.style.padding = "6px 12px";
  hoverLabel.style.borderRadius = "999px";
  hoverLabel.style.border = "1px solid rgba(255,255,255,.08)";
  hoverLabel.style.background = "#171717";
  hoverLabel.style.color = "#B8B8B8";
  hoverLabel.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  hoverLabel.style.fontSize = "12px";
  hoverLabel.style.lineHeight = "18px";
  hoverLabel.style.boxShadow = "0 8px 24px rgba(0,0,0,.22)";
  hoverLabel.style.backdropFilter = "blur(12px)";
  hoverLabel.style.webkitBackdropFilter = "blur(12px)";
  hoverLabel.style.opacity = "0";
  hoverLabel.style.visibility = "hidden";
  hoverLabel.style.transition = "opacity 180ms ease, transform 180ms ease, visibility 180ms ease";

  var lastState = {
    open: false,
    position: "right",
    launcherSize: 60,
    panelWidth: 390,
    panelHeight: 570,
    launcherHovered: false,
    hoverLabelText: "",
    hoverLabelEnabled: false,
    hoverLabelBackground: "#171717",
    hoverLabelTextColor: "#B8B8B8",
  };

  function positionHoverLabel(state) {
    var left = state.position === "left";
    var launcherSize = Number(state.launcherSize) || 60;
    var verticalCenterFromBottom = 16 + launcherSize / 2;

    hoverLabel.style.bottom = "auto";
    hoverLabel.style.top = "calc(100% - " + verticalCenterFromBottom + "px)";
    hoverLabel.style.transform = "translateY(-50%)";

    if (left) {
      hoverLabel.style.left = 16 + launcherSize + 10 + "px";
      hoverLabel.style.right = "auto";
    } else {
      hoverLabel.style.right = 16 + launcherSize + 10 + "px";
      hoverLabel.style.left = "auto";
    }
  }

  function updateHoverLabel(state) {
    hoverLabel.textContent = state.hoverLabelText || "";
    hoverLabel.style.background = state.hoverLabelBackground || "#171717";
    hoverLabel.style.color = state.hoverLabelTextColor || "#B8B8B8";
    positionHoverLabel(state);

    var visible =
      !state.open &&
      state.hoverLabelEnabled &&
      state.launcherHovered &&
      Boolean(state.hoverLabelText) &&
      window.innerWidth >= 520;

    hoverLabel.style.opacity = visible ? "1" : "0";
    hoverLabel.style.visibility = visible ? "visible" : "hidden";
    hoverLabel.style.transform = visible
      ? "translateY(-50%) translateX(0)"
      : "translateY(-50%) translateX(" + (state.position === "left" ? "-4px" : "4px") + ")";
  }

  function applyState(state) {
    lastState = state;
    var open = Boolean(state.open);
    var left = state.position === "left";
    var launcherSize = Number(state.launcherSize) || 60;

    iframe.style.left = left ? "0" : "auto";
    iframe.style.right = left ? "auto" : "0";

    if (!open) {
      var closedSize = Math.max(116, launcherSize + 56);
      iframe.style.width = closedSize + "px";
      iframe.style.height = closedSize + "px";
      updateHoverLabel(state);
      return;
    }

    updateHoverLabel(state);

    var mobile = window.innerWidth < 520;
    var panelWidth = Math.min(520, Math.max(390, Number(state.panelWidth) || 390));
    var panelHeight = Math.min(760, Math.max(570, Number(state.panelHeight) || 570));
    var width = mobile ? window.innerWidth : Math.min(panelWidth + 40, window.innerWidth);
    var height = mobile ? window.innerHeight : Math.min(panelHeight + 120, window.innerHeight);
    iframe.style.width = width + "px";
    iframe.style.height = height + "px";
  }

  function onMessage(event) {
    if (event.origin !== momoOrigin || event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== "momo:widget-state" || data.key !== key) return;

    applyState({
      open: Boolean(data.open),
      position: data.position === "left" ? "left" : "right",
      launcherSize: Number(data.launcherSize) || 60,
      panelWidth: Number(data.panelWidth) || 390,
      panelHeight: Number(data.panelHeight) || 570,
      launcherHovered: Boolean(data.launcherHovered),
      hoverLabelText: typeof data.hoverLabelText === "string" ? data.hoverLabelText : "",
      hoverLabelEnabled: Boolean(data.hoverLabelEnabled),
      hoverLabelBackground: typeof data.hoverLabelBackground === "string" ? data.hoverLabelBackground : "#171717",
      hoverLabelTextColor: typeof data.hoverLabelTextColor === "string" ? data.hoverLabelTextColor : "#B8B8B8",
    });
  }

  window.addEventListener("message", onMessage);
  window.addEventListener("resize", function () {
    applyState(lastState);
  });

  function mount() {
    if (!document.body || iframe.isConnected) return;
    document.body.appendChild(iframe);
    document.body.appendChild(hoverLabel);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
