"use client";

import { useState } from "react";
import type { AgentTone } from "@/lib/admin/agents";
import { AGENT_TONES, agentToneProfiles } from "@/lib/ai/prompts/agent-tones";

type ComparisonResult = { tone: AgentTone; text: string | null; error: boolean };
type ComparisonResponse = { results?: ComparisonResult[]; error?: string };

type Props = {
  organizationId: string;
  currentTone: AgentTone;
  primaryLanguage: "pt" | "en";
  uiLanguage?: "pt" | "en";
};

const questions = {
  pt: "Estou a pensar utilizar os vossos serviços, mas ainda não sei se são adequados para mim. Como é que me podem ajudar?",
  en: "I'm considering your services, but I'm not sure whether they're right for me yet. How could you help me?",
};

export default function ToneSelector({ organizationId, currentTone, primaryLanguage, uiLanguage = "pt" }: Props) {
  const [tone, setTone] = useState<AgentTone>(currentTone);
  const [question, setQuestion] = useState(questions[primaryLanguage]);
  const [results, setResults] = useState<ComparisonResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tx = (pt: string, en: string) => uiLanguage === "en" ? en : pt;
  const label = (entry: typeof agentToneProfiles[AgentTone]) => uiLanguage === "en" ? entry.labelEn : entry.labelPt;
  const description = (entry: typeof agentToneProfiles[AgentTone]) => uiLanguage === "en" ? entry.descriptionEn : entry.descriptionPt;

  async function compare() {
    const text = question.trim();
    if (busy || text.length < 12 || text.length > 450) return;
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(organizationId)}/tone-compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ question: text }),
      });
      const payload = await response.json() as ComparisonResponse;
      if (!response.ok || !Array.isArray(payload.results)) throw new Error(payload.error || "Unable to compare tones.");
      setResults(payload.results);
    } catch {
      setError(tx("Não foi possível comparar os tons. Tenta novamente daqui a pouco.", "Unable to compare tones. Please try again shortly."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-xs text-white/45">
        {tx("Tom", "Tone")}
        <select name="tone" value={tone} onChange={(event) => setTone(event.target.value as AgentTone)} className="min-h-11 rounded-xl border border-white/[0.08] bg-[#101010] px-3 text-sm text-white outline-none">
          {AGENT_TONES.map((entry) => <option key={entry} value={entry}>{label(agentToneProfiles[entry])}</option>)}
        </select>
      </label>
      <p className="text-xs leading-5 text-white/45">{description(agentToneProfiles[tone])}</p>
      <div className="rounded-2xl border border-[#ff7a18]/20 bg-[#ff7a18]/[0.025] p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white/85">{tx("Experimentar os quatro tons", "Compare all four tones")}</h3>
        <p className="mt-2 text-xs leading-5 text-white/40">
          {tx("Envia a mesma pergunta a cada tom e compara as respostas lado a lado. A comparação usa a configuração guardada e a Knowledge Base, mas não guarda contactos nem muda o tom ativo.", "Ask all four tones the same question and compare their answers side by side. The comparison uses your saved settings and Knowledge Base, but does not save contacts or change the active tone.")}
        </p>
        <label className="mt-4 grid gap-2 text-xs text-white/55">
          {tx("Pergunta recomendada (podes editar)", "Suggested question (editable)")}
          <textarea rows={3} maxLength={450} value={question} onChange={(event) => setQuestion(event.target.value)} className="resize-y rounded-xl border border-white/10 bg-[#101010] p-3 text-sm leading-6 text-white outline-none focus:border-[#ff7a18]/45" />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || question.trim().length < 12} onClick={() => void compare()} className="rounded-xl border border-[#ff7a18]/40 bg-[#ff7a18]/10 px-4 py-2.5 text-sm font-medium text-[#ffb47b] transition hover:bg-[#ff7a18]/20 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? tx("A comparar...", "Comparing...") : tx("Comparar respostas", "Compare responses")}
          </button>
          <span className="text-[11px] text-white/30">{tx("Cada comparação gera quatro respostas de IA.", "Each comparison generates four AI responses.")}</span>
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
        {results && <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {AGENT_TONES.map((entry) => {
            const result = results.find((item) => item.tone === entry);
            const profile = agentToneProfiles[entry];
            return (
              <div key={entry} className={`flex flex-col rounded-xl border p-4 ${tone === entry ? "border-[#ff7a18]/45 bg-[#ff7a18]/[0.035]" : "border-white/10 bg-[#101010]"}`}>
                <p className="text-sm font-semibold text-white/80">{label(profile)}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/35">{description(profile)}</p>
                <p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-6 text-white/75">
                  {result?.text ?? tx("Não foi possível gerar esta resposta.", "This response could not be generated.")}
                </p>
                <button type="button" onClick={() => setTone(entry)} disabled={tone === entry} className="mt-4 self-start rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 transition hover:border-[#ff7a18]/50 disabled:cursor-default disabled:border-[#ff7a18]/30 disabled:text-[#ffae6c]">
                  {tone === entry ? tx("Selecionado", "Selected") : tx("Escolher este tom", "Choose this tone")}
                </button>
              </div>
            );
          })}
        </div>}
        <p className="mt-4 text-[11px] leading-5 text-white/30">{tx("Para aplicar a escolha ao chatbot, guarda a configuração. O teste não usa alterações que ainda não foram guardadas.", "Save your configuration to apply your choice to the chatbot. Unsaved settings are not included in the comparison.")}</p>
      </div>
    </div>
  );
}
