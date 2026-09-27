import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "supabase", "v2.34-business-policies-knowledge.sql"), "utf8");
const verification = fs.readFileSync(path.join(root, "supabase", "v2.34-readonly-business-policies-verification.sql"), "utf8");
const supportPrompt = fs.readFileSync(path.join(root, "lib", "ai", "prompts", "portal-support.ts"), "utf8");
const supportRoute = fs.readFileSync(path.join(root, "app", "api", "portal", "support", "chat", "route.ts"), "utf8");
const policyDoc = fs.readFileSync(path.join(root, "scripts", "V2.34-BUSINESS-POLICIES.md"), "utf8");
const qa = fs.readFileSync(path.join(root, "scripts", "V2.34-QA.md"), "utf8");

const checks = [
  ["sales onboarding remains case by case", migration.includes("analisado caso a caso")],
  ["sales base plan scope exists", migration.includes("base-plan-scope") && migration.includes("um idioma principal")],
  ["setup fee and prepaid monthly billing documented", migration.includes("taxa de setup") && migration.includes("mensal") && migration.includes("antecipadamente")],
  ["failed payment grace period is seven days", migration.includes("7 dias") && migration.includes("Portal permanece acessível")],
  ["no mandatory commitment", migration.includes("Não existe fidelização")],
  ["three month recommendation documented", migration.includes("três meses")],
  ["twelve month conversation and support retention documented", migration.includes("12 meses")],
  ["backup deletion has no invented deadline", migration.includes("não devem ser inventados") || migration.includes("Do not promise a fixed backup-erasure deadline")],
  ["sales does not promise advanced unconfirmed features", migration.includes("não devem ser apresentadas como disponíveis")],
  ["support integration questions require confirmation before ticket", migration.includes("should not create a ticket automatically")],
  ["support prompt separates feature ideas from automatic escalation", supportPrompt.includes("does NOT create a ticket automatically")],
  ["support prompt uses low priority for confirmed feature suggestions", supportPrompt.includes('category="feature" with priority="low"')],
  ["support prompt protects credentials in ticket summary", supportPrompt.includes("Never include passwords, access tokens, API keys")],
  ["forced route no longer auto-detects generic feature requests", !supportRoute.includes("const featureRequest =")],
  ["forced route no longer auto-detects generic integration requests", !supportRoute.includes("const integrationRequest =")],
  ["explicit ticket requests are still forced to escalate", supportRoute.includes("pedido de suporte") && supportRoute.includes("support request")],
  ["privacy and security remain forced high priority", supportRoute.includes('priority: "high"') && supportRoute.includes("privacyOrSecurity")],
  ["verification checks reindex status", verification.includes("all_public_entries_indexed")],
  ["canonical policy doc records pending lead cleanup alignment", policyDoc.includes("Lead cleanup implementation note")],
  ["QA covers Primavera knowledge evolution example", qa.includes("Primavera")],
  ["no em dash in v2.34 migration", !migration.includes("—")],
  ["no em dash in support prompt", !supportPrompt.includes("—")],
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
