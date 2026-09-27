import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (name) => fs.readFileSync(name, "utf8");
const widgets = read("lib/admin/widgets.ts");
const action = read("app/admin/(dashboard)/clients/[id]/widget/actions.ts");
const editor = read("app/admin/(dashboard)/clients/[id]/widget/WidgetAppearanceEditor.tsx");
const portal = read("app/portal/(dashboard)/widget/page.tsx");
const admin = read("app/admin/(dashboard)/clients/[id]/widget/page.tsx");
const embedded = read("components/widget/EmbeddedClientWidget.tsx");
const migration = read("supabase/v2.23-widget-panel-size.sql");
const exportRoute = read("app/api/portal/data-export/route.ts");
const loader = read("public/widget.js");

const checks = [
  ["minimum matches original live panel 390 x 570", widgets.includes("WIDGET_PANEL_MIN_WIDTH = 390") && widgets.includes("WIDGET_PANEL_MIN_HEIGHT = 570")],
  ["maximum is 520 x 760", widgets.includes("WIDGET_PANEL_MAX_WIDTH = 520") && widgets.includes("WIDGET_PANEL_MAX_HEIGHT = 760")],
  ["widget config selects both stored dimensions", widgets.includes("panel_background, panel_width, panel_height, position")],
  ["server bounds both form values", action.includes('boundedPanelSize(formData.get("panelWidth")') && action.includes('boundedPanelSize(formData.get("panelHeight")') && action.includes("panel_width: panelWidth") && action.includes("panel_height: panelHeight")],
  ["shared editor has width and height controls", editor.includes('name="panelWidth"') && editor.includes('name="panelHeight"') && editor.includes("setPanelWidth(WIDGET_PANEL_MIN_WIDTH)") && editor.includes("setPanelHeight(WIDGET_PANEL_MIN_HEIGHT)")],
  ["admin and portal use same editor", admin.includes("<WidgetAppearanceEditor") && portal.includes("<WidgetAppearanceEditor")],
  ["preview sizes use slider values", editor.includes("width: panelWidth") && editor.includes("height: panelHeight")],
  ["embedded panel clamps to viewport", embedded.includes("max-h-[calc(100vh-108px)]") && embedded.includes("max-w-[calc(100vw-20px)]") && embedded.includes("width: widgetConfig.panel_width") && embedded.includes("height: widgetConfig.panel_height")],
  ["iframe receives panel size message", embedded.includes("panelWidth: widgetConfig.panel_width") && embedded.includes("panelHeight: widgetConfig.panel_height")],
  ["new columns default to original size and have DB checks", migration.includes("default 390") && migration.includes("default 570") && migration.includes("panel_width between 390 and 520") && migration.includes("panel_height between 570 and 760")],
  ["client data export includes both dimensions", exportRoute.includes("panel_background, panel_width, panel_height, position")],
];

// Execute the real embeddable loader against a tiny DOM to verify it allocates
// enough iframe space for the requested size and remains responsive.
function widgetHarness() {
  const handlers = {};
  const script = {
    src: "https://momo.example/widget.js",
    getAttribute(name) { return name === "data-agent" ? "0123456789abcdef0123456789abcdef" : null; },
  };
  const created = [];
  const document = {
    currentScript: script,
    body: { appendChild(element) { element.isConnected = true; } },
    querySelector() { return null; },
    createElement(tag) {
      const element = {
        tag, style: {}, contentWindow: {}, isConnected: false,
        setAttribute() {}, addEventListener() {},
      };
      created.push(element);
      return element;
    },
    addEventListener(name, fn) { handlers[`document:${name}`] = fn; },
  };
  const window = {
    location: { href: "https://client.example/" },
    innerWidth: 1400,
    innerHeight: 1000,
    addEventListener(name, fn) { handlers[name] = fn; },
  };
  vm.runInNewContext(loader, { document, window, URL, console });
  const iframe = created.find((entry) => entry.tag === "iframe");
  assert.ok(iframe, "the loader must create an iframe");
  const send = (panelWidth, panelHeight, open = true) => handlers.message({
    origin: "https://momo.example",
    source: iframe.contentWindow,
    data: {
      type: "momo:widget-state", key: "0123456789abcdef0123456789abcdef",
      open, position: "right", launcherSize: 60,
      panelWidth, panelHeight,
    },
  });
  return { iframe, window, send, handlers };
}

const harness = widgetHarness();
harness.send(390, 570);
checks.push(["original widget iframe is 430 x 690", harness.iframe.style.width === "430px" && harness.iframe.style.height === "690px"]);
harness.send(520, 760);
checks.push(["larger widget iframe is 560 x 880", harness.iframe.style.width === "560px" && harness.iframe.style.height === "880px"]);
harness.send(1, 1);
checks.push(["loader prevents undersized iframe via message", harness.iframe.style.width === "430px" && harness.iframe.style.height === "690px"]);
harness.send(9999, 9999);
checks.push(["loader caps oversized iframe via message", harness.iframe.style.width === "560px" && harness.iframe.style.height === "880px"]);
harness.window.innerWidth = 390;
harness.window.innerHeight = 640;
harness.handlers.resize();
checks.push(["mobile viewport gets full available size", harness.iframe.style.width === "390px" && harness.iframe.style.height === "640px"]);
harness.send(520, 760, false);
checks.push(["closed widget returns to compact launcher", harness.iframe.style.width === "116px" && harness.iframe.style.height === "116px"]);

for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(`\n${checks.length}/${checks.length} checks passed.`);
