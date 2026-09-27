import {
  ExternalLegalLink,
  LegalSection,
  LegalShell,
  LegalTable,
} from "../_components/LegalShell";
import { normalizeLegalLanguage } from "../legal-config";

export default async function SubprocessorsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const query = await searchParams;
  const language = normalizeLegalLanguage(query.lang);
  const en = language === "en";

  return (
    <LegalShell
      language={language}
      path="/legal/subprocessors"
      eyebrow={en ? "Data processing" : "Tratamento de dados"}
      title={en ? "Subprocessors" : "Subprocessadores"}
      intro={
        en
          ? "Current third-party providers that may process personal data to operate Momo. Provider infrastructure and their own subprocessor lists can change independently, so their official legal pages remain the authoritative source for their downstream providers."
          : "Fornecedores terceiros atuais que podem tratar dados pessoais para operar o Momo. A infraestrutura de cada fornecedor e as suas próprias listas de subcontratantes podem mudar de forma independente, pelo que as páginas jurídicas oficiais de cada fornecedor são a fonte autoritativa para os respetivos subcontratantes." 
      }
    >
      <LegalTable
        headers={en ? ["Provider", "Purpose", "Data involved", "Official references"] : ["Fornecedor", "Finalidade", "Dados envolvidos", "Referências oficiais"]}
        rows={[
          [
            "OpenAI",
            en ? "AI inference, response generation and embeddings." : "Inferência de IA, geração de respostas e embeddings.",
            en ? "Relevant conversation text, selected knowledge-base context and support prompts when required to provide the feature." : "Texto relevante de conversas, contexto selecionado da Knowledge Base e prompts de suporte quando necessários à funcionalidade.",
            <span key="openai-links"><ExternalLegalLink href="https://openai.com/policies/data-processing-addendum/">DPA</ExternalLegalLink>{" · "}<ExternalLegalLink href="https://openai.com/policies/sub-processor-list/">Subprocessors</ExternalLegalLink></span>,
          ],
          [
            "Supabase",
            en ? "Database, authentication, storage and backend data operations." : "Base de dados, autenticação, storage e operações backend de dados.",
            en ? "Customer accounts, organisation data, conversations, leads, knowledge-base content, tickets, assets and security/rate-limit data." : "Contas de clientes, dados de organizações, conversas, leads, Knowledge Base, tickets, assets e dados de segurança/rate limiting.",
            <span key="supabase-links"><ExternalLegalLink href="https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf">DPA</ExternalLegalLink>{" · "}<ExternalLegalLink href="https://supabase.com/docs/guides/security">Security</ExternalLegalLink></span>,
          ],
          [
            "Vercel",
            en ? "Application hosting, server-side execution, routing and operational request logs." : "Alojamento da aplicação, execução server-side, routing e logs operacionais de pedidos.",
            en ? "Application requests and technical metadata necessary to deliver and secure the service; request content may be processed transiently by application functions." : "Pedidos da aplicação e metadados técnicos necessários para prestar e proteger o serviço; o conteúdo dos pedidos pode ser tratado transitoriamente pelas funções da aplicação.",
            <span key="vercel-links"><ExternalLegalLink href="https://vercel.com/legal/dpa">DPA</ExternalLegalLink>{" · "}<ExternalLegalLink href="https://vercel.com/legal">Legal</ExternalLegalLink></span>,
          ],
          [
            "Resend",
            en ? "Transactional email notifications for leads, invitations and support workflows." : "Notificações de email transacionais para leads, convites e fluxos de suporte.",
            en ? "Recipient email address and the minimum notification content required for the relevant message." : "Endereço de email do destinatário e o conteúdo mínimo de notificação necessário para a respetiva mensagem.",
            <span key="resend-links"><ExternalLegalLink href="https://resend.com/legal/dpa">DPA</ExternalLegalLink>{" · "}<ExternalLegalLink href="https://resend.com/legal/subprocessors">Subprocessors</ExternalLegalLink></span>,
          ],
        ]}
      />

      <LegalSection title={en ? "Authorisation and changes" : "Autorização e alterações"}>
        <p>{en ? "The DPA uses general written authorisation for these subprocessors. Before adding or replacing a provider that will materially process Customer Personal Data, Momo will provide notice through email, the customer portal or another agreed written channel where the GDPR or the customer agreement requires that notice." : "O DPA utiliza autorização geral por escrito para estes subprocessadores. Antes de adicionar ou substituir um fornecedor que vá tratar materialmente Dados Pessoais do Cliente, o Momo dará aviso por email, portal do cliente ou outro canal escrito acordado quando o RGPD ou o acordo com o cliente exija esse aviso."}</p>
      </LegalSection>

      <LegalSection title={en ? "Processing locations" : "Locais de tratamento"}>
        <p>{en ? "Momo does not hard-code a single processing country for every provider because provider routing and subprocessor infrastructure can span several locations. The selected Supabase project region determines the primary location of project data, while other providers may process data in the EEA and/or third countries under their contractual transfer mechanisms. The exact production configuration should be recorded during the final legal review." : "O Momo não fixa neste documento um único país de tratamento para cada fornecedor porque o routing e a infraestrutura dos respetivos subcontratantes podem abranger vários locais. A região selecionada no projeto Supabase determina a localização primária dos dados do projeto, enquanto outros fornecedores podem tratar dados no EEE e/ou em países terceiros ao abrigo dos respetivos mecanismos contratuais de transferência. A configuração exata de produção deve ser registada na revisão jurídica final."}</p>
      </LegalSection>
    </LegalShell>
  );
}
