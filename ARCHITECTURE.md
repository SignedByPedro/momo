# Momo — arquitetura técnica (referência v2.13)

Este documento descreve o **código incluído na cópia v2.13**, não garante a configuração efetiva da base de dados ou das variáveis de produção. Foi revisto para a v2.14/Fase 1, sem alterar os fluxos funcionais.

## Visão geral

```text
Website da empresa                          Equipa Momo / Empresa cliente
    public/widget.js                            /admin  /portal
         │                                         │       │
         ▼                                         ▼       ▼
 /embed/[publicKey]                          Next.js App Router
         │                                         │
 /api/widget/[publicKey]/chat           Server Actions / rotas /api
         └───────────────┬─────────────────────────┘
                         ▼
               lib (IA, segurança,
               autenticação, domínio)
                  │       │      │
                  ▼       ▼      ▼
               OpenAI  Supabase Resend
                        │
            Auth / PostgreSQL / Storage
                        │
                   Supabase Cron
```

### Camadas e responsabilidade

- **Web/UI:** `app/` (Next.js App Router), `components/` e `app/globals.css`. `public/widget.js` monta um iframe servido por `/embed/[publicKey]`; `components/widget` contém a experiência do chat incorporado. O widget apresenta a identificação de assistente de IA.
- **API:** `app/api/chat/route.ts` (chat comercial do Momo); `app/api/admin/clients/[id]/agent-chat/route.ts` (teste do agente); `app/api/widget/[publicKey]/chat/route.ts` (widget); `app/api/portal/support/chat/route.ts` (Support); `app/api/portal/data-export/route.ts` (exportação).
- **Admin:** `app/admin/(dashboard)` e `lib/admin`; autenticação Supabase e whitelist `admin_users` em `lib/admin/auth.ts`.
- **Client Portal:** `app/portal/(dashboard)` e `lib/portal`; sessão validada no servidor e associação à organização em `organization_members`; permissões de `client_owner` e `client_member`.
- **Segurança:** `proxy.ts`/`lib/supabase/proxy.ts` renovam a sessão nas áreas protegidas. `lib/security/request-security.ts` valida dimensões e estrutura dos pedidos, aplica rate limits em produção através da RPC `consume_api_rate_limit` e utiliza chaves HMAC para identificar contadores sem guardar o IP em texto claro na chave.
- **Acesso à base de dados:** `lib/supabase/server.ts`, `client.ts` e `admin.ts`. O cliente administrativo utiliza `SUPABASE_SECRET_KEY` no servidor, após validação explícita de identidade/permissões nos fluxos protegidos. Rever cada novo endpoint para não expor dados de outras organizações.

## Agentes, conhecimento e comunicação

- **IA:** `@ai-sdk/openai` + `ai` em rotas de chat; prompts em `lib/ai/prompts/`. O modelo pode ser configurado com `OPENAI_MODEL`.
- **Knowledge Base:** `knowledge_entries`, embeddings OpenAI `text-embedding-3-small` e funções PostgreSQL de pesquisa vetorial. A pesquisa do cliente usa `match_client_knowledge`; a do Momo usa `match_momo_knowledge`; o Support usa `match_portal_support_knowledge`. O código de website analysis encontra-se em `lib/web/website-analysis.ts`.
- **Dados de conversa:** `conversations`, `messages` e `leads`; o widget tem persistência própria em `lib/widget/conversation-persistence.ts`. O Portal e o Admin filtram os recursos pelo contexto autorizado da organização.
- **Configuração:** `organizations`, `organization_members`, `agent_configs`, `widget_configs`; avatares e imagens do widget no bucket Supabase Storage `widget-assets`.
- **Support:** Knowledge Base específica no Portal, `support_tickets` e `support_ticket_messages`, ações de Admin e Portal, escalamento e notificações em `lib/notifications/support-email.ts`.
- **Notificações:** `lib/notifications/lead-email.ts` e `support-email.ts` chamam a API HTTP do Resend quando há configuração; o envio de resposta ao cliente requer um remetente verificado antes da ativação efetiva.

## Fluxos de privacidade, retenção e encerramento

1. **Exportação:** `/api/portal/data-export`, disponível ao owner autenticado, recolhe dados da respetiva organização e devolve JSON.
2. **Eliminação solicitada pelo cliente:** processo Privacy iniciado no Portal, separado do cancelamento normal do serviço.
3. **Retenção temporal:** o Admin (`app/admin/(dashboard)/retention`) usa `retention_dry_run_report` e regista os resultados em `data_retention_runs`; a limpeza manual chama `retention_execute_cleanup` depois das validações exigidas (incluindo prazo de 15 minutos, confirmação escrita e revalidação transacional).
4. **Retenção automática:** `data_retention_automation.enabled` controla `retention_run_automatic_cycle`, agendado no Supabase Cron `momo-retention-daily` para **03:15 UTC**. A categoria `api_rate_limits` usa **48 horas desde `updated_at`**.
5. **Cancelamento normal:** a organização pode ser reativada durante **90 dias**. O cron `momo-offboarding-recovery-expiry` (**03:35 UTC**) chama `retention_mark_terminated_clients_due` e apenas marca `purge_due` após o prazo; o apagamento final requer intervenção do Admin.

**Ponto por validar:** as queries de retenção por idade não excluem explicitamente todas as organizações que se encontram dentro da janela de recuperação. Antes de ativar ou executar limpeza destrutiva num cenário com organizações canceladas, testar esta interação numa base de dados isolada e definir o comportamento esperado. Não foi modificada na v2.14/Fase 1.

## Ambiente de produção e observabilidade

O deploy principal corre na Vercel, com Supabase externo. Configurar apenas as variáveis listadas em `.env.example`; segredos só no servidor. Logs das rotas e ações surgem nos logs da Vercel, os de retenção no Supabase e no histórico `data_retention_runs`. **Não existe ainda um painel operacional centralizado ou um sistema de alertas de incidentes implementado**: corresponde à Fase 2 da v2.14, a discutir antes de escolher fornecedores e alterar a arquitetura.

## Reconstrução e dependências de esquema

Os SQL históricos incluídos em `supabase/` não representam o esquema completo atualmente consumido pelo código. Estão em falta várias definições iniciais, a função `match_client_knowledge` e a configuração do bucket `widget-assets`. O plano de auditoria e o levantamento de metadados de leitura estão em [`supabase/MIGRATIONS.md`](./supabase/MIGRATIONS.md). Não reaplicar scripts históricos na base de produção.
