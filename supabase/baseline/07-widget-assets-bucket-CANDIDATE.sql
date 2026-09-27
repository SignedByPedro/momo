-- Momo v2.15 / public Storage bucket (production exact metadata).
-- NEW Supabase STAGING ONLY; not a public-upload policy.
-- This INSERT is intentionally NOT UPSERT: fail on existing bucket rather
-- than silently changing Storage configuration. Expected: no custom Storage policies.
BEGIN;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('widget-assets', 'widget-assets', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]);
COMMIT;
