import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge, { statusLabel } from "@/components/admin/StatusBadge";
import { getLead, type LeadStatus } from "@/lib/admin/data";
import { updateLeadStatus } from "../../actions";

const statuses: LeadStatus[] = ["new", "contacted", "won", "lost"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin" className="text-sm text-white/40 transition hover:text-white">← Leads</Link>

      {query.notice && (
        <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/80">
          {query.notice}
        </div>
      )}

      <div className="mt-5 rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Lead</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{lead.name || "Sem nome"}</h1>
            <p className="mt-2 text-sm text-white/40">Captado em {formatDate(lead.created_at)}</p>
          </div>
          <StatusBadge status={lead.status} />
        </div>

        <div className="mt-8 grid gap-6 border-t border-white/[0.07] pt-7 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/30">Contacto</p>
            <p className="mt-2 text-sm text-white/80">{lead.email || "—"}</p>
            <p className="mt-1 text-sm text-white/55">{lead.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/30">Negócio</p>
            <p className="mt-2 text-sm text-white/80">{lead.business_type || "—"}</p>
            <p className="mt-1 break-all text-sm text-white/55">{lead.website || "—"}</p>
          </div>
        </div>

        {lead.converted_organization_id && (
          <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4 text-sm text-emerald-100/75">
            Esta lead já criou um cliente. <Link className="font-medium text-emerald-200 underline underline-offset-4" href={`/admin/clients/${lead.converted_organization_id}`}>Abrir cliente →</Link>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#101010] p-5">
          <p className="text-sm font-medium">Atualizar estado</p>
          <p className="mt-1 text-xs leading-5 text-white/35">{lead.converted_organization_id ? "Ao escolher Perdido, a lead é eliminada; o cliente já criado mantém-se até o eliminares na área Clientes." : "Ao escolher Cliente é criada automaticamente uma organização em configuração. Ao escolher Perdido, a lead é eliminada."}</p>
          <form action={updateLeadStatus} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="leadId" value={lead.id} />
            <select key={lead.status} name="status" defaultValue={lead.status} className="min-h-11 flex-1 rounded-xl border border-white/[0.08] bg-[#181818] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/50">
              {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">Guardar</FormSubmitButton>
          </form>
        </div>

        {lead.conversation_id && (
          <Link href={`/admin/conversations/${lead.conversation_id}`} className="mt-6 inline-flex rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/65 transition hover:border-[#ff7a18]/25 hover:text-[#ff9a4d]">
            Ver conversa completa →
          </Link>
        )}
      </div>
    </div>
  );
}
