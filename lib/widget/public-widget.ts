import { getClientAgentConfig } from "@/lib/admin/agents";
import { getOrganization } from "@/lib/admin/organizations";
import {
  type ClientWidgetConfig,
  getClientWidgetConfig,
} from "@/lib/admin/widgets";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type PublicWidgetBundle = {
  organization: NonNullable<Awaited<ReturnType<typeof getOrganization>>>;
  agent: NonNullable<Awaited<ReturnType<typeof getClientAgentConfig>>>;
  widget: ClientWidgetConfig;
};

export async function getPublicWidgetBundle(
  publicKey: string,
): Promise<PublicWidgetBundle | null> {
  const key = publicKey.trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(key)) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("widget_configs")
    .select("organization_id")
    .eq("public_key", key)
    .eq("is_enabled", true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.organization_id) return null;

  const [organization, agent, widget] = await Promise.all([
    getOrganization(data.organization_id),
    getClientAgentConfig(data.organization_id),
    getClientWidgetConfig(data.organization_id),
  ]);

  if (!organization || !agent || !widget) return null;
  if (["paused", "cancelled", "purge_due"].includes(organization.status)) return null;
  if (!widget.is_enabled || widget.public_key !== key) return null;

  return { organization, agent, widget };
}
