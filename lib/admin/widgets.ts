import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrganization } from "@/lib/admin/organizations";

export type WidgetPosition = "left" | "right";
export type WidgetLauncherSize = "small" | "medium" | "large";
export type WidgetAvatarStyle = "chat" | "initial" | "image";
export type WidgetLauncherStyle = "momo" | "image";

// The current live chat panel is 390 x 570 px. Keep these values as the
// minimum so resizing cannot make an existing client's widget smaller.
export const WIDGET_PANEL_MIN_WIDTH = 390;
export const WIDGET_PANEL_MAX_WIDTH = 520;
export const WIDGET_PANEL_MIN_HEIGHT = 570;
export const WIDGET_PANEL_MAX_HEIGHT = 760;

export type ClientWidgetConfig = {
  id: string | null;
  organization_id: string;
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  panel_background: string;
  panel_width: number;
  panel_height: number;
  position: WidgetPosition;
  launcher_size: WidgetLauncherSize;
  launcher_style: WidgetLauncherStyle;
  launcher_image_url: string | null;
  avatar_style: WidgetAvatarStyle;
  avatar_url: string | null;
  panel_radius: number;
  hover_label_enabled: boolean;
  hover_label_text: string | null;
  hover_label_background: string;
  hover_label_text_color: string;
  public_key: string;
  is_enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export const defaultWidgetConfig = {
  primary_color: "#FF7A18",
  secondary_color: "#FFB04A",
  tertiary_color: "#FF4D00",
  panel_background: "#111111",
  panel_width: WIDGET_PANEL_MIN_WIDTH,
  panel_height: WIDGET_PANEL_MIN_HEIGHT,
  position: "right" as WidgetPosition,
  launcher_size: "medium" as WidgetLauncherSize,
  launcher_style: "momo" as WidgetLauncherStyle,
  launcher_image_url: null as string | null,
  avatar_style: "chat" as WidgetAvatarStyle,
  avatar_url: null as string | null,
  panel_radius: 28,
  hover_label_enabled: true,
  hover_label_text: null as string | null,
  hover_label_background: "#171717",
  hover_label_text_color: "#B8B8B8",
};

export async function getClientWidgetConfig(
  organizationId: string,
): Promise<ClientWidgetConfig | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("widget_configs")
    .select(
      "id, organization_id, primary_color, secondary_color, tertiary_color, panel_background, panel_width, panel_height, position, launcher_size, launcher_style, launcher_image_url, avatar_style, avatar_url, panel_radius, hover_label_enabled, hover_label_text, hover_label_background, hover_label_text_color, public_key, is_enabled, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as ClientWidgetConfig;

  const organization = await getOrganization(organizationId);
  if (!organization) return null;

  return {
    id: null,
    organization_id: organizationId,
    ...defaultWidgetConfig,
    public_key: "",
    is_enabled: false,
    created_at: null,
    updated_at: null,
  };
}

export function widgetPositionLabel(position: WidgetPosition) {
  return position === "left" ? "Esquerda" : "Direita";
}

export function widgetLauncherSizeLabel(size: WidgetLauncherSize) {
  if (size === "small") return "Pequeno";
  if (size === "large") return "Grande";
  return "Médio";
}
