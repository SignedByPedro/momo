import { getPortalSession } from "@/lib/portal/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;

async function fetchAllByOrganization(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  table: string,
  organizationId: string,
  select = "*",
) {
  const rows: Record<string, unknown>[] = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq("organization_id", organizationId)
      .range(start, start + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return rows;
}

async function fetchMessagesForConversations(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  conversationIds: string[],
) {
  const rows: Record<string, unknown>[] = [];
  const chunkSize = 100;

  for (let offset = 0; offset < conversationIds.length; offset += chunkSize) {
    const ids = conversationIds.slice(offset, offset + chunkSize);
    let start = 0;

    while (true) {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
        .range(start, start + PAGE_SIZE - 1);

      if (error) throw error;
      const page = (data ?? []) as unknown as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }
  }

  return rows;
}

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "client_owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createSupabaseAdmin();
    const organizationId = session.organizationId;

    const [
      organizationResult,
      membersResult,
      agentResult,
      widgetResult,
      knowledge,
      conversations,
      leads,
      supportTickets,
      supportMessages,
    ] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug, website, business_type, country, primary_language, plan, status, member_limit, terminated_at, recovery_until, termination_reason, created_at, updated_at")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("id, organization_id, user_id, email, role, invited_at, accepted_at")
        .eq("organization_id", organizationId)
        .order("invited_at", { ascending: true }),
      supabase
        .from("agent_configs")
        .select("id, organization_id, name, welcome_message, placeholder, tone, custom_instructions, fallback_behavior, supported_languages, objective, contact_capture_mode, human_handoff_enabled, goals, created_at, updated_at")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("widget_configs")
        .select("id, organization_id, primary_color, secondary_color, tertiary_color, panel_background, panel_width, panel_height, position, launcher_size, launcher_style, launcher_image_url, avatar_style, avatar_url, panel_radius, hover_label_enabled, hover_label_text, hover_label_background, hover_label_text_color, public_key, is_enabled, created_at, updated_at")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      fetchAllByOrganization(
        supabase,
        "knowledge_entries",
        organizationId,
        "id, organization_id, slug, category, title, content, visibility, status, source_type, source_url, created_at, updated_at",
      ),
      fetchAllByOrganization(supabase, "conversations", organizationId),
      fetchAllByOrganization(supabase, "leads", organizationId),
      fetchAllByOrganization(supabase, "support_tickets", organizationId),
      fetchAllByOrganization(supabase, "support_ticket_messages", organizationId),
    ]);

    if (organizationResult.error) throw organizationResult.error;
    if (membersResult.error) throw membersResult.error;
    if (agentResult.error) throw agentResult.error;
    if (widgetResult.error) throw widgetResult.error;
    if (!organizationResult.data) {
      return Response.json({ error: "Organization not found" }, { status: 404 });
    }

    const conversationIds = conversations
      .map((row) => String(row.id ?? ""))
      .filter(Boolean);
    const messages = await fetchMessagesForConversations(supabase, conversationIds);

    const payload = {
      export: {
        service: "Momo",
        format_version: "1.0",
        generated_at: new Date().toISOString(),
        generated_for: session.email,
        scope: "organization",
      },
      organization: organizationResult.data,
      team: membersResult.data ?? [],
      agent: agentResult.data,
      widget: widgetResult.data,
      knowledge_base: knowledge,
      conversations,
      messages,
      leads,
      support_tickets: supportTickets,
      support_ticket_messages: supportMessages,
    };

    const date = new Date().toISOString().slice(0, 10);
    const slug = String(organizationResult.data.slug ?? "momo-export")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "momo-export";

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="momo-${slug}-${date}.json"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[portal-data-export] Could not create export:", error);
    return Response.json(
      { error: "Could not create data export." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
