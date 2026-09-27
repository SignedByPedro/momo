import {
  LegalList,
  LegalSection,
  LegalShell,
  LegalTable,
} from "../_components/LegalShell";
import {
  legalConfig,
  legalEntityLabel,
  normalizeLegalLanguage,
  privacyContactLabel,
} from "../legal-config";

export default async function DpaPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const query = await searchParams;
  const language = normalizeLegalLanguage(query.lang);
  const en = language === "en";
  const processor = legalEntityLabel(language);
  const privacyContact = privacyContactLabel(language);

  return (
    <LegalShell
      language={language}
      path="/legal/dpa"
      eyebrow="GDPR · Article 28"
      title="Data Processing Agreement (DPA)"
      intro={
        en
          ? "Draft processor terms for personal data Momo handles on behalf of a business customer through that customer's agent, website widget and related portal features."
          : "Rascunho de condições de subcontratação para dados pessoais que o Momo trata por conta de um cliente empresarial através do agente, widget e funcionalidades associadas do portal desse cliente."
      }
    >
      <LegalSection title={en ? "1. Parties and role allocation" : "1. Partes e repartição de papéis"}>
        <p>{en ? `The business customer is the Controller and ${processor} is the Processor for Customer Personal Data processed to provide the Momo service. The customer's own account/contact data that Momo processes for contract administration, security and support is handled separately under the Privacy Policy.` : `O cliente empresarial é o Responsável pelo Tratamento e ${processor} é o Subcontratante relativamente aos Dados Pessoais do Cliente tratados para prestar o serviço Momo. Os dados de conta/contacto do próprio cliente tratados pelo Momo para administração contratual, segurança e suporte são tratados separadamente ao abrigo da Política de Privacidade.`}</p>
        <p>{en ? "This DPA becomes binding only when incorporated into, signed with or otherwise validly accepted as part of the customer agreement. Publication on this page alone is not intended to replace that acceptance step." : "Este DPA só se torna vinculativo quando incorporado, assinado ou de outro modo validamente aceite como parte do acordo com o cliente. A mera publicação nesta página não pretende substituir esse passo de aceitação."}</p>
      </LegalSection>

      <LegalSection title={en ? "2. Processing details" : "2. Detalhes do tratamento"}>
        <LegalTable
          headers={en ? ["Item", "Description"] : ["Elemento", "Descrição"]}
          rows={[
            [en ? "Subject matter" : "Objeto", en ? "Operation of the customer's Momo AI agent, widget, portal, conversation history, lead capture, knowledge retrieval and support-related functions." : "Operação do agente de IA Momo do cliente, widget, portal, histórico de conversas, captação de leads, pesquisa de conhecimento e funcionalidades de suporte relacionadas."],
            [en ? "Duration" : "Duração", en ? `For the term of the customer agreement and, for ordinary service cancellation, a default recovery window of up to ${legalConfig.cancellationRecoveryDays} days as a standing service instruction unless the Controller instructs earlier return or deletion. Legal retention obligations may require limited data to be kept separately.` : `Durante a vigência do acordo com o cliente e, num cancelamento normal do serviço, uma janela de recuperação por defeito de até ${legalConfig.cancellationRecoveryDays} dias como instrução padrão do serviço, salvo se o Responsável instruir devolução ou eliminação mais cedo. Obrigações legais podem exigir conservação separada e limitada de determinados dados.`],
            [en ? "Nature" : "Natureza", en ? "Collection/receipt, hosting, storage, organisation, retrieval, transmission to authorised subprocessors, AI analysis/generation, support access where necessary, deletion and return." : "Recolha/receção, alojamento, armazenamento, organização, consulta, transmissão a subprocessadores autorizados, análise/geração por IA, acesso de suporte quando necessário, eliminação e devolução."],
            [en ? "Purpose" : "Finalidade", en ? "Provide, secure, maintain and support the Momo service according to the customer's documented configuration and instructions." : "Prestar, proteger, manter e suportar o serviço Momo segundo a configuração e instruções documentadas do cliente."],
            [en ? "Data subjects" : "Titulares", en ? "Customer website visitors, leads/prospects, customer personnel and authorised portal users to the extent their data is included in Customer Personal Data." : "Visitantes do website do cliente, leads/potenciais clientes, pessoal do cliente e utilizadores autorizados do portal na medida em que os seus dados integrem Dados Pessoais do Cliente."],
            [en ? "Personal data" : "Dados pessoais", en ? "Names, email addresses, telephone numbers, conversation content, lead/follow-up context, business-related information, support content and technical identifiers necessary for security." : "Nomes, endereços de email, números de telefone, conteúdo de conversas, contexto de lead/follow-up, informação empresarial, conteúdo de suporte e identificadores técnicos necessários à segurança."],
            [en ? "Special categories" : "Categorias especiais", en ? "Not intentionally required or designed for. Customer must not instruct Momo to process special-category or similarly highly sensitive data unless separately assessed and agreed in writing." : "Não são intencionalmente necessárias nem fazem parte do desenho normal do serviço. O cliente não deve instruir o Momo a tratar categorias especiais ou dados de sensibilidade equivalente sem avaliação e acordo escrito específicos."],
          ]}
        />
      </LegalSection>

      <LegalSection title={en ? "3. Documented instructions" : "3. Instruções documentadas"}>
        <p>{en ? "Momo will process Customer Personal Data only on documented instructions from the Controller, including the customer agreement, this DPA, portal configuration, knowledge-base content and other lawful written instructions accepted by Momo." : "O Momo tratará Dados Pessoais do Cliente apenas segundo instruções documentadas do Responsável, incluindo o acordo com o cliente, este DPA, configuração do portal, conteúdo da Knowledge Base e outras instruções escritas lícitas aceites pelo Momo."}</p>
        <p>{en ? "If Momo reasonably believes an instruction infringes applicable data-protection law, it may suspend the affected processing and inform the Controller unless legally prohibited from doing so." : "Se o Momo considerar razoavelmente que uma instrução viola a legislação aplicável de proteção de dados, pode suspender o tratamento afetado e informar o Responsável, salvo proibição legal."}</p>
      </LegalSection>

      <LegalSection title={en ? "4. Confidentiality and authorised personnel" : "4. Confidencialidade e pessoas autorizadas"}>
        <p>{en ? "Momo will limit access to Customer Personal Data to persons who need it to operate, secure or support the service and who are subject to appropriate confidentiality obligations." : "O Momo limitará o acesso a Dados Pessoais do Cliente às pessoas que necessitem desse acesso para operar, proteger ou suportar o serviço e que estejam sujeitas a obrigações adequadas de confidencialidade."}</p>
      </LegalSection>

      <LegalSection title={en ? "5. Security measures" : "5. Medidas de segurança"}>
        <LegalList>
          <li>{en ? "Authenticated access to customer and administrator portals." : "Acesso autenticado aos portais de cliente e administração."}</li>
          <li>{en ? "Logical organisation/tenant separation in application and database queries." : "Separação lógica por organização/tenant na aplicação e queries de base de dados."}</li>
          <li>{en ? "Restricted use of privileged service credentials on the server side." : "Utilização restrita de credenciais privilegiadas de serviço no lado servidor."}</li>
          <li>{en ? "Encrypted transport through the hosting and infrastructure stack." : "Transporte cifrado através da infraestrutura de alojamento."}</li>
          <li>{en ? "Request validation, message-size limits, origin checks where applicable and rate limiting against abuse." : "Validação de pedidos, limites de tamanho de mensagens, verificações de origem quando aplicável e rate limiting contra abuso."}</li>
          <li>{en ? "Use of established infrastructure providers with their own contractual and security controls." : "Utilização de fornecedores de infraestrutura estabelecidos com controlos contratuais e de segurança próprios."}</li>
          <li>{en ? "Deletion controls for customer-owned operational data when a customer is removed, subject to the final retention policy." : "Controlos de eliminação para dados operacionais pertencentes ao cliente quando este é removido, sujeitos à política final de retenção."}</li>
        </LegalList>
      </LegalSection>

      <LegalSection title={en ? "6. Subprocessors" : "6. Subprocessadores"}>
        <p>{en ? "The Controller grants general written authorisation for Momo to use the subprocessors listed on the Subprocessors page. Momo will require subprocessors to protect Customer Personal Data under written terms appropriate to their role." : "O Responsável concede autorização geral por escrito para o Momo utilizar os subprocessadores constantes da página de Subprocessadores. O Momo exigirá que os subprocessadores protejam os Dados Pessoais do Cliente através de condições escritas adequadas ao respetivo papel."}</p>
        <p>{en ? "Where required by applicable law and before a new subprocessor begins materially processing Customer Personal Data, Momo will provide reasonable notice through email, the customer portal or another agreed written channel so the customer has an opportunity to raise reasoned data-protection objections." : "Quando exigido pela legislação aplicável e antes de um novo subprocessador iniciar tratamento material de Dados Pessoais do Cliente, o Momo fornecerá aviso razoável por email, portal do cliente ou outro canal escrito acordado, permitindo ao cliente apresentar objeções fundamentadas de proteção de dados."}</p>
      </LegalSection>

      <LegalSection title={en ? "7. International transfers" : "7. Transferências internacionais"}>
        <p>{en ? "Momo will not intentionally transfer Customer Personal Data outside the EEA except through authorised subprocessors or other processing necessary to provide the service and only where an appropriate transfer mechanism applies, such as an adequacy decision or the European Commission's Standard Contractual Clauses." : "O Momo não transferirá intencionalmente Dados Pessoais do Cliente para fora do EEE exceto através de subprocessadores autorizados ou outro tratamento necessário à prestação do serviço e apenas quando se aplique um mecanismo de transferência adequado, como decisão de adequação ou Cláusulas Contratuais-Tipo da Comissão Europeia."}</p>
      </LegalSection>

      <LegalSection title={en ? "8. Data-subject requests" : "8. Pedidos de titulares"}>
        <p>{en ? "Taking into account the nature of the processing, Momo will provide reasonable assistance to the Controller in responding to requests to exercise data-protection rights. Momo will not independently respond on the Controller's behalf unless instructed or legally required." : "Tendo em conta a natureza do tratamento, o Momo prestará assistência razoável ao Responsável na resposta a pedidos de exercício de direitos de proteção de dados. O Momo não responderá autonomamente em nome do Responsável salvo instrução ou obrigação legal."}</p>
      </LegalSection>

      <LegalSection title={en ? "9. Security incidents" : "9. Incidentes de segurança"}>
        <p>{en ? "Momo will notify the Controller without undue delay after becoming aware of a confirmed personal-data breach affecting Customer Personal Data and will provide information reasonably available to help the Controller meet its own legal obligations." : "O Momo notificará o Responsável sem demora injustificada após tomar conhecimento de uma violação confirmada de dados pessoais que afete Dados Pessoais do Cliente e fornecerá a informação razoavelmente disponível para ajudar o Responsável a cumprir as suas próprias obrigações legais."}</p>
      </LegalSection>

      <LegalSection title={en ? "10. DPIAs and regulator cooperation" : "10. AIPD e cooperação com autoridades"}>
        <p>{en ? "Momo will provide reasonable information and assistance, taking into account the nature of the processing and information available to Momo, where the Controller needs to conduct a data-protection impact assessment or consult a supervisory authority in relation to the service." : "O Momo prestará informação e assistência razoáveis, tendo em conta a natureza do tratamento e a informação disponível ao Momo, quando o Responsável necessite de realizar uma avaliação de impacto sobre a proteção de dados ou consultar uma autoridade de controlo relativamente ao serviço."}</p>
      </LegalSection>

      <LegalSection title={en ? "11. Return and deletion" : "11. Devolução e eliminação"}>
        <p>{en ? `At the Controller's choice and subject to technical feasibility, Momo will return or delete Customer Personal Data at the end of the service. Ordinary cancellation currently enters a ${legalConfig.cancellationRecoveryDays}-day recovery window under the service's standing instructions, but the Controller may instruct earlier return or deletion. A verified deletion instruction is treated separately and is not held for the full recovery window solely in case the customer changes its mind, unless applicable law requires retention.` : `À escolha do Responsável e sujeito à viabilidade técnica, o Momo devolverá ou eliminará Dados Pessoais do Cliente no final do serviço. O cancelamento normal entra atualmente numa janela de recuperação de ${legalConfig.cancellationRecoveryDays} dias ao abrigo das instruções padrão do serviço, mas o Responsável pode instruir devolução ou eliminação mais cedo. Uma instrução de eliminação confirmada é tratada separadamente e não fica retida durante toda a janela apenas para o caso de o cliente mudar de ideias, salvo obrigação legal de conservação.`}</p>
        <p>{en ? "Account administration, legal records or aggregate/non-identifying statistics that Momo processes in its own capacity as controller are outside this processor deletion obligation and are governed by the Privacy and Retention policies." : "Registos de administração de conta, registos legais ou estatísticas agregadas/não identificáveis tratados pelo Momo na sua qualidade própria de responsável ficam fora desta obrigação de eliminação enquanto subcontratante e são regulados pelas políticas de Privacidade e Retenção."}</p>
      </LegalSection>

      <LegalSection title={en ? "12. Compliance information and audits" : "12. Informação de conformidade e auditorias"}>
        <p>{en ? "Momo will make available information reasonably necessary to demonstrate compliance with the processor obligations applicable to the service. Audits should first rely on available documentation, provider assurance reports and written responses; on-site or intrusive audits require reasonable notice, confidentiality and safeguards for other customers' data." : "O Momo disponibilizará informação razoavelmente necessária para demonstrar o cumprimento das obrigações de subcontratante aplicáveis ao serviço. As auditorias devem recorrer primeiro à documentação disponível, relatórios de garantia dos fornecedores e respostas escritas; auditorias presenciais ou intrusivas exigem aviso razoável, confidencialidade e salvaguardas para os dados de outros clientes."}</p>
      </LegalSection>

      <LegalSection title={en ? "13. Contact for data-protection matters" : "13. Contacto para proteção de dados"}>
        <p>{privacyContact}</p>
      </LegalSection>
    </LegalShell>
  );
}
