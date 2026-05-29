import type { AssigneeGroup, DirectorView, PersonStatus, RagStatus } from "../types";
import { getLoadLevel } from "./load";

function computeHealthScore(groups: AssigneeGroup[], unassignedCards: number): number {
  let score = 100;

  const activeGroups = groups.filter((g) => g.activeCards.length > 0);

  for (const group of activeGroups) {
    if (group.activeCards.length >= 3) score -= 15;
    else if (group.activeCards.length === 2) score -= 8;

    if (group.prioritizedCards.length === 0) score -= 12;
  }

  score -= unassignedCards * 5;

  return Math.max(0, Math.min(100, score));
}

function computeRag(score: number): RagStatus {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

function computeRagLabel(rag: RagStatus): string {
  if (rag === "green") return "Sprint saudável";
  if (rag === "amber") return "Sprint em atenção";
  return "Sprint em risco";
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

function buildInsights(groups: AssigneeGroup[], unassignedCards: number): string[] {
  const insights: string[] = [];

  const activeGroups = groups.filter((g) => g.activeCards.length > 0);
  const criticalGroups = activeGroups.filter((g) => g.activeCards.length >= 3);
  const highGroups = activeGroups.filter((g) => g.activeCards.length === 2);
  const withoutNext = activeGroups.filter((g) => g.prioritizedCards.length === 0);
  const available = groups.filter((g) => g.activeCards.length === 0);

  if (criticalGroups.length === 1) {
    insights.push(
      `${firstName(criticalGroups[0].name)} com carga crítica — ${criticalGroups[0].activeCards.length} cards ativos.`,
    );
  } else if (criticalGroups.length > 1) {
    insights.push(
      `${criticalGroups.length} pessoas com carga crítica.`,
    );
  }

  if (highGroups.length > 0 && criticalGroups.length === 0) {
    const names =
      highGroups.length === 1
        ? firstName(highGroups[0].name)
        : `${highGroups.length} pessoas`;
    insights.push(`${names} com carga elevada.`);
  }

  if (withoutNext.length === 1) {
    insights.push(
      `${firstName(withoutNext[0].name)} sem próximo passo definido.`,
    );
  } else if (withoutNext.length > 1) {
    insights.push(
      `${withoutNext.length} pessoas ativas sem próximo passo definido.`,
    );
  }

  if (unassignedCards === 1) {
    insights.push("1 card sem responsável.");
  } else if (unassignedCards > 1) {
    insights.push(`${unassignedCards} cards sem responsável.`);
  }

  if (available.length === 1) {
    insights.push(
      `${firstName(available[0].name)} disponível para nova demanda.`,
    );
  } else if (available.length > 1) {
    insights.push(
      `${available.length} pessoas disponíveis para absorver nova demanda.`,
    );
  }

  if (insights.length === 0) {
    insights.push("Equipe com carga equilibrada e próximos passos mapeados.");
    insights.push("Sprint sem pontos críticos identificados.");
  }

  return insights;
}

export function buildDirectorView(
  groups: AssigneeGroup[],
  unassignedCards: number,
): DirectorView {
  const score = computeHealthScore(groups, unassignedCards);
  const rag = computeRag(score);

  const activeGroups = groups.filter((g) => g.activeCards.length > 0);
  const coverageCount = activeGroups.filter((g) => g.prioritizedCards.length > 0).length;
  const coveragePercent =
    activeGroups.length > 0
      ? Math.round((coverageCount / activeGroups.length) * 100)
      : 100;

  const allPeople: PersonStatus[] = groups.map((g) => ({
    name: g.name,
    activeCardCount: g.activeCards.length,
    loadLevel: getLoadLevel(g.activeCards.length),
    hasNextStep: g.prioritizedCards.length > 0,
  }));

  return {
    healthScore: score,
    ragStatus: rag,
    ragLabel: computeRagLabel(rag),
    insights: buildInsights(groups, unassignedCards),
    coveragePercent,
    criticalPeople: groups
      .filter((g) => g.activeCards.length >= 4)
      .map((g) => g.name),
    availablePeople: groups
      .filter((g) => g.activeCards.length === 0)
      .map((g) => g.name),
    peopleWithNext: activeGroups
      .filter((g) => g.prioritizedCards.length > 0)
      .map((g) => g.name),
    peopleWithoutNext: activeGroups
      .filter((g) => g.prioritizedCards.length === 0)
      .map((g) => g.name),
    allPeople,
  };
}
