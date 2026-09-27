-- Momo v1.2 — Knowledge Base / RAG
-- Run once in Supabase SQL Editor.

create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  agent_key text not null default 'momo-sales',
  category text not null default 'general',
  title text not null,
  content text not null,
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_entries enable row level security;

create index if not exists knowledge_entries_agent_status_idx
  on public.knowledge_entries (agent_key, status, visibility);

create index if not exists knowledge_entries_embedding_hnsw_idx
  on public.knowledge_entries
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_momo_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.34,
  match_count int default 6
)
returns table (
  id uuid,
  category text,
  title text,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    k.id,
    k.category,
    k.title,
    k.content,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_entries k
  where k.agent_key = 'momo-sales'
    and k.visibility = 'public'
    and k.status = 'published'
    and k.embedding is not null
    and 1 - (k.embedding <=> query_embedding) >= match_threshold
  order by k.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$$;

revoke all on function public.match_momo_knowledge(extensions.vector, double precision, integer) from public, anon, authenticated;
grant execute on function public.match_momo_knowledge(extensions.vector, double precision, integer) to service_role;

-- Confirmed product information from the current Momo project.
-- Embeddings are intentionally NULL at seed time. After running this SQL,
-- open /admin/knowledge and click "Reindexar conhecimento" once.

insert into public.knowledge_entries (slug, category, title, content, visibility, status)
values
  (
    'momo-overview',
    'Serviço',
    'O que é o Momo',
    'Momo é um serviço de IA para empresas focado em conversas com clientes e automação de tarefas repetitivas de atendimento. Consoante a configuração e as integrações de cada cliente, pode responder com informação da empresa, orientar clientes, captar leads, tratar pedidos comuns e encaminhar situações para uma pessoa.',
    'public',
    'published'
  ),
  (
    'monthly-service-model',
    'Pricing',
    'Modelo comercial mensal',
    'O Momo é comercializado como um serviço recorrente com mensalidade, e não como uma compra única. O serviço continua ativo e pode incluir utilização de IA, manutenção, configuração e integrações consoante a solução contratada.',
    'public',
    'published'
  ),
  (
    'pricing-depends-on-scope',
    'Pricing',
    'Como é definido o preço',
    'Ainda não existe um preço único aplicável a todas as empresas. O valor depende sobretudo do volume de utilização, das funcionalidades pretendidas e das integrações necessárias. O Momo não deve inventar um valor final; quando necessário, deve recolher um contacto para a equipa preparar uma proposta adequada.',
    'public',
    'published'
  ),
  (
    'implementation-overview',
    'Implementação',
    'Como funciona a implementação',
    'A implementação começa por perceber o negócio e aquilo que a empresa quer automatizar. Depois configura-se o Momo com a informação relevante da empresa, define-se o comportamento esperado e coloca-se o assistente no canal acordado. Integrações com sistemas externos podem ser acrescentadas quando fizerem sentido para o caso concreto.',
    'public',
    'published'
  ),
  (
    'supported-languages',
    'Produto',
    'Idiomas suportados nesta fase',
    'Nesta fase o Momo suporta Português e Inglês. A limitação é intencional para permitir controlar a qualidade do vocabulário e detetar problemas antes de acrescentar outros idiomas.',
    'public',
    'published'
  ),
  (
    'public-website-analysis',
    'Produto',
    'Análise de websites públicos',
    'O Momo comercial consegue analisar um conjunto limitado de páginas HTML públicas de um website partilhado pelo potencial cliente para identificar oportunidades específicas para esse negócio. A análise não é garantidamente exaustiva e pode obter menos informação em sites muito dependentes de JavaScript, bloqueados ou com conteúdo autenticado.',
    'public',
    'published'
  ),
  (
    'integrations-case-by-case',
    'Integrações',
    'Integrações com sistemas externos',
    'As integrações dependem dos sistemas usados pelo cliente e das funcionalidades necessárias. O Momo não deve afirmar que existe uma integração pronta com uma plataforma específica sem essa integração estar confirmada. Quando uma integração ainda não estiver confirmada, deve dizer que a equipa precisa de analisar o sistema em causa.',
    'public',
    'published'
  ),
  (
    'human-escalation',
    'Atendimento',
    'Encaminhamento para humano',
    'O produto é pensado para encaminhar para a equipa situações que o assistente não consiga resolver ou em que seja necessária intervenção humana. A forma exata de encaminhamento depende da implementação do cliente e das integrações configuradas.',
    'public',
    'published'
  ),
  (
    'lead-follow-up',
    'Vendas',
    'Contacto depois de demonstrar interesse',
    'Quando um potencial cliente demonstra interesse, o Momo pode recolher o nome e um contacto preferido, email ou telefone, para que a equipa faça o seguimento e prepare uma solução mais concreta. Não é necessário exigir email e telefone ao mesmo tempo.',
    'public',
    'published'
  ),
  (
    'cancellation-policy',
    'Políticas',
    'Política de cancelamento',
    'POR DEFINIR: decidir prazo de aviso, existência ou não de fidelização, momento em que o serviço termina e tratamento de valores já faturados.',
    'internal',
    'draft'
  ),
  (
    'privacy-data-processing',
    'Políticas',
    'Privacidade e tratamento de dados',
    'POR DEFINIR: documentar que dados são tratados, finalidades, base contratual, subprocessadores, localização de dados, responsabilidades entre a nossa empresa e o cliente e informação a apresentar aos utilizadores finais.',
    'internal',
    'draft'
  ),
  (
    'data-retention-policy',
    'Políticas',
    'Retenção e eliminação de conversas',
    'POR DEFINIR: decidir durante quanto tempo são guardadas conversas, leads, logs e knowledge bases, e qual é o processo de eliminação a pedido do cliente.',
    'internal',
    'draft'
  ),
  (
    'support-sla-policy',
    'Políticas',
    'Suporte e tempos de resposta',
    'POR DEFINIR: decidir canais de suporte, horários, prioridades, tempos de resposta e se existem níveis diferentes de suporte consoante o plano.',
    'internal',
    'draft'
  ),
  (
    'billing-policy',
    'Políticas',
    'Faturação e pagamentos',
    'POR DEFINIR: decidir periodicidade da faturação, métodos de pagamento, impostos, data de cobrança, tratamento de falhas de pagamento e alterações de preço.',
    'internal',
    'draft'
  ),
  (
    'onboarding-timeline',
    'Implementação',
    'Prazo de onboarding',
    'POR DEFINIR: estabelecer um intervalo realista de implementação para soluções simples e como comunicar prazos quando existem integrações ou requisitos personalizados.',
    'internal',
    'draft'
  )
on conflict (slug) do nothing;
