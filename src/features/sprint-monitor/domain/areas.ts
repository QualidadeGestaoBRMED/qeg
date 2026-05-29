import type { AreaBoardItem, FieldFilters, PipefyField, SprintCard } from "../types";
import { QEG_PIPE_ID } from "../constants";
import { normalizeText } from "./text";

export function extractProjectAreas(
  fields: PipefyField[] = [],
  filters: FieldFilters,
): string[] {
  const targets = filters.projectAreaFields.map(normalizeText);

  for (const field of fields) {
    const normalizedFieldName = normalizeText(field.name);

    if (!targets.some((target) => normalizedFieldName.includes(target))) {
      continue;
    }

    const reportValue = field.report_value?.trim() ?? "";
    if (reportValue) {
      return reportValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const rawValue = field.value?.trim();
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue);

        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        return rawValue
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}

function resolveCardAreas(card: SprintCard): string[] {
  return card.projectAreas.length > 0 ? card.projectAreas : ["Nao informado"];
}

export function buildAreaBoardItems(
  activeCards: SprintCard[],
  prioritizedCards: SprintCard[],
): AreaBoardItem[] {
  const areaMap = new Map<string, AreaBoardItem>();

  const ensureArea = (area: string) => {
    if (!areaMap.has(area)) {
      areaMap.set(area, { area, activeCount: 0, plannedCount: 0 });
    }
  };

  for (const card of activeCards.filter((item) => item.pipeId === QEG_PIPE_ID)) {
    for (const area of resolveCardAreas(card)) {
      ensureArea(area);
      areaMap.get(area)!.activeCount += 1;
    }
  }

  for (const card of prioritizedCards.filter((item) => item.pipeId === QEG_PIPE_ID)) {
    for (const area of resolveCardAreas(card)) {
      ensureArea(area);
      areaMap.get(area)!.plannedCount += 1;
    }
  }

  return [...areaMap.values()].sort((left, right) => {
    const activeDiff = right.activeCount - left.activeCount;

    if (activeDiff !== 0) {
      return activeDiff;
    }

    return left.area.localeCompare(right.area, "pt-BR");
  });
}
