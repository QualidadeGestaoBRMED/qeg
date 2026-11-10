# Board Beacon

Ferramenta do rito de priorizacao da SOTEC, feito com cada area cliente. Tem duas telas:

- **Rito** (tela principal): quadro da area (backlog, discovery, pronto para decidir, execucao), produtos, atas e o modo rito, que conduz a reuniao em 5 passos (execucao, discovery, triagem, escolha, ata). A priorizacao tem dois momentos: alcance, impacto e confianca (pre-score) decidem qual discovery fazer; o discovery traz o esforco, e o RICE completo decide o que entra em execucao.
- **Execucao**: monitor de sprint do Pipefy (cards das fases configuradas, por responsavel e por area).

## Stack

- React + Vite
- TypeScript
- Tailwind CSS
- Vitest

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

O app abre em `http://localhost:8080`.

## Banco do rito (Neon)

O rito guarda itens, produtos, movimentos e atas em Postgres. Em desenvolvimento, use Postgres local sem SSL. Em Preview e produção, configure `DATABASE_URL` com a URL pooled do Neon (hostname com `-pooler`) e `sslmode=verify-full`. O pool de `pg` é criado uma vez por instância serverless aquecida, com no máximo duas conexões; o pooler do Neon absorve a quantidade de conexões das instâncias. Essa opção mantém a API existente baseada em `pg` e suas transações, sem migrar para `@neondatabase/serverless` e adaptar os fluxos de transação.

Defina `DATABASE_URL` no `.env` local e na variável do ambiente escolhido na Vercel. Atualize Preview e Production separadamente, cada um com sua URL pooled do Neon e `sslmode=verify-full`. `scripts/db-setup.mjs` usa a mesma validação: remota requer `sslmode=verify-full`, local desativa SSL. Configure a URL antes de rodar:

```bash
npm run db:setup              # tabelas, areas e produtos do Suporte
npm run db:setup -- --exemplos # idem + itens de exemplo do Suporte
```

Ordem de atualização por ambiente:

1. Escolha Preview ou Production e atualize `DATABASE_URL` naquele ambiente com sua URL pooled do Neon e `sslmode=verify-full`.
2. Só depois de salvar a variável, faça o deploy para esse ambiente.
3. Valide o carregamento do Rito após publicar.
4. Se a conexão falhar, reverta o deployment desse mesmo ambiente, corrija a variável nele e tente novamente com a verificação TLS habilitada.

Ao validar em Preview, não altere Production.

O codigo do rito fica em `src/features/rito/` (regras em `regras.ts`) e a API em `api/_lib/rito.ts` (`POST /api/rito`).

## Deploy e operação

### Ambientes

| Ambiente Vercel | Branch Neon (projeto `rito`) |
| --- | --- |
| Preview | `dev` |
| Production | `main` |

Cada ambiente da Vercel tem sua própria `DATABASE_URL`, apontando para a branch Neon da tabela acima. Nunca use a URL de `main` em Preview.

### Variáveis de ambiente

Configure na Vercel (por ambiente) só os nomes listados em `.env.example`; os valores ficam no painel, nunca no repositório.

- Obrigatórias em Production e Preview: `DATABASE_URL`, `PIPEFY_TOKEN`, `AUTH_USERNAME`, `AUTH_PASSWORD`, `SESSION_SECRET`.
- Opcionais (têm default): `VITE_PIPEFY_ACTIVE_PHASES`, `VITE_PIPEFY_PRIORITIZED_PHASES`, `VITE_PIPEFY_PIPES`, `VITE_RESPONSIBLE_FIELDS`, `VITE_PROJECT_AREA_FIELDS`, `VITE_NON_PERSON_NAMES`, `VITE_NON_PERSON_KEYWORDS`.
- Só para scripts de vídeo em desenvolvimento: `FFMPEG`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

A API (`DATABASE_URL`) usa a URL pooled do Neon com `sslmode=verify-full`.

### Deploy na Vercel

1. Atualize as variáveis do ambiente alvo (Preview ou Production).
2. Aplique as migrations na branch Neon correspondente (abaixo) antes do deploy: o código novo pode depender do schema.
3. Faça o deploy: pull requests geram Preview; Production sai da `main`.
4. Valide o carregamento do Rito. Se falhar, reverta o deployment desse ambiente.

### Migrations

Migrations ficam em `db/migrations/NNNN_nome.sql` (número crescente, ex.: `0002_adiciona_coluna.sql`; versões duplicadas são rejeitadas). Cada arquivo roda em uma transação e é registrado em `schema_migrations`; rodar de novo não reaplica o que já foi aplicado.

1. Crie o arquivo com o próximo número.
2. Rode localmente contra um Postgres local: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rito npm run db:migrate`.
3. Em Neon, use a URL **direta** (sem `-pooler`) com `sslmode=verify-full`; o migrador exige só `sslmode=verify-full` em conexão remota. Quem recusa host sem `-pooler` é a API, que continua usando a URL pooled.
4. Aplique primeiro na branch `dev`; só depois de validar, em `main`.

`npm run db:setup` continua disponível para criar o schema inicial e os dados base.

### Resetar a branch `dev` do Neon a partir da `main`

Descrição do procedimento; execute só com o responsável pelo banco.

1. No console do Neon, projeto `rito`, abra a branch `dev`.
2. Use "Reset from parent" (pai: `main`). Isso descarta tudo o que existe em `dev` e a recria com o estado atual de `main`.
3. Se a connection string mudar, atualize `DATABASE_URL` de Preview na Vercel e refaça o deploy de Preview.
4. Rode `npm run db:migrate` na `dev` para aplicar migrations pendentes ainda não existentes em `main`.

Nunca faça o reset no sentido contrário nem em `main`.

## Configuracao

O app le tudo do `.env` via Vite:

- `VITE_PIPEFY_TOKEN`: token da API
- `VITE_PIPEFY_ACTIVE_PHASES`: fases ativas padrao
- `VITE_PIPEFY_PRIORITIZED_PHASES`: fases priorizadas padrao
- `VITE_PIPEFY_PIPES`: lista JSON com os pipes monitorados

Exemplo completo em `.env.example`.

## Como funciona

- Cada pipe pode sobrescrever fases ativas e priorizadas.
- Use `-` em `prioritizedPhases` para ignorar priorizados em um pipe especifico.
- Cards sem responsavel seguem visiveis em uma linha separada.

## Estrutura

O codigo principal vive em `src/features/sprint-monitor/`:

- `SprintMonitorScreen.tsx`: composicao da tela principal
- `env.ts`: leitura e validacao da configuracao vinda do ambiente
- `api.ts`: chamadas para a API do Pipefy
- `domain.ts`: parsing, agrupamento e regras de dominio
- `useSprintMonitor.ts`: estado e fluxo principal da feature
- `components/`: interface do monitor

## Testes

```bash
npm test
```
