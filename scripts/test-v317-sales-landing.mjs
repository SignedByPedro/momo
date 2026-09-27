import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const page = read("app/page.tsx");
const hero = read("components/momo/MomoHero.tsx");
const chat = read("components/momo/MomoChat.tsx");
const css = read("app/globals.css");
const legal = read("app/legal/page.tsx");

const checks = [
  ["home renders dedicated MomoHero", page.includes("<MomoHero />")],
  ["hero asset exists", exists("public/momo-robot-hero.webp")],
  ["Portuguese hero headline present", hero.includes("Uma nova forma de") && hero.includes("estar disponível.")],
  ["English hero headline present", hero.includes("A smarter way to") && hero.includes("stay available.")],
  ["hero copy is organization-wide", hero.includes("organização") && hero.includes("organization")],
  ["hero language uses existing Momo storage key", hero.includes('"momo-language"') && hero.includes('"momo-language-change"')],
  ["CTA dispatches sales open event", hero.includes('"momo-sales:open"')],
  ["MomoChat listens to sales open event", chat.includes('addEventListener("momo-sales:open"')],
  ["sales intro no longer customer/lead-only", chat.includes("Ajudo organizações") && chat.includes("I help organizations")],
  ["desktop hero is full viewport", css.includes(".momo-sales-hero") && css.includes("100svh")],
  ["robot is static hero artwork", !css.match(/\.momo-sales-robot\s*\{[^}]*animation:/s)],
  ["widget light field exists", css.includes(".momo-sales-widget-light")],
  ["mobile layout exists", css.includes("@media (max-width: 899px)")],
  ["manual legal Tailwind fix preserved", legal.includes("border-white/6") && !legal.includes("border-white/[0.06]")],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`PASS - ${name}`);
  } else {
    console.error(`FAIL - ${name}`);
  }
}

console.log(`\n${passed}/${checks.length} checks passed.`);
process.exit(passed === checks.length ? 0 : 1);
