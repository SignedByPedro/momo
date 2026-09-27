-- Momo v2.33 - Knowledge Foundation
-- Purpose: bring Momo Sales and Momo Support knowledge up to date with the
-- client-facing product behaviour implemented through v2.32.
--
-- Run in Supabase SQL Editor, then reindex BOTH knowledge bases from Admin:
--   /admin/knowledge         -> Reindexar conhecimento
--   /admin/support/knowledge -> Reindexar documentação
--
-- Updated/new public entries intentionally receive embedding = NULL so stale
-- vectors are never kept after their text changes.

begin;

-- ---------------------------------------------------------------------------
-- MOMO SALES
-- ---------------------------------------------------------------------------

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'momo-overview',
    'momo-sales',
    'Serviço',
    'O que é o Momo',
    'Momo é um serviço de IA para empresas focado em conversas com clientes e automação de tarefas repetitivas de atendimento. Pode responder com informação confirmada da empresa, orientar visitantes, captar leads, tratar pedidos comuns e encaminhar situações que precisem da equipa. O comportamento depende da configuração de cada cliente, da respetiva Knowledge Base e das integrações efetivamente contratadas e confirmadas.',
    'public', 'published', null, now()
  ),
  (
    'monthly-service-model',
    'momo-sales',
    'Pricing',
    'Modelo comercial mensal',
    'O Momo é comercializado como um serviço recorrente com mensalidade, e não como uma compra única. O serviço pode incluir utilização de IA, manutenção, configuração, suporte e integrações consoante a solução contratada. O Momo não deve inventar valores, descontos, fidelizações ou condições de faturação que ainda não estejam confirmadas.',
    'public', 'published', null, now()
  ),
  (
    'pricing-depends-on-scope',
    'momo-sales',
    'Pricing',
    'Como é definido o preço',
    'Ainda não existe um preço único aplicável a todas as empresas. O valor depende sobretudo do volume de utilização, das funcionalidades pretendidas, dos idiomas adicionais e das integrações necessárias. O Momo não deve inventar um valor final; quando necessário, deve recolher um contacto para a equipa preparar uma proposta adequada.',
    'public', 'published', null, now()
  ),
  (
    'implementation-overview',
    'momo-sales',
    'Implementação',
    'Como funciona a implementação',
    'A implementação começa por perceber o negócio e aquilo que a empresa quer automatizar. Depois configura-se o agente, adiciona-se a informação relevante à Knowledge Base, ajusta-se comportamento e aparência e instala-se o widget no website quando esse é o canal contratado. Integrações ou outros canais só devem ser apresentados como disponíveis quando a equipa confirmar o caso concreto.',
    'public', 'published', null, now()
  ),
  (
    'supported-languages',
    'momo-sales',
    'Produto',
    'Idiomas e plano base',
    'Nesta fase o Momo suporta Português de Portugal e Inglês. O plano base inclui um único idioma principal. Idiomas adicionais para o agente podem ser ativados pela equipa Momo através de uma atualização do serviço com custo adicional. O idioma principal é definido durante o setup pela equipa Momo e não é alterado diretamente pelo cliente no Portal; um cliente existente pede a alteração através do suporte. Não inventar o preço do extra multilíngua.',
    'public', 'published', null, now()
  ),
  (
    'public-website-analysis',
    'momo-sales',
    'Produto',
    'Análise de websites públicos',
    'O Momo comercial consegue analisar um conjunto limitado de páginas HTML públicas de um website partilhado pelo potencial cliente para identificar oportunidades específicas para esse negócio. A análise não é garantidamente exaustiva e pode obter menos informação em sites muito dependentes de JavaScript, bloqueados ou com conteúdo autenticado. Quando a análise falhar ou for incompleta, o Momo deve dizê-lo em vez de inventar detalhes do site.',
    'public', 'published', null, now()
  ),
  (
    'website-not-required',
    'momo-sales',
    'Produto',
    'É possível configurar o Momo sem website público',
    'Um website público não é obrigatório para começar a configurar o Momo. A informação da empresa pode ser adicionada manualmente à Knowledge Base. No produto atual, o canal de publicação disponível é o widget de website; qualquer outro canal ou integração deve ser analisado e confirmado pela equipa antes de ser prometido.',
    'public', 'published', null, now()
  ),
  (
    'knowledge-base-behaviour',
    'momo-sales',
    'Produto',
    'Knowledge Base e respostas do agente',
    'Cada cliente tem uma Knowledge Base própria usada como referência factual pelo respetivo agente. A informação pode ser criada manualmente e também pode ser gerada a partir da análise do website público do cliente. O objetivo é reduzir respostas inventadas e manter o agente alinhado com informação confirmada da empresa. A Knowledge Base de um cliente não é partilhada com outras empresas.',
    'public', 'published', null, now()
  ),
  (
    'widget-customization',
    'momo-sales',
    'Produto',
    'Widget personalizável',
    'O widget pode ser personalizado pelo cliente no Portal, incluindo cores, aparência da janela, launcher, avatar, texto de hover, posição e tamanho do painel. Existe um preview em tempo real e o cliente recebe o seu próprio script de instalação. O widget só fica disponível ao público quando está publicado/ativado.',
    'public', 'published', null, now()
  ),
  (
    'client-portal-overview',
    'momo-sales',
    'Produto',
    'Portal do cliente',
    'Os clientes têm um Portal para acompanhar o serviço. Consoante a permissão do utilizador, podem consultar Dashboard, conversas, leads e Support, e os Owners podem também gerir informação da empresa, Knowledge Base, configuração do agente, widget e equipa. O Portal inclui Momo Support para dúvidas e encaminhamento de pedidos à equipa.',
    'public', 'published', null, now()
  ),
  (
    'client-support-model',
    'momo-sales',
    'Suporte',
    'Suporte a clientes',
    'Clientes com acesso ao Portal podem utilizar o Momo Support, o assistente de suporte por IA disponível no Portal, para dúvidas documentadas sobre a plataforma. Quando é necessária intervenção humana, o pedido pode ser encaminhado para a equipa através de um ticket. Não deve ser prometido atendimento humano 24/7 nem um tempo exato de resposta sem uma política comercial aprovada.',
    'public', 'published', null, now()
  ),
  (
    'integrations-case-by-case',
    'momo-sales',
    'Integrações',
    'Integrações com sistemas externos',
    'As integrações dependem dos sistemas usados pelo cliente e das funcionalidades necessárias. O Momo não deve afirmar que existe uma integração pronta com uma plataforma específica sem essa integração estar confirmada. Quando uma integração ainda não estiver confirmada, deve dizer que a equipa precisa de analisar o sistema, a API e o caso de utilização.',
    'public', 'published', null, now()
  ),
  (
    'human-escalation',
    'momo-sales',
    'Atendimento',
    'Encaminhamento para humano',
    'O produto é pensado para encaminhar para a equipa situações que o agente não consiga resolver ou em que seja necessária intervenção humana. O agente pode indicar que é necessário follow-up, mas isso não significa chat humano em tempo real. A forma exata de encaminhamento depende da implementação e das integrações configuradas.',
    'public', 'published', null, now()
  ),
  (
    'lead-follow-up',
    'momo-sales',
    'Vendas',
    'Contacto depois de demonstrar interesse',
    'Quando um potencial cliente demonstra interesse, o Momo pode recolher o nome e um contacto preferido, email ou telefone, para que a equipa faça o seguimento e prepare uma solução mais concreta. Não é necessário exigir email e telefone ao mesmo tempo. Depois de uma análise de website com valor relevante, o Momo pode incluir logo um convite opcional para deixar contacto, sem obrigar a uma pergunta intermédia de sim ou não.',
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
    'momo-support-product-overview',
    'momo-support',
    'Momo',
    'What Momo is and how the service is managed',
    'Momo is a recurring AI service for businesses focused on customer conversations and repetitive service tasks. Each organization has its own configuration, Knowledge Base, conversations, leads, widget and team access. Product behaviour must be explained from the current portal and approved documentation, not from assumptions. Pricing, billing terms, contracts, integrations and unconfirmed roadmap items require the Momo team when the documentation does not explicitly answer them.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-portal-overview',
    'momo-support',
    'Portal',
    'Portal overview and permissions',
    'The client Portal includes Dashboard, Conversations, Leads, Support and My account for client users. Owners can additionally manage Company, Knowledge Base, Agent, Widget and Team. Members can use the operational areas but cannot change owner-only company or agent configuration. The Dashboard summarizes conversations, leads, knowledge status and widget state. Momo Support is available from the Portal for documented help and ticket escalation.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-company-settings',
    'momo-support',
    'Company',
    'Company settings and editable organization details',
    'Owners can update the organization website, business type and country from Company. The company name is managed by the Momo team and is not directly editable in the Portal. The primary language is displayed read-only and is also managed by the Momo team. Company also contains organization data export and the verified deletion-request workflow.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-primary-language',
    'momo-support',
    'Company',
    'Primary language changes',
    'The organization primary language is selected by the Momo team during setup, determines the Portal interface language, and cannot be edited directly by either Owners or Members. This remains true even when the organization has multilingual chat enabled. An Owner can request a change from Company using the primary-language request button, which creates a support ticket for team review. A Member can ask an Owner to submit the request or ask Support to create a ticket. Never say the language changes automatically when the ticket is created.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-agent-settings',
    'momo-support',
    'Agent',
    'Agent settings and lead capture',
    'Owners can configure the website agent name, welcome message, input placeholder, tone, objective, allowed outcomes/goals, fallback behaviour, contact capture and whether team follow-up is allowed. Contact capture modes are: disabled - do not ask for or create leads; passive - save contact details when the visitor voluntarily provides them or asks for follow-up; proactive - the agent may ask for contact details when it is appropriate. The Agent test chat is for validating knowledge, objective, tone and contact behaviour and does not create real leads or execute integrations. Supported chat languages are displayed in the Agent area but additional languages are enabled by the Momo team, not by the client.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-agent-tones',
    'momo-support',
    'Agent',
    'Agent tone selection and comparison',
    'The Agent area offers four tone profiles: Professional and approachable, Approachable, Direct, and Formal. Owners can compare the same test question across all four tones before choosing one. Choosing a tone in the comparison updates the selection in the form, but the active agent configuration only changes after the owner saves the Agent settings. The tone changes style, not factual permissions or the Knowledge Base.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-agent-languages',
    'momo-support',
    'Agent',
    'Supported languages and multilingual service',
    'The base service includes the organization primary language only. Additional supported chat languages are a service upgrade enabled by the Momo team. Current supported languages are European Portuguese and English. A client cannot add or remove supported languages directly in the Portal. If a visitor writes clearly in a language that is not enabled for that organization, the website agent should not answer the original request and should instead say that the language is not supported. Multilingual chat does not give the client permission to change the organization primary language.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-knowledge-base',
    'momo-support',
    'Knowledge Base',
    'Managing the Knowledge Base',
    'The Knowledge Base is managed by an organization Owner. Manual entries can be added or edited directly. Website knowledge can be generated by analysing the organization public website. Running website analysis again replaces website-sourced entries while preserving manual entries. Public published entries must be indexed before semantic retrieval can use them reliably. The website agent should use confirmed organization knowledge as factual reference and should not invent unsupported business facts. Knowledge belongs to that organization and is not shared with other clients.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-widget-installation',
    'momo-support',
    'Widget',
    'Widget appearance, publishing and installation',
    'The Widget area lets an Owner configure colours, panel appearance, launcher style, avatar, hover label, position and panel size with a live preview. The panel cannot be configured below the original 390 x 570 px size; the current maximum is 520 x 760 px. The widget must be published/enabled before it is available to website visitors. Installation uses the organization-specific script shown in the Widget area and should be pasted before the closing body tag. Never guess or invent an installation key or script. The embedded widget adapts to smaller mobile viewports automatically.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-widget-troubleshooting',
    'momo-support',
    'Widget',
    'Basic widget troubleshooting',
    'If a widget is not visible, first confirm in the Widget area that it is published/enabled, then confirm that the installation script on the website belongs to the correct organization and has not been altered. Refresh the live website and test again. If the widget opens but answers incorrectly, check the Agent configuration and the relevant published/indexed Knowledge Base entries. If those checks are correct and the widget is still missing or repeatedly failing, escalate as a technical support request.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-conversations-leads',
    'momo-support',
    'Conversations & Leads',
    'Conversations and leads in the portal',
    'Conversations contains visitor chat history from the organization website agent. Leads contains contacts captured according to the configured contact-capture mode. Client users can review both operational areas. Very long links may be shown in a compact readable form in conversation screens, but the full original URL is preserved for opening/copying and is not intentionally discarded. If expected conversations or leads are consistently missing despite real test chats, confirm the agent and widget are active and then escalate as a technical issue.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-team-access',
    'momo-support',
    'Team',
    'Team access, Owners, Members and seat limits',
    'Owners can invite Members from Team, subject to the organization seat limit; pending invitations also count towards the limit. Owners can remove Members, but an Owner cannot remove another Owner from the Portal. Removing or changing another Owner requires the Momo team. Members can access operational areas but cannot modify Company, Knowledge Base, Agent, Widget or Team settings. If the seat limit is reached, the client must contact the Momo team to increase it.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-account-self-deletion',
    'momo-support',
    'Account & Privacy',
    'Deleting a personal Portal account',
    'Each Portal user can request deletion of their own personal account from My account. Where direct self-deletion is allowed, the user must confirm with the current password and the required confirmation text; the action is irreversible and a new invitation is required to return. A last active Owner cannot directly delete their own account because the organization must not be left without an Owner; they must contact the Momo team to arrange ownership or account removal. Deleting a personal user account does not by itself delete the organization, widget or organization data.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-tickets',
    'momo-support',
    'Support',
    'Momo Support and human support tickets',
    'Momo Support is the AI support assistant inside the client Portal. It should answer documented how-to questions first and create a human-support ticket when team action is actually needed. Tickets are visible in Support. Client users can reply to their tickets and can mark a ticket as resolved. If a client later sends another message to a resolved ticket, it reopens automatically. The Support item in the navbar shows an unread alert when there is a new relevant ticket update, and the ticket list identifies unread items. Team replies can also trigger email notifications when support email delivery is configured. Human support is not presented as 24/7 and no exact response time should be promised.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-escalation',
    'momo-support',
    'Escalation',
    'Requests that require the Momo team',
    'Try to solve documented how-to questions before creating a ticket. Escalate when the client explicitly asks for the team or a human, requests a feature/product change, asks for an integration, has a billing/contract/payment question, needs ownership or access changes that cannot be performed in the Portal, reports a serious or repeating technical problem, raises a security concern, or requests privacy/data deletion. Do not promise implementation, timing, pricing or a human response deadline that is not documented.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-data-privacy-controls',
    'momo-support',
    'Privacy & Data',
    'Organization data export and deletion requests',
    'Organization Owners can manage privacy-related controls from Company. Export data downloads a JSON copy of organization operational data including organization/team information, agent and widget configuration, Knowledge Base entries, conversations/messages, leads and support history. The organization deletion control does not erase data immediately: after the Owner types the organization name to confirm, Momo creates a high-priority privacy ticket for manual identity verification, any needed export, and review of legal or contractual retention obligations before destructive deletion. Do not say the request button instantly deletes the account.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-account-cancellation-recovery',
    'momo-support',
    'Account & Privacy',
    'Service cancellation and recovery window',
    'Normal service cancellation is different from an explicit privacy deletion request. When the Momo team closes an organization normally, the public widget is unavailable and normal Portal operation is suspended while organization data is retained for a 90-day recovery window so reactivation can be requested without rebuilding the account. Recovery access can still expose the limited actions intentionally allowed by the Portal, such as support and available data controls. After the normal recovery window expires, the organization is marked for final deletion review. An explicit verified privacy deletion request follows the separate privacy workflow and must not be described as requiring the client to wait 90 days.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-login-session',
    'momo-support',
    'Portal',
    'Login, session persistence and signing out',
    'Admin and client Portal authentication use persistent Supabase sessions. Refreshing the page or opening another tab should normally keep a valid session, subject to the platform session limits and revocation. Signing out should end the current authenticated session. Login forms can be submitted with the button or the Enter key and show loading feedback while authentication is in progress. If a valid user is repeatedly forced to sign in again, treat it as a technical issue after checking that cookies are not being blocked by the browser.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-commercial-boundary',
    'momo-support',
    'Billing',
    'Pricing, billing, contracts and service upgrades',
    'Momo is a recurring monthly service. Exact prices, invoices, payment failures, contract terms, discounts, billing dates, cancellations for non-payment and the price of upgrades are handled by the Momo team unless an approved policy explicitly states the answer. Multilingual chat and higher limits can require a service upgrade. Momo Support must not invent commercial terms; create or offer a billing/support ticket when the client needs a definitive account-specific answer.',
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
