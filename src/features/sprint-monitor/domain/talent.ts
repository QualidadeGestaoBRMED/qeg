import type {
  AssigneeGroup,
  LoadLevel,
  SkillCoverage,
  TalentMap,
  TalentMatrixRow,
} from "../types";
import { getLoadLevel } from "./load";
import { normalizeText } from "./text";

export async function loadTalentMap(): Promise<TalentMap> {
  const response = await fetch("/talent.json");
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o mapa de talentos.");
  }
  return response.json() as Promise<TalentMap>;
}

function parseDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(d.getTime()) ? null : d;
}

export function daysUntil(dateStr: string): number | null {
  const date = parseDDMMYYYY(dateStr);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function earliestDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((earliest, d) => {
    const earlyDate = parseDDMMYYYY(earliest);
    const currDate = parseDDMMYYYY(d);
    if (!earlyDate) return d;
    if (!currDate) return earliest;
    return currDate < earlyDate ? d : earliest;
  });
}

export function buildTalentMatrix(talentMap: TalentMap, groups: AssigneeGroup[]): TalentMatrixRow[] {
  const groupByName = new Map(groups.map((g) => [normalizeText(g.name), g]));

  return talentMap.members.map((member) => {
    const group = groupByName.get(normalizeText(member.name));
    const activeCardCount = group?.activeCards.length ?? 0;
    const deliveryDates = (group?.activeCards ?? [])
      .map((c) => c.deliveryDate)
      .filter((d): d is string => !!d);

    return {
      name: member.name,
      avatarUrl: group?.avatarUrl ?? null,
      senioridade: member.senioridade,
      skills: member.skills,
      loadLevel: getLoadLevel(activeCardCount),
      activeCardCount,
      soonestDelivery: earliestDate(deliveryDates),
    };
  });
}

const LOAD_ORDER: Record<LoadLevel, number> = { ok: 0, high: 1, critical: 2 };

export function findAvailableBySkill(matrix: TalentMatrixRow[], skill: string): TalentMatrixRow[] {
  return matrix
    .filter((row) => skill in row.skills)
    .sort((a, b) => {
      const loadDiff = LOAD_ORDER[a.loadLevel] - LOAD_ORDER[b.loadLevel];
      if (loadDiff !== 0) return loadDiff;
      const aDay = a.soonestDelivery ? (daysUntil(a.soonestDelivery) ?? Infinity) : Infinity;
      const bDay = b.soonestDelivery ? (daysUntil(b.soonestDelivery) ?? Infinity) : Infinity;
      return aDay - bDay;
    });
}

export function buildSkillCoverage(matrix: TalentMatrixRow[], skills: string[]): SkillCoverage[] {
  return skills.map((skill) => {
    const qualified = matrix.filter((row) => skill in row.skills);
    const available = qualified.filter((row) => row.loadLevel === "ok");
    const strong = qualified.filter((row) => row.skills[skill] === "forte");
    const occupiedDates = qualified
      .filter((row) => row.activeCardCount > 0 && row.soonestDelivery)
      .map((row) => row.soonestDelivery as string);

    return {
      skill,
      total: qualified.length,
      available: available.length,
      strong: strong.length,
      nextDelivery: earliestDate(occupiedDates),
    };
  });
}
