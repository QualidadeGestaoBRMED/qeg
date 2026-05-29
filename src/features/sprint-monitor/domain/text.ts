export function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchPhase(phaseName: string, targets: string[]): boolean {
  const normalizedPhase = normalizeText(phaseName);

  return targets.some((target) => {
    const normalizedTarget = normalizeText(target);

    return normalizedPhase === normalizedTarget || normalizedPhase.includes(normalizedTarget);
  });
}
