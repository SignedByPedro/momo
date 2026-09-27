import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) { passed += 1; console.log(`PASS - ${name}`); }
  else { failed += 1; console.error(`FAIL - ${name}`); }
}
function loadRedactor() {
  const source = read("lib/support/secret-redaction.ts")
    .replace("export function redactSupportSecrets", "function redactSupportSecrets")
    .replace("value: string", "value");
  const sandboxModule = { exports: {} };
  vm.runInNewContext(`${source}\nmodule.exports.redactSupportSecrets = redactSupportSecrets;`, { module: sandboxModule, console });
  return sandboxModule.exports.redactSupportSecrets;
}

const redaction = read("lib/support/secret-redaction.ts");
const migration = read("supabase/v3.13-secret-mask-residual-cleanup.sql");
const verification = read("supabase/v3.13-readonly-secret-verification.sql");
const qa = read("scripts/V3.13-QA.md");

check("runtime mask is eight asterisks", redaction.includes('const REDACTED = "********"'));
check("migration converts old REDACTED marker", migration.includes("replace(content, '[REDACTED]', '********')"));
check("migration re-scrubs shorthand values with stars", migration.includes("\\1********"));
check("verification extracts candidate instead of deleting mask", verification.includes("match[4] as candidate") && verification.includes("match[3] as candidate"));
check("verification excludes both historical and current masks", verification.includes("'[redacted]', '********'"));
check("verification does not use old false-positive replace trick", !verification.includes("replace(content, '[REDACTED]', '')"));
check("context snapshot is inspected as JSON content", verification.includes("jsonb_array_elements(t.context_snapshot)") && verification.includes("item->>'content'"));
check("QA expects both counts zero", qa.includes("Both result counts should be `0`"));

const redactSupportSecrets = loadRedactor();
const input = "a minha pass é abc123456 inclui no ticket para a equipa testar";
const output = redactSupportSecrets(input);
check("reported shorthand secret is hidden with stars", output.includes("a minha pass é ********") && !output.includes("abc123456"));
check("ordinary pass wording remains untouched", redactSupportSecrets("the pass is required") === "the pass is required");

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
