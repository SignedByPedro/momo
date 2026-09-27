import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

const pagePath = "app/admin/register/page.tsx";
const actionsPath = "app/admin/register/actions.ts";
const loginPath = "app/admin/login/page.tsx";
const envPath = ".env.example";

const page = exists(pagePath) ? read(pagePath) : "";
const actions = exists(actionsPath) ? read(actionsPath) : "";
const login = exists(loginPath) ? read(loginPath) : "";
const env = exists(envPath) ? read(envPath) : "";
const legal = read("app/legal/page.tsx");

check("Admin registration page exists", exists(pagePath));
check("Admin registration action exists", exists(actionsPath));
check("Registration is gated by server-only invite code", page.includes("MOMO_ADMIN_INVITE_CODE") && actions.includes("MOMO_ADMIN_INVITE_CODE"));
check("Invite code uses constant-time comparison", actions.includes("timingSafeEqual"));
check("Password confirmation is required", actions.includes("password !== confirmPassword") && page.includes('name="confirmPassword"'));
check("Minimum password length remains enforced", actions.includes("password.length < 8") && page.includes("minLength={8}"));
check("Created admin receives owner role", actions.includes('role: "owner"'));
check("Existing Auth account can be promoted", actions.includes("signInWithPassword") && actions.includes("upsert"));
check("New Auth user is rolled back if Admin grant fails", actions.includes("deleteUser(userId)"));
check("Login only shows registration link when enabled", login.includes("registrationEnabled") && login.includes('href="/admin/register"'));
check("Invite secret is documented without a real value", env.includes("MOMO_ADMIN_INVITE_CODE=replace_with_long_random_admin_invite_code"));
check("Registration page is noindex", page.includes("index: false") && page.includes("follow: false"));
check("Manual legal Tailwind fix preserved", legal.includes("border-white/6") && !legal.includes("border-white/[0.06]"));

for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} - ${item.name}`);
}

const passed = checks.filter((item) => item.ok).length;
console.log(`\n${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
