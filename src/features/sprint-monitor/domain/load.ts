import type { AssigneeGroup, LoadLevel, TeamLoadItem } from "../types";

export function getLoadLevel(activeCardCount: number): LoadLevel {
  if (activeCardCount >= 4) {
    return "critical";
  }

  if (activeCardCount === 3) {
    return "high";
  }

  return "ok";
}

export function getLoadLabel(loadLevel: LoadLevel): string {
  if (loadLevel === "critical") {
    return "Alta carga";
  }

  if (loadLevel === "high") {
    return "Carga alta";
  }

  return "Carga ok";
}

export function getLoadRatio(activeCardCount: number): number {
  return Math.min(activeCardCount / 4, 1);
}

function buildSuggestion(activeCardCount: number, prioritizedCardCount: number, loadLevel: LoadLevel): string {
  if (activeCardCount === 0) {
    return "Disponivel para receber demanda e destravar tarefas de colegas.";
  }

  if (loadLevel === "critical") {
    return "Sugerir redistribuicao imediata para reduzir gargalo desta pessoa.";
  }

  if (loadLevel === "high") {
    return "Vale revisar se algum item de menor prioridade pode ser redistribuido.";
  }

  if (prioritizedCardCount === 0) {
    return "Defina um proximo passo para evitar ociosidade quando a fila ativa terminar.";
  }

  return "Carga equilibrada. Pode apoiar quem estiver com fila maior.";
}

export function buildTeamLoadItems(groups: AssigneeGroup[]): TeamLoadItem[] {
  return groups.map((group) => {
    const activeCardCount = group.activeCards.length;
    const prioritizedCardCount = group.prioritizedCards.length;
    const loadLevel = getLoadLevel(activeCardCount);

    return {
      name: group.name,
      avatarUrl: group.avatarUrl,
      activeCardCount,
      prioritizedCardCount,
      loadLevel,
      loadLabel: getLoadLabel(loadLevel),
      loadRatio: getLoadRatio(activeCardCount),
      suggestion: buildSuggestion(activeCardCount, prioritizedCardCount, loadLevel),
    };
  });
}
