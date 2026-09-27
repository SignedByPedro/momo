import {
  LegalSection,
  LegalShell,
  LegalTable,
} from "../_components/LegalShell";
import { legalConfig, normalizeLegalLanguage } from "../legal-config";

export default async function RetentionPage({
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
      path="/legal/retention"
      eyebrow={en ? "Data lifecycle" : "Ciclo de vida dos dados"}
      title={en ? "Data Retention Policy" : "Política de Retenção de Dados"}
      intro={
        en
          ? "These are the retention defaults selected for Momo. The policy remains in draft until the corresponding deletion, review and provider controls are operationally verified. GDPR does not impose one universal retention period: data must be deleted or anonymised when it is no longer necessary for its purpose."
          : "Estes são os prazos de retenção definidos para o Momo. A política mantém-se em rascunho até os respetivos processos de eliminação, revisão e controlos dos fornecedores estarem verificados operacionalmente. O RGPD não impõe um prazo universal: os dados devem ser eliminados ou anonimizados quando deixarem de ser necessários para a respetiva finalidade."
      }
    >
      <LegalTable
        headers={en ? ["Data category", "Retention rule", "Reason / action"] : ["Categoria de dados", "Regra de retenção", "Motivo / ação"]}
        rows={[
          [
            en ? "Website visitor conversations" : "Conversas de visitantes do website",
            en ? `Default maximum: ${legalConfig.customerConversationRetentionMonths} months from the last relevant conversation activity while the customer account is active, unless the customer instructs Momo to use a shorter period or another lawful retention need applies.` : `Máximo por defeito: ${legalConfig.customerConversationRetentionMonths} meses desde a última atividade relevante da conversa enquanto a conta do cliente estiver ativa, salvo instrução do cliente para um prazo inferior ou outra necessidade lícita de conservação.`,
            en ? "The business customer is normally the controller for widget conversations. Momo acts as processor and follows documented customer instructions." : "O cliente empresarial é normalmente o responsável pelo tratamento das conversas do widget. O Momo atua como subcontratante e segue instruções documentadas do cliente.",
          ],
          [
            en ? "Widget leads" : "Leads do widget",
            en ? `Default maximum: ${legalConfig.customerLeadRetentionMonths} months from the last meaningful lead activity while the customer account is active, unless the customer instructs Momo to use a shorter period or another lawful retention need applies.` : `Máximo por defeito: ${legalConfig.customerLeadRetentionMonths} meses desde a última atividade relevante do lead enquanto a conta do cliente estiver ativa, salvo instrução do cliente para um prazo inferior ou outra necessidade lícita de conservação.`,
            en ? "Prevents dormant visitor contact data from being stored indefinitely." : "Evita conservar indefinidamente contactos de visitantes sem atividade.",
          ],
          [
            en ? "Knowledge Base, agent/widget configuration and customer operational records" : "Knowledge Base, configuração de agente/widget e registos operacionais do cliente",
            en ? `For the active customer relationship. A normal service cancellation enters a ${legalConfig.cancellationRecoveryDays}-day recovery window during which the customer can request reactivation. The public service is suspended during that period. A verified deletion/return instruction is handled separately and can be completed earlier, subject to legal retention duties.` : `Durante a relação ativa com o cliente. Um cancelamento normal do serviço entra numa janela de recuperação de ${legalConfig.cancellationRecoveryDays} dias durante a qual o cliente pode pedir reativação. O serviço público fica suspenso nesse período. Uma instrução confirmada de eliminação/devolução é tratada separadamente e pode ser concluída mais cedo, sujeita a obrigações legais de conservação.`,
            en ? "Provides a defined recovery period without treating an explicit deletion request as a request to keep the data for possible reactivation." : "Cria um período de recuperação definido sem tratar um pedido explícito de eliminação como autorização para conservar os dados para uma eventual reativação.",
          ],
          [
            en ? "Portal user accounts and organisation membership" : "Contas de utilizadores do portal e associação à organização",
            en ? "For as long as the user is authorised. Access is removed when revoked; account data is deleted with the organisation subject to limited security/legal records." : "Enquanto o utilizador estiver autorizado. O acesso é removido quando revogado; os dados da conta são eliminados com a organização, sujeito a registos limitados de segurança/jurídicos.",
            en ? "Needed to provide authenticated customer access." : "Necessário para fornecer acesso autenticado ao cliente.",
          ],
          [
            en ? "Resolved support tickets" : "Tickets de suporte resolvidos",
            en ? `${legalConfig.resolvedSupportRetentionMonths} months after resolution, then delete or anonymise unless needed for an ongoing dispute, security investigation or legal obligation.` : `${legalConfig.resolvedSupportRetentionMonths} meses após resolução, depois eliminar ou anonimizar salvo necessidade por litígio em curso, investigação de segurança ou obrigação legal.`,
            en ? "Provides reasonable support continuity while avoiding indefinite support-history retention." : "Permite continuidade razoável do suporte sem conservar indefinidamente o histórico.",
          ],
          [
            en ? "Momo commercial chat / prospect leads" : "Chat comercial Momo / leads de potenciais clientes",
            en ? `Delete or anonymise after ${legalConfig.dormantSalesLeadRetentionMonths} months without meaningful commercial activity, unless the person becomes an active customer or another lawful reason requires retention.` : `Eliminar ou anonimizar após ${legalConfig.dormantSalesLeadRetentionMonths} meses sem atividade comercial relevante, salvo se a pessoa se tornar cliente ativo ou existir outro fundamento lícito de conservação.`,
            en ? "Avoids retaining inactive prospect data indefinitely." : "Evita conservar indefinidamente dados de potenciais clientes inativos.",
          ],
          [
            en ? "Technical API rate-limit counters" : "Contadores técnicos de rate limiting da API",
            en ? `Retention threshold: ${legalConfig.rateLimitRetentionHours} hours after the last counter update. Older records are removed by the next enabled daily run (or a confirmed manual cleanup), so actual deletion can occur after the threshold.` : `Prazo de retenção: ${legalConfig.rateLimitRetentionHours} horas após a última atualização de cada contador. Os registos mais antigos são eliminados na próxima execução diária ativa (ou numa limpeza manual confirmada), pelo que a eliminação efetiva pode ocorrer após esse limite.`,
            en ? "Short-lived request-limit state, not a security-incident history. The retention audit stores only category/count/results, not rate-limit keys or visitor identifiers. Infrastructure-provider logs may follow separate schedules." : "Estado temporário de limitação de pedidos, não um histórico de incidentes. O audit de retenção guarda apenas categoria, contagens e resultados, sem chaves de rate limiting nem identificadores de visitantes. Os logs dos fornecedores podem ter prazos próprios.",
          ],
          [
            en ? "Provider-side AI and transactional-email records" : "Registos de IA e email transacional mantidos por fornecedores",
            en ? "According to the applicable provider agreement and configured plan. Momo does not intentionally extend provider-side retention beyond what is needed for the service." : "De acordo com o contrato aplicável do fornecedor e plano configurado. O Momo não prolonga intencionalmente a retenção no fornecedor para além do necessário ao serviço.",
            en ? "Current provider terms and settings must be reviewed periodically because provider retention can change." : "As condições e definições atuais dos fornecedores devem ser revistas periodicamente, porque os respetivos prazos podem mudar.",
          ],
          [
            en ? "Limited account/legal history" : "Histórico limitado de conta/jurídico",
            en ? "Only for as long as reasonably necessary for legal obligations, accounting once applicable, disputes, fraud prevention or proof of the customer relationship. Prefer aggregate/non-identifying statistics when identity is no longer necessary." : "Apenas durante o período razoavelmente necessário para obrigações legais, contabilidade quando aplicável, litígios, prevenção de fraude ou prova da relação com o cliente. Preferir estatísticas agregadas/não identificáveis quando a identidade deixe de ser necessária.",
            en ? "This category is processed by Momo in its own controller capacity." : "Esta categoria é tratada pelo Momo na sua própria qualidade de responsável pelo tratamento.",
          ],
          [
            en ? "Truly anonymised aggregate statistics" : "Estatísticas agregadas verdadeiramente anonimizadas",
            en ? "May be retained without a fixed personal-data retention period once the data can no longer reasonably identify an individual." : "Podem ser conservadas sem um prazo de retenção de dados pessoais quando deixarem de permitir razoavelmente identificar uma pessoa.",
            en ? "Anonymised information is not kept as a substitute for identifiable raw data." : "A informação anonimizada não é mantida como substituto dos dados brutos identificáveis.",
          ],
        ]}
      />

      <LegalSection title={en ? "Deletion requests and exports" : "Pedidos de eliminação e exportações"}>
        <p>{en ? "Organisation owners can download an organisation data export from the Company area of the client portal. They can also submit a verified deletion request from the same area. A deletion request creates a privacy-support ticket for manual verification before destructive action is taken; it does not immediately erase the account." : "Os owners da organização podem descarregar uma exportação dos dados da organização na área Empresa do portal. Podem também submeter, no mesmo local, um pedido de eliminação confirmado. O pedido cria um ticket de privacidade para verificação manual antes de qualquer ação destrutiva; não elimina imediatamente a conta."}</p>
      </LegalSection>

      <LegalSection title={en ? "Implementation status" : "Estado de implementação"}>
        <p>{en ? `Data export and deletion-request controls are available in the portal. The admin has dry-run review, controlled manual cleanup and scheduled automatic cleanup for the supported time-based categories. Normal customer cancellation is now tracked separately with a ${legalConfig.cancellationRecoveryDays}-day recovery window: the portal enters recovery mode, the public widget becomes unavailable, and expired recovery windows are marked for final purge review. The 48-hour technical rate-limit category is integrated into manual and scheduled cleanup, but live operation still requires verification. Final destructive account purge and any separate future security-incident retention are not implemented; this draft is not a contractual promise.` : `Os controlos de exportação e pedido de eliminação estão disponíveis no portal. O Admin dispõe de análise dry-run, limpeza manual controlada e limpeza automática agendada para as categorias temporais suportadas. O cancelamento normal do cliente é agora acompanhado separadamente com uma janela de recuperação de ${legalConfig.cancellationRecoveryDays} dias: o portal entra em modo de recuperação, o widget público fica indisponível e as janelas expiradas são marcadas para revisão de eliminação final. A categoria de rate limiting técnico de 48 horas está integrada nas limpezas manual e agendada, mas a operação em produção ainda requer verificação. A eliminação destrutiva final das contas e a eventual retenção separada de incidentes de segurança não estão implementadas; este rascunho não é uma promessa contratual.`}</p>
      </LegalSection>

      <LegalSection title={en ? "Backups" : "Backups"}>
        <p>{en ? "When data is deleted from the live service, residual copies may remain temporarily in encrypted provider backups until the provider's normal backup rotation expires. Those copies are not restored for ordinary product use and remain subject to access restrictions." : "Quando os dados são eliminados do serviço ativo, cópias residuais podem permanecer temporariamente em backups cifrados dos fornecedores até terminar a rotação normal desses backups. Essas cópias não são restauradas para utilização normal do produto e permanecem sujeitas a restrições de acesso."}</p>
      </LegalSection>

      <LegalSection title={en ? "Deletion and anonymisation" : "Eliminação e anonimização"}>
        <p>{en ? "When data is no longer required, Momo deletes it or transforms it so that it can no longer reasonably identify a person. Merely removing a display name while retaining directly identifying fields is not treated as anonymisation." : "Quando os dados deixam de ser necessários, o Momo elimina-os ou transforma-os de modo a que já não permitam razoavelmente identificar uma pessoa. Remover apenas um nome visível mantendo outros campos diretamente identificativos não é tratado como anonimização."}</p>
      </LegalSection>
    </LegalShell>
  );
}
