/**
 * Momo v2.14/Fase 1: run code checks locally without touching production.
 * Uses the existing package-lock and package.json scripts; no credentials read
 * or logged deliberately. Review logs before sharing because underlying
 * commands may print environment-specific paths or details.
 *
 * Usage: node scripts/validate-v214.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reports = join(root, "validation-results");
mkdirSync(reports, { recursive: true });

const onWindows = process.platform === "win32";
const npm = onWindows ? "npm.cmd" : "npm";
const npx = onWindows ? "npx.cmd" : "npx";
const steps = [
  ["01-npm-ci", npm, ["ci", "--no-audit", "--no-fund"]],
  ["02-eslint", npm, ["run", "lint"]],
  ["03-typescript", npx, ["tsc", "--noEmit"]],
  ["04-next-build", npm, ["run", "build"]],
];

let allPassed = true;
for (const [label, command, args] of steps) {
  process.stdout.write(`\n${label}: ${command} ${args.join(" ")}\n`);
  // npm.cmd/npx.cmd need cmd.exe on Windows; avoid shell:true (DEP0190).
  // Command and arguments come from the fixed steps above, not user input.
  const executable = onWindows ? process.env.ComSpec || "cmd.exe" : command;
  const commandArgs = onWindows ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    env: { ...process.env, CI: "1" },
  });
  const output = [result.stdout || "", result.stderr || "", result.error?.message || ""]
    .filter(Boolean)
    .join("\n");
  writeFileSync(join(reports, `${label}.log`), output || "(no output)\n", "utf8");
  const passed = result.status === 0 && !result.error;
  allPassed &&= passed;
  process.stdout.write(`${passed ? "PASS" : "FAIL"} — validation-results/${label}.log\n`);
  if (!passed && label === "01-npm-ci") {
    process.stdout.write("A instalação falhou; os restantes testes seriam inconclusivos.\n");
    break;
  }
}

process.stdout.write(`\nResultado: ${allPassed ? "todas as verificações concluídas" : "existem falhas; rever os logs"}.\n`);
process.exitCode = allPassed ? 0 : 1;
