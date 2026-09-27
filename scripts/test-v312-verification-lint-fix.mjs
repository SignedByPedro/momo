import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) { passed += 1; console.log(`PASS - ${name}`); }
  else { failed += 1; console.error(`FAIL - ${name}`); }
}

const v311Test = read("scripts/test-v311-admin-account-secret-redaction.mjs");
const verify = read("supabase/v3.12-readonly-secret-redaction-verification.sql");
check("v3.11 test no longer assigns to module", !v311Test.includes("const module ="));
check("v3.11 test uses sandboxModule", v311Test.includes("sandboxModule"));
check("verification strips REDACTED marker before matching", verify.includes("replace(content, '[REDACTED]', '')"));
check("message residual count is explicitly unredacted", verify.includes("support_messages_with_unredacted_recognizable_shorthand_secret"));
check("metadata residual count is explicitly unredacted", verify.includes("support_ticket_metadata_with_unredacted_recognizable_shorthand_secret"));
console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
