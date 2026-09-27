# Momo v2.24 - Controlo de acessos e eliminação pessoal

**Nova migration de produção:** `v2.24-guarded-membership-revocation.sql`.
Cria a função `revoke_organization_membership_guarded(uuid,uuid)` com `EXECUTE` apenas para `service_role` e o owner SQL. Usa um bloqueio por organização para impedir a eliminação simultânea de todos os Owners ativos, e devolve o registo removido para restauro se o Supabase Auth recusar a eliminação.

**Ordem obrigatória:** confirmar o projeto e backup; executar **apenas** `v2.24-guarded-membership-revocation.sql` no SQL Editor; executar `v2.24-readonly-guarded-membership-verification.sql` e confirmar `true, false, false, false, true` nos cinco resultados; só depois instalar e fazer deploy da aplicação v2.24. Não executar `baseline/*` nem migrations históricas em produção. `scripts/V2.24-QA.md` documenta os testes não destrutivos e os testes manuais com contas descartáveis. Esta atualização **não** altera cobrança, estados do serviço, retenção dos dados da empresa nem o fluxo de eliminação da organização.

---

# Momo v2.23 — Tamanho configurável da janela de chat

**Nova migration de produção:** `v2.23-widget-panel-size.sql`. Acrescenta `panel_width` (390–520 px) e `panel_height` (570–760 px) a `public.widget_configs`, com defaults iguais ao tamanho anterior. As constraints na base de dados impedem tamanhos fora destes limites, mesmo que se contorne o formulário. Os dados de widget existentes conservam o tamanho original.

**Ordem obrigatória:** (1) confirmar que estás no projeto Supabase certo e guardar backup adequado; (2) executar apenas `v2.23-widget-panel-size.sql` no SQL Editor; (3) confirmar que ambas as colunas existem, e só depois (4) instalar/deploy da aplicação v2.23. Não executar `baseline/*` ou voltar a executar migrations históricas em produção. O Portal e Admin partilham a mesma configuração de widget. Em dispositivos com ecrã menor, a apresentação ajusta-se ao espaço visível sem alterar os valores guardados.

---

# Histórico — v2.16 — Retention ACL Remediation (recheck de produção)

**Estado em 23/09/2026, 14:28 UTC:** o utilizador executou `v2.15-readonly-retention-acl-recheck.sql` em produção. O resultado devolveu **1 de 5 assinaturas** com ACL correta: apenas `retention_dry_run_report` de 5 parâmetros bloqueava `anon`/`authenticated`. A assinatura legacy de 4 parâmetros, `retention_execute_cleanup`, `retention_mark_terminated_clients_due` e `retention_run_automatic_cycle` mantinham grants explícitos `EXECUTE` a esses roles. `PUBLIC` não tinha `EXECUTE` nas cinco; `service_role` tinha acesso nas cinco. O recheck é posterior ao relato de v2.14a aplicada com PASS, pelo que existe uma **discrepância não explicada**; uma v2.14a realmente concluída nesta mesma base sem alterações de ACL posteriores não deveria apresentar estes resultados. Confirmar no Dashboard que o projeto selecionado é o Momo de produção e guardar os resultados anteriores e posteriores para a auditoria. Não inferir causa sem evidências.

**Migration nova:** `v2.16-retention-acl-remediation.sql`. Só altera `EXECUTE` nas quatro assinaturas afetadas, depois de preflight das cinco assinaturas e dos dois cron jobs; verifica todas as cinco ACLs e os direitos dos roles dos cron jobs antes do COMMIT. É transacional e idempotente; não altera corpo das funções, cron, dados nem configurações. `v2.16-readonly-retention-acl-verification.sql` faz pré e pós-verificação de leitura, incluindo cron e estado da automação.

**Procedimento:** (1) rever o projeto Supabase selecionado, guardar backup apropriado, executar o script read-only e confirmar as quatro linhas `REVIEW` e a linha de 5 parâmetros `PASS`; confirmar 2 cron jobs `PASS`. (2) Executar somente a migration v2.16. Se houver erro `V216_*`, parar: toda a transação reverte e é necessário inspecionar o estado real sem forçar comandos. (3) Repetir a verificação: esperar **5 `PASS`** nas RPCs, **2 `PASS`** nos crons, e estado do interruptor inalterado. (4) Realizar **só dry-run** no Admin; não testar eliminação destrutiva em produção. (5) Observar próximos resultados agendados sem executar manualmente a função automática para testar.

A baseline v2.15 em `baseline/` **continua candidata** e já define as cinco assinaturas de retenção com privilégios restritos, independentemente da captura antiga. Não instalar a baseline em produção. O risco de grants de `TRUNCATE` para `anon`/`authenticated` nas tabelas é uma auditoria de segurança separada; RLS não restringe `TRUNCATE`.

---

# Histórico anterior — v2.15 (baseline candidata)

**v2.15 é uma baseline CANDIDATA para um NOVO ambiente**, não uma migration para o Supabase existente. A numeração de versões futuras continua sequencial sem letras; `v2.14a` conserva o nome histórico porque já foi aplicada.

O proprietário confirmou: v2.14a instalada, script de 5 RPCs e 2 cron jobs com PASS, dry-run funcional. Recebidos dois inventários de produção: o primeiro de estrutura e o segundo de **corpos exatos das 12 funções, 189 tipos exatos de colunas, configuração Storage, event trigger e default ACL**.

**Atualização v2.16:** o recheck de 23/09/2026 às 14:28 UTC confirmou a discrepância nas quatro RPCs. Consultar a secção v2.16 acima; não considerar o hardening v2.14a efetivo até obter cinco PASS em verificação pós-correção.

A pasta `baseline/` já inclui a estrutura de tabelas, constraints, índices, ACLs de tabela, 11 definições de funções da aplicação, 2 triggers, bucket `widget-assets`, helper/event trigger opcional e testes de catálogo. O `baseline/README.md` documenta a ordem em staging, dependências e riscos. Não há alteração ao código da aplicação nem motivo para um novo deploy Vercel nesta entrega.

Risco de segurança adicional no snapshot: os grants de tabela incluem `TRUNCATE` para `anon`/`authenticated`, e RLS não filtra TRUNCATE. O candidato 04 reproduz esses privilégios históricos apenas para auditoria; rever antes de instalar num ambiente acessível.

Apenas o **histórico SQL versionado** está preservado; não reaplicar migrations históricas em produção. Não executar `baseline/*` em produção, nem instalar a baseline em staging sem confirmar o preflight.

---

# Momo — auditoria do histórico Supabase (v2.14/Fase 1)

**Estado (23/09/2026):** inventário do código v2.13 comparado com os **metadados de produção fornecidos pelo proprietário**. Esses metadados NÃO são um dump completo da estrutura nem contêm os corpos SQL das funções, políticas de Storage ou a configuração Auth. Ainda não permitem uma baseline de reconstrução testada. A v2.14a adiciona exclusivamente uma migration transacional para restringir EXECUTE nas funções administrativas de retenção.

## 1. Scripts existentes

| Ficheiro | Âmbito observado no SQL | Observações |
| --- | --- | --- |
| `v0.8-admin.sql` | `admin_users`, alterações e índices de leads/conversas/mensagens. | Depende de tabelas anteriores que não são criadas neste histórico. |
| `v1.0-website-analysis.sql` | `website_analyses` e índice. | Depende da tabela preexistente `organizations`. |
| `v1.2-momo-knowledge.sql` | Extensão `vector`, `knowledge_entries` e `match_momo_knowledge`. | Confirmar configuração de `extensions` e alterações posteriores antes de reconstruir. |
| `v2.7-portal-support.sql` | `support_tickets` e `support_ticket_messages`. | Depende de organizações e utilizadores Auth. |
| `v2.7.1-support-hardening.sql` | `match_portal_support_knowledge` e reforços do Support. | Dependências anteriores obrigatórias. |
| `v2.8-privacy-controls.sql` | Ajustes SQL do fluxo Privacy. | A versão documental Legal v2.8 está no código e não corresponde a uma migration autónoma. |
| `v2.9-retention-dry-run.sql` | `data_retention_runs` e relatório inicial de elegibilidade. | A versão de quatro parâmetros do relatório foi posteriormente ampliada. |
| `v2.10-retention-cleanup.sql` | Limpeza manual transacional e controlos de auditoria. | Não executar sobre dados reais para testar histórico. |
| `v2.11-retention-automation.sql` | `data_retention_automation`, funções de ciclo e cron 03:15 UTC. | O script inclui `ON CONFLICT DO UPDATE` para parâmetros de retenção e reagendamento do cron; **não reaplicar em produção**. |
| `v2.12-client-offboarding-recovery.sql` | Estados da organização, recuperação 90 dias, cron de marcação 03:35 UTC. | Não apaga automaticamente organizações; também redefine a função automática e metadados. |
| `v2.13-security-rate-limit-retention.sql` | `api_rate_limits`, função `consume_api_rate_limit` e integração de 48h no motor existente. | A nova assinatura do dry-run (5 parâmetros) já é `service_role`-only; as funções antigas mantiveram grants explícitos a `anon`/`authenticated` em produção. |
| `v2.14-readonly-schema-inventory.sql` | Inventário de metadados sem alterações. | Executado pelo proprietário na produção e revisto na v2.14a. **Não** é uma migration. |
| `v2.14a-retention-rpc-hardening.sql` | Restringe EXECUTE de cinco assinaturas administrativas ao `service_role`/owner sem alterar funções, dados, crons ou configurações. | Executar apenas depois da verificação e análise do `cron.job.username`/comando esperado. A transação falha e reverte integralmente perante divergências. |
| `v2.14a-retention-rpc-verification.sql` | Verificação apenas de leitura: acesso efetivo a cada função, cron e estado operacional. | Executar antes e depois da migration; **não** invoca nenhuma função que limpe dados. |

Os ficheiros existentes têm nomes de versões, mas **não** há neste ZIP um histórico completo de migrations com checksums, esquema inicial ou aplicação gerida automaticamente pelo Supabase CLI. Não assumir uma cronologia executável apenas pela ordenação alfabética dos nomes.

## 2. Lacunas identificadas no código

Comparando as referências `.from(...)` do TypeScript com os `CREATE TABLE` dos scripts SQL incluídos, faltam definições versionadas pelo menos de:

- `organizations`, `organization_members`, `agent_configs`, `widget_configs`;
- `conversations`, `messages`, `leads`, `client_history`.

A migration `v1.2-momo-knowledge.sql` cria `knowledge_entries` apenas com a estrutura inicial do Momo comercial. O código atual também consulta `organization_id`, `source_type` e `source_url` nessa tabela, sem que a evolução dessas colunas esteja versionada neste ZIP.

O projeto também utiliza `match_client_knowledge` (`lib/knowledge/client-knowledge.ts`) e o bucket Supabase Storage `widget-assets` (configuração e uploads de imagens do Widget); não foram encontrados neste histórico os respetivos comandos de criação. Comparar igualmente índices, constraints, triggers, RLS/policies, grants, sequências e funções auxiliares do esquema existente; um conjunto de `CREATE TABLE` isolado não garante compatibilidade nem isolamento multi-tenant.

## 3. Evidência recolhida do Supabase em produção (23/09/2026)

Inventário read-only fornecido pelo proprietário: 16 tabelas públicas, 189 colunas, 83 constraints, 55 índices, **0 policies em `public`**, 12 assinaturas de funções, 2 triggers (configuração automática de Agent/Widget), 7 extensões e 434 entradas de `table_grants`. As 16 tabelas têm RLS ativo; **RLS ativo sem policies não implica acesso público** (os pedidos normais ficam bloqueados, embora `service_role` possa ignorar RLS). O inventário não cobre as policies do Storage nem os corpos SQL das funções.

Foram ainda confirmados dois cron jobs ativos: `momo-retention-daily` (`15 3 * * *`, 03:15 UTC) e `momo-offboarding-recovery-expiry` (`35 3 * * *`, 03:35 UTC). O bucket `storage.buckets.id = 'widget-assets'` existe e está marcado `public = true`. A listagem inicial de cron **não continha** o campo `username` nem o comando; consultar ambos através do ficheiro de verificação antes de aplicar o hardening.

O inventário confirma `SECURITY DEFINER` e ACL explícitas para cinco assinaturas de retenção:

| RPC | `anon` / `authenticated` na captura inicial | Acesso esperado após v2.14a |
| --- | --- | --- |
| `retention_dry_run_report(timestamptz × 4)` (legado) | EXECUTE concedido | Apenas `service_role` e owner |
| `retention_dry_run_report(timestamptz × 5)` (v2.13) | Sem EXECUTE | Apenas `service_role` e owner |
| `retention_execute_cleanup(uuid, uuid, text)` | EXECUTE concedido | Apenas `service_role` e owner |
| `retention_run_automatic_cycle()` | EXECUTE concedido | Apenas `service_role` e owner; cron preservado |
| `retention_mark_terminated_clients_due()` | EXECUTE concedido | Apenas `service_role` e owner; cron preservado |

`consume_api_rate_limit(text, integer, integer)` já é `service_role`-only; a v2.14a **não** a modifica. Igualmente não altera grants nem lógica de Knowledge Base e Support. A análise da configuração de `SECURITY DEFINER`/`search_path` e dos privilégios de outras funções deve ser uma auditoria de segurança separada.

## 4. Aplicação segura da v2.14a (somente grants)

1. Executar `v2.14a-retention-rpc-verification.sql` no SQL Editor e guardar os três resultados: acessos por assinatura, cron (`username`, resultado booleano da comparação do comando, horário, atividade) e estado da automação. Verificar que existem cinco assinaturas e dois cron jobs com configurações esperadas. Não partilhar comandos SQL com segredos, caso tenham sido personalizados.
2. Após revisão e backup adequado, executar apenas **`v2.14a-retention-rpc-hardening.sql`** uma vez na produção. A migration é transacional e valida funções e cron antes e depois da mudança. Se der `V214A_*`, não forçar nem alterar crons; rever a configuração real antes de prosseguir. Uma falha reverte toda a transação.
3. Reexecutar `v2.14a-retention-rpc-verification.sql`: as cinco linhas têm de indicar `PASS` (`anon=false`, `authenticated=false`, `public=false`, `service_role=true`). Ambos os jobs têm de indicar `PASS`; o interruptor `enabled` da retenção deve continuar inalterado.
4. No Admin → Retenção, efetuar **só** um dry-run (cria histórico mas não elimina dados). Confirmar que funciona com a assinatura v2.13 de cinco parâmetros e a categoria de rate limits. Não usar limpeza manual destrutiva como teste de grants.
5. Consultar os resultados normais dos próximos ciclos agendados do `pg_cron` e o histórico de retenção. Se o interruptor estiver desligado, esperar estado `disabled`, não uma eliminação. O cron de offboarding só altera estados de organizações expiradas, conforme o comportamento já existente.
6. Guardar data/hora, resultado do script e hash da migration no vosso histórico de aplicação. **Não** reaplicar migrations antigas. Como a alteração é apenas SQL, não necessita de um novo build/deploy na Vercel; conservar o SQL novo no projeto e no controlo de versões.

## 5. Procedimento seguro para levantar o esquema real

1. Criar um backup/snapshot adequado de produção pelo procedimento habitual do Supabase. **Não compartilhar credenciais nem exportações com dados de clientes.**
2. No Supabase SQL Editor, executar **apenas** `v2.14-readonly-schema-inventory.sql`, que lê metadados do catálogo PostgreSQL sem consultar linhas de clientes. Guardar o resultado num local privado. O acesso aos catálogos depende das permissões da conta.
3. Confirmar separadamente a configuração dos agendamentos do Supabase Cron, os nomes dos buckets e as políticas de Storage. Existem consultas opcionais (comentadas) no ficheiro de inventário.
4. Num ambiente de desenvolvimento/staging isolado, obter um **dump apenas de esquema** (sem linhas e sem credenciais no ficheiro) por ferramentas aprovadas, depois de inspecionar definições de funções/triggers para eventuais segredos hardcoded. Uma listagem de metadados, por si só, não basta para reconstruir a base.
5. Comparar o dump real com os ficheiros SQL existentes, especialmente as definições finais das funções `retention_dry_run_report` (4 e 5 argumentos), `retention_execute_cleanup`, `retention_run_automatic_cycle`, `consume_api_rate_limit`, as permissões e os dois cron jobs.
6. Só depois propor uma baseline inicial **para novos ambientes**, com esquema completo, extensões, políticas e configurações de Storage verificadas. Testar do zero numa base vazia, com testes de autenticação, permissões e dados não reais; não aplicar essa baseline à produção já existente.
7. Para futuras alterações de produção, usar migrations novas, pequenas e revistas, seguidas de validação de integridade e regressão. Manter registo de data de aplicação, hash do SQL e estado de cada ambiente, após confirmar o histórico real do Supabase.

## 6. Riscos conhecidos que não foram alterados nesta fase

- A retenção por idade de conversas/leads/tickets poderá abranger dados de organizações em recuperação de 90 dias, porque a SQL existente não as exclui explicitamente. Testar em staging antes de operações destrutivas e definir uma correção funcional numa versão separada, se for necessário.
- A v2.11 pode repor `schedule_cron`, `schedule_timezone`, `policy_version` e períodos de retenção ao ser reaplicada, apesar de preservar o campo `enabled` no seu `ON CONFLICT`.
- As migrations posteriores usam `CREATE OR REPLACE FUNCTION` e a v2.13 mantém a assinatura antiga de quatro argumentos do dry-run. A v2.14a restringe os seus grants, mas **não elimina** essa assinatura enquanto não forem inventariadas as dependências de uma futura baseline.
- O rate limiter em produção usa contadores de 48 horas desde `updated_at`; não os confundir com logs de incidentes de segurança. A política legal continua em `draft`.

## 7. Critérios de aceitação da futura baseline

Uma base **vazia e isolada** deve permitir: criar o Admin e uma organização; associar owner/membros com RLS correta; configurar Agent e Widget; criar e consultar Knowledge Base com pesquisa vetorial; persistir conversas e leads sem fuga cross-tenant; usar Support e exportação; executar dry-run sem eliminar dados; verificar cron e offboarding sem avançar artificialmente o estado de produção. A configuração do Supabase Auth/Storage/Cron também tem de ser documentada fora do dump de tabelas, quando aplicável.

**Nota histórica da v2.14a:** este foi o script de permissões daquela entrega. Em v2.16, aplicar somente a migration de remediação após preflight read-only, sem reaplicar migrations históricas.
