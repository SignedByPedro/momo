import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const cases = JSON.parse(read("scripts", "v300-knowledge-cases.json"));
const qa = read("scripts", "V3.0-KNOWLEDGE-QA.md");
const policy = read("scripts", "V2.34-BUSINESS-POLICIES.md");
const v233 = read("supabase", "v2.33-knowledge-foundation.sql");
const v234 = read("supabase", "v2.34-business-policies-knowledge.sql");
const salesPrompt = read("lib", "ai", "prompts", "sales.ts");
const corePrompt = read("lib", "ai", "prompts", "core.ts");
const supportPrompt = read("lib", "ai", "prompts", "portal-support.ts");
const supportRoute = read("app", "api", "portal", "support", "chat", "route.ts");

const salesCases = cases.filter((c) => c.agent === "momo-sales");
const supportCases = cases.filter((c) => c.agent === "momo-support");
const ids = new Set(cases.map((c) => c.id));
const requiredFields = ["id", "agent", "category", "severity", "prompt", "expected", "escalation"];

const checks = [
  ["QA matrix contains exactly 100 cases", cases.length === 100],
  ["QA matrix contains exactly 40 Sales cases", salesCases.length === 40],
  ["QA matrix contains exactly 60 Support cases", supportCases.length === 60],
  ["all QA case IDs are unique", ids.size === cases.length],
  ["all QA cases have required fields", cases.every((c) => requiredFields.every((field) => typeof c[field] === "string" && c[field].trim()))],
  ["Sales IDs cover S001-S040", Array.from({ length: 40 }, (_, i) => `S${String(i + 1).padStart(3, "0")}`).every((id) => ids.has(id))],
  ["Support IDs cover U001-U060", Array.from({ length: 60 }, (_, i) => `U${String(i + 1).padStart(3, "0")}`).every((id) => ids.has(id))],
  ["QA document states all critical cases must pass", qa.includes("Todos os cenários `critical` têm de passar")],
  ["QA document forbids em dash in agent responses", qa.includes("Nenhuma resposta deve usar o caractere `—`")],

  ["onboarding remains case by case", policy.includes("timeline is confirmed case by case") && v234.includes("analisado caso a caso")],
  ["base scope includes one primary language", policy.includes("One primary language") && v234.includes("um idioma principal")],
  ["exact prices remain undefined", policy.includes("Exact base-plan price") && corePrompt.includes("Never invent a company policy")],
  ["setup is paid at contracting", policy.includes("Setup fee: paid at contracting") && v234.includes("taxa de setup")],
  ["monthly billing begins after installation and publication", policy.includes("Monthly subscription starts when installation is complete and the widget is published")],
  ["billing is monthly prepaid and auto-renewing", policy.includes("Billing is monthly and prepaid") && policy.includes("Renewal is automatic")],
  ["failed payment grace period is seven days", policy.includes("Failed payment grace period: 7 days")],
  ["portal remains available after grace-period widget suspension", policy.includes("Portal access remains available")],
  ["no mandatory commitment", policy.includes("No mandatory commitment period")],
  ["three-month evaluation is recommendation only", policy.includes("recommendation, not a minimum term")],
  ["paid-period service continues after cancellation", policy.includes("end of the billing period already paid")],
  ["normal cancellation recovery is 90 days", policy.includes("90-day recovery window")],
  ["privacy deletion is separate from recovery", policy.includes("verified privacy deletion request is separate")],
  ["conversation retention is twelve months", policy.includes("Website conversations: up to 12 months")],
  ["normal resolved support ticket retention is twelve months", policy.includes("Normal resolved support tickets: 12 months")],
  ["normal log target is thirty days", policy.includes("Normal application logs: target 30 days")],
  ["security incident records can be retained for twelve months", policy.includes("Security-incident records: up to 12 months")],
  ["rate limit counters remain forty-eight hours", policy.includes("Rate-limit counters: 48 hours")],
  ["backup erasure deadline is not invented", policy.includes("Do not promise a fixed backup-erasure deadline")],

  ["primary-language change is team-controlled", v233.includes("primary language is displayed read-only") && v233.includes("managed by the Momo team")],
  ["multilingual upgrade does not allow primary-language edits", v233.includes("Multilingual chat does not give the client permission")],
  ["widget size limits are documented", v233.includes("390 x 570 px") && v233.includes("520 x 760 px")],
  ["support checks KB first for wrong agent answers", policy.includes("Support checks the relevant Knowledge Base first")],
  ["unconfirmed integrations must not be presented as available", policy.includes("Do not present a specific integration or advanced feature as available")],
  ["support prompt does not auto-ticket feature ideas", supportPrompt.includes("does NOT create a ticket automatically")],
  ["support route does not force generic feature/integration tickets", !supportRoute.includes("const featureRequest =") && !supportRoute.includes("const integrationRequest =")],
  ["explicit human/ticket requests are still forced", supportRoute.includes("humanRequest") && supportRoute.includes("pedido de suporte")],
  ["privacy and security forced escalation remains high priority", supportRoute.includes("privacyOrSecurity") && supportRoute.includes('priority: "high"')],
  ["support prompt forbids credentials in tickets", supportPrompt.includes("Never include passwords, access tokens, API keys")],
  ["sales prompt requires website analysis before handoff", salesPrompt.includes("Whenever the visitor shares a website URL") && salesPrompt.includes("FIRST show one to three specific opportunities")],
  ["sales prompt avoids repeating generic examples", salesPrompt.includes("prioritise new, website-specific findings instead of repeating them")],
  ["knowledge governance allows future confirmed integrations", policy.includes("If the team validates a new integration")],

  ["all QA prompts avoid em dash", cases.every((c) => !c.prompt.includes("—"))],
  ["all QA expected criteria avoid em dash", cases.every((c) => !c.expected.includes("—"))],
  ["sales, core and support prompts avoid em dash", !salesPrompt.includes("—") && !corePrompt.includes("—") && !supportPrompt.includes("—")],
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
