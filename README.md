# Momo — plataforma SaaS de chatbots de IA

**Código de referência:** v2.13 (Security & Rate-Limit Retention), em produção na Vercel segundo o estado comunicado pela equipa. **Trabalho v2.14 / Fase 1:** atualização da documentação e auditoria do versionamento SQL. A execução integral de ESLint, TypeScript e build depende da instalação das dependências; consultar a secção de validação antes de fazer deploy. A Fase 2 (monitorização operacional) ainda não está implementada.

O Momo permite configurar e instalar assistentes de IA nos websites de empresas de diferentes setores. Inclui um Admin para a equipa Momo, um Client Portal para as empresas e um widget incorporável. O modelo comercial previsto é **taxa inicial de setup + mensalidade**; preços, pagamentos e faturação ainda não foram definidos no código desta fase.

## Stack

- Next.js 16 (App Router), React 19, TypeScript e Tailwind CSS 4.
- Supabase: Auth, PostgreSQL, Supabase Storage e funções RPC; `@supabase/ssr` para sessões.
- OpenAI através de `ai` / `@ai-sdk/openai`, incluindo embeddings para a Knowledge Base.
- Resend via API HTTP para notificações opcionais.
- Vercel para deploy; Supabase Cron (`pg_cron`) para tarefas de retenção.
- Node.js >= 22 (`package.json`). Utilizar `package-lock.json` e `npm ci`.

## Estrutura do projeto

| Pasta/ficheiro | Responsabilidade |
| --- | --- |
| `app/admin` | Login, dashboard, organizações, agentes, conhecimento, widget, conversas, leads, suporte e retenção. |
| `app/portal` | Acesso dos clientes, equipa e convites, configurações, conversas, leads, Support e exportação. |
| `app/api` | API do chat Momo, chat de demonstração de agentes, widget, Support e exportação JSON. |
| `app/embed/[publicKey]`, `public/widget.js` | Iframe e script para incorporar o Widget num website externo. |
| `app/legal` | Centro Legal PT/EN; **documentos ainda em draft**. |
| `components`, `lib`, `knowledge`, `types` | UI, lógica de domínio, autenticação/segurança, IA e tipos. |
| `supabase` | Scripts SQL históricos e auditoria do esquema (ver `supabase/MIGRATIONS.md`). |
| `proxy.ts` | Atualização das sessões Supabase nas áreas `/admin` e `/portal`. |

Arquitetura e fluxos detalhados: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Variáveis de ambiente

O ficheiro [`.env.example`](./.env.example) documenta todas as variáveis explicitamente consultadas no código, sem credenciais. Configurar os valores reais nas **Environment Variables da Vercel**. Não fazer commit de `.env.local` nem de chaves privadas.

- **Essenciais para os principais fluxos em produção:** `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
- **Configuração de modelo:** `OPENAI_MODEL` é opcional; as rotas de chat têm um fallback no código.
- **URLs públicas e convites:** `NEXT_PUBLIC_APP_URL` é recomendado em produção para gerar links completos em convites e emails.
- **Emails:** `RESEND_API_KEY` e `*_NOTIFICATION_*` são opcionais. Não ativar os emails para clientes antes de verificar o domínio remetente no Resend.

`SUPABASE_SECRET_KEY` deve existir exclusivamente no backend; nunca utilizar o prefixo `NEXT_PUBLIC_` em segredos. O código de rate limiting usa uma das chaves privadas existentes para derivar hashes HMAC; não alterar nem trocar chaves sem considerar os contadores em curso.

## Preparar e validar alterações

Numa cópia do projeto (não é necessário utilizar localhost como ambiente de produção):

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Alternativamente, em Windows, macOS ou Linux, executar `node scripts/validate-v214.mjs`. O script executa os mesmos comandos em sequência, gera logs em `validation-results/` (ignorado pelo Git) e não acede à produção. Rever os logs para remover detalhes locais antes de os partilhar.

Executar por esta ordem, tratar quaisquer erros e repetir as três verificações depois de corrigir o código. `npm ci` requer acesso ao registo npm e as versões do `package-lock.json`. O build precisa de um ambiente compatível com Next.js; consultar os requisitos das rotas se surgirem erros relacionados com variáveis de ambiente. Uma análise sintática não substitui as três verificações acima.

Para verificar na Vercel sem alterar a produção: publicar primeiro num deploy **Preview**, testar os fluxos abaixo e, só depois, promover através do fluxo habitual do repositório. Não alterar variáveis ou domínios de produção sem autorização.

### Verificações funcionais antes da publicação

1. Admin: login autorizado e bloqueio de um utilizador fora de `admin_users`.
2. Portal: owner/membro, convites, permissões e isolamento entre organizações.
3. Chat Momo e Widget: resposta IA, consulta à Knowledge Base e persistência de conversas e leads; verificar transparência de IA no widget.
4. Momo Support: consulta à KB própria, criação/escalamento de tickets e resposta do Admin; envio por email apenas se Resend estiver devidamente configurado.
5. Exportação JSON acessível apenas ao owner; pedidos explícitos de eliminação continuam no fluxo Privacy.
6. Retenção: dry-run e auditoria, categoria técnica `api_rate_limits` com 48h. A limpeza manual exige o mecanismo de confirmação existente; não executar eliminações reais apenas para testar o deploy.
7. Offboarding: encerramento e reativação dentro da janela de 90 dias; o cron de expiração apenas assinala a elegibilidade, não apaga organizações.
8. Centro Legal: manter `draft`; confirmar que `app/legal/page.tsx` conserva `border-white/6`.

**Atenção:** foi identificado um potencial conflito entre a retenção temporal de dados e a janela de recuperação de 90 dias para organizações canceladas. Este comportamento ainda precisa de validação em staging; não é corrigido nesta fase de documentação.

## Versionamento SQL e segurança dos dados

O histórico SQL disponível **não constitui ainda uma reconstrução completa da base de dados**: faltam definições de tabelas/objetos já usados pelo código. Consultar `supabase/MIGRATIONS.md` antes de instalar num novo projeto. O ficheiro `supabase/v2.14-readonly-schema-inventory.sql` limita-se a consultar metadados; não modifica dados nem configurações.

**Não executar em produção, por ordem ou em bloco, os scripts SQL históricos.** Alguns redefinem funções, cron jobs e parâmetros de retenção. Uma baseline fiável deverá ser comparada com o esquema real e validada numa base de dados isolada antes de qualquer migração futura.

## Estado do produto

O código contém as funcionalidades até à v2.13, incluindo o fluxo de Privacy, retenção manual/automática e recuperação após cancelamento. A documentação legal continua em draft, a configuração final de notificações ao cliente aguarda um domínio verificado no Resend e a monitorização operacional da v2.14/Fase 2 ainda depende de decisões de arquitetura.
