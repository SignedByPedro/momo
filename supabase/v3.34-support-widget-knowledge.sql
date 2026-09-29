-- Momo v3.34 — Support Widget knowledge expansion
-- Run in Supabase SQL Editor, then reindex Momo Support knowledge from
-- Admin > Support > Knowledge Base > Reindexar.
-- Idempotent: official slugs are inserted if missing and refreshed if present.

insert into public.knowledge_entries (
  slug, agent_key, category, title, content, visibility, status
)
select
  'momo-support-widget-customization',
  'momo-support',
  'Widget',
  'Widget appearance and launcher customization',
  'Organization Owners can configure the website Widget from the Widget area of the Portal. Members cannot change Widget settings. Owners can change the three animated launcher colours and the chat-window background, plus the hover-label background and text colours. The launcher can be positioned left or right and its size can be Small (50 px), Medium (60 px), or Large (70 px). Launcher style can be the animated Momo gradient or a full custom image. Full button images accept PNG, JPG or WebP up to 5 MB and are cropped to a circle to fill the button. The hover label can be enabled or disabled and its text can be customized; when the text is left empty, the automatic label is "Falar com {agent name}" in Portuguese or "Chat with {agent name}" in English. Owners can choose the chat icon, the agent initial, or a custom image for the avatar. Custom avatar images accept PNG, JPG or WebP up to 5 MB. The avatar appears in the header and assistant messages and, with the Momo launcher style, can also appear inside the launcher. Saving appearance settings applies the configuration; if the Widget is already published, it does not need to be published again after every appearance change.',
  'public',
  'published'
where not exists (
  select 1 from public.knowledge_entries
  where slug = 'momo-support-widget-customization'
);

update public.knowledge_entries
set
  agent_key = 'momo-support',
  category = 'Widget',
  title = 'Widget appearance and launcher customization',
  content = 'Organization Owners can configure the website Widget from the Widget area of the Portal. Members cannot change Widget settings. Owners can change the three animated launcher colours and the chat-window background, plus the hover-label background and text colours. The launcher can be positioned left or right and its size can be Small (50 px), Medium (60 px), or Large (70 px). Launcher style can be the animated Momo gradient or a full custom image. Full button images accept PNG, JPG or WebP up to 5 MB and are cropped to a circle to fill the button. The hover label can be enabled or disabled and its text can be customized; when the text is left empty, the automatic label is "Falar com {agent name}" in Portuguese or "Chat with {agent name}" in English. Owners can choose the chat icon, the agent initial, or a custom image for the avatar. Custom avatar images accept PNG, JPG or WebP up to 5 MB. The avatar appears in the header and assistant messages and, with the Momo launcher style, can also appear inside the launcher. Saving appearance settings applies the configuration; if the Widget is already published, it does not need to be published again after every appearance change.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where slug = 'momo-support-widget-customization';

insert into public.knowledge_entries (
  slug, agent_key, category, title, content, visibility, status
)
select
  'momo-support-widget-sizing',
  'momo-support',
  'Widget',
  'Widget launcher and chat window sizes',
  'The Widget has separate controls for the launcher button and the open chat window. Launcher button sizes are Small (50 px), Medium (60 px), and Large (70 px). The open chat window width can be configured from 390 px to 520 px and its height from 570 px to 760 px. The original 390 x 570 px size is also the minimum allowed size. On small and mobile screens the open Widget adapts automatically to the available screen. Window corner rounding can be configured from 16 px to 36 px.',
  'public',
  'published'
where not exists (
  select 1 from public.knowledge_entries
  where slug = 'momo-support-widget-sizing'
);

update public.knowledge_entries
set
  agent_key = 'momo-support',
  category = 'Widget',
  title = 'Widget launcher and chat window sizes',
  content = 'The Widget has separate controls for the launcher button and the open chat window. Launcher button sizes are Small (50 px), Medium (60 px), and Large (70 px). The open chat window width can be configured from 390 px to 520 px and its height from 570 px to 760 px. The original 390 x 570 px size is also the minimum allowed size. On small and mobile screens the open Widget adapts automatically to the available screen. Window corner rounding can be configured from 16 px to 36 px.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where slug = 'momo-support-widget-sizing';

-- Refresh the original installation entry so its guidance does not imply that
-- every saved appearance change requires republishing an already-active Widget.
update public.knowledge_entries
set
  content = 'The Widget area lets an Owner configure colours, panel appearance, launcher style, avatar, hover label, position and size. The Widget must be published/enabled before it is available to website visitors. Installation uses the organization-specific script shown in the Widget area. Never guess or invent an installation key or script: the client should copy the code shown in their Portal. Saving appearance settings applies them to the Widget; if it is already published, it does not need to be published again after every appearance change. After first installation or publication, test the live website and confirm that the Widget opens and can complete a chat.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-widget-installation';
