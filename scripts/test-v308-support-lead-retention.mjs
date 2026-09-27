import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const promptPath = path.join(root, "lib", "ai", "prompts", "portal-support.ts");
const migrationPath = path.join(root, "supabase", "v3.8-support-lead-retention-clarification.sql");

const prompt = fs.readFileSync(promptPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

const checks = [
  ["prompt has fixed lead retention policy", prompt.includes("FIXED PLATFORM POLICY: LEAD RETENTION")],
  ["prompt blocks immediate deletion claim", prompt.includes("Do not claim that marking a lead as lost triggers an immediate automatic deletion")],
  ["informational deletion question does not escalate", prompt.includes("is an informational policy question, not a privacy deletion request") && prompt.includes("set escalate=false")],
  ["explicit deletion requests can escalate", prompt.includes("actually asks the team to delete personal data now")],
  ["generic privacy escalation distinguishes questions", prompt.includes("A general question about retention or deletion behaviour is not by itself a deletion request")],
  ["migration updates support retention policy", migration.includes("slug = 'momo-support-retention-policy'")],
  ["migration updates support lead retention", migration.includes("slug = 'momo-support-lead-retention'")],
  ["migration adds focused lost-lead entry", migration.includes("momo-support-lost-lead-deletion-timing")],
  ["focused entry includes Portuguese query wording", migration.includes("Se eu marcar uma lead como perdida")],
  ["focused entry says no ticket for informational question", migration.includes("answered directly without opening a ticket")],
  ["migration uses global slug conflict target", migration.includes("on conflict (slug) do update")],
  ["migration clears embeddings for reindex", (migration.match(/embedding = null/g) || []).length >= 2],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) failed += 1;
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
