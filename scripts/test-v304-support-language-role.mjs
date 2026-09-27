import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const route = read("app/api/portal/support/chat/route.ts");
const prompt = read("lib/ai/prompts/portal-support.ts");
const knowledge = read("lib/knowledge/portal-support-knowledge.ts");

const checks = [
  ["support detects conversation language", route.includes("detectSupportLanguage")],
  ["fallback language follows support language", route.includes("const language = responseLanguage")],
  ["prompt receives response language", route.includes("responseLanguage,")],
  ["json parser extracts object from wrapped output", route.includes("firstBrace") && route.includes("lastBrace")],
  ["support language independent of organization primary", prompt.includes("independent of the organization primary language")],
  ["authenticated role is authoritative", prompt.includes("server-provided role is authoritative")],
  ["support does not ask role", prompt.includes("Never ask the user whether they are an Owner or Member")],
  ["member owner-only guidance prevented", prompt.includes("Do not give a Member Owner-only steps")],
  ["owner can remove members", prompt.includes("An Owner can remove Members")],
  ["owner cannot remove owner", prompt.includes("cannot remove another Owner")],
  ["support retrieval uses latest question only", knowledge.includes("const query = latestMessage.slice(0, 4000)")],
  ["support has lexical retrieval", knowledge.includes("lexicalSupportKnowledge")],
  ["support semantic threshold hardened", knowledge.includes("match_threshold: 0.3")],
  ["support merges lexical and semantic", knowledge.includes("mergeSupportKnowledgeMatches")],
];

let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (ok) pass += 1;
}
console.log(`\n${pass}/${checks.length} checks passed.`);
if (pass !== checks.length) process.exit(1);
