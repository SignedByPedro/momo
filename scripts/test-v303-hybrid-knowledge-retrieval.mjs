import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const knowledgePath = path.join(root, "lib", "knowledge", "momo-knowledge.ts");
const source = fs.readFileSync(knowledgePath, "utf8");

const checks = [
  ["uses current question only for semantic search", source.includes("const query = latestMessage.slice(0, 4000)")],
  ["no RECENT CONTEXT embedding dilution", !source.includes("RECENT CONTEXT:")],
  ["hybrid lexical retrieval exists", source.includes("async function lexicalKnowledge")],
  ["lexical rank checks title", source.includes("titleWords.has(token)")],
  ["lexical rank checks category", source.includes("categoryWords.has(token)")],
  ["lexical rank checks content", source.includes("contentWords.has(token)")],
  ["lexical matches are merged before semantic matches", source.includes("[...lexicalMatches, ...semanticMatches]")],
  ["semantic threshold widened for recall", source.includes("match_threshold: 0.3")],
  ["semantic match count widened", source.includes("match_count: 8")],
  ["hybrid result capped", source.includes("if (merged.length >= 8) break")],
  ["lexical fallback survives embedding failures", source.includes("using lexical/fallback")],
  ["sales scope remains momo-sales only", source.includes('.eq("agent_key", "momo-sales")')],
  ["only public knowledge is retrieved", source.includes('.eq("visibility", "public")')],
  ["only published knowledge is retrieved", source.includes('.eq("status", "published")')],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log(`PASS - ${label}`);
    passed += 1;
  } else {
    console.error(`FAIL - ${label}`);
  }
}

console.log(`\n${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
