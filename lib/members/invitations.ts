import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { PortalRole } from "@/lib/portal/auth";
import type { UiLanguage } from "@/lib/i18n/ui";

export async function inviteOrganizationUser({
  organizationId,
  organizationName,
  email,
  role,
  invitedBy,
  origin,
  language,
}: {
  organizationId: string;
  organizationName: string;
  email: string;
  role: PortalRole;
  invitedBy: string;
  origin: string;
  language: UiLanguage;
}) {
  const supabase = createSupabaseAdmin();
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin.replace(/\/$/, "")}/portal/accept-invite?lang=${language}`,
    data: {
      organization_id: organizationId,
      organization_name: organizationName,
      portal_role: role,
      portal_language: language,
    },
  });

  if (inviteError || !inviteData.user?.id) {
    throw new Error(inviteError?.message || (language === "en" ? "Could not send the invite." : "Não foi possível enviar o convite."));
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: inviteData.user.id,
    email,
    role,
    invited_by: invitedBy,
  });

  if (memberError) {
    await supabase.auth.admin.deleteUser(inviteData.user.id);
    throw memberError;
  }

  return inviteData.user;
}

export async function organizationEmailAlreadyUsed(email: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
