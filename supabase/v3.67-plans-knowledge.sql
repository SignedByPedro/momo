-- Momo v3.67 — Plan knowledge for Momo Sales and Portal Support
-- Adds authoritative Base / Premium / Business documentation and aligns older
-- Support entries with the access rules introduced in v3.66.
-- After running this migration, reindex BOTH Momo Sales knowledge and Support knowledge.

-- -----------------------------------------------------------------------------
-- Momo Sales knowledge
-- -----------------------------------------------------------------------------

update public.knowledge_entries
set
  category = 'Pricing',
  title = 'Planos Base, Premium e Business',
  content = 'O Momo tem três planos: Base, Premium e Business. O plano Base inclui as áreas principais Dashboard, Conversas e Knowledge. O plano Premium inclui tudo do Base e desbloqueia todas as funcionalidades standard atuais do Momo, incluindo Leads/CRM, configuração do agente, personalização do widget, Tester e gestão de equipa, além das restantes ferramentas standard disponíveis no produto. O plano Business inclui tudo do Premium e acrescenta funcionalidades ou integrações desenvolvidas para necessidades específicas da empresa, por exemplo gestão de encomendas, marcação de reuniões, reservas ou integrações com sistemas externos. Exemplos de funcionalidades Business não devem ser apresentados como já contratados ou ativos para uma empresa sem confirmação.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales'
  and slug = 'momo-plans-overview';

insert into public.knowledge_entries (
  slug,
  agent_key,
  category,
  title,
  content,
  visibility,
  status
)
select
  'momo-plans-overview',
  'momo-sales',
  'Pricing',
  'Planos Base, Premium e Business',
  'O Momo tem três planos: Base, Premium e Business. O plano Base inclui as áreas principais Dashboard, Conversas e Knowledge. O plano Premium inclui tudo do Base e desbloqueia todas as funcionalidades standard atuais do Momo, incluindo Leads/CRM, configuração do agente, personalização do widget, Tester e gestão de equipa, além das restantes ferramentas standard disponíveis no produto. O plano Business inclui tudo do Premium e acrescenta funcionalidades ou integrações desenvolvidas para necessidades específicas da empresa, por exemplo gestão de encomendas, marcação de reuniões, reservas ou integrações com sistemas externos. Exemplos de funcionalidades Business não devem ser apresentados como já contratados ou ativos para uma empresa sem confirmação.',
  'public',
  'published'
where not exists (
  select 1
  from public.knowledge_entries
  where agent_key = 'momo-sales'
    and slug = 'momo-plans-overview'
);

update public.knowledge_entries
set
  category = 'Pricing',
  title = 'Modelo comercial mensal',
  content = 'O Momo é comercializado como um serviço recorrente com mensalidade, e não como uma compra única. Existem os planos Base e Premium para a oferta standard e o plano Business para soluções com funcionalidades ou integrações específicas. A mensalidade pode incluir utilização de IA, manutenção e a configuração correspondente ao plano contratado.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales'
  and slug = 'monthly-service-model';

update public.knowledge_entries
set
  category = 'Pricing',
  title = 'Preços dos planos',
  content = 'Os preços exatos dos planos Base e Premium ainda não estão publicados no Knowledge do Momo e não devem ser inventados nem estimados. O plano Business é definido por orçamento porque depende das funcionalidades e integrações específicas necessárias. Se alguém pedir um valor exato para Base ou Premium, o Momo deve dizer de forma direta que os preços ainda não estão publicados e pode oferecer contacto com a equipa quando houver intenção de avançar.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales'
  and slug = 'pricing-depends-on-scope';

-- -----------------------------------------------------------------------------
-- Portal Support knowledge
-- -----------------------------------------------------------------------------

update public.knowledge_entries
set
  category = 'Plans & Access',
  title = 'Base, Premium and Business plans',
  content = 'Momo has three plans. Base includes the core product areas Dashboard, Conversations and Knowledge. Premium includes everything in Base and unlocks the current standard premium capabilities, including Leads/CRM, Agent configuration, Widget customization, the Tester inside Knowledge and Team management. Business includes everything in Premium and can add custom functionality or integrations agreed with the Momo team, such as order management, meeting booking, reservations or external-system integrations. Base and Premium exact prices are not currently published in the product Knowledge; never invent or estimate them. Business is custom-priced by quotation.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-plans-access';

insert into public.knowledge_entries (
  slug,
  agent_key,
  category,
  title,
  content,
  visibility,
  status
)
select
  'momo-support-plans-access',
  'momo-support',
  'Plans & Access',
  'Base, Premium and Business plans',
  'Momo has three plans. Base includes the core product areas Dashboard, Conversations and Knowledge. Premium includes everything in Base and unlocks the current standard premium capabilities, including Leads/CRM, Agent configuration, Widget customization, the Tester inside Knowledge and Team management. Business includes everything in Premium and can add custom functionality or integrations agreed with the Momo team, such as order management, meeting booking, reservations or external-system integrations. Base and Premium exact prices are not currently published in the product Knowledge; never invent or estimate them. Business is custom-priced by quotation.',
  'public',
  'published'
where not exists (
  select 1
  from public.knowledge_entries
  where agent_key = 'momo-support'
    and slug = 'momo-support-plans-access'
);

update public.knowledge_entries
set
  category = 'Plans & Access',
  title = 'Upgrades and downgrades',
  content = 'A client plan can be changed by the Momo team when the client upgrades or downgrades. Moving from Base to Premium unlocks the current standard Premium areas without requiring the client to rebuild previously saved Premium configuration. Downgrading from Premium or Business to Base restricts access to Premium areas but does not delete saved Premium configuration or historical Premium data solely because of the downgrade. The live website Momo remains available on Base, but lead capture is disabled while Base is active. A later upgrade can restore access to the saved Premium configuration. Business-specific functionality is handled case by case according to the client agreement, so requests to add, remove or change custom Business functionality should be escalated to the Momo team.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-plan-changes';

insert into public.knowledge_entries (
  slug,
  agent_key,
  category,
  title,
  content,
  visibility,
  status
)
select
  'momo-support-plan-changes',
  'momo-support',
  'Plans & Access',
  'Upgrades and downgrades',
  'A client plan can be changed by the Momo team when the client upgrades or downgrades. Moving from Base to Premium unlocks the current standard Premium areas without requiring the client to rebuild previously saved Premium configuration. Downgrading from Premium or Business to Base restricts access to Premium areas but does not delete saved Premium configuration or historical Premium data solely because of the downgrade. The live website Momo remains available on Base, but lead capture is disabled while Base is active. A later upgrade can restore access to the saved Premium configuration. Business-specific functionality is handled case by case according to the client agreement, so requests to add, remove or change custom Business functionality should be escalated to the Momo team.',
  'public',
  'published'
where not exists (
  select 1
  from public.knowledge_entries
  where agent_key = 'momo-support'
    and slug = 'momo-support-plan-changes'
);

-- Align older Support documentation with plan-gated navigation.
update public.knowledge_entries
set
  category = 'Portal',
  title = 'Portal overview, plans and permissions',
  content = 'Portal navigation depends on both the organization plan and the user role. Base provides the core product areas Dashboard, Conversations and Knowledge; Knowledge editing is an Owner configuration area. Support, My account and Company remain available as operational/account areas and are not treated as paid feature modules. Premium and Business also unlock Leads, Agent, Widget and Team, plus the Tester inside Knowledge. Owners can change organization configuration in the areas allowed by the plan. Members can use the operational areas available to their organization but cannot change Owner-only configuration.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-portal-overview';

update public.knowledge_entries
set
  category = 'Knowledge Base',
  title = 'Managing the Knowledge Base and Tester access',
  content = 'The Knowledge Base is a core Base, Premium and Business capability and is managed by an organization Owner. In Portal > Knowledge Base, an Owner can add manual knowledge with Title, Category and Content, choose Public or Internal visibility, choose Published or Draft status, and save the entry. A public published manual entry is embedded/indexed when it is saved, so Reindex is not mandatory after every manual entry; Reindex is available to refresh public published knowledge after broader changes. Website knowledge can also be generated by analysing the organization public website. Running website analysis again replaces website-sourced entries while preserving manual entries. Before saving new manual business information, Momo Support can help the client prepare a clear Knowledge Base draft; only an authenticated Owner can confirm the Add to Knowledge action. Members may prepare wording with Support but cannot save Knowledge Base changes. The integrated Tester inside Knowledge is a Premium and Business capability; Base clients can manage Knowledge but do not have access to the Tester.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-knowledge-base';

update public.knowledge_entries
set
  category = 'Agent',
  title = 'Agent settings and lead capture',
  content = 'Agent configuration in the client Portal is available on Premium and Business plans to organization Owners. It includes the website agent name, welcome message, input placeholder, tone, objective, supported languages, goals, fallback behaviour, contact capture and human handoff settings. Base clients continue to have a live configured Momo but do not have Portal access to these Premium agent settings. On Base, lead capture is disabled at runtime even if an older Premium configuration remains saved.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-agent-settings';

update public.knowledge_entries
set
  category = 'Widget',
  title = 'Publishing, installing and customizing the website widget',
  content = 'Every active client plan can use the live Momo website widget. Portal access to Widget customization is a Premium and Business capability for organization Owners. Premium and Business Owners can configure colours, panel appearance, launcher style, avatar, hover label, position and size and can use the organization-specific installation script shown in the Widget area. The Widget must be published/enabled before it is available to website visitors. Saving appearance settings applies them to an already-published Widget without requiring a new publication after every visual change. Base clients keep the live widget configured for their service, but Widget customization is not available in their Portal. Never invent an installation key or script; if a Base client needs installation or configuration help, escalate to the Momo team.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-widget-installation';

update public.knowledge_entries
set
  category = 'Widget',
  title = 'Widget appearance and launcher customization',
  content = 'Widget appearance customization in the client Portal is available to organization Owners on Premium and Business plans. Owners can change the three animated launcher colours and the chat-window background, hover-label background and text colours, launcher position and launcher size, launcher style, avatar and hover-label text. The launcher style can use the animated Momo gradient or a full custom image. Saving appearance settings applies the configuration; if the Widget is already published, it does not need to be published again after every appearance change. Base clients keep their live configured widget but do not have access to these customization controls in the Portal.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-widget-customization';

update public.knowledge_entries
set
  category = 'Widget',
  title = 'Widget launcher and chat window sizes',
  content = 'Widget size controls are available to organization Owners on Premium and Business plans. Launcher button sizes are Small (50 px), Medium (60 px) and Large (70 px). The open chat window width can be configured from 390 px to 520 px and its height from 570 px to 760 px; 390 x 570 px is the minimum. On small and mobile screens the open Widget adapts automatically to the available screen. Window corner rounding can be configured from 16 px to 36 px. Base clients do not have access to these Widget customization controls in the Portal.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-widget-sizing';

update public.knowledge_entries
set
  category = 'Widget',
  title = 'Basic widget troubleshooting by plan',
  content = 'If a Premium or Business client reports that the widget is not visible, first confirm in the Widget area that it is published/enabled, then confirm that the installation script belongs to the correct organization and has not been altered. Refresh the live website after deployment and test in a normal browser window. Base clients do not have Portal access to Widget configuration, so installation, publishing or configuration issues on Base should be escalated to the Momo team rather than asking the client to open the Widget area. If the relevant checks are correct and the widget is still missing or repeatedly failing, escalate as a technical support request.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-widget-troubleshooting';

update public.knowledge_entries
set
  category = 'Conversations & Leads',
  title = 'Conversations and leads by plan',
  content = 'Conversations is a core Base, Premium and Business area and contains visitor chat history from the organization website agent. Leads/CRM is a Premium and Business capability. On Base, lead capture is disabled and the Leads area is not available in the Portal. A downgrade does not delete historical lead data solely because the plan changes; access is restricted while Base is active and can return after an upgrade. If expected conversation data is consistently missing despite real test conversations, escalate as a technical issue after confirming the live Momo is active.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-conversations-leads';

update public.knowledge_entries
set
  category = 'Team',
  title = 'Team invitations, roles and plan access',
  content = 'Team management is available on Premium and Business plans to organization Owners. To invite a teammate, an Owner opens Team, enters the teammate email and sends the invitation. Client Owners can invite Members; adding or changing an Owner requires the Momo team. Pending invitations count toward the organization seat limit and can be resent. The invited account becomes active only after the recipient completes the invitation/email flow. Owners can remove Members directly but cannot directly remove another Owner. When the seat limit is reached, new invitations are blocked and the client should contact the Momo team about additional seats. Base does not include the Team management area. Members can use the operational areas made available by the organization plan but cannot change Owner-only configuration.',
  visibility = 'public',
  status = 'published',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support'
  and slug = 'momo-support-team-access';
