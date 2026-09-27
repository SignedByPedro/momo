/**
 * Deterministic prompt/state regressions, with no API calls or database writes.
 * Run after npm ci: node scripts/test-v217-conversation.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadTs(filename, imports = {}) {
  const source = readFileSync(path.join(root, filename), "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      strict: true,
    },
  });
  assert.equal(diagnostics?.length ?? 0, 0, `${filename} should transpile cleanly`);
  const loadedModule = { exports: {} };
  runInNewContext(outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (name) => {
      assert.ok(name in imports, `Unexpected runtime dependency ${name} in ${filename}`);
      return imports[name];
    },
  }, { filename });
  return loadedModule.exports;
}

const style = loadTs("lib/ai/prompts/natural-style.ts");
const stateModule = loadTs("lib/conversations/state.ts");
const salesModule = loadTs("lib/ai/prompts/sales.ts");
const coreModule = loadTs("lib/ai/prompts/core.ts", {
  "./natural-style": style,
  "./sales": salesModule,
});
const toneModule = loadTs("lib/ai/prompts/agent-tones.ts");
const clientModule = loadTs("lib/ai/prompts/client-agent.ts", { "./natural-style": style, "./agent-tones": toneModule });
const supportModule = loadTs("lib/ai/prompts/portal-support.ts", { "./natural-style": style });
const { deriveConversationState, websiteSharedInLatestUserTurn } = stateModule;
const { momoSalesPrompt } = salesModule;

const user = (text) => ({ role: "user", parts: [{ type: "text", text }] });
const assistant = (text) => ({ role: "assistant", parts: [{ type: "text", text }] });
let passed = 0;
function test(label, fn) {
  fn();
  passed += 1;
  process.stdout.write(`PASS ${label}\n`);
}

const urlOnly = [user("Tenho uma loja. O meu site é https://exemplo.pt/colecao?campaign=123456789.")];
const siteState = deriveConversationState(urlOnly, "pt");

test("a website shared in the latest user turn triggers site analysis priority", () => {
  assert.equal(websiteSharedInLatestUserTurn(urlOnly), true);
  assert.equal(siteState.stage, "website_received");
  assert.equal(siteState.lead.hasContact, false);
  const prompt = momoSalesPrompt(siteState, true, true);
  assert.match(prompt, /NEW WEBSITE SHARED: SHOW NEW, SITE-SPECIFIC VALUE/);
  assert.match(prompt, /Sharing a URL alone is NOT consent to sales follow-up/);
  assert.match(prompt, /OPTIONAL contact invitation at the end of THIS SAME reply/);
});

test("a website and explicit proposal request in the same turn still trigger analysis first", () => {
  const messages = [user("Quero uma proposta. O meu website é https://loja.pt")];
  const state = deriveConversationState(messages, "pt");
  assert.equal(state.stage, "lead_requested");
  assert.equal(websiteSharedInLatestUserTurn(messages), true);
  const prompt = momoSalesPrompt(state, true, true);
  assert.match(prompt, /NEW WEBSITE SHARED: SHOW NEW, SITE-SPECIFIC VALUE/);
  assert.match(prompt, /explicitly asked to progress/);
});

test("site-analysis failure cannot lead to an invented site audit", () => {
  const prompt = momoSalesPrompt(siteState, false, true);
  assert.match(prompt, /NEW WEBSITE SHARED BUT ANALYSIS FAILED/);
  assert.match(prompt, /Do not pretend you inspected it/);
});

test("a later question about an already-shared site does not trigger a full analysis again", () => {
  const messages = [user("https://exemplo.pt"), assistant("Vi algumas oportunidades no teu site."), user("E como funcionaria a instalação?")];
  const state = deriveConversationState(messages, "pt");
  assert.equal(websiteSharedInLatestUserTurn(messages), false);
  assert.match(momoSalesPrompt(state, true, false), /WEBSITE WAS SHARED EARLIER/);
});

test("an email alone cannot be mistaken for a website", () => {
  assert.equal(websiteSharedInLatestUserTurn([user("O meu email é pessoa@empresa.pt")]), false);
});

test("existing captured contact is not requested again", () => {
  const state = deriveConversationState([user("O meu email é pessoa@empresa.pt")], "pt");
  assert.equal(state.lead.hasContact, true);
  assert.match(momoSalesPrompt(state, false, false), /Contact capture is COMPLETE/);
});

test("shared style is used by sales, client agents and portal support", () => {
  const prompt = coreModule.buildMomoSystemPrompt(siteState, {
    websiteJustShared: true,
    websiteAnalysisAvailable: true,
    websiteContext: "WEBSITE ANALYSIS\nVerified: clothing store",
  });
  assert.match(prompt, /NATURAL CONVERSATION STANDARD/);
  assert.match(prompt, /website shared in the latest visitor message: yes/);
  assert.match(prompt, /NEW WEBSITE SHARED/);
  assert.doesNotMatch(prompt, /\u2014/, "Momo prompt should not contain em dashes");

  const client = clientModule.buildClientAgentSystemPrompt({
    organization: { name: "Loja Exemplo", business_type: "retalho", website: null, country: "PT", primary_language: "pt" },
    config: {
      name: "Assistente", supported_languages: ["pt"], tone: "friendly", objective: "sales_lead_generation",
      goals: ["answer_questions"], contact_capture_mode: "passive", human_handoff_enabled: true,
      fallback_behavior: "say_unknown", custom_instructions: "",
    },
  });
  assert.match(client, /NATURAL CONVERSATION STANDARD/);
  assert.match(client, /CONTACT CAPTURE IS PASSIVE/);
  assert.doesNotMatch(client, /\u2014/, "Client agent prompt should not contain em dashes");

  const support = supportModule.buildPortalSupportPrompt({
    organization: { name: "Loja Exemplo", website: null, business_type: "retalho", primary_language: "pt", status: "active" },
    role: "client_owner", agent: null, widget: null,
    knowledgeTotal: 0, knowledgeIndexed: 0, memberUsed: 1, memberLimit: 3,
  });
  assert.match(support, /NATURAL CONVERSATION STANDARD/);
  assert.match(support, /Return ONLY one valid JSON object/);
  assert.match(support, /minor factual detail.*absent from the guide/);
  assert.doesNotMatch(support, /\u2014/, "Support prompt should not contain em dashes");
});

process.stdout.write(`\n${passed} deterministic regressions passed.\n`);
