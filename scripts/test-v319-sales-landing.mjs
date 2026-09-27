import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const hero = read("components/momo/MomoHero.tsx");
const css = read("app/globals.css");
const widget = read("public/widget.js");
const legal = read("app/legal/page.tsx");

const checks = [
  ["approved dark robot asset exists", exists("public/momo-robot-hero-v319.png")],
  ["rounded wordmark asset exists", exists("public/momo-wordmark.png")],
  ["hero uses approved robot asset", hero.includes('src="/momo-robot-hero-v319.png"')],
  ["hero uses image wordmark", hero.includes('src="/momo-wordmark.png"')],
  ["English CTA says Chat with Momo", hero.includes('cta: "Chat with Momo"')],
  ["Portuguese CTA remains Falar com o Momo", hero.includes('cta: "Falar com o Momo"')],
  ["desktop robot is darkened but hand area preserved", css.includes("brightness(0.78)") && css.includes("radial-gradient(circle at 82% 74%")],
  ["desktop robot uses left cinematic framing", css.includes("width: 88vw") && css.includes("object-position: left center")],
  ["mobile robot is substantially smaller", css.includes("width: 68vw") && css.includes("height: 34vh")],
  ["wordmark image styling exists", css.includes(".momo-sales-wordmark-image")],
  ["headline metallic texture remains", css.includes(".momo-sales-title-accent") && css.includes("background-image:")],
  ["widget lint warning removed", widget.includes("} catch {") && !widget.includes("catch (_)")],
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
