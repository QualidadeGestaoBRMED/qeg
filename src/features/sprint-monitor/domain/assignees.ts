import type {
  AssigneeGroup,
  CardAssignee,
  FieldFilters,
  PipefyField,
  SprintCard,
} from "../types";
import { normalizeText } from "./text";

const NON_PERSON_FIRST_TOKENS = ["projetos", "processos", "pipefy", "qeg", "sotec"];

function isHumanName(value: string, filters: FieldFilters): boolean {
  const normalized = normalizeText(value);
  const tokens = normalized.split(" ").filter(Boolean);

  if (filters.nonPersonNames.includes(normalized)) {
    return false;
  }

  if (filters.nonPersonKeywords.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  if ((normalized.includes("(") || normalized.includes(")")) && tokens.length > 2) {
    return false;
  }

  if (tokens.length < 2) {
    return false;
  }

  if (NON_PERSON_FIRST_TOKENS.includes(tokens[0])) {
    return false;
  }

  return true;
}

function mapNamesToAssignees(names: string[]): CardAssignee[] {
  return names.map((name) => ({ name, avatarUrl: null }));
}

export function filterValidAssignees<T extends CardAssignee>(
  assignees: T[],
  filters: FieldFilters,
): T[] {
  return assignees.filter((assignee) => isHumanName(assignee.name, filters));
}

export function extractAssignees(
  fields: PipefyField[] = [],
  filters: FieldFilters,
): CardAssignee[] {
  const targets = filters.responsibleFields.map(normalizeText);

  for (const field of fields) {
    const normalizedFieldName = normalizeText(field.name);

    if (!targets.some((target) => normalizedFieldName.includes(target))) {
      continue;
    }

    if (field.report_value) {
      const names = field.report_value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((name) => isHumanName(name, filters));

      if (names.length > 0) {
        return mapNamesToAssignees(names);
      }
    }

    if (!field.value) {
      continue;
    }

    try {
      const parsed = JSON.parse(field.value);

      if (Array.isArray(parsed)) {
        const names = parsed
          .map((item) => String(item).trim())
          .filter(Boolean)
          .filter((name) => isHumanName(name, filters));

        if (names.length > 0) {
          return mapNamesToAssignees(names);
        }
      }
    } catch {
      const singleName = field.value.trim();

      if (singleName && isHumanName(singleName, filters)) {
        return [{ name: singleName, avatarUrl: null }];
      }
    }
  }

  return [];
}

export function groupCardsByAssignee(
  activeCards: SprintCard[],
  prioritizedCards: SprintCard[],
): AssigneeGroup[] {
  const groups = new Map<string, AssigneeGroup>();

  const ensureGroup = (key: string, name: string, avatarUrl: string | null) => {
    if (!groups.has(key)) {
      groups.set(key, { name, avatarUrl, activeCards: [], prioritizedCards: [] });
    }
  };

  for (const card of activeCards) {
    for (const assignee of card.assignees) {
      ensureGroup(assignee.name, assignee.name, assignee.avatarUrl);
      groups.get(assignee.name)!.activeCards.push(card);
    }
  }

  for (const card of prioritizedCards) {
    for (const assignee of card.assignees) {
      ensureGroup(assignee.name, assignee.name, assignee.avatarUrl);
      groups.get(assignee.name)!.prioritizedCards.push(card);
    }
  }

  return [...groups.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "pt-BR"),
  );
}
