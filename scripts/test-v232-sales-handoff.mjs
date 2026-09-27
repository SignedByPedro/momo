/**
 * Deterministic v2.32 regression tests for the public Momo sales handoff.
 * No OpenAI calls, crawling, database writes or production data.
 * Run: node scripts/test-v232-sales-handoff.mjs
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

function loadTs(file) {
  const source = readFileSync(path.join(root, file), "utf8");
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      strict: true,
    },
  });
  assert.equal(result.diagnostics?.length ?? 0, 0, `${file} should transpile`);
  const loadedModule = { exports: {} };
  runInNewContext(result.outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (dependency) => {
      throw Error(`Unexpected runtime dependency in ${file}: ${dependency}`);
    },
  }, { filename: file });
  return loadedModule.exports;
}

const { deriveConversationState, websiteSharedInLatestUserTurn } = loadTs("lib/conversations/state.ts");
const { momoSalesPrompt } = loadTs("lib/ai/prompts/sales.ts");
const user = (text) => ({ role: "user", parts: [{ type: "text", text }] });
const assistant = (text) => ({ role: "assistant", parts: [{ type: "text", text }] });
const previousExamples = "Num centro de explicações, o Momo responde a dúvidas sobre disciplinas, horários, preços e inscrições.";
const beforeWebsite = [
  user("Sou um centro de explicações"),
  assistant(previousExamples + " Partilha o site se quiseres uma análise."),
  user("Não tenho um site"),
  assistant("Não precisas de ter um site. Podemos configurar o Momo com os dados do centro."),
];
const website = user("Afinal tenho site e é este https://www.exemplo-academia.pt/");
let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
}

test("a tutoring centre is recognised without requiring a website", () => {
  const state = deriveConversationState([beforeWebsite[0]], "pt");
  assert.equal(state.businessType, "centro de explicações");
  assert.equal(state.stage, "business_known");
});

test("a centre without a website does not receive the same list again", () => {
  const state = deriveConversationState(beforeWebsite, "pt");
  const prompt = momoSalesPrompt(state, false, false);
  assert.match(prompt, /do not repeat a list of use cases you have already given/i);
  assert.match(prompt, /do not keep asking for a website/i);
});

test("sharing a new website after earlier examples triggers site-specific analysis", () => {
  const messages = [...beforeWebsite, website];
  const state = deriveConversationState(messages, "pt");
  assert.equal(websiteSharedInLatestUserTurn(messages), true);
  assert.equal(state.stage, "website_received");
  const prompt = momoSalesPrompt(state, true, true);
  assert.match(prompt, /NEW WEBSITE SHARED: SHOW NEW, SITE-SPECIFIC VALUE/);
  assert.match(prompt, /do NOT list the same ones again/);
  assert.match(prompt, /WEBSITE ANALYSIS/);
});

test("successful analysis ends with an optional contact CTA in the same reply", () => {
  const state = deriveConversationState([...beforeWebsite, website], "pt");
  const prompt = momoSalesPrompt(state, true, true);
  assert.match(prompt, /OPTIONAL contact invitation at the end of THIS SAME reply/);
  assert.match(prompt, /Se estas ideias fizerem sentido/);
  assert.match(prompt, /teu nome e o melhor contacto, email ou telefone/);
  assert.doesNotMatch(prompt, /Estas ideias seriam úteis\?/);
});

test("a website alone never implies permission to contact the visitor", () => {
  const prompt = momoSalesPrompt(deriveConversationState([...beforeWebsite, website], "pt"), true, true);
  assert.match(prompt, /Sharing a URL alone is NOT consent to sales follow-up/);
  assert.match(prompt, /if the ideas seem useful/);
});

test("if a name is already known the CTA requests contact only", () => {
  const messages = [user("Chamo-me Maria. Sou um centro de explicações."), website];
  const prompt = momoSalesPrompt(deriveConversationState(messages, "pt"), true, true);
  assert.match(prompt, /Maria, deixa-me o melhor contacto/);
  assert.doesNotMatch(prompt, /Maria, deixa-me o teu nome/);
});

test("if contact is already known the website CTA is omitted", () => {
  const state = deriveConversationState([user("O meu email é maria@academia.pt"), website], "pt");
  assert.equal(state.lead.hasContact, true);
  const prompt = momoSalesPrompt(state, true, true);
  assert.match(prompt, /Do not ask again or include another contact invitation/);
});

test("an explicit proposal request and new URL get analysis plus contact in one reply", () => {
  const messages = [user("Quero uma proposta para o centro. Site: https://academia.pt")];
  const state = deriveConversationState(messages, "pt");
  assert.equal(state.stage, "lead_requested");
  const prompt = momoSalesPrompt(state, true, true);
  assert.match(prompt, /After showing the tailored value, ask for the minimum missing contact details in this same reply/);
});

test("a visitor's yes after the CTA moves straight to contact collection", () => {
  const messages = [...beforeWebsite, website,
    assistant("Encontrei oportunidades no site. Se estas ideias fizerem sentido, deixa-me o teu nome e o melhor contacto, email ou telefone."),
    user("sim"),
  ];
  const state = deriveConversationState(messages, "pt");
  assert.equal(state.stage, "lead_requested");
  const prompt = momoSalesPrompt(state, true, false);
  assert.match(prompt, /THE VISITOR HAS AGREED TO FOLLOW-UP/);
});

test("a later turn does not trigger another full analysis or another URL invitation", () => {
  const messages = [...beforeWebsite, website,
    assistant("Analisei o site e encontrei novas oportunidades."),
    user("E como funciona a configuração?"),
  ];
  assert.equal(websiteSharedInLatestUserTurn(messages), false);
  const prompt = momoSalesPrompt(deriveConversationState(messages, "pt"), true, false);
  assert.match(prompt, /WEBSITE WAS SHARED EARLIER/);
  assert.match(prompt, /do not repeat the whole analysis/);
});

test("failed analysis does not invent site findings or assume consent", () => {
  const prompt = momoSalesPrompt(deriveConversationState([...beforeWebsite, website], "pt"), false, true);
  assert.match(prompt, /NEW WEBSITE SHARED BUT ANALYSIS FAILED/);
  assert.match(prompt, /Do not pretend you inspected it/);
});

test("sales prompts keep the established no-em-dash rule", () => {
  const cases = [
    momoSalesPrompt(deriveConversationState(beforeWebsite, "pt")),
    momoSalesPrompt(deriveConversationState([...beforeWebsite, website], "pt"), true, true),
  ];
  for (const prompt of cases) assert.doesNotMatch(prompt, /\u2014/);
});

process.stdout.write(`\n${passed}/${passed} deterministic checks passed.\n`);
