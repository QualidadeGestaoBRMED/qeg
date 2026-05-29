import {
  DEFAULT_ACTIVE_PHASES,
  DEFAULT_NON_PERSON_KEYWORDS,
  DEFAULT_NON_PERSON_NAMES,
  DEFAULT_PIPES,
  DEFAULT_PRIORITIZED_PHASES,
  DEFAULT_PROJECT_AREA_FIELDS,
  DEFAULT_RESPONSIBLE_FIELDS,
  PIPE_COLOR_TOKENS,
} from "./constants";
import { parseCommaSeparated, sanitizePipe } from "./domain";
import type { MonitorConfig, PipeConfig } from "./types";

interface RawEnvConfig {
  VITE_PIPEFY_TOKEN?: string;
  VITE_PIPEFY_ACTIVE_PHASES?: string;
  VITE_PIPEFY_PRIORITIZED_PHASES?: string;
  VITE_PIPEFY_PIPES?: string;
  VITE_RESPONSIBLE_FIELDS?: string;
  VITE_PROJECT_AREA_FIELDS?: string;
  VITE_NON_PERSON_NAMES?: string;
  VITE_NON_PERSON_KEYWORDS?: string;
}

function csvList(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  const parsed = parseCommaSeparated(value);
  return parsed.length > 0 ? parsed : fallback;
}

function parsePipeList(value: string | undefined): PipeConfig[] {
  if (!value) {
    return DEFAULT_PIPES;
  }

  const parsed = JSON.parse(value) as Array<Partial<PipeConfig> & { prioPhases?: string }>;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return DEFAULT_PIPES;
  }

  return parsed.map((pipe, index) => {
    const fallbackPipe = DEFAULT_PIPES.find(
      (defaultPipe) => defaultPipe.id === String(pipe.id ?? "").trim(),
    );

    return sanitizePipe(pipe, index, PIPE_COLOR_TOKENS, fallbackPipe);
  });
}

export function loadMonitorConfigFromEnv(
  env: RawEnvConfig = import.meta.env,
): { config: MonitorConfig | null; error: string | null } {
  const token = env.VITE_PIPEFY_TOKEN?.trim() ?? "";

  if (!token) {
    return {
      config: null,
      error: "Defina VITE_PIPEFY_TOKEN no .env para carregar o monitor.",
    };
  }

  try {
    return {
      config: {
        token,
        pipes: parsePipeList(env.VITE_PIPEFY_PIPES),
        defaultActivePhases: csvList(env.VITE_PIPEFY_ACTIVE_PHASES, DEFAULT_ACTIVE_PHASES),
        defaultPrioritizedPhases: csvList(
          env.VITE_PIPEFY_PRIORITIZED_PHASES,
          DEFAULT_PRIORITIZED_PHASES,
        ),
        filters: {
          responsibleFields: csvList(env.VITE_RESPONSIBLE_FIELDS, DEFAULT_RESPONSIBLE_FIELDS),
          projectAreaFields: csvList(env.VITE_PROJECT_AREA_FIELDS, DEFAULT_PROJECT_AREA_FIELDS),
          nonPersonNames: csvList(env.VITE_NON_PERSON_NAMES, DEFAULT_NON_PERSON_NAMES),
          nonPersonKeywords: csvList(env.VITE_NON_PERSON_KEYWORDS, DEFAULT_NON_PERSON_KEYWORDS),
        },
      },
      error: null,
    };
  } catch {
    return {
      config: null,
      error: "VITE_PIPEFY_PIPES precisa ser um JSON valido no .env.",
    };
  }
}
