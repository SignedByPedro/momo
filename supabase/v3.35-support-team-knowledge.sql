-- v3.35: expand public Momo Support knowledge for Portal Team management.
-- Safe/idempotent update of the existing Team knowledge entry.

update public.knowledge_entries
set
  category = 'Team',
  title = 'Team invitations, roles and seat limits',
  content = 'The Team area is available to organization Owners. To invite a teammate, open Team in the Portal, enter the teammate email in the "Invite team member" / "Convidar colaborador" section and choose "Send invite" / "Enviar convite". Client Owners can invite Members through this flow; adding or changing an Owner requires the Momo team. Pending invitations count toward the organization seat limit and can be resent from Team. The invited account becomes active only after the recipient confirms the invitation/email flow. Owners can remove Members directly from Team, but cannot directly remove another Owner. Team shows current seat usage; when the seat limit is reached, new invitations are blocked and the client should contact the Momo team about additional seats. Members can use operational areas such as Dashboard, Conversations, Leads and Support, but cannot change Company, Knowledge Base, Agent, Widget or Team settings.',
  visibility = 'public',
  status = 'published',
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-team-access';

-- Insert it if an older environment never received the original Team seed.
insert into public.knowledge_entries (slug, agent_key, category, title, content, visibility, status)
select
  'momo-support-team-access',
  'momo-support',
  'Team',
  'Team invitations, roles and seat limits',
  'The Team area is available to organization Owners. To invite a teammate, open Team in the Portal, enter the teammate email in the "Invite team member" / "Convidar colaborador" section and choose "Send invite" / "Enviar convite". Client Owners can invite Members through this flow; adding or changing an Owner requires the Momo team. Pending invitations count toward the organization seat limit and can be resent from Team. The invited account becomes active only after the recipient confirms the invitation/email flow. Owners can remove Members directly from Team, but cannot directly remove another Owner. Team shows current seat usage; when the seat limit is reached, new invitations are blocked and the client should contact the Momo team about additional seats. Members can use operational areas such as Dashboard, Conversations, Leads and Support, but cannot change Company, Knowledge Base, Agent, Widget or Team settings.',
  'public',
  'published'
where not exists (
  select 1
  from public.knowledge_entries
  where agent_key = 'momo-support'
    and slug = 'momo-support-team-access'
);
