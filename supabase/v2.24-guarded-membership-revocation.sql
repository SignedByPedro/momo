-- Momo v2.24. Run in the production SQL Editor before deploying the app.
-- A per-organisation row lock prevents two concurrent account deletions
-- from removing every accepted owner of the same organisation.
-- Only the server-side service_role may call this function. Authentication,
-- authorization and password re-verification happen in Next.js actions.

begin;

create or replace function public.revoke_organization_membership_guarded(
  p_organization_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_member public.organization_members%rowtype;
begin
  -- All callers (self-delete and Momo Admin owner removal) must use this
  -- function so they share the same organisation-level lock.
  perform 1
  from public.organizations
  where id = p_organization_id
  for update;
  if not found then
    raise exception 'organization_not_found';
  end if;

  select * into v_member
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id
  for update;
  if not found then
    raise exception 'membership_not_found';
  end if;

  if v_member.role = 'client_owner' and v_member.accepted_at is not null and not exists (
    select 1
    from public.organization_members other_owner
    where other_owner.organization_id = p_organization_id
      and other_owner.user_id <> p_user_id
      and other_owner.role = 'client_owner'
      and other_owner.accepted_at is not null
  ) then
    raise exception 'last_active_owner';
  end if;

  delete from public.organization_members
  where id = v_member.id;

  -- Return the original row for restoration if Auth deletion fails.
  return to_jsonb(v_member);
end;
$function$;

revoke all on function public.revoke_organization_membership_guarded(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_organization_membership_guarded(uuid, uuid)
  to service_role;

commit;
