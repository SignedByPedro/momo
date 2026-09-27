import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getClientAgentConfig } from "@/lib/admin/agents";
import { getOrganization } from "@/lib/admin/organizations";
import { getClientWidgetConfig, WIDGET_PANEL_MIN_WIDTH, WIDGET_PANEL_MAX_WIDTH, WIDGET_PANEL_MIN_HEIGHT, WIDGET_PANEL_MAX_HEIGHT } from "@/lib/admin/widgets";
import CopyInstallCode from "./CopyInstallCode";
import WidgetAppearanceEditor from "./WidgetAppearanceEditor";
import {
  saveClientWidgetConfig,
  toggleClientWidgetPublication,
} from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

export default async function ClientWidgetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const [organization, agent, widget] = await Promise.all([
    getOrganization(id),
    getClientAgentConfig(id),
    getClientWidgetConfig(id),
  ]);

  if (!organization || !agent || !widget) notFound();

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const baseUrl = `${protocol}://${host}`;
  const installCode = `<script src="${baseUrl}/widget.js" data-agent="${widget.public_key}" async></script>`;
  const isolatedWidgetUrl = `${baseUrl}/embed/${widget.public_key}`;

  return (
    <div className="max-w-[1500px]">
      <Link
        href={`/admin/clients/${organization.id}`}
        className="text-sm text-white/40 transition hover:text-white"
      >
        ← {organization.name}
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Widget</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Aspeto de {agent.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Personaliza o launcher e a janela de chat para combinar com a identidade visual de {organization.name}. O preview atualiza em tempo real.
          </p>
        </div>
        <Link
          href={`/admin/clients/${organization.id}/agent`}
          className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/55 transition hover:border-[#ff7a18]/25 hover:text-[#ff9a4d]"
        >
          Agent →
        </Link>
      </div>

      {query.notice && (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">
          {query.notice}
        </div>
      )}
      {query.error && (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
          {query.error}
        </div>
      )}

      <form action={saveClientWidgetConfig} className="mt-7">
        <input type="hidden" name="organizationId" value={organization.id} />
        <WidgetAppearanceEditor
          config={widget}
          agentName={agent.name}
          welcomeMessage={agent.welcome_message}
          placeholder={agent.placeholder}
          primaryLanguage={organization.primary_language}
          panelSizeBounds={{ minWidth: WIDGET_PANEL_MIN_WIDTH, maxWidth: WIDGET_PANEL_MAX_WIDTH, minHeight: WIDGET_PANEL_MIN_HEIGHT, maxHeight: WIDGET_PANEL_MAX_HEIGHT }}
        />
      </form>

      <section className="mt-7 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold">Instalação no website</h2>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  widget.is_enabled
                    ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300/80"
                    : "border-white/[0.08] bg-white/[0.03] text-white/35"
                }`}
              >
                {widget.is_enabled ? "Publicado" : "Desativado"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">
              Cola este script antes de <code className="text-white/60">&lt;/body&gt;</code> no website do cliente. O script cria um iframe isolado, por isso o CSS do site não interfere com o widget e o widget também não altera o site.
            </p>
          </div>

          <form action={toggleClientWidgetPublication}>
            <input type="hidden" name="organizationId" value={organization.id} />
            <input type="hidden" name="enabled" value={widget.is_enabled ? "false" : "true"} />
            <FormSubmitButton
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                widget.is_enabled
                  ? "border border-white/[0.08] text-white/55 hover:border-red-400/20 hover:text-red-300"
                  : "bg-[#ff7a18] text-[#17110c] hover:bg-[#ff9138]"
              }`}
            >
              {widget.is_enabled ? "Desativar widget" : "Publicar widget"}
            </FormSubmitButton>
          </form>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#0e0e0e] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/30">Script de instalação</p>
            <CopyInstallCode code={installCode} />
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.06] bg-black/20 p-4 font-mono text-xs leading-6 text-white/65">
            {installCode}
          </pre>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/30">
          <span>Public key: <code className="text-white/45">{widget.public_key}</code></span>
          {widget.is_enabled && (
            <a
              href={isolatedWidgetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#ff9a4d]/75 transition hover:text-[#ff9a4d]"
            >
              Abrir widget isolado ↗
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
