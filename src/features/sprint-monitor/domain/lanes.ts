import type { PlannedLaneSummary, SprintCard } from "../types";
import { QEG_PIPE_ID } from "../constants";
import { normalizeText } from "./text";

export function buildPlannedLaneSummary(prioritizedCards: SprintCard[]): PlannedLaneSummary[] {
  const qegPrioritized = prioritizedCards.filter((card) => card.pipeId === QEG_PIPE_ID);

  const countByMatcher = (matcher: string) =>
    qegPrioritized.filter((card) => normalizeText(card.currentPhase).includes(matcher)).length;

  const squad1Count = countByMatcher("priorizados squad 1");
  const squad2Count = countByMatcher("priorizados squad 2");
  const otherCount = qegPrioritized.length - squad1Count - squad2Count;

  return [
    {
      id: "squad-1",
      label: "Priorizados - Squad 1 (Operacoes e MKT)",
      count: squad1Count,
    },
    {
      id: "squad-2",
      label: "Priorizados - Squad 2 (Financeiro e Backoffice)",
      count: squad2Count,
    },
    {
      id: "other",
      label: "Outras colunas priorizadas",
      count: otherCount,
    },
  ].filter((item) => item.count > 0);
}
