-- Momo v2.31: per-user unread ticket alerts in the Admin and Portal.
-- Execute ONCE in Supabase SQL Editor, before deploying the app.
-- All reads/writes happen in authenticated server routes with the service role.
-- Existing tickets/replies are initially treated as read on first installation,
-- so the first deployment does not generate historical notification noise.

DO $migration$
DECLARE
  first_install boolean := to_regclass('public.support_ticket_reads') IS NULL;
BEGIN
  CREATE TABLE IF NOT EXISTS public.support_ticket_reads (
    ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_area text NOT NULL CHECK (reader_area IN ('admin', 'portal')),
    last_seen_at timestamptz NOT NULL,
    PRIMARY KEY (ticket_id, user_id, reader_area)
  );

  -- Only seed once. Rerunning this migration must NEVER mark newer unread
  -- conversations as read for existing users.
  IF first_install THEN
    INSERT INTO public.support_ticket_reads (ticket_id, user_id, reader_area, last_seen_at)
    SELECT t.id, a.user_id, 'admin',
      GREATEST(t.created_at, COALESCE((
        SELECT MAX(m.created_at)
        FROM public.support_ticket_messages m
        WHERE m.ticket_id = t.id AND m.author_type = 'client'
      ), t.created_at))
    FROM public.support_tickets t
    CROSS JOIN public.admin_users a
    JOIN auth.users u ON u.id = a.user_id
    ON CONFLICT DO NOTHING;

    INSERT INTO public.support_ticket_reads (ticket_id, user_id, reader_area, last_seen_at)
    SELECT t.id, member.user_id, 'portal', last_reply.created_at
    FROM public.support_tickets t
    JOIN public.organization_members member
      ON member.organization_id = t.organization_id AND member.accepted_at IS NOT NULL
    JOIN auth.users u ON u.id = member.user_id
    CROSS JOIN LATERAL (
      SELECT MAX(m.created_at) AS created_at
      FROM public.support_ticket_messages m
      WHERE m.ticket_id = t.id AND m.author_type = 'support'
    ) AS last_reply
    WHERE last_reply.created_at IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS support_ticket_messages_unread_idx
  ON public.support_ticket_messages (ticket_id, author_type, created_at DESC);
CREATE INDEX IF NOT EXISTS support_ticket_reads_user_idx
  ON public.support_ticket_reads (user_id, reader_area);

ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_ticket_reads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_ticket_reads TO service_role;

-- One row per ticket with at least one event the reader has not yet seen.
-- The support team sees new, non-resolved tickets and client messages;
-- portal members see support-team replies from their own organisation only.
CREATE OR REPLACE FUNCTION public.support_unread_ticket_ids(
  p_reader_user_id uuid,
  p_reader_area text,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (ticket_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT t.id
  FROM public.support_tickets t
  LEFT JOIN public.support_ticket_reads r
    ON r.ticket_id = t.id
   AND r.user_id = p_reader_user_id
   AND r.reader_area = p_reader_area
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN p_reader_area = 'admin' THEN
        GREATEST(t.created_at, COALESCE((
          SELECT MAX(m.created_at)
          FROM public.support_ticket_messages m
          WHERE m.ticket_id = t.id AND m.author_type = 'client'
        ), t.created_at))
      ELSE (
        SELECT MAX(m.created_at)
        FROM public.support_ticket_messages m
        WHERE m.ticket_id = t.id AND m.author_type = 'support'
      )
    END AS latest_event_at
  ) event
  WHERE p_reader_user_id IS NOT NULL
    AND (
      (p_reader_area = 'admin' AND t.status <> 'resolved')
      OR (p_reader_area = 'portal'
        AND p_organization_id IS NOT NULL
        AND t.organization_id = p_organization_id)
    )
    AND event.latest_event_at IS NOT NULL
    AND event.latest_event_at > COALESCE(r.last_seen_at, '-infinity'::timestamptz);
$function$;

-- Save only events the user has actually opened. The last visible message ID
-- is verified against the ticket and its author. A new message arriving while
-- the page is rendering therefore remains unread. GREATEST prevents two tabs
-- from moving the read marker backwards.
CREATE OR REPLACE FUNCTION public.support_mark_ticket_seen(
  p_reader_user_id uuid,
  p_reader_area text,
  p_ticket_id uuid,
  p_last_message_id uuid DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_seen_at timestamptz;
BEGIN
  IF p_reader_user_id IS NULL OR p_ticket_id IS NULL OR
     p_reader_area IS NULL OR p_reader_area NOT IN ('admin', 'portal') THEN
    RETURN false;
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.support_tickets t
  WHERE t.id = p_ticket_id
    AND (p_reader_area = 'admin' OR
         (p_reader_area = 'portal' AND p_organization_id IS NOT NULL
          AND t.organization_id = p_organization_id));
  IF NOT FOUND THEN RETURN false; END IF;

  IF p_last_message_id IS NOT NULL THEN
    SELECT m.created_at INTO v_seen_at
    FROM public.support_ticket_messages m
    WHERE m.id = p_last_message_id
      AND m.ticket_id = p_ticket_id
      AND m.author_type = CASE WHEN p_reader_area = 'admin' THEN 'client' ELSE 'support' END;
    IF v_seen_at IS NULL THEN RETURN false; END IF;
  ELSIF p_reader_area = 'admin' THEN
    v_seen_at := v_ticket.created_at;
  ELSE
    -- Opening a ticket without any team replies creates no portal receipt.
    RETURN true;
  END IF;

  IF p_reader_area = 'admin' THEN
    v_seen_at := GREATEST(v_seen_at, v_ticket.created_at);
  END IF;

  INSERT INTO public.support_ticket_reads (ticket_id, user_id, reader_area, last_seen_at)
  VALUES (p_ticket_id, p_reader_user_id, p_reader_area, v_seen_at)
  ON CONFLICT (ticket_id, user_id, reader_area) DO UPDATE
    SET last_seen_at = GREATEST(
      public.support_ticket_reads.last_seen_at, EXCLUDED.last_seen_at
    );

  RETURN true;
END
$function$;

REVOKE ALL ON FUNCTION public.support_unread_ticket_ids(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_mark_ticket_seen(uuid, text, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_unread_ticket_ids(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.support_mark_ticket_seen(uuid, text, uuid, uuid, uuid) TO service_role;
