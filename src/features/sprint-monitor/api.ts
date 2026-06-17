import {
  extractAssignees,
  extractProjectAreas,
  filterValidAssignees,
  matchPhase,
  parseCommaSeparated,
} from "./domain";
import type {
  FieldFilters,
  MonitorConfig,
  PipeConfig,
  PipefyField,
  SprintCard,
} from "./types";

const PIPEFY_API_URL = "https://api.pipefy.com/graphql";

interface PipefyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface RawPipefyCard {
  id: string;
  title: string;
  assignees?: Array<{ name: string; avatar_url: string | null }>;
  current_phase: { name: string };
  fields?: PipefyField[];
  labels?: Array<{ name: string }>;
}

interface PipeCardsQueryResult {
  pipe: {
    phases: Array<{
      name: string;
      cards?: {
        edges?: Array<{ node: RawPipefyCard }>;
      };
    }>;
  } | null;
}

async function pipefyRequest<T>(token: string, query: string): Promise<T> {
  const response = await fetch(PIPEFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Falha na API do Pipefy (${response.status}).`);
  }

  const payload = (await response.json()) as PipefyGraphQLResponse<T>;

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }

  if (!payload.data) {
    throw new Error("A API do Pipefy retornou uma resposta vazia.");
  }

  return payload.data;
}

function resolveActivePhases(pipe: PipeConfig, config: MonitorConfig): string[] {
  const parsed = parseCommaSeparated(pipe.activePhases);
  return parsed.length > 0 ? parsed : config.defaultActivePhases;
}

function resolvePrioritizedPhases(pipe: PipeConfig, config: MonitorConfig): string[] {
  const rawValue = pipe.prioritizedPhases.trim();

  if (rawValue === "-") {
    return [];
  }

  if (!rawValue) {
    return config.defaultPrioritizedPhases;
  }

  return parseCommaSeparated(rawValue);
}

function mapRawCard(card: RawPipefyCard, pipe: PipeConfig, filters: FieldFilters): SprintCard {
  const explicitAssignees = filterValidAssignees(
    card.assignees?.map((assignee) => ({
      name: assignee.name,
      avatarUrl: assignee.avatar_url,
    })) ?? [],
    filters,
  );

  const deliveryField = card.fields?.find((f) => f.name.includes("Entrega Estimada"));

  return {
    id: card.id,
    title: card.title,
    currentPhase: card.current_phase.name,
    projectAreas: extractProjectAreas(card.fields, filters),
    assignees:
      explicitAssignees.length > 0 ? explicitAssignees : extractAssignees(card.fields, filters),
    pipeId: pipe.id,
    pipeName: pipe.name,
    pipeColor: pipe.color,
    deliveryDate: deliveryField?.value ?? undefined,
    labels: card.labels?.map((label) => label.name) ?? [],
  };
}

export async function fetchPipeCards(
  token: string,
  pipe: PipeConfig,
  config: MonitorConfig,
): Promise<{ activeCards: SprintCard[]; prioritizedCards: SprintCard[] }> {
  const query = `{
    pipe(id: "${pipe.id}") {
      phases {
        name
        cards(first: 200) {
          edges {
            node {
              id
              title
              assignees { name avatar_url }
              fields { name value report_value }
              labels { name }
              current_phase { name }
            }
          }
        }
      }
    }
  }`;

  const data = await pipefyRequest<PipeCardsQueryResult>(token, query);

  if (!data.pipe) {
    return { activeCards: [], prioritizedCards: [] };
  }

  const activePhases = resolveActivePhases(pipe, config);
  const prioritizedPhases = resolvePrioritizedPhases(pipe, config);
  const activeCards: SprintCard[] = [];
  const prioritizedCards: SprintCard[] = [];

  for (const phase of data.pipe.phases) {
    const nodes = phase.cards?.edges?.map((edge) => edge.node) ?? [];

    if (nodes.length === 0) {
      continue;
    }

    const isActivePhase = matchPhase(phase.name, activePhases);
    const isPrioritizedPhase = !isActivePhase && matchPhase(phase.name, prioritizedPhases);

    if (!isActivePhase && !isPrioritizedPhase) {
      continue;
    }

    for (const node of nodes) {
      const card = mapRawCard(node, pipe, config.filters);

      if (isActivePhase) {
        activeCards.push(card);
      } else {
        prioritizedCards.push(card);
      }
    }
  }

  return { activeCards, prioritizedCards };
}

export async function fetchMonitorCards(
  config: MonitorConfig,
): Promise<{ activeCards: SprintCard[]; prioritizedCards: SprintCard[] }> {
  const pipes = config.pipes.filter((pipe) => pipe.id);

  const results = await Promise.all(
    pipes.map((pipe) => fetchPipeCards(config.token, pipe, config)),
  );

  return {
    activeCards: results.flatMap((result) => result.activeCards),
    prioritizedCards: results.flatMap((result) => result.prioritizedCards),
  };
}
