import FormSubmitButton from "@/app/_components/FormSubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  contactCaptureLabel,
  fallbackBehaviorLabel,
  getClientAgentConfig,
  objectiveLabel,
} from "@/lib/admin/agents";
import { getClientKnowledgeStats } from "@/lib/admin/client-knowledge";
import { getOrganization } from "@/lib/admin/organizations";
import { getClientWidgetConfig } from "@/lib/admin/widgets";
import AgentTestChat from "./AgentTestChat";
import ToneSelector from "./ToneSelector";
import { saveClientAgentConfig } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

const goalOptions = [
  {
    value: "answer_questions",
    title: "Responder a dúvidas",
    description: "Usar a Knowledge Base para resolver perguntas dos clientes.",
  },
  {
    value: "recommend_products_services",
    title: "Recomendar produtos / serviços",
    description: "Sugerir opções relevantes quando a informação estiver confirmada.",
  },
  {
    value: "generate_leads",
    title: "Gerar leads",
    description: "Identificar intenção comercial e facilitar follow-up quando permitido.",
  },
  {
    value: "encourage_conversion",
    title: "Incentivar conversão",
    description: "Sugerir próximos passos como compra, inscrição ou pedido de proposta.",
  },
  {
    value: "collect_booking_requests",
    title: "Recolher pedidos de marcação",
    description: "Recolher um pedido sem fingir que a marcação ficou confirmada.",
  },
] as const;

export default async function ClientAgentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const [organization, config, knowledgeStats, widgetConfig] = await Promise.all([
    getOrganization(id),
    getClientAgentConfig(id),
    getClientKnowledgeStats(id),
    getClientWidgetConfig(id),
  ]);

  if (!organization || !config || !widgetConfig) notFound();

  return (
    <div className="max-w-7xl">
      <Link
        href={`/admin/clients/${organization.id}`}
        className="text-sm text-white/40 transition hover:text-white"
      >
        ← {organization.name}
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#ff8a32]">Agent</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{config.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Define o papel real deste agente. Um bot de apoio ao cliente não precisa de se comportar como um bot comercial — e vice-versa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/clients/${organization.id}/knowledge`}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/55 transition hover:border-[#ff7a18]/25 hover:text-[#ff9a4d]"
          >
            Knowledge Base →
          </Link>
          <Link
            href={`/admin/clients/${organization.id}/widget`}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/55 transition hover:border-[#ff7a18]/25 hover:text-[#ff9a4d]"
          >
            Widget →
          </Link>
        </div>
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

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <form action={saveClientAgentConfig} className="space-y-6">
          <input type="hidden" name="organizationId" value={organization.id} />

          <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Identidade</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Estes textos serão visíveis ao cliente final no widget.
              </p>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2 text-xs text-white/45">
                Nome do agente
                <input
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={config.name}
                  className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45"
                />
              </label>

              <label className="grid gap-2 text-xs text-white/45">
                Mensagem inicial
                <textarea
                  name="welcomeMessage"
                  required
                  maxLength={500}
                  rows={3}
                  defaultValue={config.welcome_message}
                  className="resize-y rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-[#ff7a18]/45"
                />
              </label>

              <label className="grid gap-2 text-xs text-white/45">
                Placeholder da caixa de mensagem
                <input
                  name="placeholder"
                  required
                  maxLength={160}
                  defaultValue={config.placeholder}
                  className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none focus:border-[#ff7a18]/45"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#ff7a18]/15 bg-[#ff7a18]/[0.025] p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Objetivo do agente</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Esta configuração separa um agente de suporte, como o Signed By, de um agente comercial como o Momo.
              </p>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2 text-xs text-white/45">
                Objetivo principal
                <select
                  name="objective"
                  defaultValue={config.objective}
                  className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none"
                >
                  <option value="customer_support">Apoio ao cliente</option>
                  <option value="sales_lead_generation">Vendas / captação de leads</option>
                  <option value="support_and_sales">Apoio + vendas</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>

              <label className="grid gap-2 text-xs text-white/45">
                Captação de contactos
                <select
                  name="contactCaptureMode"
                  defaultValue={config.contact_capture_mode}
                  className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none"
                >
                  <option value="disabled">Desativada — não pedir nem criar leads</option>
                  <option value="passive">Passiva — guardar apenas quando o visitante fornece / pede follow-up</option>
                  <option value="proactive">Proativa — pode pedir contacto quando fizer sentido</option>
                </select>
                <span className="text-[11px] leading-5 text-white/25">
                  Passiva é uma boa opção para apoio ao cliente: o agente não caça leads, mas consegue registar um contacto quando o próprio visitante quer acompanhamento.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#101010] px-4 py-4">
                <input
                  type="checkbox"
                  name="humanHandoffEnabled"
                  defaultChecked={config.human_handoff_enabled}
                  className="mt-0.5 accent-[#ff7a18]"
                />
                <span>
                  <span className="block text-sm font-medium text-white/80">Permitir follow-up pela equipa</span>
                  <span className="mt-1 block text-xs leading-5 text-white/35">
                    O agente pode indicar que a equipa é mais adequada para um caso. Não significa atendimento humano em tempo real.
                  </span>
                </span>
              </label>

              <fieldset>
                <legend className="text-xs text-white/45">Resultados que o agente pode procurar</legend>
                <div className="mt-2 grid gap-2">
                  {goalOptions.map((goal) => (
                    <label
                      key={goal.value}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#101010] px-4 py-3.5"
                    >
                      <input
                        type="checkbox"
                        name="goals"
                        value={goal.value}
                        defaultChecked={config.goals.includes(goal.value)}
                        className="mt-0.5 accent-[#ff7a18]"
                      />
                      <span>
                        <span className="block text-sm text-white/75">{goal.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-5 text-white/30">
                          {goal.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Comunicação</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Define como o agente fala. Português é sempre PT-PT.
              </p>
            </div>

            <div className="mt-6 grid gap-5">
              <ToneSelector organizationId={organization.id} currentTone={config.tone} primaryLanguage={organization.primary_language === "en" ? "en" : "pt"} />

              <fieldset>
                <legend className="text-xs text-white/45">Idiomas permitidos</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-[#101010] px-4 py-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      name="supportedLanguages"
                      value="pt"
                      defaultChecked={config.supported_languages.includes("pt")}
                      className="accent-[#ff7a18]"
                    />
                    Português (PT-PT)
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-[#101010] px-4 py-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      name="supportedLanguages"
                      value="en"
                      defaultChecked={config.supported_languages.includes("en")}
                      className="accent-[#ff7a18]"
                    />
                    English
                  </label>
                </div>
              </fieldset>
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.07] bg-[#151515] p-6 sm:p-8">
            <div>
              <h2 className="text-lg font-semibold">Fallback e regras adicionais</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                O agente continua sempre limitado à informação confirmada da empresa.
              </p>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2 text-xs text-white/45">
                Quando não sabe responder
                <select
                  name="fallbackBehavior"
                  defaultValue={config.fallback_behavior === "collect_contact" ? "human_handoff" : config.fallback_behavior}
                  className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none"
                >
                  <option value="human_handoff">Indicar follow-up pela equipa</option>
                  <option value="say_unknown">Dizer que não tem informação confirmada</option>
                </select>
              </label>

              <label className="grid gap-2 text-xs text-white/45">
                Instruções adicionais
                <textarea
                  name="customInstructions"
                  maxLength={8000}
                  rows={8}
                  defaultValue={config.custom_instructions}
                  placeholder="Ex.: Mantém o foco em apoio ao cliente. Se perguntarem por uma encomenda, explica apenas a política publicada e nunca inventes o estado da encomenda."
                  className="resize-y rounded-xl border border-white/[0.08] bg-[#101010] px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-[#ff7a18]/45"
                />
                <span className="text-[11px] leading-5 text-white/25">
                  Usa este campo para regras de comportamento, não para factos como preços ou horários. Esses devem ficar na Knowledge Base.
                </span>
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <FormSubmitButton className="rounded-xl bg-[#ff7a18] px-5 py-3 text-sm font-semibold text-[#151515] transition hover:bg-[#ff9138]">
              Guardar configuração
            </FormSubmitButton>
            <span className="text-xs text-white/30">
              O preview usa a última configuração guardada.
            </span>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/30">Configuração ativa</p>
                <p className="mt-1 text-sm text-white/75">{objectiveLabel(config.objective)}</p>
              </div>
              <span className="rounded-full bg-[#ff7a18]/10 px-2.5 py-1 text-[10px] font-medium text-[#ffad6b]">
                Contactos: {contactCaptureLabel(config.contact_capture_mode)}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-xs leading-5 text-white/35">
              <p>{knowledgeStats.total} entradas · {knowledgeStats.indexed} indexadas</p>
              <p>Fallback: {fallbackBehaviorLabel(config.fallback_behavior)}.</p>
              <p>Follow-up humano: {config.human_handoff_enabled ? "permitido" : "desativado"}.</p>
            </div>
          </div>

          <AgentTestChat
            organizationId={organization.id}
            agentName={config.name}
            welcomeMessage={config.welcome_message}
            placeholder={config.placeholder}
            widgetConfig={widgetConfig}
          />
          <p className="px-1 text-[11px] leading-5 text-white/25">
            O chat de teste não cria leads reais nem executa integrações. Serve para validar conhecimento, objetivo, tom e política de contactos antes de publicar o agente.
          </p>
        </aside>
      </div>
    </div>
  );
}
