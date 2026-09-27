import {
  LegalList,
  LegalSection,
  LegalShell,
} from "../_components/LegalShell";
import {
  legalConfig,
  legalContactLabel,
  legalEntityLabel,
  normalizeLegalLanguage,
} from "../legal-config";

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const query = await searchParams;
  const language = normalizeLegalLanguage(query.lang);
  const en = language === "en";
  const entity = legalEntityLabel(language);
  const legalContact = legalContactLabel(language);

  return (
    <LegalShell
      language={language}
      path="/legal/terms"
      eyebrow={en ? "Customer terms" : "Termos para clientes"}
      title={en ? "Terms & Conditions" : "Termos e Condições"}
      intro={
        en
          ? "Draft B2B terms for use of the Momo platform. Exact prices, invoicing mechanics and any negotiated commercial terms belong in the proposal/order form and override this general draft where expressly agreed."
          : "Rascunho de termos B2B para utilização da plataforma Momo. Valores exatos, mecanismos de faturação e condições comerciais negociadas ficam na proposta/order form e prevalecem sobre este rascunho geral quando expressamente acordado."
      }
    >
      <LegalSection title={en ? "1. Parties and scope" : "1. Partes e âmbito"}>
        <p>{en ? `These terms govern access to and use of Momo by a business customer. The service provider will be ${entity}. The final legal identity and jurisdiction must be completed before these terms are published or accepted.` : `Estes termos regulam o acesso e utilização do Momo por um cliente empresarial. O prestador do serviço será ${entity}. A identidade jurídica final e a jurisdição têm de ser preenchidas antes de estes termos serem publicados ou aceites.`}</p>
        <p>{en ? "The customer's proposal, order form or signed commercial agreement may contain additional terms specific to the implementation." : "A proposta, order form ou acordo comercial assinado pelo cliente pode conter condições adicionais específicas da implementação."}</p>
      </LegalSection>

      <LegalSection title={en ? "2. The Momo service" : "2. O serviço Momo"}>
        <p>{en ? "Momo provides configurable AI-assisted customer conversation tools, including a website widget, customer portal, knowledge base, lead capture, conversation history and support tooling. Features may evolve as the product develops." : "O Momo disponibiliza ferramentas configuráveis de conversação com apoio de IA, incluindo widget para website, portal do cliente, Knowledge Base, captação de leads, histórico de conversas e ferramentas de suporte. As funcionalidades podem evoluir com o desenvolvimento do produto."}</p>
        <p>{en ? "Momo is an AI system. Responses can be incomplete or incorrect. Customers must configure and review their knowledge, instructions and use cases and must not represent the AI assistant as a human operator." : "O Momo é um sistema de IA. As respostas podem ser incompletas ou incorretas. O cliente deve configurar e rever o seu conhecimento, instruções e casos de utilização e não pode apresentar o assistente de IA como se fosse um operador humano."}</p>
      </LegalSection>

      <LegalSection title={en ? "3. Customer responsibilities" : "3. Responsabilidades do cliente"}>
        <LegalList>
          <li>{en ? "Provide accurate business information and keep the knowledge base and instructions reasonably up to date." : "Fornecer informação empresarial correta e manter a Knowledge Base e instruções razoavelmente atualizadas."}</li>
          <li>{en ? "Ensure that content, personal data and instructions submitted to Momo are lawful and that the customer has the necessary rights and legal bases." : "Garantir que conteúdo, dados pessoais e instruções introduzidos no Momo são lícitos e que possui os direitos e fundamentos jurídicos necessários."}</li>
          <li>{en ? "Maintain the confidentiality of portal credentials and promptly remove access for users who no longer require it." : "Manter a confidencialidade das credenciais do portal e remover rapidamente acessos de utilizadores que deixem de necessitar deles."}</li>
          <li>{en ? "Provide its own website visitors with any privacy information and legal notices required for the customer's use of the Momo widget." : "Disponibilizar aos visitantes do seu website a informação de privacidade e avisos jurídicos necessários para a utilização do widget Momo pelo cliente."}</li>
          <li>{en ? "Keep the AI disclosure visible and not configure or present Momo in a way intended to mislead users into believing they are communicating with a human." : "Manter visível a indicação de IA e não configurar ou apresentar o Momo de forma destinada a levar utilizadores a acreditar que comunicam com uma pessoa."}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={en ? "4. Acceptable use" : "4. Utilização aceitável"}>
        <p>{en ? "The customer must not use Momo unlawfully, to infringe third-party rights, to distribute malware or abusive content, to bypass security controls, or to use the service as the sole basis for decisions producing legal or similarly significant effects about individuals." : "O cliente não pode utilizar o Momo de forma ilícita, para violar direitos de terceiros, distribuir malware ou conteúdo abusivo, contornar controlos de segurança, ou usar o serviço como única base para decisões que produzam efeitos jurídicos ou similarmente significativos sobre pessoas."}</p>
        <p>{en ? "Use involving special-category personal data, highly sensitive secrets, payment-card data or other specially regulated information requires prior written assessment and agreement." : "A utilização envolvendo categorias especiais de dados pessoais, segredos altamente sensíveis, dados de cartões de pagamento ou outra informação especialmente regulada exige avaliação e acordo escrito prévios."}</p>
      </LegalSection>

      <LegalSection title={en ? "5. Accounts and access" : "5. Contas e acessos"}>
        <p>{en ? "Customer portal access is invitation-based. The customer is responsible for ensuring that invited users are authorised to act for the relevant organisation. Momo may suspend credentials reasonably believed to be compromised or used in breach of these terms." : "O acesso ao portal do cliente é feito por convite. O cliente é responsável por garantir que os utilizadores convidados estão autorizados a atuar em nome da respetiva organização. O Momo pode suspender credenciais que razoavelmente considere comprometidas ou utilizadas em violação destes termos."}</p>
      </LegalSection>

      <LegalSection title={en ? "6. Customer content and intellectual property" : "6. Conteúdo do cliente e propriedade intelectual"}>
        <p>{en ? "The customer retains its rights in customer-provided content, including knowledge-base materials, branding and business information. The customer grants Momo the limited rights necessary to host, process, index and display that content solely to provide and secure the service." : "O cliente mantém os seus direitos sobre o conteúdo que fornece, incluindo materiais da Knowledge Base, branding e informação empresarial. O cliente concede ao Momo apenas os direitos necessários para alojar, tratar, indexar e apresentar esse conteúdo com a finalidade de prestar e proteger o serviço."}</p>
        <p>{en ? "Momo retains rights in the platform, software, interface, documentation and service technology, excluding customer content and third-party materials." : "O Momo mantém os direitos sobre a plataforma, software, interface, documentação e tecnologia do serviço, excluindo conteúdo do cliente e materiais de terceiros."}</p>
      </LegalSection>

      <LegalSection title={en ? "7. AI outputs" : "7. Resultados de IA"}>
        <p>{en ? "AI-generated output is probabilistic and may not always be unique, complete or accurate. The customer remains responsible for deciding whether a particular use case requires human review and for configuring escalation or follow-up where appropriate." : "O conteúdo gerado por IA é probabilístico e pode não ser sempre único, completo ou exato. O cliente continua responsável por decidir se determinado caso de utilização exige revisão humana e por configurar escalamento ou follow-up quando adequado."}</p>
      </LegalSection>

      <LegalSection title={en ? "8. Fees and commercial terms" : "8. Preços e condições comerciais"}>
        <p>{en ? `The intended commercial model is an ${legalConfig.commercialModelEn}. The exact setup amount, monthly amount, included usage, payment dates, taxes, renewal, cancellation and any overage rules will be stated in the applicable proposal/order form or signed agreement.` : `O modelo comercial previsto é ${legalConfig.commercialModelPt}. O valor do setup, valor mensal, utilização incluída, datas de pagamento, impostos, renovação, cancelamento e eventuais regras de excedentes serão definidos na proposta/order form ou acordo assinado aplicável.`}</p>
        <p>{en ? "Until those commercial terms are agreed with a customer, this draft does not by itself create a payment obligation." : "Enquanto essas condições comerciais não forem acordadas com um cliente, este rascunho não cria, por si só, uma obrigação de pagamento."}</p>
      </LegalSection>

      <LegalSection title={en ? "9. Availability, maintenance and changes" : "9. Disponibilidade, manutenção e alterações"}>
        <p>{en ? "Momo aims to provide a reliable service but does not promise uninterrupted or error-free availability unless a written SLA is expressly agreed. Maintenance, third-party provider incidents, security actions and product changes may temporarily affect availability." : "O Momo procura prestar um serviço fiável, mas não promete disponibilidade ininterrupta ou sem erros salvo SLA escrito expressamente acordado. Manutenção, incidentes de fornecedores, ações de segurança e alterações do produto podem afetar temporariamente a disponibilidade."}</p>
      </LegalSection>

      <LegalSection title={en ? "10. Data protection" : "10. Proteção de dados"}>
        <p>{en ? "Where Momo processes personal data on behalf of the customer, the Data Processing Agreement forms part of the contractual framework. For Momo's own account and portal administration, the Privacy Policy applies." : "Quando o Momo trata dados pessoais por conta do cliente, o Data Processing Agreement integra o enquadramento contratual. Para a gestão própria de contas e portal do Momo, aplica-se a Política de Privacidade."}</p>
      </LegalSection>

      <LegalSection title={en ? "11. Confidentiality" : "11. Confidencialidade"}>
        <p>{en ? "Each party must protect non-public business, technical and commercial information received from the other party and use it only for the agreed relationship, except where disclosure is required by law or expressly authorised." : "Cada parte deve proteger informação empresarial, técnica e comercial não pública recebida da outra parte e utilizá-la apenas para a relação acordada, salvo quando a divulgação seja exigida por lei ou expressamente autorizada."}</p>
      </LegalSection>

      <LegalSection title={en ? "12. Suspension and termination" : "12. Suspensão e cessação"}>
        <p>{en ? "Momo may suspend access where reasonably necessary to address security risks, unlawful use, material breach or non-payment once payment terms are finalised. Termination rights, notice periods and any refund rules must be set in the applicable commercial agreement before launch." : "O Momo pode suspender o acesso quando razoavelmente necessário para responder a riscos de segurança, utilização ilícita, incumprimento material ou falta de pagamento depois de as condições de pagamento estarem finalizadas. Direitos de cessação, prazos de aviso e eventuais regras de reembolso devem ser definidos no acordo comercial aplicável antes do lançamento."}</p>
        <p>{en ? `For a normal service cancellation, Momo currently applies a ${legalConfig.cancellationRecoveryDays}-day recovery window so the customer can request reactivation without rebuilding the account. During that window the service is unavailable for normal use and the public widget is disabled. A verified instruction to delete or return Customer Personal Data is handled separately under the DPA and is not delayed merely to preserve a possible reactivation.` : `Num cancelamento normal do serviço, o Momo aplica atualmente uma janela de recuperação de ${legalConfig.cancellationRecoveryDays} dias para permitir ao cliente pedir reativação sem reconstruir a conta. Durante essa janela o serviço fica indisponível para utilização normal e o widget público é desativado. Uma instrução confirmada para eliminar ou devolver Dados Pessoais do Cliente é tratada separadamente ao abrigo do DPA e não é adiada apenas para preservar uma eventual reativação.`}</p>
      </LegalSection>

      <LegalSection title={en ? "13. Warranties, liability and governing law" : "13. Garantias, responsabilidade e lei aplicável"}>
        <p>{en ? "These provisions are intentionally not finalised in this draft. Warranty disclaimers, liability caps, indemnities, governing law, courts and dispute process must be reviewed and completed once the contracting legal entity and commercial structure are confirmed." : "Estas cláusulas não estão deliberadamente fechadas neste rascunho. Exclusões de garantias, limites de responsabilidade, indemnizações, lei aplicável, tribunais e processo de resolução de litígios têm de ser revistos e completados quando forem confirmadas a entidade legal contratante e a estrutura comercial."}</p>
      </LegalSection>

      <LegalSection title={en ? "14. Contact" : "14. Contacto"}>
        <p>{en ? `Legal and contractual notices: ${legalContact}.` : `Notificações jurídicas e contratuais: ${legalContact}.`}</p>
      </LegalSection>
    </LegalShell>
  );
}
