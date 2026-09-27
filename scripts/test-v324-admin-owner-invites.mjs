import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

const accountPagePath = "app/admin/(dashboard)/account/page.tsx";
const accountActionsPath = "app/admin/(dashboard)/account/actions.ts";
const acceptClientPath = "app/admin/accept-invite/AcceptInviteClient.tsx";
const acceptPagePath = "app/admin/accept-invite/page.tsx";
const setupPagePath = "app/admin/setup-password/page.tsx";
const setupActionsPath = "app/admin/setup-password/actions.ts";
const registerPagePath = "app/admin/register/page.tsx";
const loginPath = "app/admin/login/page.tsx";
const envPath = ".env.example";

const accountPage = read(accountPagePath);
const accountActions = read(accountActionsPath);
const acceptClient = read(acceptClientPath);
const acceptPage = read(acceptPagePath);
const setupPage = read(setupPagePath);
const setupActions = read(setupActionsPath);
const registerPage = read(registerPagePath);
const login = read(loginPath);
const env = read(envPath);
const legal = read("app/legal/page.tsx");

check("Owner invite UI is inside Admin My Account", accountPage.includes("Admin access") && accountPage.includes("inviteAdminOwner"));
check("Current Owners are loaded and listed", accountPage.includes('eq("role", "owner")') && accountPage.includes("getUserById"));
check("Only existing Owners can invite Owners", accountActions.includes('session.role !== "owner"'));
check("Owner invitation uses Supabase email invite", accountActions.includes("inviteUserByEmail"));
check("Invite redirects through Admin accept flow", accountActions.includes("/admin/accept-invite?lang="));
check("Invited Admin is granted Owner role", accountActions.includes('role: "owner"'));
check("Auth user is rolled back if Owner grant fails", accountActions.includes("deleteUser(inviteData.user.id)"));
check("Admin invite accept page exists and is noindex", exists(acceptPagePath) && acceptPage.includes("index: false"));
check("Invite accept supports PKCE and token-hash sessions", acceptClient.includes("exchangeCodeForSession") && acceptClient.includes("setSession"));
check("Invite accept continues to password setup", acceptClient.includes("/admin/setup-password"));
check("Password setup requires confirmed email", setupPage.includes("email_confirmed_at") && setupActions.includes("email_confirmed_at"));
check("Password setup verifies Owner access server-side", setupActions.includes('adminAccess?.role !== "owner"'));
check("Owner password keeps minimum length", setupPage.includes("minLength={8}") && setupActions.includes("password.length < 8"));
check("Legacy public Admin registration is disabled", registerPage.includes('redirect("/admin/login")'));
check("Login no longer exposes Admin self-registration", !login.includes("/admin/register") && !login.includes("MOMO_ADMIN_INVITE_CODE"));
check("Legacy Admin invite secret removed from env example", !env.includes("MOMO_ADMIN_INVITE_CODE"));
check("Manual legal Tailwind fix preserved", legal.includes("border-white/6") && !legal.includes("border-white/[0.06]"));

for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} - ${item.name}`);
}

const passed = checks.filter((item) => item.ok).length;
console.log(`\n${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
