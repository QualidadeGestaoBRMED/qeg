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

O rito guarda itens, produtos, movimentos e atas num Postgres (Neon). Defina `DATABASE_URL` no `.env` (e nas variaveis da Vercel) e rode:

```bash
npm run db:setup              # tabelas, areas e produtos do Suporte
npm run db:setup -- --exemplos # idem + itens de exemplo do Suporte
```

O codigo do rito fica em `src/features/rito/` (regras em `regras.ts`) e a API em `api/_lib/rito.ts` (`POST /api/rito`).

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
