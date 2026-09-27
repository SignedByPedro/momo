import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const portal = read("app/portal/(dashboard)/settings/page.tsx");
const portalActions = read("app/portal/(dashboard)/settings/actions.ts");
const adminActions = read("app/admin/(dashboard)/clients/actions.ts");
const supportPrompt = read("lib/ai/prompts/portal-support.ts");
const languageRegression = read("scripts/test-v221-language-policy.mjs");
const legal = read("app/legal/page.tsx");
const updatePortal = portalActions.split("export async function updatePortalOrganization(formData: FormData)")[1]?.split("export async function requestPrimaryLanguageChange()")[0] ?? "";
const requestAction = portalActions.split("export async function requestPrimaryLanguageChange()")[1]?.split("export async function requestOrganizationDataDeletion")[0] ?? "";
const updateAdmin = adminActions.split("export async function updateClient(formData: FormData)")[1]?.split("export async function scheduleClientTermination")[0] ?? "";

const checks = [
  ["Portal displays primary language without an editable select", !portal.includes('name="primaryLanguage"') && portal.includes('organization.primary_language === "en" ? "English" : "Português"')],
  ["Portal explains only the Momo team may change it", portal.includes("só a nossa equipa o pode alterar") && portal.includes("even with the multilingual add-on")],
  ["Portal offers a dedicated ticket request button", portal.includes("action={requestPrimaryLanguageChange}") && portal.includes("Pedir alteração para")],
  ["No nested ticket form in company details form", portal.indexOf("</form>") < portal.indexOf("action={requestPrimaryLanguageChange}")],
  ["Portal update requires owner permissions", updatePortal.includes("requirePortalOwner()")],
  ["Portal update ignores a forged primaryLanguage field", !updatePortal.includes('formData.get("primaryLanguage")')],
  ["Portal update never writes primary_language", !updatePortal.includes("primary_language:")],
  ["Portal update does not sync agent languages", !updatePortal.includes("syncSingleLanguageAgentLanguage")],
  ["Request ticket action requires owner permissions", requestAction.includes("requirePortalOwner()")],
  ["Requested language derives from organization data", requestAction.includes('.select("primary_language")') && requestAction.includes('const requested = current === "en" ? "pt" : "en"')],
  ["Request is an account ticket and requires team review", requestAction.includes('category: "account"') && requestAction.includes('priority: "normal"') && requestAction.includes("equipa Momo, após análise do ticket")],
  ["Repeated clicks reuse an existing open ticket", requestAction.includes('.neq("status", "resolved")') && requestAction.includes("existing?.id")],
  ["Ticket creation includes the authenticated organization and user", requestAction.includes("organizationId: session.organizationId") && requestAction.includes("openedByUserId: session.userId")],
  ["New ticket attempts the existing support notification", requestAction.includes("sendNewSupportTicketNotification")],
  ["Admin remains authorized to update primary_language", updateAdmin.includes("primary_language: language") && updateAdmin.includes("requireAdmin()")],
  ["Admin synchronizes single-language agents without overwriting multilingual setups", updateAdmin.includes("syncSingleLanguageAgentLanguage(id, language)") && read("lib/admin/agents.ts").includes("if (current.length > 1) return")],
  ["Support explains Company ticket procedure", supportPrompt.includes("FIXED PLATFORM POLICY: PRIMARY LANGUAGE") && supportPrompt.includes("go to Company in the Portal")],
  ["Support does not automatically escalate how-to questions", supportPrompt.includes("For this how-to question, set escalate=false")],
  ["Support can raise an account ticket for an explicit change request", supportPrompt.includes('set escalate=true, category="account", priority="normal"')],
  ["Support distinguishes primary and paid additional languages", supportPrompt.includes("Paying for multilingual chat never grants permission")],
  ["Support overrides outdated KB instructions", supportPrompt.includes("follow this policy instead")],
  ["v2.21 regression test updated for admin-only management", languageRegression.includes("Admin-selected primary language")],
  ["Preserve manual Tailwind legal correction", legal.includes("border-white/6") && !legal.includes("border-white/[0.06]")],
];

let passed = 0;
for (const [label, result] of checks) {
  try {
    assert.ok(result, label);
    console.log(`PASS - ${label}`);
    passed++;
  } catch (error) {
    console.error(`FAIL - ${error.message}`);
  }
}
console.log(`\n${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exitCode = 1;
