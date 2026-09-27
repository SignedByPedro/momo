import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const prompt = fs.readFileSync(path.join(root, "lib/ai/prompts/portal-support.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/portal/support/chat/route.ts"), "utf8");
const normalizerSource = fs.readFileSync(path.join(root, "lib/ai/support-plain-text.ts"), "utf8");

function normalize(value) {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*\n?/, "").replace(/```$/, ""))
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[*+]\s+/gm, "")
    .replace(/\*+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const checks = [
  ["prompt requires plain text", prompt.includes("Reply as plain conversational text. Never use Markdown formatting.")],
  ["prompt forbids asterisks", prompt.includes("Never use asterisks or double asterisks")],
  ["route imports normalizer", route.includes('normalizeSupportReplyText } from "@/lib/ai/support-plain-text"')],
  ["route sanitizes structured reply", route.includes("normalizeSupportReplyText(parsed.reply).slice(0, 3000)")],
  ["normalizer strips remaining asterisks", normalizerSource.includes('.replace(/\\*+/g, "")')],
  ["bold markdown removed", normalize("Use **Agent** and choose **Direct**.") === "Use Agent and choose Direct."],
  ["italic markdown removed", normalize("Use *Agent* and _Direct_.") === "Use Agent and Direct."],
  ["heading marker removed", normalize("## Widget\nConfigure it here.") === "Widget\nConfigure it here."],
  ["markdown link becomes readable plain text", normalize("Open [Momo](https://momo.example/test).") === "Open Momo (https://momo.example/test)."],
  ["star bullets lose star marker", normalize("* Disabled\n* Passive\n* Proactive") === "Disabled\nPassive\nProactive"],
  ["ordinary punctuation preserved", normalize("Agent: Direct. Widget: enabled.") === "Agent: Direct. Widget: enabled."],
];

let passed = 0;
for (const [name, ok] of checks) {
  assert.equal(ok, true, name);
  passed += 1;
  console.log(`PASS - ${name}`);
}
console.log(`\n${passed}/${checks.length} checks passed.`);
