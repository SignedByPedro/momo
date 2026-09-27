import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const hero = read("components/momo/MomoHero.tsx");
const chat = read("components/momo/MomoChat.tsx");
const css = read("app/globals.css");
const legal = read("app/legal/page.tsx");

const checks = [
  ["robot removed from hero", !hero.includes("momo-sales-robot") && !hero.includes("momo-robot-hero")],
  ["top-left logo removed", !hero.includes("momo-wordmark") && !hero.includes("momo-sales-brand")],
  ["unused robot asset removed", !exists("public/momo-robot-hero-v319.png")],
  ["unused wordmark asset removed", !exists("public/momo-wordmark.png")],
  ["English CTA remains Chat with Momo", hero.includes('cta: "Chat with Momo"')],
  ["Portuguese CTA remains Falar com o Momo", hero.includes('cta: "Falar com o Momo"')],
  ["CTA still opens real sales chat", hero.includes('"momo-sales:open"') && chat.includes('addEventListener("momo-sales:open"')],
  ["language selector retained", hero.includes('momo-sales-language') && hero.includes('chooseLanguage')],
  ["widget ambient light retained", hero.includes('momo-sales-widget-light') && css.includes('.momo-sales-widget-light')],
  ["robot CSS removed", !css.includes('.momo-sales-robot') && !css.includes('.momo-sales-robot-wrap')],
  ["brand CSS removed", !css.includes('.momo-sales-brand') && !css.includes('.momo-sales-wordmark-image')],
  ["desktop hero remains full viewport", css.includes('100svh')],
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
