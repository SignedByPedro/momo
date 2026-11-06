"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizationPremiumOwnerAccess } from "@/lib/portal/auth";
import { getOrganization } from "@/lib/admin/organizations";
import {
  type WidgetAvatarStyle,
  type WidgetLauncherSize,
  type WidgetLauncherStyle,
  type WidgetPosition,
  WIDGET_PANEL_MIN_WIDTH,
  WIDGET_PANEL_MAX_WIDTH,
  WIDGET_PANEL_MIN_HEIGHT,
  WIDGET_PANEL_MAX_HEIGHT,
} from "@/lib/admin/widgets";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { tr } from "@/lib/i18n/ui";

const allowedPositions = new Set<WidgetPosition>(["left", "right"]);
const allowedSizes = new Set<WidgetLauncherSize>(["small", "medium", "large"]);
const allowedAvatarStyles = new Set<WidgetAvatarStyle>(["chat", "initial", "image"]);
const allowedLauncherStyles = new Set<WidgetLauncherStyle>(["momo", "image"]);
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;
const hexColor = /^#[0-9A-Fa-f]{6}$/;

function boundedPanelSize(value: FormDataEntryValue | null, min: number, max: number) {
  const number = Number(String(value ?? ""));
  return Number.isFinite(number) && number > 0
    ? Math.min(max, Math.max(min, Math.round(number)))
    : min;
}

function clean(value: FormDataEntryValue | null, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function fileValue(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function widgetPath(organizationId: string, surface: "admin" | "portal" = "admin") {
  return surface === "portal" ? "/portal/widget" : `/admin/clients/${organizationId}/widget`;
}

function redirectWith(
  organizationId: string,
  key: "notice" | "error",
  message: string,
  surface: "admin" | "portal" = "admin",
): never {
  redirect(`${widgetPath(organizationId, surface)}?${key}=${encodeURIComponent(message)}`);
}

function validateImage(file: File, organizationId: string, label: string, surface: "admin" | "portal", language: "pt" | "en") {
  if (!allowedImageTypes.has(file.type)) {
    redirectWith(organizationId, "error", tr(language, `${label}: usa PNG, JPG ou WebP.`, `${label}: use PNG, JPG or WebP.`), surface);
  }
  if (file.size > maxImageBytes) {
    redirectWith(organizationId, "error", tr(language, `${label}: a imagem não pode ultrapassar 5 MB.`, `${label}: the image cannot exceed 5 MB.`), surface);
  }
}

async function uploadWidgetImage(
  organizationId: string,
  kind: "avatar" | "launcher",
  file: File,
) {
  const supabase = createSupabaseAdmin();
  const path = `${organizationId}/${kind}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("widget-assets").upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new Error(`Widget asset upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from("widget-assets").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function saveClientWidgetConfig(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  if (!organizationId) return;
  const access = await requireOrganizationPremiumOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";
  const primaryColor = clean(formData.get("primaryColor"), 20).toUpperCase();
  const secondaryColor = clean(formData.get("secondaryColor"), 20).toUpperCase();
  const tertiaryColor = clean(formData.get("tertiaryColor"), 20).toUpperCase();
  const panelBackground = clean(formData.get("panelBackground"), 20).toUpperCase();
  const panelWidth = boundedPanelSize(formData.get("panelWidth"), WIDGET_PANEL_MIN_WIDTH, WIDGET_PANEL_MAX_WIDTH);
  const panelHeight = boundedPanelSize(formData.get("panelHeight"), WIDGET_PANEL_MIN_HEIGHT, WIDGET_PANEL_MAX_HEIGHT);
  const position = clean(formData.get("position"), 20) as WidgetPosition;
  const launcherSize = clean(formData.get("launcherSize"), 20) as WidgetLauncherSize;
  const launcherStyle = clean(formData.get("launcherStyle"), 20) as WidgetLauncherStyle;
  const avatarStyle = clean(formData.get("avatarStyle"), 20) as WidgetAvatarStyle;
  const existingAvatarUrl = clean(formData.get("existingAvatarUrl"), 1400) || null;
  const existingLauncherImageUrl = clean(formData.get("existingLauncherImageUrl"), 1400) || null;
  const avatarFile = fileValue(formData.get("avatarFile"));
  const launcherImageFile = fileValue(formData.get("launcherImageFile"));
  const hoverLabelEnabled = clean(formData.get("hoverLabelEnabled"), 10) !== "false";
  const hoverLabelText = clean(formData.get("hoverLabelText"), 80) || null;
  const hoverLabelBackground = clean(formData.get("hoverLabelBackground"), 20).toUpperCase();
  const hoverLabelTextColor = clean(formData.get("hoverLabelTextColor"), 20).toUpperCase();
  const panelRadiusRaw = Number(clean(formData.get("panelRadius"), 10));
  const panelRadius = Number.isFinite(panelRadiusRaw)
    ? Math.min(36, Math.max(16, Math.round(panelRadiusRaw)))
    : 28;


  for (const [label, color] of [
    ["cor principal", primaryColor],
    ["cor secundária", secondaryColor],
    ["terceira cor", tertiaryColor],
    ["fundo do chat", panelBackground],
    ["fundo do texto de hover", hoverLabelBackground],
    ["texto do hover", hoverLabelTextColor],
  ] as const) {
    if (!hexColor.test(color)) {
      redirectWith(organizationId, "error", tr(language, `A ${label} não é válida.`, `Invalid ${label}.`), access.surface);
    }
  }

  if (!allowedPositions.has(position)) {
    redirectWith(organizationId, "error", tr(language, "A posição selecionada não é válida.", "The selected position is invalid."), access.surface);
  }
  if (!allowedSizes.has(launcherSize)) {
    redirectWith(organizationId, "error", tr(language, "O tamanho selecionado não é válido.", "The selected size is invalid."), access.surface);
  }
  if (!allowedLauncherStyles.has(launcherStyle)) {
    redirectWith(organizationId, "error", tr(language, "O estilo do botão não é válido.", "The button style is invalid."), access.surface);
  }
  if (!allowedAvatarStyles.has(avatarStyle)) {
    redirectWith(organizationId, "error", tr(language, "O estilo de avatar não é válido.", "The avatar style is invalid."), access.surface);
  }

  if (avatarFile) validateImage(avatarFile, organizationId, "Avatar", access.surface, language);
  if (launcherImageFile) validateImage(launcherImageFile, organizationId, tr(language, "Imagem do botão", "Button image"), access.surface, language);

  const organization = await getOrganization(organizationId);
  if (!organization) redirectWith(organizationId, "error", tr(language, "Cliente não encontrado.", "Client not found."), access.surface);

  let avatarUrl = existingAvatarUrl;
  let launcherImageUrl = existingLauncherImageUrl;

  if (avatarFile) {
    avatarUrl = await uploadWidgetImage(organizationId, "avatar", avatarFile);
  }
  if (launcherImageFile) {
    launcherImageUrl = await uploadWidgetImage(organizationId, "launcher", launcherImageFile);
  }

  if (avatarStyle === "image" && !avatarUrl) {
    redirectWith(organizationId, "error", tr(language, "Escolhe uma imagem para o avatar.", "Choose an image for the avatar."), access.surface);
  }
  if (launcherStyle === "image" && !launcherImageUrl) {
    redirectWith(organizationId, "error", tr(language, "Escolhe uma imagem para o botão completo.", "Choose an image for the full button."), access.surface);
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("widget_configs").upsert(
    {
      organization_id: organizationId,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      tertiary_color: tertiaryColor,
      panel_background: panelBackground,
      panel_width: panelWidth,
      panel_height: panelHeight,
      position,
      launcher_size: launcherSize,
      launcher_style: launcherStyle,
      launcher_image_url: launcherImageUrl,
      avatar_style: avatarStyle,
      avatar_url: avatarUrl,
      panel_radius: panelRadius,
      hover_label_enabled: hoverLabelEnabled,
      hover_label_text: hoverLabelText,
      hover_label_background: hoverLabelBackground,
      hover_label_text_color: hoverLabelTextColor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) throw error;

  revalidatePath(widgetPath(organizationId, "admin"));
  revalidatePath("/portal/widget");
  revalidatePath(`/admin/clients/${organizationId}`);
  revalidatePath(`/admin/clients/${organizationId}/agent`);
  revalidatePath("/portal/agent");
  redirectWith(organizationId, "notice", tr(language, "Aspeto do widget guardado.", "Widget appearance saved."), access.surface);
}

export async function toggleClientWidgetPublication(formData: FormData) {
  const organizationId = clean(formData.get("organizationId"), 100);
  if (!organizationId) return;
  const access = await requireOrganizationPremiumOwnerAccess(organizationId);
  const language = access.portal?.language ?? "pt";
  const enabled = clean(formData.get("enabled"), 10) === "true";

  const organization = await getOrganization(organizationId);
  if (!organization) redirectWith(organizationId, "error", tr(language, "Cliente não encontrado.", "Client not found."), access.surface);

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("widget_configs")
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (error) throw error;

  revalidatePath(widgetPath(organizationId, "admin"));
  revalidatePath("/portal/widget");
  redirectWith(
    organizationId,
    "notice",
    enabled ? tr(language, "Widget publicado e pronto a instalar.", "Widget published and ready to install.") : tr(language, "Widget desativado.", "Widget disabled."),
    access.surface,
  );
}
