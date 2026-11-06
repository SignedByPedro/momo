"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { syncDefaultAgentPlaceholder } from "@/lib/admin/agents";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses = ["new", "contacted", "won", "lost"] as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "cliente";
}

async function uniqueSlug(name: string) {
  const supabase = createSupabaseAdmin();
  const base = slugify(name);
  const { data, error } = await supabase.from("organizations").select("slug").eq("slug", base).maybeSingle();
  if (error) throw error;
  return data ? `${base}-${crypto.randomUUID().slice(0, 6)}` : base;
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function organizationNameFromLead(lead: { website: string | null; name: string | null }) {
  if (lead.website) {
    try {
      const url = new URL(/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`);
      const hostname = url.hostname.replace(/^www\./i, "");
      const firstLabel = hostname.split(".")[0];
      if (firstLabel) return titleCase(firstLabel);
    } catch {
      // Fall through to the contact name.
    }
  }

  return lead.name ? `Cliente - ${lead.name}` : "Novo cliente";
}

async function convertLeadToClient(leadId: string) {
  const supabase = createSupabaseAdmin();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, conversation_id, name, website, business_type, converted_organization_id")
    .eq("id", leadId)
    .eq("source", "momo_sales")
    .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) throw new Error("Lead não encontrada.");

  if (lead.converted_organization_id) {
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "won", updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (updateError) throw updateError;
    return lead.converted_organization_id as string;
  }

  let primaryLanguage: "pt" | "en" = "pt";
  if (lead.conversation_id) {
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("language")
      .eq("id", lead.conversation_id)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (conversation?.language === "en") primaryLanguage = "en";
  }

  const name = organizationNameFromLead(lead);
  const slug = await uniqueSlug(name);
  const now = new Date().toISOString();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      website: lead.website,
      business_type: lead.business_type,
      country: null,
      primary_language: primaryLanguage,
      plan: "base",
      status: "setup",
      updated_at: now,
    })
    .select("id")
    .single();

  if (organizationError) throw organizationError;

  await syncDefaultAgentPlaceholder(organization.id, primaryLanguage);

  const { error: updateLeadError } = await supabase
    .from("leads")
    .update({
      status: "won",
      converted_organization_id: organization.id,
      updated_at: now,
    })
    .eq("id", leadId);

  if (updateLeadError) throw updateLeadError;
  return organization.id as string;
}

export async function updateLeadStatus(formData: FormData) {
  await requireAdmin();

  const leadId = String(formData.get("leadId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!leadId || !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) return;

  const supabase = createSupabaseAdmin();

  if (status === "lost") {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("source", "momo_sales");
    if (error) throw error;

    revalidatePath("/admin");
    redirect(`/admin?notice=${encodeURIComponent("Lead marcada como perdida e eliminada.")}`);
  }

  if (status === "won") {
    const organizationId = await convertLeadToClient(leadId);
    revalidatePath("/admin");
    revalidatePath("/admin/clients");
    redirect(`/admin/clients/${organizationId}?notice=${encodeURIComponent("Cliente criado automaticamente a partir da lead. Podes agora completar a configuração.")}`);
  }

  const { error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("source", "momo_sales");

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath(`/admin/leads/${leadId}`);
  redirect(`/admin/leads/${leadId}?notice=${encodeURIComponent("Estado guardado com sucesso.")}`);
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
