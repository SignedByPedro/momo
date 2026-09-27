import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const teamActions = read("app/portal/(dashboard)/team/actions.ts");
const teamPage = read("app/portal/(dashboard)/team/page.tsx");
const accountActions = read("app/portal/(dashboard)/account/actions.ts");
const accountPage = read("app/portal/(dashboard)/account/page.tsx");
const adminActions = read("app/admin/(dashboard)/clients/[id]/access/actions.ts");
const helper = read("lib/members/revocation.ts");
const migration = read("supabase/v2.24-guarded-membership-revocation.sql");
const nav = read("components/portal/PortalNav.tsx");
const login = read("app/portal/login/page.tsx");

const checks = [
  ["Owner can remove Members only", teamActions.includes("requirePortalOwner()") && teamActions.includes('member.role !== "client_member"') && teamActions.includes("deleteUser(userId)")],
  ["Portal never offers deletion of another Owner", teamPage.includes('member.role === "client_member" && <form action={removePortalMember}>') && teamPage.includes('member.role === "client_owner" && (member.user_id === session.userId')],
  ["Other Owner removal goes through Momo support", teamPage.includes('href="/portal/support"') && teamPage.includes('"Pedir remoção ao Momo"')],
  ["Personal account page available to Owners and Members, including closed organizations", accountPage.includes("requirePortal()") && nav.includes('href="/portal/account"')],
  ["Self-deletion requires typed confirmation and current password", accountActions.includes("expectedConfirmation") && accountActions.includes('formData.get("password")') && accountPage.includes('autoComplete="current-password"')],
  ["Password verified with non-persistent Supabase session", accountActions.includes("signInWithPassword") && accountActions.includes("persistSession: false") && accountActions.includes("verified.user?.id !== session.userId")],
  ["Admin accounts cannot be self-deleted via Portal", accountActions.includes('.from("admin_users")') && accountActions.includes("if (platformAdmin)")],
  ["Sole Owner gets a privacy ticket rather than deleting own login", accountPage.includes("soleOwner ?") && accountPage.includes("requestLastOwnerAccountDeletion") && accountActions.includes('priority: "high"')],
  ["Sole Owner duplicate tickets avoided", accountActions.includes('.in("subject", deleteRequestSubjects)') && accountActions.includes('opened_by_user_id')],
  ["Personal deletion does not delete organization data", !accountActions.includes('.from("organizations").delete(') && accountPage.includes("Não elimina a empresa")],
  ["SQL locks organization per deletion and only counts accepted alternate Owners", migration.includes("for update") && migration.includes("other_owner.accepted_at is not null") && migration.includes("last_active_owner")],
  ["SQL denies public and client RPC access", migration.includes("from public, anon, authenticated") && migration.includes("to service_role")],
  ["Self and Admin Owner deletions use same atomic guard", accountActions.includes("revokeMembershipGuarded(session.organizationId, session.userId)") && adminActions.includes("revokeMembershipGuarded(organizationId, userId)")],
  ["Auth failure restores original membership", helper.includes("restoreMembership") && accountActions.includes("await restoreMembership(removed)") && adminActions.includes("await restoreMembership(removed)")],
  ["Successful self-deletion signs out and redirects to login", accountActions.includes('auth.admin.deleteUser(session.userId)') && accountActions.includes('redirect(`/portal/login?lang=${l}&deleted=1`)') && login.includes('query.deleted === "1"')],
  ["Last Owner remains protected in Admin", adminActions.includes("reason instanceof LastActiveOwnerError")],
];

for (const [label, value] of checks) {
  console.log(`${value ? "PASS" : "FAIL"} - ${label}`);
}
assert.ok(checks.every(([, value]) => value), "One or more v2.24 checks failed");
console.log(`\n${checks.length}/${checks.length} checks passed.`);
