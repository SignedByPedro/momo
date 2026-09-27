import fs from "node:fs";

const prompt = fs.readFileSync("lib/ai/prompts/client-agent.ts", "utf8");
const portal = fs.readFileSync("app/portal/(dashboard)/agent/page.tsx", "utf8");
const action = fs.readFileSync("app/admin/(dashboard)/clients/[id]/agent/actions.ts", "utf8");
const settings = fs.readFileSync("app/portal/(dashboard)/settings/actions.ts", "utf8");
const adminSettings = fs.readFileSync("app/admin/(dashboard)/clients/actions.ts", "utf8");

const checks = [
  ["unsupported language is blocked", prompt.includes("DO NOT answer, translate, summarise or act on the request")],
  ["Portuguese notice exists", prompt.includes("este chat só está disponível em português")],
  ["English notice exists", prompt.includes("this chat is only available in English")],
  ["neutral content exception exists", prompt.includes("URLs, email addresses, names, phone numbers")],
  ["portal cannot select language checkboxes", !portal.includes('name="supportedLanguages"')],
  ["portal explains base language policy", portal.includes("O plano base inclui o idioma principal")],
  ["server preserves portal language entitlement", action.includes('access.surface === "portal"') && action.includes("existingConfig?.supported_languages")],
  ["single-language agent follows Admin-selected primary language", adminSettings.includes("syncSingleLanguageAgentLanguage")],
  ["Portal cannot change primary language", !settings.includes("primary_language: primaryLanguage") && !settings.includes("syncSingleLanguageAgentLanguage")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (!ok) failed += 1;
}

if (failed) process.exit(1);
console.log(`\n${checks.length}/${checks.length} checks passed.`);
