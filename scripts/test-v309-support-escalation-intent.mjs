import fs from "node:fs";

const route = fs.readFileSync("app/api/portal/support/chat/route.ts", "utf8");

const checks = [
  ["generic personal-data terms no longer force escalation", !route.includes("privacidade|privacy|dados pessoais|personal data|data deletion")],
  ["explicit deletion classifier exists", route.includes("explicitPrivacyDeletion")],
  ["explicit deletion includes Portuguese request forms", route.includes("eliminem") && route.includes("apaguem")],
  ["deletion requires action cue or imperative", route.includes("explicitDeletionCue || imperativeDeletion")],
  ["informational privacy questions are not hard-forced", route.includes("Do not turn general privacy/retention questions into tickets")],
  ["lost-lead timing has deterministic no-ticket guard", route.includes("isLostLeadDeletionTimingQuestion") && route.includes("escalate: false")],
  ["lost-lead timing answer rejects instant deletion promise", route.includes("não promete atualmente que sejam apagados automaticamente naquele exato segundo")],
  ["concrete security incidents remain forced", route.includes("concreteSecurityOrPrivacyIncident")],
  ["unauthorized access remains covered", route.includes("unauthorized access")],
  ["data breach remains covered", route.includes("data breach")],
  ["explicit privacy deletion remains high priority", route.includes('priority: "high"')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) failed += 1;
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
