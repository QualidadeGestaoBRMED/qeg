import type {
  AreaBoardItem,
  AreaBucketGroup,
  AreaDetail,
  FieldFilters,
  PipefyField,
  SprintCard,
} from "../types";
import { QEG_PIPE_ID } from "../constants";
import { normalizeText } from "./text";

const FALLBACK_BUCKET = "Outras áreas";

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

/**
 * Agrupa as áreas em "baldes" (diretorias) conforme o mapa buckets (balde -> [áreas]),
 * expondo as demandas (cards) de cada área. Áreas fora do mapa caem em "Outras áreas".
 */
export function buildAreaBuckets(
  activeCards: SprintCard[],
  prioritizedCards: SprintCard[],
  buckets: Record<string, string[]>,
): AreaBucketGroup[] {
  const areaToBucket = new Map<string, string>();
  const bucketOrder: string[] = [];
  for (const [bucket, areas] of Object.entries(buckets)) {
    bucketOrder.push(bucket);
    for (const area of areas) areaToBucket.set(normalizeText(area), bucket);
  }

  const areaMap = new Map<string, AreaDetail>();
  const ensureArea = (area: string) => {
    if (!areaMap.has(area)) {
      areaMap.set(area, { area, activeCount: 0, plannedCount: 0, cards: [] });
    }
    return areaMap.get(area)!;
  };

  const collect = (cards: SprintCard[], status: "active" | "planned") => {
    for (const card of cards.filter((item) => item.pipeId === QEG_PIPE_ID)) {
      for (const area of resolveCardAreas(card)) {
        const detail = ensureArea(area);
        if (status === "active") detail.activeCount += 1;
        else detail.plannedCount += 1;
        detail.cards.push({
          id: card.id,
          title: card.title,
          deliveryDate: card.deliveryDate ?? null,
          phase: card.currentPhase,
          status,
        });
      }
    }
  };

  collect(activeCards, "active");
  collect(prioritizedCards, "planned");

  const groupMap = new Map<string, AreaBucketGroup>();
  const ensureBucket = (bucket: string) => {
    if (!groupMap.has(bucket)) {
      groupMap.set(bucket, { bucket, areas: [], activeCount: 0, plannedCount: 0 });
    }
    return groupMap.get(bucket)!;
  };

  for (const detail of areaMap.values()) {
    const bucket = areaToBucket.get(normalizeText(detail.area)) ?? FALLBACK_BUCKET;
    const group = ensureBucket(bucket);
    group.areas.push(detail);
    group.activeCount += detail.activeCount;
    group.plannedCount += detail.plannedCount;
  }

  const order = [...bucketOrder, FALLBACK_BUCKET];
  const groups = [...groupMap.values()].sort((a, b) => {
    const ia = order.indexOf(a.bucket);
    const ib = order.indexOf(b.bucket);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  for (const group of groups) {
    group.areas.sort(
      (x, y) => y.activeCount - x.activeCount || y.plannedCount - x.plannedCount,
    );
  }

  return groups;
}
