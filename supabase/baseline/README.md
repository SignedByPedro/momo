# Momo v2.15 — baseline candidata para um NOVO Supabase

> **NUNCA executar estes ficheiros no Supabase de produção do Momo.** A baseline reconstruída cobre os objetos documentados, mas NÃO foi executada nem validada numa base vazia real. Não a considerar instalação pronta para produção ou recuperação de desastre até completar os testes num projeto isolado.

## Fonte e estado

- Inventário inicial de metadados: **16 tabelas, 189 colunas, 83 constraints, 55 índices, 0 policies em `public`, 12 assinaturas de funções, 2 row triggers e 7 extensões**. Há 434 registos de privilégios de tabela, agregados em comandos GRANT.
- Export exato v2.15: **12 corpos SQL**, tipos exatos de **189 colunas**, **0 policies em `storage.objects` e `storage.buckets`** na consulta efetuada, bucket `widget-assets` público, com limite **5 MiB** e PNG/JPEG/WebP. Identificados `ensure_rls` / `rls_auto_enable()` e **6 registos de default ACL**.
- `knowledge_entries.embedding` é comprovadamente `vector(1536)` no esquema atual.
- O recheck read-only de **23/09/2026, 14:28 UTC** confirmou ACLs efetivas antigas em quatro assinaturas de retenção após a aplicação relatada da v2.14a. A v2.16 inclui `../v2.16-retention-acl-remediation.sql` (APENAS produção existente, depois de preflight) e `../v2.16-readonly-retention-acl-verification.sql` (antes/depois). A causa da discrepância ainda não foi determinada. **A baseline candidata já restringe as cinco assinaturas a `service_role`/owner; não reproduz as ACLs inseguras**.

## Conteúdo e sequência para uma base NOVA e isolada

1. `00-new-environment-preflight-READONLY.sql`: confirmar Supabase novo, **zero tabelas do Momo**, `auth.users`, `storage.buckets`, `vector` em `extensions` e disponibilidade do `pgcrypto`. Ativar `vector` via Supabase Extensions antes de iniciar; confirmar que o relatório ficou conforme.
2. `01-public-tables-CANDIDATE.sql`: cria as 16 tabelas, incluindo `extensions.vector(1536)`. Não inclui dados de clientes.
3. `02-public-constraints-CANDIDATE.sql`: PK, UNIQUE, CHECK e FK, incluindo dependência de `auth.users` existente num novo Supabase.
4. `03-public-indexes-CANDIDATE.sql`: 33 índices independentes. Os restantes 22 surgem das PK/UNIQUE.
5. `04-public-rls-table-grants-CANDIDATE.sql`: ativa RLS nas 16 tabelas; reproduz os GRANTs **das tabelas** obtidos no snapshot. Sem policies públicas adicionais porque o inventário devolveu zero. Não aplicar a outras tabelas/roles do Supabase.
6. `05-public-functions-CANDIDATE.sql`: cria 11 funções da aplicação a partir das **definições exatas recebidas**, excluindo o helper gerido do event trigger. Normaliza GRANTs dentro da mesma transação. As cinco assinaturas de retenção são restringidas a `service_role` e owner, de acordo com a v2.14a; as permissões antigas da exportação NÃO são reproduzidas. As outras funções mantêm os GRANTs capturados (incluindo visibilidade da Support Knowledge Base para `anon`/`authenticated`).
7. `06-public-triggers-CANDIDATE.sql`: recria os triggers de criação automática de Agent e Widget após criação de uma organização.
8. `07-widget-assets-bucket-CANDIDATE.sql`: cria o bucket Storage **apenas num ambiente onde ainda não exista**. Público para leitura, limite 5 MiB, formatos PNG/JPEG/WebP. O código atual faz upload com `createSupabaseAdmin()` (service role), pelo que o snapshot não inclui policies de upload para visitantes.
9. `08-ensure-rls-OPTIONAL-MANUAL-REVIEW.sql`: o export mostra o event trigger `ensure_rls` com helper `rls_auto_enable`. **NÃO executar por defeito.** Novos projetos Supabase podem já o fornecer; se existir, preservar e comparar. Se faltar, requer análise e privilégios elevados antes de instalar a versão capturada. O script bloqueia a instalação se encontrar o evento.
10. `09-staging-verification-READONLY.sql`: comparar contagens, RLS, triggers, RPCs, ACLs e bucket. O resultado é uma verificação de catálogos, não um teste funcional.

**Executar os scripts individualmente pela ordem acima apenas em staging**, após rever cada resultado. Não há um script único que apague e recrie o esquema e não há `DROP`/`TRUNCATE` nestes ficheiros. Nunca executar por cima de uma base existente.

## O que não deve ser reproduzido cegamente

- **Aviso de privilégios de tabelas:** a exportação inclui GRANT de `TRUNCATE` para `anon`/`authenticated` nas tabelas públicas. `TRUNCATE` não é filtrado por policies RLS. A baseline 04 reproduz o snapshot para auditoria, mas estes grants devem ser revistos e restringidos antes de usar este conjunto para qualquer ambiente acessível. Não assumir que a RLS protege operações TRUNCATE.
- `06_default_acl` contém 6 entradas, incluindo EXECUTE por defeito em novas funções para `anon`/`authenticated`. O novo projeto já vem com os próprios defaults do Supabase, que podem variar. **Não aplicar globalmente este snapshot**; em vez disso, `05` revoga e concede ACLs explicitamente nas funções que cria.
- **Auth**: URLs de redirecionamento, provedores, SMTP, templates, configurações de segurança e utilizadores não fazem parte deste inventário. Configurar e testar separadamente; nunca copiar dados ou credenciais de produção.
- **Cron**: a produção utiliza `momo-retention-daily` às 03:15 UTC e `momo-offboarding-recovery-expiry` às 03:35 UTC. Os agendamentos são configuração operacional separada e NÃO são recriados por esta baseline. Testar funções num staging isolado e só agendar crons com autorização.
- **Storage**: a consulta devolveu zero policies em `storage.objects`/`storage.buckets`. Confirmar manualmente que isso corresponde ao ambiente pretendido; não inventar policies. O bucket público expõe ficheiros por URL, não significa que visitantes possam fazer upload.
- **Event trigger**: a `ensure_rls` pode ser gerida pela plataforma Supabase; o script opcional não a substitui.
- **Dados e seeds**: a baseline contém estrutura e metadata, não owners, organizações, tickets, conversas, chaves de API nem configurações comerciais de clientes. `data_retention_automation` é criada mas a linha de controlo `id=1` deve ser inicializada **apenas no staging**, após revisão dos valores e com `enabled=false`; não ativar crons automaticamente.
- **Policy draft e offboarding**: não altera os documentos legais, não elimina clientes, não modifica a recuperação de 90 dias nem a retenção de 48 horas de rate limits.

## Testes de aceitação antes de classificar como pronta

1. Os 00 e 09 devem apresentar as contagens esperadas sem erros.
2. Criar utilizadores **fictícios** via Auth de staging; criar organização e confirmar que os triggers produzem `agent_configs` e `widget_configs` sem duplicados.
3. Confirmar os GRANTs efetivos, inclusive que `anon` e `authenticated` não conseguem executar diretamente as cinco funções de retenção.
4. Testar embeddings `vector(1536)` para pesquisa Momo, Support e um cliente, verificando isolamento de organização.
5. Carregar e consultar imagens de teste no bucket usando a mesma via server-side do Momo; testar limite/tipos. Confirmar que visitante não consegue upload sem policy.
6. Criar dados **fictícios** para testar `consume_api_rate_limit`, dry-run, revalidação/limpeza atómica, retenção de 48 horas, e recuperação de 90 dias. **Não utilizar dados nem crons de produção.**
7. Testar permissões reais do Admin e Portal, incluindo exportação e Support; os scripts atuais não configuram Auth e Vercel.
8. Resolver separadamente o risco já identificado: a retenção periódica de conversas/leads/tickets não exclui explicitamente organizações no período de recuperação de 90 dias. **Testar a interação em staging antes de operar limpezas destrutivas gerais em produção.**

## Estado das verificações desta entrega

- Comparação programática dos metadados e das definições SQL originais, contagens e integridade ZIP (consultar entrega).
- Sem instância PostgreSQL/Supabase disponível neste ambiente: **a sintaxe em execução, as dependências, as políticas de plataforma, o comportamento dos triggers e os fluxos de aplicação NÃO foram testados numa base real**.
- Não foi executada qualquer ação no Supabase ou Vercel de produção.
