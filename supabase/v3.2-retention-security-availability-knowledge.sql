-- Momo v3.2 - Retention, data access and availability knowledge hardening
--
-- Refines policy wording found during the v3.0 real-agent QA (S023, S025,
-- S026, S029 and S030), adds focused semantic entries, and corrects two
-- Support policy updates from v3.1 that targeted obsolete slugs.
--
-- After running this migration, reindex BOTH knowledge bases from Admin.

begin;

-- ---------------------------------------------------------------------------
-- MOMO SALES
-- ---------------------------------------------------------------------------

update public.knowledge_entries
set
  content = 'A regra operacional de referência é conservar conversas do widget até 12 meses desde a última atividade relevante e tickets de suporte normais até 12 meses após resolução. Leads com estado novo ou contactado são mantidas enquanto forem comercialmente relevantes. Quando uma lead é dada como perdida ou convertida em cliente, os dados pessoais dessa lead deixam de ser necessários como registo comercial e devem ser eliminados segundo o processo aplicável; métricas agregadas sem dados pessoais podem ser mantidas. O cancelamento normal mantém os dados da organização durante uma janela de recuperação de 90 dias após o fim efetivo do serviço. Pedidos explícitos de eliminação são tratados separadamente. Logs normais de aplicação têm uma retenção de referência de 30 dias, registos associados a incidentes de segurança podem ser conservados até 12 meses e contadores técnicos de rate limit usam 48 horas. Cópias residuais podem permanecer temporariamente em backups até ao respetivo ciclo de expiração.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales' and slug = 'data-retention-policy';

update public.knowledge_entries
set
  content = 'O acesso ao Momo usa contas autenticadas e permissões por organização. Owners e Members têm níveis de acesso diferentes. Utilizadores de outras organizações clientes não têm acesso, através do Portal, aos dados da tua organização. A plataforma pode passar por manutenção, atualizações ou indisponibilidades ocasionais, incluindo dependências externas. Em condições normais, o Momo foi concebido para estar disponível 24/7, mas não é prometido 100% de uptime nem um SLA técnico que não tenha sido formalmente aprovado.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales' and slug = 'security-availability';

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'lead-retention-lifecycle',
    'momo-sales',
    'Privacidade',
    'Retenção de leads',
    'Leads com estado novo ou contactado são mantidas enquanto forem comercialmente relevantes. Quando uma lead é dada como perdida ou é convertida em cliente, os dados pessoais dessa lead deixam de ser necessários como registo comercial e devem ser eliminados segundo o processo aplicável. Podem permanecer apenas métricas agregadas que não identifiquem a pessoa.',
    'public', 'published', null, now()
  ),
  (
    'technical-log-retention',
    'momo-sales',
    'Privacidade',
    'Retenção de logs técnicos normais',
    'Os logs normais de aplicação têm uma retenção de referência de 30 dias. Contadores técnicos de rate limit são mais curtos e usam uma janela de 48 horas.',
    'public', 'published', null, now()
  ),
  (
    'security-incident-retention',
    'momo-sales',
    'Segurança',
    'Retenção de registos de incidentes de segurança',
    'Registos associados a incidentes de segurança podem ser conservados até 12 meses para permitir investigação e acompanhamento do incidente.',
    'public', 'published', null, now()
  ),
  (
    'organization-data-access',
    'momo-sales',
    'Segurança',
    'Acesso aos dados entre organizações',
    'O acesso é controlado por autenticação, organização e permissões. Utilizadores de outras organizações clientes não têm acesso, através do Portal, aos dados da tua organização. Owners e Members da própria organização têm níveis de acesso diferentes.',
    'public', 'published', null, now()
  ),
  (
    'service-availability-24-7',
    'momo-sales',
    'Serviço',
    'Disponibilidade do Momo',
    'Em condições normais, o Momo foi concebido para estar disponível 24 horas por dia, 7 dias por semana. Podem existir períodos de manutenção, atualizações ou indisponibilidade, incluindo falhas de serviços externos dos quais a plataforma depende. Por isso, não é prometido 100% de uptime nem um SLA técnico de disponibilidade que não esteja formalmente definido.',
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

-- Correct the v3.1 support updates using the actual v2.34 slugs.
update public.knowledge_entries
set
  content = 'The setup fee is paid when the customer contracts the service. The monthly subscription starts once installation is complete and the widget is published. Monthly billing is prepaid and renews automatically. A failed monthly payment has a 7-day grace period during which the service remains active. If it remains unpaid after that period, the website widget is suspended while Portal access remains available so the client can review the issue and contact Support. Once payment is regularized, the widget is reactivated automatically; the client does not need to request manual reactivation. Do not invent the payment method or an account-specific payment status.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-billing-policy';

update public.knowledge_entries
set
  content = 'There is no mandatory commitment period. A client can request cancellation at any time. Momo recommends roughly three months of real use to evaluate results, but this is a recommendation rather than a minimum term or special trial. If a billing period has already been paid, service remains available until the end of that paid period and does not renew afterwards. The standard policy does not provide a prorated refund for unused days. Account-specific exceptions must be reviewed by the Momo team.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-cancellation-policy';

update public.knowledge_entries
set
  content = 'The current retention reference is up to 12 months from the last relevant activity for website conversations and 12 months after resolution for normal support tickets. Leads in new or contacted status are retained while commercially relevant; once a lead is marked lost or converted to a customer, its personal lead data is no longer needed as a commercial lead and should be removed through the applicable process, while non-identifying aggregate metrics may remain. Normal cancellation uses the separate 90-day organization recovery window after service ends. Explicit verified deletion requests are handled separately. Technical rate-limit counters use 48 hours, normal application logs have a 30-day reference period, and security-incident records may be retained for up to 12 months. Backup residues follow their normal expiry cycle.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-retention-policy';

update public.knowledge_entries
set
  content = 'Momo uses individual authenticated accounts and organization-based permissions. Owners and Members have different access levels. Users belonging to other customer organizations do not have Portal access to this organization data. Under normal conditions Momo is designed to be available 24/7, but maintenance, updates and occasional outages can occur, including failures in external services Momo depends on. Momo does not promise 100% uptime or a fixed technical availability SLA. Suspected unauthorized access, data exposure or serious security concerns require high-priority escalation.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-security-availability';

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'momo-support-lead-retention',
    'momo-support',
    'Privacy & Data',
    'Lead retention lifecycle',
    'Leads in new or contacted status are retained while commercially relevant. Once a lead is marked lost or converted to a customer, its personal lead data is no longer needed as a commercial lead and should be removed through the applicable process. Non-identifying aggregate metrics may remain. Do not claim an immediate automatic deletion mechanism unless the current product behavior explicitly confirms it.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-log-retention',
    'momo-support',
    'Privacy & Data',
    'Technical and security log retention',
    'Normal application logs use a 30-day reference retention period. Technical rate-limit counters use 48 hours. Records associated with security incidents may be retained for up to 12 months for investigation and follow-up.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-organization-data-access',
    'momo-support',
    'Security',
    'Organization data access boundaries',
    'Access is controlled through authentication, organization membership and permissions. Users from other customer organizations do not have Portal access to this organization data. Owners and Members within the same organization have different permissions.',
    'public', 'published', null, now()
  ),
  (
    'momo-support-service-availability-24-7',
    'momo-support',
    'Service',
    '24/7 operation and availability limits',
    'Under normal conditions Momo is designed to operate 24 hours a day, 7 days a week. Maintenance, updates and outages can still occur, including failures in external dependencies. This must not be presented as a 100% uptime guarantee or a fixed technical availability SLA.',
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
