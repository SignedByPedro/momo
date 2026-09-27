import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const checks = [];
const check = async (description, task) => {
  await task();
  checks.push(description);
  console.log(`PASS - ${description}`);
};

function loadTypeScript(path, deps) {
  const { outputText, diagnostics } = ts.transpileModule(read(path), {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal(diagnostics?.length ?? 0, 0, `Syntax errors in ${path}`);
  const exports = {};
  runInNewContext(outputText, {
    exports,
    Date,
    console,
    encodeURIComponent,
    require: (name) => {
      assert.ok(Object.hasOwn(deps, name), `Unexpected dependency ${name} in ${path}`);
      return deps[name];
    },
  });
  return exports;
}

const orgA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const orgB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ticketA = "11111111-1111-4111-8111-111111111111";
const ticketB = "22222222-2222-4222-8222-222222222222";
const tickets = new Map([
  [ticketA, { id: ticketA, organization_id: orgA, status: "new", resolved_at: null }],
  [ticketB, { id: ticketB, organization_id: orgB, status: "in_progress", resolved_at: null }],
]);
const mutationLog = [];

const supportLib = loadTypeScript("lib/support/tickets.ts", {
  "@/lib/supabase/admin": {
    createSupabaseAdmin: () => ({
      from(table) {
        assert.equal(table, "support_tickets");
        return {
          update(changes) {
            const filters = [];
            return {
              eq(column, value) { filters.push(["eq", column, value]); return this; },
              neq(column, value) { filters.push(["neq", column, value]); return this; },
              select(column) { assert.equal(column, "id"); return this; },
              async maybeSingle() {
                mutationLog.push({ changes, filters });
                const target = [...tickets.values()].find((row) => filters.every(([operator, column, value]) =>
                  operator === "eq" ? row[column] === value : row[column] !== value,
                ));
                if (!target) return { data: null, error: null };
                Object.assign(target, changes);
                return { data: { id: target.id }, error: null };
              },
            };
          },
        };
      },
    }),
  },
});

let portalSession = { organizationId: orgA, language: "pt", role: "client_member" };
let useStaleRead = false;
let reads = 0;
let revalidated = [];
const redirect = (url) => { const e = new Error("NEXT_REDIRECT"); e.location = url; throw e; };
const portalActions = loadTypeScript("app/portal/(dashboard)/support/actions.ts", {
  "next/cache": { revalidatePath: (path) => revalidated.push(path) },
  "next/navigation": { redirect },
  "@/lib/portal/auth": { requirePortal: async () => portalSession },
  "@/lib/support/tickets": {
    getPortalSupportTicket: async (organizationId, ticketId) => {
      reads++;
      const row = tickets.get(ticketId);
      if (!row || row.organization_id !== organizationId) return null;
      if (useStaleRead) return { ...row, status: "new" };
      return { ...row };
    },
    resolvePortalSupportTicket: supportLib.resolvePortalSupportTicket,
    addSupportTicketMessage: async () => { throw new Error("Not expected during resolution"); },
  },
  "@/lib/i18n/ui": { tr: (lang, pt, en) => lang === "en" ? en : pt },
});

const form = (id) => { const data = new FormData(); data.set("ticketId", id); return data; };
async function submit(id) {
  try {
    await portalActions.markSupportTicketResolved(form(id));
    assert.fail("Action must redirect");
  } catch (error) {
    if (error.location) return error.location;
    throw error;
  }
}

await check("A Member can resolve a ticket belonging to their company", async () => {
  const location = await submit(ticketA);
  assert.match(location, /Pedido%20marcado%20como%20resolvido/);
  assert.equal(tickets.get(ticketA).status, "resolved");
  assert.ok(!Number.isNaN(Date.parse(tickets.get(ticketA).resolved_at)));
});
await check("The update is guarded by both organization ID and ticket ID", () => {
  assert.deepEqual(mutationLog[0].filters, [
    ["eq", "organization_id", orgA], ["eq", "id", ticketA], ["neq", "status", "resolved"],
  ]);
});
await check("Both Admin and Portal ticket pages are invalidated after resolving", () => {
  assert.deepEqual(revalidated, [
    "/portal/support", `/portal/support/${ticketA}`, "/admin/support", `/admin/support/${ticketA}`,
  ]);
});
await check("Tickets of another company cannot be marked resolved, even with their UUID", async () => {
  const before = mutationLog.length;
  const location = await submit(ticketB);
  assert.match(location, /Pedido%20n%C3%A3o%20encontrado/);
  assert.equal(mutationLog.length, before);
  assert.equal(tickets.get(ticketB).status, "in_progress");
});
await check("Submitting the form again does not overwrite the original resolution timestamp", async () => {
  const before = mutationLog.length;
  const timestamp = tickets.get(ticketA).resolved_at;
  const location = await submit(ticketA);
  assert.match(location, /j%C3%A1%20est%C3%A1%20resolvido/);
  assert.equal(tickets.get(ticketA).resolved_at, timestamp);
  assert.equal(mutationLog.length, before);
});
await check("Stale forms cannot alter a ticket already resolved by the team", async () => {
  useStaleRead = true;
  const timestamp = tickets.get(ticketA).resolved_at;
  const location = await submit(ticketA);
  assert.match(location, /j%C3%A1%20est%C3%A1%20resolvido/);
  assert.equal(tickets.get(ticketA).resolved_at, timestamp);
  assert.equal(mutationLog.at(-1).filters.at(-1)[2], "resolved");
  useStaleRead = false;
});
await check("Invalid ticket IDs never reach the database", async () => {
  const beforeReads = reads;
  const beforeUpdates = mutationLog.length;
  const location = await submit("invalid");
  assert.match(location, /Pedido%20inv%C3%A1lido/);
  assert.equal(reads, beforeReads);
  assert.equal(mutationLog.length, beforeUpdates);
});
await check("A company Owner has the same ticket-resolution permission", async () => {
  portalSession = { organizationId: orgB, language: "en", role: "client_owner" };
  const location = await submit(ticketB);
  assert.match(location, /Request%20marked%20as%20resolved/);
  assert.equal(tickets.get(ticketB).status, "resolved");
});
await check("Ticket page only shows the Resolve button on open tickets, in both languages", () => {
  const page = read("app/portal/(dashboard)/support/[id]/page.tsx");
  assert.match(page, /ticket\.status !== "resolved"/);
  assert.match(page, /action=\{markSupportTicketResolved\}/);
  assert.match(page, /Marcar como resolvido/);
  assert.match(page, /Mark as resolved/);
});
await check("Portal explains that replying to a resolved ticket reopens it", () => {
  const page = read("app/portal/(dashboard)/support/[id]/page.tsx");
  const lib = read("lib/support/tickets.ts");
  assert.match(page, /Se precisares de voltar a contactar-nos/);
  assert.match(lib, /status: input\.authorType === "client" \? "new" : "in_progress"/);
});
await check("The existing legal-page Tailwind correction is preserved", () => {
  assert.match(read("app/legal/page.tsx"), /border-white\/6/);
});

console.log(`\n${checks.length}/${checks.length} checks passed.`);
