import type { FieldFilters, PipeConfig } from "./types";

export const PIPE_COLOR_TOKENS = ["--pipe-1", "--pipe-2", "--pipe-3", "--pipe-4"];
export const QEG_PIPE_ID = "301947374";

export const DEFAULT_ACTIVE_PHASES = ["Sprint", "In Dev"];
export const DEFAULT_PRIORITIZED_PHASES = ["Priorizados"];

export const DEFAULT_PIPES: PipeConfig[] = [
  {
    id: "301947374",
    name: "QEG",
    color: "--pipe-1",
    activePhases: "Sprint",
    prioritizedPhases: "Priorizados",
  },
  {
    id: "303253939",
    name: "SOTEC",
    color: "--pipe-2",
    activePhases: "In Dev",
    prioritizedPhases: "-",
  },
  {
    id: "306999381",
    name: "Processos",
    color: "--pipe-3",
    activePhases: "Sprint",
    prioritizedPhases: "-",
  },
];

export const CANONICAL_PIPE_NAMES: Record<string, string> = {
  "301947374": "QEG",
  "303253939": "SOTEC",
  "306999381": "Processos",
};

export const DEFAULT_RESPONSIBLE_FIELDS = ["responsavel pela execucao", "responsavel"];

export const DEFAULT_PROJECT_AREA_FIELDS = ["Informar o(s) setor(es) impactado(s)"];

export const DEFAULT_NON_PERSON_NAMES = [
  "efp",
  "efp (especificacao de fluxo de processo)",
  "qeg",
  "sotec",
  "projetos brmed",
  "projetos br med",
  "pipefy - criacao do pipe",
  "pipefy - criacao de pipe",
  "pipefy - criacao de automacao",
  "pipefy - criacao do processo",
  "solucoes tecnologicas",
  "processos",
  "qualidade e gestao",
  "operacoes",
  "financeiro",
  "backoffice",
  "marketing",
  "brand",
  "desenvolvimento",
  "enablement",
  "suporte",
  "diretoria",
  "rh",
  "juridico",
  "sales",
  "saude",
  "seguranca",
  "suprimentos",
  "dp",
  "legalizacao",
  "bi e ferramentas",
];

export const DEFAULT_NON_PERSON_KEYWORDS = [
  "especificacao de fluxo",
  "fluxo de processo",
  "projetos",
  "projetos brmed",
  "projetos br med",
  "pipefy",
  "criacao do pipe",
  "criacao de pipe",
  "criacao de automacao",
  "criacao do processo",
];

export const DEFAULT_FIELD_FILTERS: FieldFilters = {
  responsibleFields: DEFAULT_RESPONSIBLE_FIELDS,
  projectAreaFields: DEFAULT_PROJECT_AREA_FIELDS,
  nonPersonNames: DEFAULT_NON_PERSON_NAMES,
  nonPersonKeywords: DEFAULT_NON_PERSON_KEYWORDS,
};
