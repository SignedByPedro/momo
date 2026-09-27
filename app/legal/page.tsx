import Link from "next/link";
import { LegalSection, LegalShell } from "./_components/LegalShell";
import {
  legalConfig,
  missingLegalFields,
  normalizeLegalLanguage,
} from "./legal-config";

export default async function LegalIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const query = await searchParams;
  const language = normalizeLegalLanguage(query.lang);
  const en = language === "en";
  const q = `?lang=${language}`;

  return (
    <LegalShell
      language={language}
      path="/legal"
      eyebrow="Momo · Legal"
      title={en ? "Legal & Privacy Center" : "Centro Legal e de Privacidade"}
      intro={
        en
          ? "This area centralises the legal documents for Momo, including customer terms, privacy information, data processing terms and operational data-handling policies."
          : "Esta área centraliza os documentos jurídicos do Momo, incluindo termos para clientes, privacidade, tratamento de dados e políticas operacionais de dados."
      }
    >
      <LegalSection title={en ? "Current status" : "Estado atual"}>
        <p>
          {en
            ? "The legal package is currently in draft mode. It reflects the current technical architecture and intended B2B service model, but must be completed with the contracting entity and reviewed before commercial publication."
            : "O pacote jurídico está atualmente em modo rascunho. Reflete a arquitetura técnica atual e o modelo de serviço B2B previsto, mas tem de ser completado com a entidade contratante e revisto antes da publicação comercial."}
        </p>
        <div className="rounded-xl border border-white/6 bg-[#101010] px-4 py-3 text-xs leading-6 text-white/45">
          <strong className="text-white/70">{en ? "Fields still required:" : "Campos ainda necessários:"}</strong>{" "}
          {missingLegalFields.length > 0 ? missingLegalFields.join(", ") : (en ? "none" : "nenhum")}.
        </div>
      </LegalSection>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["/legal/privacy", en ? "Privacy Policy" : "Política de Privacidade", en ? "How Momo handles personal data in its own services and when acting for customers." : "Como o Momo trata dados pessoais nos seus próprios serviços e quando atua por conta dos clientes."],
          ["/legal/terms", en ? "Terms & Conditions" : "Termos e Condições", en ? "Core B2B service terms, account responsibilities, AI use and commercial framework." : "Termos base B2B, responsabilidades da conta, utilização de IA e enquadramento comercial."],
          ["/legal/dpa", "Data Processing Agreement", en ? "Controller/processor terms for customer website conversations and related personal data." : "Termos responsável/subcontratante para conversas dos websites dos clientes e dados pessoais associados."],
          ["/legal/subprocessors", en ? "Subprocessors" : "Subprocessadores", en ? "Current infrastructure and AI providers used to operate Momo." : "Fornecedores atuais de infraestrutura e IA utilizados para operar o Momo."],
          ["/legal/cookies", en ? "Cookies & local storage" : "Cookies e armazenamento local", en ? "Current use of essential authentication cookies and language preference storage." : "Utilização atual de cookies essenciais de autenticação e armazenamento da preferência de idioma."],
          ["/legal/retention", en ? "Data retention" : "Retenção de dados", en ? "Draft retention schedule and deletion principles to operationalise before publication." : "Calendário de retenção em rascunho e princípios de eliminação a operacionalizar antes da publicação."],
        ].map(([href, title, body]) => (
          <Link key={href} href={`${href}${q}`} className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5 transition hover:border-[#ff7a18]/25 hover:bg-[#171717]">
            <h2 className="font-semibold text-white/90">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">{body}</p>
          </Link>
        ))}
      </div>

      <LegalSection title={en ? "Commercial model kept unchanged" : "Modelo comercial mantido"}>
        <p>
          {en
            ? `These drafts preserve the current commercial structure: ${legalConfig.commercialModelEn}. Exact prices, invoicing rules, renewal and payment mechanics remain to be defined in the proposal/order form and final agreement.`
            : `Estes rascunhos mantêm a estrutura comercial atual: ${legalConfig.commercialModelPt}. Valores exatos, regras de faturação, renovação e mecanismos de pagamento continuam por definir na proposta/order form e no acordo final.`}
        </p>
      </LegalSection>
    </LegalShell>
  );
}
