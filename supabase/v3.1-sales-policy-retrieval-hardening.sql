-- Momo v3.1 - Sales policy retrieval hardening
--
-- Refines the approved billing/cancellation wording found during the v3.0
-- real-agent QA and adds focused entries so direct commercial questions are
-- easier to retrieve semantically.
--
-- After running this migration, reindex Momo Sales and Momo Support from Admin.

begin;

-- Sales: keep the full billing entry, but make suspension/reactivation explicit.
update public.knowledge_entries
set
  content = 'A taxa de setup é paga na contratação. A mensalidade começa quando a instalação está concluída e o widget é publicado, é cobrada antecipadamente e renova automaticamente. Se um pagamento mensal falhar, existe um período de tolerância de 7 dias e o serviço permanece ativo durante esse período. Se continuar por regularizar depois dos 7 dias, o widget é suspenso enquanto o Portal permanece acessível. Assim que o pagamento for regularizado, o widget é reativado automaticamente. O método de pagamento e detalhes específicos da conta não devem ser inventados.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales' and slug = 'billing-policy';

update public.knowledge_entries
set
  content = 'Não existe fidelização e o cliente pode pedir o cancelamento a qualquer momento. Recomendamos normalmente cerca de três meses de utilização para permitir a implementação, acumular utilização real e avaliar os resultados com informação suficiente, mas esta recomendação não é obrigatória. Se já existir um período de faturação pago, o serviço mantém-se ativo até ao fim desse período e não renova depois. Não existe reembolso proporcional dos dias restantes. Quando o serviço termina efetivamente, inicia-se a janela normal de recuperação de 90 dias antes da eliminação final, salvo um pedido de eliminação de dados tratado separadamente.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-sales' and slug = 'cancellation-policy';

insert into public.knowledge_entries
  (slug, agent_key, category, title, content, visibility, status, embedding, updated_at)
values
  (
    'failed-payment-grace-period',
    'momo-sales',
    'Faturação',
    'O que acontece quando um pagamento falha',
    'Uma falha de pagamento não suspende imediatamente o Momo. Existe um período de tolerância de 7 dias e o serviço permanece ativo durante esse período. Se o pagamento continuar por regularizar depois dos 7 dias, o widget é suspenso, mas o Portal continua acessível.',
    'public', 'published', null, now()
  ),
  (
    'payment-reactivation',
    'momo-sales',
    'Faturação',
    'Reativação após regularização do pagamento',
    'Se o widget tiver sido suspenso por falta de pagamento, a regularização do pagamento reativa o widget automaticamente. O cliente não precisa de pedir manualmente a reativação.',
    'public', 'published', null, now()
  ),
  (
    'no-commitment-recommendation',
    'momo-sales',
    'Cancelamento',
    'Sem fidelização e período recomendado',
    'Não existe fidelização. O cliente pode cancelar quando quiser. Ainda assim, recomendamos normalmente cerca de três meses de utilização real para avaliar o impacto do Momo com informação suficiente. Os três meses são uma recomendação, não um período mínimo obrigatório nem um trial especial.',
    'public', 'published', null, now()
  ),
  (
    'no-prorated-refund',
    'momo-sales',
    'Cancelamento',
    'Cancelamento e dias já pagos',
    'Se o cliente cancelar durante um período de faturação já pago, o serviço continua ativo até ao fim desse período e não existe reembolso proporcional dos dias restantes.',
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

-- Support: keep the same approved policy wording so later support QA cannot
-- contradict Sales on automatic reactivation or the 7-day grace period.
update public.knowledge_entries
set
  content = 'The setup fee is paid when the customer contracts the service. The monthly subscription starts once installation is complete and the widget is published. Monthly billing is prepaid and renews automatically. A failed monthly payment has a 7-day grace period during which the service remains active. If it remains unpaid after that period, the website widget is suspended while Portal access remains available so the client can review the issue and contact Support. Once payment is regularized, the widget is reactivated automatically; the client does not need to request manual reactivation. Do not invent the payment method or an account-specific payment status.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-billing-failed-payments';

update public.knowledge_entries
set
  content = 'There is no mandatory commitment period. A client can request cancellation at any time. Momo recommends roughly three months of real use to evaluate results, but this is a recommendation rather than a minimum term or special trial. If a billing period has already been paid, service remains available until the end of that paid period and does not renew afterwards. The standard policy does not provide a prorated refund for unused days. Account-specific exceptions must be reviewed by the Momo team.',
  embedding = null,
  updated_at = now()
where agent_key = 'momo-support' and slug = 'momo-support-cancellation-billing-period';

commit;
