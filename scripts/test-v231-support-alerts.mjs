import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = (p) => readFileSync(path.join(root, p), "utf8");
let passed = 0;
function test(description, fn) {
  fn();
  passed++;
  console.log(`PASS - ${description}`);
}
const sql = file("supabase/v2.31-support-unread-alerts.sql");
const lib = file("lib/support/unread.ts");
const badge = file("components/support/SupportUnreadBadge.tsx");
const marker = file("components/support/SupportTicketReadMarker.tsx");

test("read receipts belong to one user, ticket and role", () => {
  assert.match(sql, /PRIMARY KEY\s*\(ticket_id, user_id, reader_area\)/i);
  assert.match(sql, /REFERENCES\s+auth\.users\(id\)\s+ON DELETE CASCADE/i);
  assert.match(sql, /REFERENCES\s+public\.support_tickets\(id\)\s+ON DELETE CASCADE/i);
});
test("first installation seeds existing tickets but rerunning does not clear new alerts", () => {
  assert.match(sql, /first_install\s+boolean\s*:=\s*to_regclass/i);
  assert.match(sql, /IF first_install THEN/i);
  assert.match(sql, /ON CONFLICT DO NOTHING/g);
});
test("read receipts have RLS and no direct public or customer access", () => {
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.support_ticket_reads FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.support_ticket_reads TO service_role/i);
});
test("SQL privileges on both RPCs are service role only", () => {
  for (const name of ["support_unread_ticket_ids", "support_mark_ticket_seen"]) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}[^;]+FROM PUBLIC, anon, authenticated`,"i"));
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}[^;]+TO service_role`,"i"));
  }
});
test("admin alerts include new open tickets and new client messages", () => {
  assert.match(sql, /t\.status\s*<>\s*'resolved'/);
  assert.match(sql, /GREATEST\(t\.created_at,[\s\S]+m\.author_type = 'client'/);
});
test("portal alerts include only team replies from its own organization", () => {
  assert.match(sql, /p_reader_area = 'portal'[\s\S]+t\.organization_id = p_organization_id/);
  assert.match(sql, /m\.author_type = 'support'/);
});
test("only a displayed and verified relevant message can be marked read", () => {
  assert.match(sql, /m\.id\s*=\s*p_last_message_id/);
  assert.match(sql, /m\.ticket_id\s*=\s*p_ticket_id/);
  assert.match(sql, /m\.author_type\s*=\s*CASE WHEN p_reader_area = 'admin' THEN 'client' ELSE 'support' END/);
});
test("out-of-order tabs cannot move read markers backwards", () => {
  assert.match(sql, /last_seen_at\s*=\s*GREATEST\(/);
});
test("application keeps unread query and write in the trusted server data layer", () => {
  assert.match(lib, /createSupabaseAdmin/);
  assert.match(lib, /\.rpc\("support_unread_ticket_ids"/);
  assert.match(lib, /\.rpc\("support_mark_ticket_seen"/);
});
test("all four APIs check active authenticated session before reading or writing", () => {
  for (const area of ["admin", "portal"]) {
    for (const action of ["read", "unread"]) {
      const source = file(`app/api/${area}/support/${action}/route.ts`);
      assert.match(source, area === "admin" ? /getAdminSession\(\)/ : /getPortalSession\(\)/);
      assert.match(source, /if \(!(?:admin|session)\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/);
    }
  }
});
test("the portal API never trusts an organization ID supplied by the browser", () => {
  for (const action of ["read", "unread"]) {
    const source = file(`app/api/portal/support/${action}/route.ts`);
    assert.match(source, /organizationId: session\.organizationId/);
  }
});
test("the badge updates on navigation, timer, focus and read receipts", () => {
  assert.match(badge, /usePathname/);
  assert.match(badge, /45_000/);
  assert.match(badge, /visibilitychange/);
  assert.match(badge, /momo:support-read/);
});
test("the badge is a small orange exclamation displayed only if unread exists", () => {
  assert.match(badge, /if \(count === 0\) return null/);
  assert.match(badge, /bg-\[#ff7a18\]/);
  assert.match(badge, /!\s*<\/span>/);
});
test("both Admin and Portal navigation show Support badges", () => {
  assert.match(file("components/admin/AdminNav.tsx"), /<SupportUnreadBadge area="admin"/);
  assert.match(file("components/portal/PortalNav.tsx"), /<SupportUnreadBadge area="portal"/);
  assert.match(file("app/admin/(dashboard)/layout.tsx"), /unreadSupport\.length/);
  assert.match(file("app/portal/(dashboard)/layout.tsx"), /unreadSupport\.length/);
});
test("opening a ticket posts a read receipt with the last incoming message on screen", () => {
  assert.match(marker, /method: "POST"/);
  assert.match(marker, /body: JSON\.stringify\(\{ ticketId, lastMessageId \}\)/);
  assert.match(file("app/admin/(dashboard)/support/[id]/page.tsx"), /author_type === "client"/);
  assert.match(file("app/portal/(dashboard)/support/[id]/page.tsx"), /author_type === "support"/);
});
test("Support lists show which tickets remain unread", () => {
  assert.match(file("app/admin/(dashboard)/support/page.tsx"), /unreadIds\.has\(ticket\.id\)/);
  assert.match(file("app/portal/(dashboard)/support/page.tsx"), /unreadIds\.has\(ticket\.id\)/);
});
test("migration includes read-only verification for permissions", () => {
  const checks = file("supabase/v2.31-readonly-support-alerts-verification.sql");
  assert.match(checks, /anon_cannot_read/);
  assert.match(checks, /user_cannot_mark/);
});
test("manual QA includes multiple users and concurrent replies", () => {
  const qa = file("scripts/V2.31-QA.md");
  assert.match(qa, /other admin/i);
  assert.match(qa, /other member/i);
  assert.match(qa, /while the ticket is opening/i);
});
console.log(`\n${passed}/${passed} static checks passed.`);
