-- Momo v2.34 - Approved business policies and support knowledge
--
-- This migration turns the policy decisions agreed after v2.33 into searchable
-- knowledge for Momo Sales and Momo Support. Updated entries receive a NULL
-- embedding so stale vectors cannot represent new text.
--
-- After running this migration, reindex BOTH knowledge bases from Admin:
--   /admin/knowledge         -> Reindexar conhecimento
--   /admin/support/knowledge -> Reindexar documentação

begin;

-- ---------------------------------------------------------------------------
-- MOMO SALES
-- ---------------------------------------------------------------------------

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'onboarding-timeline',
    'momo-sales',
    'Implementação',
    'Prazo de onboarding',
    'O prazo de implementação é analisado caso a caso, porque depende da solução e da configuração necessárias para cada empresa. O Momo Sales não deve atribuir um prazo padrão nem explicar possíveis dependências operacionais do cliente a menos que a pessoa pergunte especificamente sobre a instalação.',
    'public', 'published', null, now()
  ),
  (
    'base-plan-scope',
    'momo-sales',
    'Planos',
    'O que inclui a solução base',
    'A solução base atual centra-se no agente de IA para website, um idioma principal, Knowledge Base da empresa, widget personalizável, Portal do cliente, consulta de conversas e leads e acesso ao Momo Support. Limites de utilizadores, volume e outras condições dependem do plano contratado e só devem ser afirmados quando estiverem documentados. Idiomas adicionais e capacidades avançadas podem exigir um upgrade ou solução diferente.',
    'public', 'published', null, now()
  ),
  (
    'monthly-service-model',
    'momo-sales',
    'Pricing',
    'Modelo comercial',
    'O Momo é um serviço recorrente. A contratação inclui uma taxa de setup paga no início e uma mensalidade obrigatória. A mensalidade começa quando a instalação está concluída e o widget é publicado. A cobrança é mensal e antecipada, com renovação automática. O Momo Sales não deve inventar preços, métodos de pagamento, descontos ou valores de upgrades que ainda não estejam documentados.',
    'public', 'published', null, now()
  ),
  (
    'pricing-depends-on-scope',
    'momo-sales',
    'Pricing',
    'Como é definido o preço',
    'O preço depende do plano e das funcionalidades contratadas. A solução base poderá ter um preço fixo quando esse valor estiver oficialmente aprovado e documentado; até lá, o Momo não deve inventar números. Funcionalidades adicionais, idiomas extra, limites superiores e integrações podem ter custos diferentes. Quando o preço exato não estiver confirmado na Knowledge Base, a equipa deve fornecer a proposta.',
    'public', 'published', null, now()
  ),
  (
    'billing-policy',
    'momo-sales',
    'Políticas',
    'Faturação e pagamentos',
    'A taxa de setup é paga na contratação. A mensalidade começa quando a instalação está concluída e o widget é publicado, é cobrada antecipadamente e renova automaticamente. Se um pagamento mensal falhar, existe um período de tolerância de 7 dias. Durante esse período o serviço permanece ativo. Se continuar por regularizar depois dos 7 dias, o widget pode ser suspenso enquanto o Portal permanece acessível. Depois de o pagamento ser regularizado, o serviço pode ser reativado. O método de pagamento e detalhes específicos da conta não devem ser inventados.',
    'public', 'published', null, now()
  ),
  (
    'cancellation-policy',
    'momo-sales',
    'Políticas',
    'Política de cancelamento',
    'Não existe fidelização. O cliente pode pedir o cancelamento a qualquer momento. Se já existir um período de faturação pago, o serviço mantém-se ativo até ao fim desse período e não renova depois. Não existe reembolso proporcional dos dias restantes por defeito, salvo exceção acordada pela equipa ou obrigação legal. Quando o serviço termina efetivamente, inicia-se a janela normal de recuperação de 90 dias antes da eliminação final, salvo um pedido de eliminação de dados tratado separadamente.',
    'public', 'published', null, now()
  ),
  (
    'recommended-evaluation-period',
    'momo-sales',
    'Políticas',
    'Período recomendado para avaliar o serviço',
    'O Momo não exige fidelização. Ainda assim, recomendamos normalmente cerca de três meses de utilização para permitir a implementação, acumular utilização real e avaliar os resultados com informação suficiente. Esta recomendação não é um período mínimo obrigatório nem um trial especial.',
    'public', 'published', null, now()
  ),
  (
    'privacy-data-processing',
    'momo-sales',
    'Políticas',
    'Privacidade e tratamento de dados',
    'O Momo trata os dados necessários para prestar o serviço e disponibiliza controlos de exportação e pedidos de eliminação no Portal. Pedidos explícitos de eliminação são verificados pela equipa e não têm de esperar pela janela normal de recuperação de 90 dias, embora determinadas obrigações legais ou contratuais possam exigir retenção limitada de alguns registos. Não prometer eliminação instantânea de backups nem garantias jurídicas que não estejam documentadas.',
    'public', 'published', null, now()
  ),
  (
    'data-retention-policy',
    'momo-sales',
    'Políticas',
    'Retenção de dados',
    'A regra operacional de referência é conservar conversas do widget até 12 meses desde a última atividade relevante e tickets de suporte normais até 12 meses após resolução, salvo instrução válida para um prazo inferior ou outra necessidade legítima. O cancelamento normal mantém os dados da organização durante uma janela de recuperação de 90 dias após o fim efetivo do serviço. Pedidos explícitos de eliminação são tratados separadamente. Cópias residuais podem permanecer temporariamente em backups até ao respetivo ciclo de expiração.',
    'public', 'published', null, now()
  ),
  (
    'support-sla-policy',
    'momo-sales',
    'Políticas',
    'Suporte e tempos de resposta',
    'O Momo Support está disponível no Portal para ajuda por IA a qualquer hora. Quando é necessária intervenção humana, é criado ou solicitado um ticket para a equipa. O suporte humano não é apresentado como 24/7 e, nesta fase, não existe um prazo fixo de resposta a prometer. O tempo de resposta depende da prioridade e da complexidade do pedido.',
    'public', 'published', null, now()
  ),
  (
    'security-availability',
    'momo-sales',
    'Segurança',
    'Acesso, segurança e disponibilidade',
    'O acesso ao Momo usa contas autenticadas e permissões por organização. Owners e Members têm níveis de acesso diferentes. A plataforma pode passar por manutenção, atualizações ou indisponibilidades ocasionais, incluindo dependências externas. O Momo não deve prometer 100% de uptime, isolamento absoluto em termos não documentados ou um SLA técnico que não tenha sido aprovado.',
    'public', 'published', null, now()
  ),
  (
    'ai-limitations',
    'momo-sales',
    'Produto',
    'Limitações das respostas de IA',
    'O Momo responde com base na Knowledge Base, configurações e integrações disponíveis. Como qualquer sistema de IA, pode interpretar mal uma pergunta ou produzir uma resposta incorreta. Informação importante do negócio deve ser mantida atualizada. Quando não existe informação confirmada, o agente deve admitir a limitação ou encaminhar para uma pessoa em vez de inventar. Decisões críticas não devem depender exclusivamente de uma resposta automática.',
    'public', 'published', null, now()
  ),
  (
    'advanced-capabilities-status',
    'momo-sales',
    'Planos',
    'Funcionalidades avançadas e roadmap',
    'Existem soluções que podem evoluir para automações, operações e integrações mais avançadas, mas o Momo só deve dizer que uma funcionalidade específica está disponível quando essa capacidade estiver implementada, testada e documentada. Gestão de encomendas, CRM, e-commerce ou outras operações não devem ser apresentadas como disponíveis apenas porque seriam tecnicamente possíveis. Casos não confirmados são analisados pela equipa.',
    'public', 'published', null, now()
  ),
  (
    'integrations-case-by-case',
    'momo-sales',
    'Integrações',
    'Integrações com sistemas externos',
    'As integrações são confirmadas caso a caso. O Momo não deve afirmar que existe integração com uma plataforma específica sem essa compatibilidade estar documentada. Se alguém perguntar por um sistema ainda não confirmado, deve dizer que não tem essa integração confirmada e pode encaminhar o pedido para a equipa analisar. Quando a equipa validar uma integração e essa informação for adicionada à Knowledge Base, o Momo passa a poder apresentá-la como suportada dentro das condições documentadas.',
    'public', 'published', null, now()
  ),
  (
    'knowledge-governance',
    'momo-sales',
    'Produto',
    'Conhecimento confirmado e atualizações',
    'Informação não confirmada não deve ser assumida. Quando a equipa Momo valida uma nova funcionalidade, integração, política, preço ou procedimento, essa informação deve ser adicionada ou atualizada na Knowledge Base. O Momo deve usar a versão documentada mais recente e nunca transformar uma possibilidade técnica ou uma ideia futura numa promessa comercial.',
    'public', 'published', null, now()
  )
on conflict (slug) do update set
  agent_key = excluded.agent_key,
  category = excluded.category,
  title = excluded.title,
  content = excluded.content,
  visibility = excluded.visibility,
  status = excluded.status,
  embedding = null,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- MOMO SUPPORT
-- ---------------------------------------------------------------------------

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'momo-support-onboarding',
    'momo-support',
    'Onboarding',
    'Onboarding timing and website installation dependencies',
    'The onboarding timeline is confirmed case by case. For client support, explain that publishing the website widget requires a permitted way to add the organization installation script. This can be direct code access or, depending on the website platform, a CMS custom-code area, tag manager, theme setting, plugin or another supported script-injection method. If the client does not manage the website, they may need the person or provider that does. Do not promise a standard implementation deadline.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-plans-capabilities',
    'momo-support',
    'Plans',
    'Base scope, upgrades and advanced capabilities',
    'The current base service focuses on the website AI agent, one primary language, organization Knowledge Base, customizable widget, client Portal, conversations/leads and Momo Support. Seat, usage and other limits depend on the contracted plan. Additional languages and higher limits may require an upgrade. Advanced operational features or integrations must not be presented as available unless the current documentation explicitly confirms them for the product and, where relevant, for the client account.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-commercial-boundary',
    'momo-support',
    'Billing',
    'Pricing, billing, contracts and service upgrades',
    'Momo is a recurring service with an initial setup fee and a monthly subscription. Momo Support may answer general approved billing and cancellation policies from the documentation. Exact plan prices, payment methods, invoice details, discounts, account-specific balances and any term not documented must not be invented. If the answer depends on the client account or a commercial exception, offer or create a billing ticket when the client asks the team to review it.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-billing-policy',
    'momo-support',
    'Billing',
    'Setup fee, monthly billing and failed payments',
    'The setup fee is paid when the customer contracts the service. The monthly subscription starts once installation is complete and the widget is published. Monthly billing is prepaid and renews automatically. A failed monthly payment has a 7-day grace period during which the service remains active. If it remains unpaid after that period, the website widget can be suspended while Portal access remains available so the client can review the issue and contact Support. Once payment is regularized, the service can be reactivated. Do not invent the payment method or an account-specific payment status.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-cancellation-policy',
    'momo-support',
    'Billing',
    'Cancellation, paid billing period and recommended evaluation period',
    'There is no mandatory commitment period. A client can request cancellation at any time. If a billing period has already been paid, service remains available until the end of that paid period and does not renew afterwards. The default policy does not provide a prorated refund for unused days, except where the team agrees an exception or applicable law requires one. Momo recommends roughly three months of use to evaluate results with real usage, but this is a recommendation, not a minimum contract term or special trial.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-account-cancellation-recovery',
    'momo-support',
    'Account & Privacy',
    'Service cancellation and recovery window',
    'Normal service cancellation is different from an explicit data-deletion request. Cancellation becomes effective at the end of the paid billing period unless the team has agreed another effective date. When service actually ends, the organization enters the normal 90-day recovery window: the public widget is unavailable and organization data is retained so reactivation can be requested without rebuilding the account. A verified privacy deletion request is handled separately and does not have to wait for the 90-day recovery window. After the recovery window expires, the organization is marked for final deletion review.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-retention-policy',
    'momo-support',
    'Privacy & Data',
    'Operational data retention reference',
    'The current retention reference is up to 12 months from the last relevant activity for website conversations and 12 months after resolution for normal support tickets, unless a valid shorter instruction or another lawful retention need applies. Normal cancellation uses the separate 90-day organization recovery window after service ends. Explicit verified deletion requests are handled separately. Technical rate-limit counters are short-lived and use a 48-hour retention window. Normal application logs have an approved target of 30 days and security-incident records may require up to 12 months, subject to the actual logging system and legal needs.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-backup-deletion',
    'momo-support',
    'Privacy & Data',
    'Deletion from active systems and backup copies',
    'When an approved deletion is executed, data should be removed from active systems as part of the verified deletion process. Residual copies can remain temporarily inside automatic backups until those backups expire under their normal retention cycle. Backup copies are not used for ordinary operations. Do not promise a fixed backup-erasure deadline until the infrastructure policy documents one.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-security-availability',
    'momo-support',
    'Security',
    'Access controls, maintenance and availability',
    'Momo uses individual authenticated accounts and organization-based permissions. Owners and Members have different access levels. Do not describe the security model with guarantees that are not documented. Maintenance, updates and occasional outages can occur, including failures in external services Momo depends on. Momo does not currently promise 100% uptime or a fixed technical availability SLA. Suspected unauthorized access, data exposure or serious security concerns require high-priority escalation.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-ai-limitations',
    'momo-support',
    'Agent',
    'AI answer limitations and incorrect answers',
    'The customer website agent uses the organization Knowledge Base, configuration and confirmed integrations as factual context, but AI can still misunderstand a question or produce an incorrect answer. When a client reports an incorrect answer, first check whether the relevant information exists, is correct, published and indexed in the Knowledge Base. If the source information is missing or wrong, correct it and test again. If the Knowledge Base is correct and the problem persists, treat it as a technical issue. Critical decisions should not rely only on an automated answer.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-escalation',
    'momo-support',
    'Escalation',
    'When Momo Support should create a ticket',
    'Answer documented how-to questions directly and use a short troubleshooting sequence for ordinary technical problems. Create a ticket immediately when the client explicitly asks for a ticket, the team or a human. Escalate when team action is required, a serious or repeating technical issue remains after normal troubleshooting, there is a privacy/security concern, or an account-specific consequential question cannot be answered from confirmed documentation. A casual feature suggestion or a question about an unconfirmed integration should not create a ticket automatically: explain what is confirmed and ask whether the client wants the team to review it. If they confirm, create the appropriate ticket.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-ticket-priorities',
    'momo-support',
    'Support',
    'Ticket priority and useful context',
    'Use high priority for security concerns, suspected unauthorized access or data exposure, verified privacy deletion requests, and critical complete service outages. Use normal priority for technical investigation, account-specific billing/payment help, ownership/access changes, primary-language requests and confirmed integration evaluations. Use low priority for confirmed feature suggestions and other non-urgent requests. Priority is internal triage and never a response-time promise. Ticket summaries should include the problem and useful troubleshooting already completed, but must never include passwords, API keys, access tokens or other credentials.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-knowledge-governance',
    'momo-support',
    'Knowledge Base',
    'How confirmed product and integration knowledge evolves',
    'Do not assume an undocumented capability is supported. For example, if a client asks whether Momo integrates with a named system and that integration is not confirmed in the documentation, say that it is not currently confirmed and offer to ask the team. If the team later validates the integration, feature, price or procedure and updates the Knowledge Base, future answers should use that newly confirmed information. The latest approved documentation is the source of truth.',
    'public', 'published', null, now()
  )
on conflict (slug) do update set
  agent_key = excluded.agent_key,
  category = excluded.category,
  title = excluded.title,
  content = excluded.content,
  visibility = excluded.visibility,
  status = excluded.status,
  embedding = null,
  updated_at = now();

commit;
