-- Momo v3.61 — Large / visual document imports
-- Creates a private temporary bucket used for direct browser uploads.

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'knowledge-imports',
  'knowledge-imports',
  false,
  26214400
)
on conflict (id) do update set
  public = false,
  file_size_limit = 26214400;

-- Update Momo Support documentation for the revised document flow.
insert into public.knowledge_entries (
  slug,
  agent_key,
  category,
  title,
  content,
  visibility,
  status
)
values (
  'momo-support-document-knowledge-import',
  'momo-support',
  'Knowledge Base',
  'Importar Knowledge através de documentos',
  'Na área Knowledge, um Owner pode importar informação diretamente de documentos. O importador aceita ficheiros Word, Excel, CSV, PDF, PowerPoint e texto até 25 MB. O ficheiro é enviado diretamente do browser para armazenamento temporário privado no Supabase, sem passar pelo limite de upload das Functions da Vercel. Depois da análise, o ficheiro temporário é removido. PDFs visuais, portfolios e scans são analisados também através das imagens das páginas. Depois de escolher o ficheiro, deve carregar em Analisar documento. O Momo lê o ficheiro e propõe várias entradas de Knowledge separadas por temas ou perguntas independentes, em vez de colocar todo o documento numa única entrada. Antes de guardar, o Owner pode rever, editar, desmarcar ou cancelar cada entrada proposta. Ao carregar em Adicionar à Knowledge, as entradas selecionadas ficam Públicas, Publicadas e indexadas automaticamente. O importador não deve ser usado para inventar informação ausente no ficheiro; se uma entrada proposta estiver errada ou incompleta, deve ser corrigida ou removida antes de guardar.',
  'public',
  'published'
)
on conflict (slug) do update set
  category = excluded.category,
  title = excluded.title,
  content = excluded.content,
  visibility = excluded.visibility,
  status = excluded.status,
  embedding = null,
  updated_at = now();
