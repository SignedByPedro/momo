/** Deterministic v2.22 regression checks. No external API/database calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
function source(filename) { return fs.readFileSync(filename, "utf8"); }
function loadModule(filename, imports = {}) {
  const { outputText, diagnostics } = ts.transpileModule(source(filename), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(diagnostics?.length ?? 0, 0, `${filename} should transpile`);
  const loadedModule = { exports: {} };
  runInNewContext(outputText, {
    module: loadedModule, exports: loadedModule.exports,
    require: (name) => {
      assert.ok(name in imports, `Unexpected dependency ${name} in ${filename}`);
      return imports[name];
    },
  }, { filename });
  return loadedModule.exports;
}
const profiles = loadModule("lib/ai/prompts/agent-tones.ts");
const standard = loadModule("lib/ai/prompts/natural-style.ts");
const client = loadModule("lib/ai/prompts/client-agent.ts", {
  "./agent-tones": profiles, "./natural-style": standard,
});
const tones = ["professional_friendly", "friendly", "direct", "formal"];
let passed = 0;
function test(name, fn) { fn(); console.log("PASS", name); passed++; }

test("all four existing tones have distinct detailed instructions and display descriptions", () => {
  assert.deepEqual(Array.from(profiles.AGENT_TONES), tones);
  const instructions = tones.map((tone) => profiles.toneInstructions(tone));
  assert.equal(new Set(instructions).size, 4);
  for (const tone of tones) {
    const info = profiles.agentToneProfiles[tone];
    assert.ok(info.labelPt && info.labelEn && info.descriptionPt && info.descriptionEn);
    assert.ok(profiles.toneInstructions(tone).length > 280);
  }
});
test("each tone is used in the real client-agent prompt", () => {
  const prompts = tones.map((tone) => client.buildClientAgentSystemPrompt({
    organization: { name: "Test Shop", business_type: "retail", website: null, country: "PT", primary_language: "pt" },
    config: {
      name: "Assistente", supported_languages: ["pt"], tone, objective: "customer_support",
      goals: ["answer_questions"], contact_capture_mode: "passive", human_handoff_enabled: true,
      fallback_behavior: "say_unknown", custom_instructions: "",
    },
    isPreview: true,
  }));
  assert.equal(new Set(prompts).size, 4);
  prompts.forEach((prompt, i) => {
    assert.ok(prompt.includes(profiles.toneInstructions(tones[i])));
    assert.match(prompt, /NATURAL CONVERSATION STANDARD/);
    assert.match(prompt, /PUBLIC CLIENT KNOWLEDGE/);
    assert.match(prompt, /INTERNAL ADMIN PREVIEW/);
    assert.doesNotMatch(prompt, /\u2014/);
  });
});
const route = source("app/api/admin/clients/[id]/tone-compare/route.ts");
const panel = source("app/admin/(dashboard)/clients/[id]/agent/ToneSelector.tsx");
const admin = source("app/admin/(dashboard)/clients/[id]/agent/page.tsx");
const portal = source("app/portal/(dashboard)/agent/page.tsx");
test("comparison endpoint requires preview authorization and trusted origin", () => {
  assert.match(route, /canPreviewOrganization\(id\)/);
  assert.match(route, /requestHasTrustedOrigin\(req\)/);
});
test("comparisons share one question and the same knowledge across four tone variants", () => {
  assert.match(route, /retrieveClientKnowledge\(id, question\)/);
  assert.match(route, /AGENT_TONES\.map/);
  assert.match(route, /config: \{ \.\.\.config, tone \}/);
  assert.match(route, /prompt: question/);
});
test("comparison is rate limited and does not create actual contacts", () => {
  assert.match(route, /namespace: "agent-tone-comparison"/);
  assert.match(route, /limit: 6/);
  assert.match(route, /isPreview: true/);
  assert.doesNotMatch(route, /\.from\("leads"\)|saveLead|storeLead/);
});
test("Admin and Portal both show comparison and allow choosing without changing supported languages", () => {
  assert.match(admin, /<ToneSelector /);
  assert.match(portal, /<ToneSelector /);
  assert.match(panel, /setTone\(entry\)/);
  assert.match(panel, /name="tone" value=\{tone\}/);
  assert.match(portal, /O plano base inclui o idioma principal/);
});
test("comparison has editable, pre-filled recommended questions in PT and EN", () => {
  assert.match(panel, /Estou a pensar utilizar os vossos serviços/);
  assert.match(panel, /I'm considering your services/);
  assert.match(panel, /setQuestion\(event\.target\.value\)/);
});
console.log(`\n${passed}/${passed} v2.22 checks passed.`);
