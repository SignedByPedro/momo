import FormSubmitButton from "@/app/_components/FormSubmitButton";
import { getOrganization } from "@/lib/admin/organizations";
import { requirePortalOwner } from "@/lib/portal/auth";
import { tr } from "@/lib/i18n/ui";
import { requestOrganizationDataDeletion, requestPrimaryLanguageChange, updatePortalOrganization } from "./actions";

export default async function PortalSettingsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const session = await requirePortalOwner();
  const query = await searchParams;
  const organization = await getOrganization(session.organizationId);
  if (!organization) return null;
  const l = session.language;

  return (
    <div className="max-w-3xl">
      <div><p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">{tr(l,"Empresa","Company")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr(l,"Dados da organização","Organization details")}</h1><p className="mt-2 text-sm leading-6 text-white/40">{tr(l,"Atualiza a informação base usada para configurar o teu agente.","Update the core information used to configure your agent.")}</p></div>
      {query.notice && <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">{query.notice}</div>}
      {query.error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">{query.error}</div>}
      <form action={updatePortalOrganization} className="mt-7 grid gap-5 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <input type="hidden" name="uiLanguage" value={l} />
        <div><p className="text-xs text-white/35">{tr(l,"Nome da empresa","Company name")}</p><p className="mt-1 font-medium text-white/80">{organization.name}</p><p className="mt-1 text-[11px] text-white/25">{tr(l,"O nome é gerido pela equipa da plataforma para evitar alterações acidentais de identificação.","The company name is managed by the platform team to avoid accidental identity changes.")}</p></div>
        <label className="grid gap-2 text-xs text-white/45">Website<input name="website" defaultValue={organization.website ?? ""} placeholder="https://..." className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" /></label>
        <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-xs text-white/45">{tr(l,"Tipo de negócio","Business type")}<input name="businessType" defaultValue={organization.business_type ?? ""} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" /></label><label className="grid gap-2 text-xs text-white/45">{tr(l,"País","Country")}<input name="country" defaultValue={organization.country ?? ""} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45" /></label></div>
        <div className="grid gap-2 text-xs text-white/45">
          <p>{tr(l, "Idioma principal", "Primary language")}</p>
          <div className="flex min-h-11 items-center rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm font-medium text-white/75" aria-label={tr(l, "Idioma principal definido pela equipa Momo", "Primary language set by the Momo team")}>
            {organization.primary_language === "en" ? "English" : "Português"}
          </div>
          <p className="text-[11px] leading-5 text-white/35">{tr(l, "Definido pela equipa Momo. Também determina o idioma do Portal e só a nossa equipa o pode alterar, mesmo com o extra multilíngua.", "Set by the Momo team. It also determines the Portal language and can only be changed by our team, even with the multilingual add-on.")}</p>
        </div>
        <div><FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">{tr(l,"Guardar alterações","Save changes")}</FormSubmitButton></div>
      </form>

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-base font-semibold text-white/85">{tr(l, "Alterar idioma principal", "Change primary language")}</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">
          {tr(l, "Queres mudar o idioma principal? Envia um ticket à equipa Momo para analisarmos o pedido. A alteração não é automática.", "Want to change the primary language? Send a ticket to the Momo team for review. The change is not automatic.")}
        </p>
        <form action={requestPrimaryLanguageChange} className="mt-4">
          <FormSubmitButton type="submit" className="rounded-xl border border-[#ff7a18]/40 bg-[#ff7a18]/[0.08] px-4 py-2.5 text-sm font-semibold text-[#ff9b50] transition hover:bg-[#ff7a18]/[0.15]">
            {tr(l, `Pedir alteração para ${organization.primary_language === "en" ? "Português" : "English"}`, `Request change to ${organization.primary_language === "en" ? "Portuguese" : "English"}`)}
          </FormSubmitButton>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">{tr(l,"Privacidade","Privacy")}</p>
          <h2 className="mt-2 text-xl font-semibold text-white/90">{tr(l,"Dados da organização","Organisation data")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">{tr(l,"Exporta uma cópia dos dados operacionais da tua organização ou pede à equipa Momo a eliminação da conta e dos dados associados.","Export a copy of your organisation's operational data or ask the Momo team to delete the account and associated data.")}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#101010] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white/80">{tr(l,"Exportar dados","Export data")}</h3>
              <p className="mt-1 text-xs leading-5 text-white/35">{tr(l,"Descarrega um ficheiro JSON com dados da organização, equipa, agente/widget, Knowledge Base, conversas, mensagens, leads e suporte.","Download a JSON file containing organisation, team, agent/widget, Knowledge Base, conversations, messages, leads and support data.")}</p>
            </div>
            <a href="/api/portal/data-export" className="shrink-0 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/[0.18] hover:bg-white/[0.03] hover:text-white">{tr(l,"Descarregar exportação","Download export")}</a>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/[0.025] p-5">
          <h3 className="text-sm font-semibold text-red-200/80">{tr(l,"Pedir eliminação da empresa e dados","Request company and data deletion")}</h3>
          <p className="mt-2 text-xs leading-5 text-white/35">{tr(l,"Isto não apaga a empresa imediatamente. É criado um pedido de privacidade de prioridade alta para a equipa confirmar a identidade, permitir exportação quando necessário e rever eventuais obrigações de conservação antes da eliminação.","This does not erase the company immediately. It creates a high-priority privacy request so the team can verify identity, allow export where needed and review any retention obligations before deletion.")}</p>
          <form action={requestOrganizationDataDeletion} className="mt-4 grid gap-3">
            <input type="hidden" name="uiLanguage" value={l} />
            <label className="grid gap-2 text-xs text-white/45">
              {tr(l,`Para confirmar, escreve exatamente: ${organization.name}`,`To confirm, type exactly: ${organization.name}`)}
              <input name="confirmation" required autoComplete="off" className="min-h-11 rounded-xl border border-red-400/15 bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:border-red-300/35" />
            </label>
            <div><FormSubmitButton className="rounded-xl border border-red-400/25 px-4 py-2.5 text-sm font-medium text-red-200/75 transition hover:bg-red-400/[0.06] hover:text-red-100">{tr(l,"Criar pedido de eliminação","Create deletion request")}</FormSubmitButton></div>
          </form>
        </div>
      </section>
    </div>
  );
}
