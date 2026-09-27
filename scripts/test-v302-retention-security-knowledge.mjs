import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sqlPath = path.join(root, 'supabase', 'v3.2-retention-security-availability-knowledge.sql');
const verifyPath = path.join(root, 'supabase', 'v3.2-readonly-retention-security-verification.sql');
const qaPath = path.join(root, 'scripts', 'V3.2-QA.md');

const sql = fs.readFileSync(sqlPath, 'utf8');
const verify = fs.readFileSync(verifyPath, 'utf8');
const qa = fs.readFileSync(qaPath, 'utf8');

const checks = [
  ['sales lead retention entry', sql.includes("'lead-retention-lifecycle'")],
  ['sales normal logs 30 days', sql.includes('30 dias')],
  ['sales security records 12 months', sql.includes('até 12 meses')],
  ['sales org access boundary', sql.includes('Utilizadores de outras organizações clientes não têm acesso')],
  ['sales normal 24/7 wording', sql.includes('concebido para estar disponível 24/7')],
  ['no 100% uptime promise', sql.includes('não é prometido 100% de uptime')],
  ['support lead retention entry', sql.includes("'momo-support-lead-retention'")],
  ['support log retention entry', sql.includes("'momo-support-log-retention'")],
  ['support org access entry', sql.includes("'momo-support-organization-data-access'")],
  ['support availability entry', sql.includes("'momo-support-service-availability-24-7'")],
  ['v3.1 support billing corrected actual slug', sql.includes("slug = 'momo-support-billing-policy'")],
  ['v3.1 support cancellation corrected actual slug', sql.includes("slug = 'momo-support-cancellation-policy'")],
  ['uses real unique slug conflict target', sql.includes('on conflict (slug) do update set')],
  ['verification includes all expected checks', (verify.match(/ as /g) ?? []).length >= 11],
  ['QA includes all five retests', ['Quanto tempo guardam leads?', 'Quanto tempo guardam logs técnicos?', 'incidentes de segurança', 'dados ficam separados', '100% de disponibilidade'].every((x) => qa.includes(x))],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) {
    console.log(`PASS - ${name}`);
    passed += 1;
  } else {
    console.error(`FAIL - ${name}`);
  }
}
console.log(`\n${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
