import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(root, "supabase", "v2.33-knowledge-foundation.sql");
const verificationPath = path.join(root, "supabase", "v2.33-readonly-knowledge-verification.sql");
const qaPath = path.join(root, "scripts", "V2.33-QA.md");

const migration = fs.readFileSync(migrationPath, "utf8");
const verification = fs.readFileSync(verificationPath, "utf8");
const qa = fs.readFileSync(qaPath, "utf8");

const checks = [
  ["sales base language model", migration.includes("O plano base inclui um único idioma principal")],
  ["sales multilingual upgrade", migration.includes("custo adicional")],
  ["sales no-website knowledge", migration.includes("website-not-required")],
  ["sales portal overview", migration.includes("client-portal-overview")],
  ["support primary-language policy", migration.includes("momo-support-primary-language")],
  ["support tone comparison", migration.includes("momo-support-agent-tones")],
  ["support unsupported language behaviour", migration.includes("language is not supported")],
  ["support widget bounds", migration.includes("390 x 570") && migration.includes("520 x 760")],
  ["support compact URL display", migration.includes("compact readable form")],
  ["support Owner/Member rules", migration.includes("Owner cannot remove another Owner")],
  ["support self deletion", migration.includes("momo-support-account-self-deletion")],
  ["support ticket resolve and unread", migration.includes("mark a ticket as resolved") && migration.includes("unread alert")],
  ["support cancellation recovery", migration.includes("90-day recovery window")],
  ["support login persistence", migration.includes("momo-support-login-session")],
  ["changed entries invalidate embeddings", migration.includes("embedding = null")],
  ["verification requires indexed entries", verification.includes("all_public_entries_indexed")],
  ["QA tests both agents", qa.includes("## Sales questions") && qa.includes("## Support questions")],
  ["no long em dash in migration", !migration.includes("—")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS - ${label}`);
  else {
    failed += 1;
    console.error(`FAIL - ${label}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
