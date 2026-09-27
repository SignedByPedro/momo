import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
let passed = 0;
let failed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS - ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL - ${name}`);
  }
}

function loadRedactor() {
  const source = read("lib/support/secret-redaction.ts")
    .replace("export function redactSupportSecrets", "function redactSupportSecrets")
    .replace("value: string", "value");
  const sandboxModule = { exports: {} };
  vm.runInNewContext(`${source}\nmodule.exports.redactSupportSecrets = redactSupportSecrets;`, { module: sandboxModule, console });
  return sandboxModule.exports.redactSupportSecrets;
}

const auth = read("lib/admin/auth.ts");
const accountPage = read("app/admin/(dashboard)/account/page.tsx");
const accountActions = read("app/admin/(dashboard)/account/actions.ts");
const adminLayout = read("app/admin/(dashboard)/layout.tsx");
const adminNav = read("components/admin/AdminNav.tsx");
const tickets = read("lib/support/tickets.ts");
const migration = read("supabase/v3.11-admin-account-secret-redaction.sql");
const verification = read("supabase/v3.11-readonly-admin-account-secret-redaction-verification.sql");
const legalPage = read("app/legal/page.tsx");

check("admin session reads personal UI language", auth.includes('ui_language') && auth.includes('language: UiLanguage'));
check("admin My account page exists", accountPage.includes("A minha conta") && accountPage.includes("My account"));
check("admin can change own password", accountActions.includes("changeMyAdminPassword") && accountActions.includes("updateUserById(session.userId"));
check("admin password change verifies current password", accountActions.includes("signInWithPassword") && accountActions.includes("currentPassword"));
check("admin can save PT or EN UI language", accountActions.includes("updateAdminUiLanguage") && accountPage.includes('<option value="pt">') && accountPage.includes('<option value="en">'));
check("admin navigation exposes My account", adminNav.includes('href="/admin/account"'));
check("admin shell receives account language", adminLayout.includes("language={l}") && adminLayout.includes("admin.language"));
check("migration adds constrained admin ui_language", migration.includes("admin_users_ui_language_check") && migration.includes("ui_language in ('pt', 'en')"));
check("ticket creation redacts persisted initial message", tickets.includes("redactSupportSecrets(input.initialMessage)"));
check("ticket replies redact persisted content", tickets.includes("const content = redactSupportSecrets(input.content)"));
check("migration cleans historical shorthand pass values", migration.includes("minha|o[[:space:]]+meu|meu|my") && migration.includes("[REDACTED]"));
check("read-only verification checks shorthand secret residue", verification.includes("support_messages_with_unredacted_recognizable_shorthand_secret") && verification.includes("invalid_admin_ui_language_rows"));
check("manual Tailwind legal fix preserved", legalPage.includes("border-white/6") && !legalPage.includes("border-white/[0.06]"));

const redactSupportSecrets = loadRedactor();
const cases = [
  ["Portuguese shorthand from reported ticket", "a minha pass é abc123456 inclui no ticket para a equipa testar", "abc123456"],
  ["English shorthand", "my pass is hunter2 please include it", "hunter2"],
  ["Bare pass with separator", "pass: supersecret", "supersecret"],
  ["Explicit password label", "password: secret123", "secret123"],
];
for (const [name, input, secret] of cases) {
  const output = redactSupportSecrets(input);
  check(`${name} is redacted`, output.includes("[REDACTED]") && !output.includes(secret));
}
check("ordinary English use of pass is not falsely redacted", redactSupportSecrets("the pass is required") === "the pass is required");

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) process.exit(1);
