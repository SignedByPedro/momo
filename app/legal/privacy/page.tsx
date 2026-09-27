import {
  ExternalLegalLink,
  LegalList,
  LegalSection,
  LegalShell,
} from "../_components/LegalShell";
import {
  legalConfig,
  legalEntityLabel,
  normalizeLegalLanguage,
  privacyContactLabel,
} from "../legal-config";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const query = await searchParams;
  const language = normalizeLegalLanguage(query.lang);
  const en = language === "en";
  const entity = legalEntityLabel(language);
  const privacyContact = privacyContactLabel(language);

  return (
    <LegalShell
      language={language}
      path="/legal/privacy"
      eyebrow={en ? "Privacy" : "Privacidade"}
      title={en ? "Privacy Policy" : "Política de Privacidade"}
      intro={
        en
          ? "This draft explains the personal data Momo processes, why it is processed, who receives it, and the distinction between Momo acting as controller and as processor for business customers."
          : "Este rascunho explica os dados pessoais tratados pelo Momo, as finalidades, destinatários e a distinção entre o Momo atuar como responsável pelo tratamento e como subcontratante dos clientes empresariais."
      }
    >
      <LegalSection title={en ? "1. Who is responsible" : "1. Quem é responsável"}>
        <p>
          {en
            ? `${entity} operates the Momo service. The final legal identity, registered address and privacy contact must be completed before publication.`
            : `${entity} opera o serviço Momo. A identidade jurídica final, morada registada e contacto de privacidade têm de ser preenchidos antes da publicação.`}
        </p>
        <p>{en ? "Privacy contact:" : "Contacto de privacidade:"} <strong className="text-white/75">{privacyContact}</strong>.</p>
      </LegalSection>

      <LegalSection title={en ? "2. Momo's two data-protection roles" : "2. Os dois papéis do Momo em proteção de dados"}>
        <LegalList>
          <li>{en ? "Momo as controller: for Momo's own commercial website/chat, prospect leads, customer account administration, portal users, support, security and service operations." : "Momo como responsável pelo tratamento: no website/chat comercial do próprio Momo, leads comerciais, gestão de contas de clientes, utilizadores do portal, suporte, segurança e operação do serviço."}</li>
          <li>{en ? "Momo as processor: when a business customer uses the Momo widget/agent to handle conversations, leads and related data from that customer's website visitors. In that context, the customer determines the purposes and means of the processing and Momo acts on documented instructions under the DPA." : "Momo como subcontratante: quando um cliente empresarial utiliza o widget/agente Momo para tratar conversas, leads e dados associados dos visitantes do seu website. Nesse contexto, o cliente determina as finalidades e meios do tratamento e o Momo atua segundo instruções documentadas, ao abrigo do DPA."}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={en ? "3. Data we may process" : "3. Dados que podemos tratar"}>
        <LegalList>
          <li>{en ? "Identity and contact data: name, business email, telephone number and company/organisation details where provided." : "Dados de identificação e contacto: nome, email profissional, número de telefone e dados da empresa/organização quando fornecidos."}</li>
          <li>{en ? "Conversation data: messages exchanged with Momo, generated replies, language, business context and information voluntarily included in a conversation." : "Dados de conversa: mensagens trocadas com o Momo, respostas geradas, idioma, contexto do negócio e informação introduzida voluntariamente numa conversa."}</li>
          <li>{en ? "Lead data: contact information a visitor chooses to provide, the related conversation and follow-up context." : "Dados de lead: contactos que o visitante decide fornecer, respetiva conversa e contexto de follow-up."}</li>
          <li>{en ? "Customer account and portal data: user email, organisation membership, role, agent/widget configuration, knowledge-base content and support tickets." : "Dados de conta e portal do cliente: email do utilizador, associação à organização, função, configuração do agente/widget, conteúdo da Knowledge Base e tickets de suporte."}</li>
          <li>{en ? "Technical and security data: request metadata and pseudonymised rate-limit identifiers derived from network information such as IP address, together with provider logs needed for security and reliability." : "Dados técnicos e de segurança: metadados de pedidos e identificadores pseudonimizados de rate limiting derivados de informação de rede, como o endereço IP, bem como logs dos fornecedores necessários para segurança e fiabilidade."}</li>
          <li>{en ? "Website-analysis data: public business website content supplied or selected by the customer for knowledge-base creation." : "Dados de análise de website: conteúdo público de websites empresariais fornecidos ou selecionados pelo cliente para criação da Knowledge Base."}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={en ? "4. Purposes and legal bases" : "4. Finalidades e fundamentos de licitude"}>
        <LegalList>
          <li>{en ? "Provide and administer the service, customer accounts and support: performance of a contract or steps requested before entering into a contract." : "Prestar e administrar o serviço, contas de clientes e suporte: execução de contrato ou diligências pré-contratuais solicitadas."}</li>
          <li>{en ? "Respond to prospects and follow up on requested contact: pre-contractual steps and, where appropriate, legitimate interests in responding to business enquiries." : "Responder a potenciais clientes e efetuar follow-up solicitado: diligências pré-contratuais e, quando adequado, interesses legítimos em responder a contactos comerciais."}</li>
          <li>{en ? "Protect the service, prevent abuse, investigate incidents and maintain reliability: legitimate interests in security, fraud prevention and service integrity." : "Proteger o serviço, prevenir abuso, investigar incidentes e manter a fiabilidade: interesses legítimos em segurança, prevenção de fraude e integridade do serviço."}</li>
          <li>{en ? "Comply with legal obligations and establish, exercise or defend legal claims where applicable." : "Cumprir obrigações legais e declarar, exercer ou defender direitos em processo judicial quando aplicável."}</li>
          <li>{en ? "Where consent is the appropriate legal basis, Momo will request it before the relevant processing and it may be withdrawn as easily as it was given." : "Quando o consentimento for o fundamento adequado, o Momo irá solicitá-lo antes do tratamento relevante e este poderá ser retirado com a mesma facilidade com que foi dado."}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={en ? "5. Artificial intelligence" : "5. Inteligência artificial"}>
        <p>{en ? "Momo uses AI models to generate conversational responses, embeddings and support assistance. Relevant message content and selected knowledge-base context may be transmitted to the AI provider to perform those functions." : "O Momo utiliza modelos de IA para gerar respostas conversacionais, embeddings e assistência de suporte. Conteúdo relevante das mensagens e contexto selecionado da Knowledge Base podem ser enviados ao fornecedor de IA para executar essas funções."}</p>
        <p>{en ? "Users are informed that they are interacting with an AI assistant. Momo is not intended to make decisions that produce legal or similarly significant effects about individuals." : "Os utilizadores são informados de que estão a interagir com um assistente de IA. O Momo não se destina a tomar decisões que produzam efeitos jurídicos ou efeitos similarmente significativos sobre pessoas."}</p>
      </LegalSection>

      <LegalSection title={en ? "6. Service providers and subprocessors" : "6. Fornecedores e subprocessadores"}>
        <p>{en ? "Momo currently relies on OpenAI, Supabase, Vercel and Resend for AI processing, database/authentication/storage, application hosting and transactional email. The current list and purposes are maintained on the Subprocessors page." : "O Momo recorre atualmente à OpenAI, Supabase, Vercel e Resend para processamento de IA, base de dados/autenticação/storage, alojamento da aplicação e email transacional. A lista atual e respetivas finalidades é mantida na página de Subprocessadores."}</p>
        <p><a className="text-[#ff9b52] underline decoration-[#ff9b52]/35 underline-offset-4" href={`/legal/subprocessors?lang=${language}`}>{en ? "View Momo subprocessors" : "Ver subprocessadores do Momo"}</a>.</p>
      </LegalSection>

      <LegalSection title={en ? "7. International transfers" : "7. Transferências internacionais"}>
        <p>{en ? "Some providers may process data outside the EEA. Where required, Momo relies on appropriate transfer mechanisms made available in the relevant provider agreements, such as adequacy decisions and/or the European Commission's Standard Contractual Clauses." : "Alguns fornecedores podem tratar dados fora do EEE. Quando necessário, o Momo recorre aos mecanismos de transferência adequados disponibilizados nos contratos dos respetivos fornecedores, como decisões de adequação e/ou Cláusulas Contratuais-Tipo da Comissão Europeia."}</p>
      </LegalSection>

      <LegalSection title={en ? "8. Retention" : "8. Retenção"}>
        <p>{en ? "Personal data is kept only for as long as necessary for the relevant purpose, contractual relationship, security needs and applicable legal obligations. The current draft schedule is described in the Data Retention Policy and must be operationally validated before publication." : "Os dados pessoais são conservados apenas durante o período necessário para a finalidade relevante, relação contratual, necessidades de segurança e obrigações legais aplicáveis. O calendário atual em rascunho consta da Política de Retenção de Dados e tem de ser validado operacionalmente antes da publicação."}</p>
        <p><a className="text-[#ff9b52] underline decoration-[#ff9b52]/35 underline-offset-4" href={`/legal/retention?lang=${language}`}>{en ? "View retention policy" : "Ver política de retenção"}</a>.</p>
      </LegalSection>

      <LegalSection title={en ? "9. Your rights" : "9. Os teus direitos"}>
        <p>{en ? "Where the GDPR applies and subject to its conditions, individuals may have rights of information, access, rectification, erasure, restriction, portability and objection, as well as the right to withdraw consent where processing is based on consent." : "Quando o RGPD é aplicável e sujeito às respetivas condições, os titulares podem ter direitos de informação, acesso, retificação, apagamento, limitação, portabilidade e oposição, bem como o direito de retirar o consentimento quando o tratamento se baseia em consentimento."}</p>
        <p>{en ? `Requests concerning Momo's own processing should be sent to ${privacyContact}. If the request concerns a customer's website widget, the individual should normally contact that business first because it is the controller.` : `Os pedidos relativos ao tratamento próprio do Momo devem ser enviados para ${privacyContact}. Se o pedido disser respeito ao widget no website de um cliente, o titular deve normalmente contactar primeiro essa empresa, por ser o responsável pelo tratamento.`}</p>
        <p>{en ? "Business-customer organisation owners can download an organisation data export and submit a verified account/data-deletion request from the Company area of the client portal. Deletion requests are manually verified before destructive action." : "Os owners de organizações clientes podem descarregar uma exportação dos dados da organização e submeter um pedido confirmado de eliminação da conta/dados na área Empresa do portal. Os pedidos de eliminação são verificados manualmente antes de qualquer ação destrutiva."}</p>
        <p>{en ? "Individuals may also lodge a complaint with the competent supervisory authority. In Portugal, this is the Comissão Nacional de Proteção de Dados (CNPD)." : "Os titulares podem também apresentar reclamação à autoridade de controlo competente. Em Portugal, essa autoridade é a Comissão Nacional de Proteção de Dados (CNPD)."}</p>
      </LegalSection>

      <LegalSection title={en ? "10. Cookies and device storage" : "10. Cookies e armazenamento no dispositivo"}>
        <p>{en ? "The current Momo application uses authentication cookies required for the customer/admin portals and local storage for the user's language preference. The current codebase does not include advertising or marketing analytics cookies. If non-essential analytics or marketing technologies are introduced, Momo will implement the required information and consent controls before activation." : "A aplicação Momo atual utiliza cookies de autenticação necessários aos portais de cliente/admin e armazenamento local para a preferência de idioma do utilizador. O código atual não inclui cookies de analytics publicitários ou de marketing. Se forem introduzidas tecnologias não essenciais de analytics ou marketing, o Momo implementará a informação e os controlos de consentimento necessários antes da ativação."}</p>
      </LegalSection>

      <LegalSection title={en ? "11. Security" : "11. Segurança"}>
        <p>{en ? "Momo uses technical and organisational safeguards appropriate to the service, including authenticated portal access, organisation separation, restricted administrative credentials, encrypted transport provided by the hosting stack, request-size controls and rate limiting. Security is a shared responsibility and no internet service can guarantee absolute security." : "O Momo utiliza salvaguardas técnicas e organizativas adequadas ao serviço, incluindo acesso autenticado ao portal, separação por organização, credenciais administrativas restritas, transporte cifrado fornecido pela infraestrutura, limites de pedidos e rate limiting. A segurança é uma responsabilidade partilhada e nenhum serviço na Internet pode garantir segurança absoluta."}</p>
      </LegalSection>

      <LegalSection title={en ? "12. Children and sensitive data" : "12. Crianças e dados sensíveis"}>
        <p>{en ? "Momo is designed as a business customer-support platform and is not specifically directed to children. Customers must assess their own audience and legal obligations before deploying the service to minors." : "O Momo foi concebido como plataforma empresarial de apoio ao cliente e não é especificamente dirigido a crianças. Os clientes devem avaliar o seu público e as suas obrigações legais antes de disponibilizar o serviço a menores."}</p>
        <p>{en ? "The service is not intended for special-category personal data, highly sensitive secrets, payment-card data or other regulated data unless a separate written assessment and agreement confirms the required safeguards." : "O serviço não se destina ao tratamento de categorias especiais de dados pessoais, segredos altamente sensíveis, dados de cartões de pagamento ou outros dados regulados sem avaliação e acordo escrito específicos que confirmem as salvaguardas necessárias."}</p>
      </LegalSection>

      <LegalSection title={en ? "13. Reference framework" : "13. Enquadramento de referência"}>
        <p>{en ? "This draft was structured around the GDPR controller/processor framework and the EU AI Act transparency requirements for direct interaction with AI systems. Final legal review remains necessary." : "Este rascunho foi estruturado com base no enquadramento responsável/subcontratante do RGPD e nas obrigações de transparência do AI Act para interação direta com sistemas de IA. Continua a ser necessária revisão jurídica final."}</p>
        <p className="text-xs text-white/35">
          <ExternalLegalLink href="https://eur-lex.europa.eu/eli/reg/2016/679">GDPR / RGPD</ExternalLegalLink>{" · "}
          <ExternalLegalLink href="https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations">EU AI Act transparency guidance</ExternalLegalLink>
        </p>
      </LegalSection>

      <p className="text-xs leading-6 text-white/25">{en ? `Draft version ${legalConfig.version} · ${legalConfig.lastUpdated}` : `Versão rascunho ${legalConfig.version} · ${legalConfig.lastUpdated}`}</p>
    </LegalShell>
  );
}
