import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import type { OrganizationStatus } from "@/lib/admin/organizations";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tr, type UiLanguage } from "@/lib/i18n/ui";
import {
  organizationPlanHasPremiumFeatures,
  type OrganizationPlan,
} from "@/lib/plans";

export type PortalRole = "client_owner" | "client_member";

export type PortalSession = {
  userId: string;
  email: string;
  emailVerified: true;
  organizationId: string;
  organizationName: string;
  organizationStatus: OrganizationStatus;
  plan: OrganizationPlan;
  terminatedAt: string | null;
  recoveryUntil: string | null;
  role: PortalRole;
  language: UiLanguage;
};

export function portalServiceIsClosed(session: PortalSession) {
  return session.organizationStatus === "cancelled" || session.organizationStatus === "purge_due";
}

export function portalHasPremiumAccess(session: PortalSession) {
  return organizationPlanHasPremiumFeatures(session.plan);
}

function premiumPlanMessage(language: UiLanguage) {
  return tr(
    language,
    "Esta funcionalidade está disponível nos planos Premium e Business.",
    "This feature is available on Premium and Business plans.",
  );
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (error || !user?.id || !user.email || !user.email_confirmed_at) return null;

  const admin = createSupabaseAdmin();
  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("user_id, organization_id, email, role, accepted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) return null;

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, name, primary_language, plan, status, terminated_at, recovery_until")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (organizationError || !organization || !membership.accepted_at) return null;

  const plan: OrganizationPlan =
    organization.plan === "business"
      ? "business"
      : organization.plan === "premium"
        ? "premium"
        : "base";

  return {
    userId: user.id,
    email: user.email,
    emailVerified: true,
    organizationId: membership.organization_id,
    organizationName: organization.name,
    organizationStatus: organization.status as OrganizationStatus,
    plan,
    terminatedAt: organization.terminated_at ?? null,
    recoveryUntil: organization.recovery_until ?? null,
    role: membership.role === "client_owner" ? "client_owner" : "client_member",
    language: organization.primary_language === "en" ? "en" : "pt",
  };
}

export async function requirePortal(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  return session;
}

export async function requirePortalOperational(): Promise<PortalSession> {
  const session = await requirePortal();
  if (portalServiceIsClosed(session)) {
    redirect("/portal?service=closed");
  }
  return session;
}

export async function requirePortalPremium(): Promise<PortalSession> {
  const session = await requirePortalOperational();
  if (!portalHasPremiumAccess(session)) {
    redirect(`/portal?error=${encodeURIComponent(premiumPlanMessage(session.language))}`);
  }
  return session;
}

export async function requirePortalOwner(): Promise<PortalSession> {
  const session = await requirePortalOperational();
  if (session.role !== "client_owner") {
    const message = tr(session.language, "Sem permissão para alterar a configuração.", "You do not have permission to change the configuration.");
    redirect(`/portal?error=${encodeURIComponent(message)}`);
  }
  return session;
}

export async function requirePortalPremiumOwner(): Promise<PortalSession> {
  const session = await requirePortalPremium();
  if (session.role !== "client_owner") {
    const message = tr(session.language, "Sem permissão para alterar a configuração.", "You do not have permission to change the configuration.");
    redirect(`/portal?error=${encodeURIComponent(message)}`);
  }
  return session;
}

export async function getOrganizationOwnerAccess(organizationId: string) {
  const admin = await getAdminSession();
  if (admin) {
    return { surface: "admin" as const, admin, portal: null };
  }

  const portal = await getPortalSession();
  if (
    !portal ||
    portal.organizationId !== organizationId ||
    portal.role !== "client_owner" ||
    portalServiceIsClosed(portal)
  ) {
    return null;
  }

  return { surface: "portal" as const, admin: null, portal };
}

export async function requireOrganizationOwnerAccess(organizationId: string) {
  const access = await getOrganizationOwnerAccess(organizationId);
  if (!access) redirect("/portal/login");
  return access;
}

export async function requireOrganizationPremiumOwnerAccess(organizationId: string) {
  const access = await requireOrganizationOwnerAccess(organizationId);
  if (access.surface === "portal" && !portalHasPremiumAccess(access.portal)) {
    redirect(`/portal?error=${encodeURIComponent(premiumPlanMessage(access.portal.language))}`);
  }
  return access;
}

export async function canPreviewOrganization(organizationId: string) {
  const admin = await getAdminSession();
  if (admin) return true;
  const portal = await getPortalSession();
  return Boolean(
    portal &&
      portal.organizationId === organizationId &&
      portal.role === "client_owner" &&
      !portalServiceIsClosed(portal) &&
      portalHasPremiumAccess(portal),
  );
}
