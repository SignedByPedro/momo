-- Momo v3.60 — Document Knowledge Import
-- Run once in Supabase SQL Editor, then reindex Momo Support documentation.

alter table public.knowledge_entries
  add column if not exists source_type text not null default 'manual';

alter table public.knowledge_entries
  add column if not exists source_url text;

update public.knowledge_entries
set source_type = 'manual'
where source_type is null or btrim(source_type) = '';

alter table public.knowledge_entries
  alter column source_type set default 'manual',
  alter column source_type set not null;

-- Keep the source_type constraint compatible with existing manual/website entries
-- and the new document import source. The constraint name may differ between
-- environments, so remove only CHECK constraints that reference source_type.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.knowledge_entries'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source_type%'
  loop
    execute format(
      'alter table public.knowledge_entries drop constraint %I',
      constraint_row.conname
    );
  end loop;
end $$;

alter table public.knowledge_entries
  add constraint knowledge_entries_source_type_check
  check (source_type in ('manual', 'website', 'document'));

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
  'Na área Knowledge, um Owner pode importar informação diretamente de documentos. O importador aceita ficheiros Word, Excel, CSV, PDF, PowerPoint e texto até 4 MB. Depois de escolher o ficheiro, deve carregar em Analisar documento. O Momo lê o ficheiro e propõe várias entradas de Knowledge separadas por temas ou perguntas independentes, em vez de colocar todo o documento numa única entrada. Antes de guardar, o Owner pode rever, editar, desmarcar ou cancelar cada entrada proposta. Ao carregar em Adicionar à Knowledge, as entradas selecionadas ficam Públicas, Publicadas e indexadas automaticamente. O importador não deve ser usado para inventar informação ausente no ficheiro; se uma entrada proposta estiver errada ou incompleta, deve ser corrigida ou removida antes de guardar.',
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
