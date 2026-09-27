-- Read-only checks after executing v2.31-support-unread-alerts.sql.
SELECT
  to_regclass('public.support_ticket_reads') IS NOT NULL AS receipts_table_exists,
  has_table_privilege('service_role', 'public.support_ticket_reads', 'SELECT') AS service_can_read,
  has_table_privilege('service_role', 'public.support_ticket_reads', 'INSERT') AS service_can_write,
  NOT has_table_privilege('anon', 'public.support_ticket_reads', 'SELECT') AS anon_cannot_read,
  NOT has_table_privilege('authenticated', 'public.support_ticket_reads', 'SELECT') AS user_cannot_read,
  has_function_privilege('service_role', 'public.support_unread_ticket_ids(uuid,text,uuid)', 'EXECUTE') AS service_can_count,
  has_function_privilege('service_role', 'public.support_mark_ticket_seen(uuid,text,uuid,uuid,uuid)', 'EXECUTE') AS service_can_mark,
  NOT has_function_privilege('authenticated', 'public.support_mark_ticket_seen(uuid,text,uuid,uuid,uuid)', 'EXECUTE') AS user_cannot_mark;
-- Expect eight TRUE values. Client/Admin routes use the service role after
-- checking the authenticated user's organisation/role on the server.
