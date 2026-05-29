# Board Beacon

Monitor enxuto de sprint para Pipefy. O app busca os cards das fases configuradas, agrupa por responsavel e destaca gargalos de execucao.

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
