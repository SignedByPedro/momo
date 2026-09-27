import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type PortalLead = {
  id: string;
  conversation_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

export async function getPortalLeads(organizationId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("id, conversation_id, name, email, phone, status, created_at")
    .eq("organization_id", organizationId)
    .eq("source", "widget")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PortalLead[];
}

export async function getPortalLeadStats(organizationId: string) {
  const leads = await getPortalLeads(organizationId);
  return {
    total: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    contacted: leads.filter((lead) => lead.status === "contacted").length,
  };
}
