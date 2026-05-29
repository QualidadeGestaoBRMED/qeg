import type { PipeConfig } from "../types";
import { CANONICAL_PIPE_NAMES } from "../constants";

export function sanitizePipe(
  pipe: Partial<PipeConfig> & { prioPhases?: string },
  index: number,
  fallbackColors: string[],
  fallbackPipe?: PipeConfig,
): PipeConfig {
  const id = String(pipe.id ?? fallbackPipe?.id ?? "").trim();

  return {
    id,
    name: CANONICAL_PIPE_NAMES[id] ?? String(pipe.name ?? fallbackPipe?.name ?? "").trim(),
    color: pipe.color || fallbackPipe?.color || fallbackColors[index % fallbackColors.length],
    activePhases: String(pipe.activePhases ?? fallbackPipe?.activePhases ?? "").trim(),
    prioritizedPhases: String(
      pipe.prioritizedPhases ?? pipe.prioPhases ?? fallbackPipe?.prioritizedPhases ?? "",
    ).trim(),
  };
}
