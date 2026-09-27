import FormSubmitButton from "@/app/_components/FormSubmitButton";
import { requirePortal } from "@/lib/portal/auth";
import { getPortalLeads } from "@/lib/portal/data";
import { dateLocale, tr } from "@/lib/i18n/ui";
import { updatePortalLeadStatus } from "../actions";

export default async function PortalLeadsPage() {
  const session = await requirePortal();
  const leads = await getPortalLeads(session.organizationId);
  const l = session.language;
  const formatDate = (value: string) => new Intl.DateTimeFormat(dateLocale(l), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  const statuses = l === "en" ? [["new","New"],["contacted","Contacted"],["won","Customer"],["lost","Lost"]] as const : [["new","Novo"],["contacted","Contactado"],["won","Cliente"],["lost","Perdido"]] as const;

  return (
    <div className="max-w-6xl">
      <div><p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">{tr(l, "Contactos", "Contacts")}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Leads</h1><p className="mt-2 text-sm text-white/40">{tr(l, `Contactos captados pelo widget de ${session.organizationName}.`, `Contacts captured by ${session.organizationName}'s widget.`)}</p></div>
      <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515]">
        {leads.length === 0 ? <div className="px-5 py-14 text-center text-sm text-white/35">{tr(l, "Ainda não existem leads captados.", "No leads have been captured yet.")}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.12em] text-white/30"><tr><th className="px-5 py-3 font-medium">Lead</th><th className="px-5 py-3 font-medium">{tr(l,"Contacto","Contact")}</th><th className="px-5 py-3 font-medium">{tr(l,"Estado","Status")}</th><th className="px-5 py-3 font-medium">{tr(l,"Data","Date")}</th></tr></thead><tbody className="divide-y divide-white/[0.05]">{leads.map((lead) => <tr key={lead.id}><td className="px-5 py-4 font-medium text-white/85">{lead.name || tr(l,"Sem nome","No name")}</td><td className="px-5 py-4 text-white/55">{lead.email || lead.phone || "—"}</td><td className="px-5 py-4"><form action={updatePortalLeadStatus} className="flex items-center gap-2"><input type="hidden" name="leadId" value={lead.id}/><select name="status" defaultValue={lead.status} className="rounded-lg border border-white/[0.08] bg-[#101010] px-2.5 py-2 text-xs text-white/70 outline-none">{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><FormSubmitButton className="rounded-lg border border-white/[0.07] px-2.5 py-2 text-xs text-white/50 transition hover:text-white">{tr(l,"Guardar","Save")}</FormSubmitButton></form></td><td className="px-5 py-4 text-xs text-white/35">{formatDate(lead.created_at)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
