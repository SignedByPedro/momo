import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const accountPage = read("app/portal/(dashboard)/account/page.tsx");
const accountActions = read("app/portal/(dashboard)/account/actions.ts");
const supportRoute = read("app/api/portal/support/chat/route.ts");
const prompt = read("lib/ai/prompts/portal-support.ts");
const tickets = read("lib/support/tickets.ts");
const redaction = read("lib/support/secret-redaction.ts");
const migration = read("supabase/v3.10-account-password-secret-redaction.sql");

check("My account exposes password change form", accountPage.includes("changeMyPortalPassword") && accountPage.includes('name="currentPassword"') && accountPage.includes('name="newPassword"'));
check("password change is not owner-only", !accountActions.match(/changeMyPortalPassword[\s\S]{0,900}session\.role\s*!==\s*["']client_owner["']/));
check("current password is re-authenticated", accountActions.includes("signInWithPassword") && accountActions.includes("currentPassword"));
check("new password updates authenticated user id", accountActions.includes("updateUserById(session.userId") && accountActions.includes("password: newPassword"));
check("new password minimum is enforced", accountActions.includes("newPassword.length < 8") && accountPage.includes("minLength={8}"));
check("Support knows Owners and Members can change own password", prompt.includes("Both authenticated Owners and Members can change the password of their own Portal account"));
check("unauthorized access advises password change", prompt.includes("advise the authenticated user to change their own password immediately from My account"));
check("secret redaction helper exists", redaction.includes("redactSupportSecrets") && redaction.includes("[REDACTED]"));
check("new ticket persistence redacts secret content", tickets.includes("redactSupportSecrets(input.initialMessage)") && tickets.includes("redactSupportSecrets(message.content)"));
check("existing ticket replies redact secret content", tickets.includes("redactSupportSecrets(input.content)"));
check("Support strips secrets before AI and retrieval", supportRoute.includes("const safeMessages = messages.map") && supportRoute.includes("retrievePortalSupportKnowledge(safeMessages)") && supportRoute.includes("safeMessages.map((message)"));
check("structured Support output receives defensive redaction", supportRoute.includes("redactSupportSecrets(normalizeSupportReplyText(parsed.reply))") && supportRoute.includes("redactSupportSecrets(parsed.summary)"));
check("knowledge migration uses real slug conflict key", migration.includes("on conflict (slug) do update"));
check("migration scrubs historical labelled passwords", migration.includes("update public.support_ticket_messages") && migration.includes("context_snapshot = cleaned.context_snapshot") && migration.includes("[REDACTED]"));
check("manual QA documents stored-context inspection", read("scripts/V3.10-QA.md").includes("context snapshot") && read("scripts/V3.10-QA.md").includes("[REDACTED]"));

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} - ${item.name}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
