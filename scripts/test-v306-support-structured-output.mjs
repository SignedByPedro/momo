import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const route = read("app/api/portal/support/chat/route.ts");
const prompt = read("lib/ai/prompts/portal-support.ts");

const checks = [
  ["AI SDK structured output imported", route.includes("jsonSchema, Output") || route.includes("Output, jsonSchema")],
  ["support decision JSON schema exists", route.includes("const supportDecisionSchema = jsonSchema<SupportDecision>")],
  ["schema requires reply", route.includes('required: ["reply", "escalate", "category", "priority", "subject", "summary"]')],
  ["structured output used for primary support generation", route.includes("output: Output.object({")],
  ["structured result normalized directly", route.includes("normalizeDecision(result.output, language)")],
  ["manual text parser retained only as retry fallback", route.includes("retrying with text JSON") && route.includes("parseDecision(retry.text, language)")],
  ["failed retry has safe fallback", route.includes("decision = fallbackDecision(language)")],
  ["prompt describes schema-enforced response", prompt.includes("schema-enforced structured output")],
  ["no prompt-only JSON dependency", !prompt.includes("Return ONLY one valid JSON object")],
  ["support role awareness preserved", prompt.includes("server-provided role is authoritative")],
  ["support language independence preserved", prompt.includes("independent of the organization primary language")],
];

let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (ok) pass += 1;
}
console.log(`\n${pass}/${checks.length} checks passed.`);
if (pass !== checks.length) process.exit(1);
