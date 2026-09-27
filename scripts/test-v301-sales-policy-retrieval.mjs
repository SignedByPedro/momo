import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const migration = read("supabase/v3.1-sales-policy-retrieval-hardening.sql");
const retrieval = read("lib/knowledge/momo-knowledge.ts");
const cases = JSON.parse(read("scripts/v300-knowledge-cases.json"));

const checks = [
  ["7-day grace period is explicit", migration.includes("período de tolerância de 7 dias") && migration.includes("serviço permanece ativo")],
  ["automatic widget reactivation is explicit", migration.includes("reativado automaticamente") && migration.includes("não precisa de pedir manualmente")],
  ["no commitment includes three-month recommendation", migration.includes("Não existe fidelização") && migration.includes("três meses")],
  ["sales refund wording has no legal boilerplate", migration.includes("não existe reembolso proporcional dos dias restantes") && !migration.includes("obrigação legal")],
  ["support policy also says automatic reactivation", migration.includes("reactivated automatically")],
  ["retrieval labels current question explicitly", retrieval.includes("CURRENT QUESTION:")],
  ["retrieval retains recent context for follow-ups", retrieval.includes("RECENT CONTEXT:")],
  ["S013 expects automatic reactivation", cases.find((x) => x.id === "S013")?.expected.includes("automaticamente")],
  ["S014 expects three-month recommendation", cases.find((x) => x.id === "S014")?.expected.includes("três meses")],
  ["S016 expects concise no-refund answer", cases.find((x) => x.id === "S016")?.expected.includes("não existe reembolso proporcional")],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) { console.log(`PASS - ${label}`); passed += 1; }
  else console.error(`FAIL - ${label}`);
}
console.log(`\n${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
