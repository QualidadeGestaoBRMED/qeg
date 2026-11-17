// Regras do rito, sem dependências: usadas pela tela e pela API.
import type { StatusExibido, StatusProduto } from "./tipos";

export const ETAPAS = ["backlog", "discovery", "decidir", "execucao", "pausado", "entregue", "descartado"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const PILARES = ["eficiencia", "decisao", "capacitacao"] as const;
export type Pilar = (typeof PILARES)[number];

export const IMPACTOS = [0.25, 0.5, 1, 2, 3] as const;
export const CONFIANCAS = [0.5, 0.8, 1] as const;

export interface ItemRice {
  etapa: Etapa;
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  motivo?: string;
}

/** Pré-score (sem esforço): decide quem merece discovery. */
export function preScore(i: Pick<ItemRice, "reach" | "impact" | "confidence">): number | null {
  if (i.reach == null || i.impact == null || i.confidence == null) return null;
  return Math.round(i.reach * i.impact * i.confidence * 10) / 10;
}

/** RICE completo: decide quem entra em execução. */
export function rice(i: Pick<ItemRice, "reach" | "impact" | "confidence" | "effort">): number | null {
  const p = preScore(i);
  if (p == null || i.effort == null || i.effort <= 0) return null;
  return Math.round(((i.reach! * i.impact! * i.confidence!) / i.effort) * 10) / 10;
}

/** O número que aparece no card: RICE quando já tem esforço, senão o pré-score. */
export function scoreDoCard(i: ItemRice): { valor: number | null; tipo: "rice" | "pre" } {
  const r = rice(i);
  return r != null ? { valor: r, tipo: "rice" } : { valor: preScore(i), tipo: "pre" };
}

const TRANSICOES: Record<Etapa, Etapa[]> = {
  backlog: ["discovery", "descartado"],
  discovery: ["decidir", "backlog", "descartado"],
  decidir: ["execucao", "backlog", "descartado"],
  execucao: ["entregue", "pausado"],
  pausado: ["execucao", "backlog", "descartado"],
  entregue: [],
  descartado: ["backlog"],
};

export function destinosPossiveis(de: Etapa): Etapa[] {
  return TRANSICOES[de];
}

/** Por que o item ainda não pode ir para `para`. null = pode. */
export function bloqueioDaMudanca(item: ItemRice, para: Etapa, nota = ""): string | null {
  if (!TRANSICOES[item.etapa].includes(para)) {
    return `Não dá para ir de "${NOMES_ETAPA[item.etapa]}" para "${NOMES_ETAPA[para]}".`;
  }
  if (para === "discovery" && preScore(item) == null) {
    return "Preencha alcance, impacto e confiança antes de abrir o discovery.";
  }
  if (para === "decidir" && (item.effort == null || item.effort <= 0)) {
    return "O discovery precisa trazer o esforço (pessoa-semana).";
  }
  if (para === "descartado" && !nota.trim() && !(item.motivo ?? "").trim()) {
    return "Diga por que o item foi descartado.";
  }
  return null;
}

export const NOMES_ETAPA: Record<Etapa, string> = {
  backlog: "Backlog",
  discovery: "Em discovery",
  decidir: "Priorizar execução",
  execucao: "Em execução",
  pausado: "Pausado",
  entregue: "Entregue",
  descartado: "Descartado",
};

/**
 * Fases do fluxo, na ordem em que uma feature anda. O backlog se divide em dois:
 * sem R, I e C ("nova") e com eles, esperando a escolha do discovery.
 */
export const FASES = ["nova", "priorizar_discovery", "discovery", "priorizar_execucao", "execucao"] as const;
export type Fase = (typeof FASES)[number];

export const NOMES_FASE: Record<Fase, string> = {
  nova: "Features novas",
  priorizar_discovery: "Priorizar discovery",
  discovery: "Em discovery",
  priorizar_execucao: "Priorizar execução",
  execucao: "Em execução",
};

export const PROXIMO_PASSO: Record<Fase, string> = {
  nova: "Definir alcance, impacto e confiança",
  priorizar_discovery: "Escolher para discovery",
  discovery: "Definir o esforço",
  priorizar_execucao: "Escolher para execução",
  execucao: "Entregar",
};

/** Fase do fluxo em que o item aparece no quadro (null = fora do fluxo: pausado, entregue, descartado). */
export function faseDoItem(item: ItemRice): Fase | null {
  switch (item.etapa) {
    case "backlog":
      return preScore(item) == null ? "nova" : "priorizar_discovery";
    case "discovery":
      return "discovery";
    case "decidir":
      return "priorizar_execucao";
    case "execucao":
      return "execucao";
    default:
      return null;
  }
}

export const NOMES_PILAR: Record<Pilar, string> = {
  eficiencia: "Eficiência operacional",
  decisao: "Decisão estratégica",
  capacitacao: "Capacitação",
};

export const ESCALA_IMPACTO: { valor: number; nome: string; exemplo: string }[] = [
  { valor: 3, nome: "Enorme", exemplo: "Recupera receita ou evita perda de cliente" },
  { valor: 2, nome: "Alto", exemplo: "Tira um processo manual inteiro da equipe" },
  { valor: 1, nome: "Médio", exemplo: "Melhora visivelmente o dia a dia da área" },
  { valor: 0.5, nome: "Baixo", exemplo: "Ajuste que poucos vão notar" },
  { valor: 0.25, nome: "Mínimo", exemplo: "Conforto, sem efeito no resultado" },
];

export const ESCALA_CONFIANCA: { valor: number; nome: string; exemplo: string }[] = [
  { valor: 1, nome: "Alta", exemplo: "Temos dados ou já fizemos parecido" },
  { valor: 0.8, nome: "Média", exemplo: "Faz sentido, mas há suposições" },
  { valor: 0.5, nome: "Baixa", exemplo: "É uma aposta" },
];

/** Ordem dentro de uma coluna: maior score primeiro; sem score por último, mais antigos antes. */
export function ordenar<T extends ItemRice & { id: number }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const sa = scoreDoCard(a).valor;
    const sb = scoreDoCard(b).valor;
    if (sa == null && sb == null) return a.id - b.id;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sb - sa;
  });
}

export interface MovimentoDaAta {
  itemId: number;
  titulo: string;
  de: Etapa | null;
  para: Etapa;
  nota: string;
}

/** Ata do rito, em texto simples: cada item aparece uma vez, no estado em que terminou o rito. */
export function montarAta(area: string, data: Date, movimentos: MovimentoDaAta[]): string {
  const dia = data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhas = [`Rito de priorização — ${area} — ${dia}`, ""];
  if (movimentos.length === 0) {
    linhas.push("Nenhuma mudança de etapa neste rito.");
    return linhas.join("\n");
  }
  const ultimos = new Map<number, MovimentoDaAta>();
  for (const m of movimentos) {
    ultimos.delete(m.itemId);
    ultimos.set(m.itemId, m);
  }
  const finais = [...ultimos.values()];
  const grupos: [string, (m: MovimentoDaAta) => boolean][] = [
    ["Entraram em execução", (m) => m.para === "execucao"],
    ["Começaram discovery", (m) => m.para === "discovery"],
    ["Discovery concluído (vão para priorizar execução)", (m) => m.para === "decidir"],
    ["Entregues", (m) => m.para === "entregue"],
    ["Pausados", (m) => m.para === "pausado"],
    ["Features novas", (m) => m.para === "backlog" && m.de == null],
    ["Voltaram para o backlog", (m) => m.para === "backlog" && m.de != null],
    ["Descartados", (m) => m.para === "descartado"],
  ];
  for (const [titulo, filtro] of grupos) {
    const itens = finais.filter(filtro);
    if (itens.length === 0) continue;
    linhas.push(`${titulo}:`);
    for (const m of itens) {
      const nota = m.de == null ? "" : m.nota.trim();
      linhas.push(`- ${m.titulo}${nota ? ` (${nota})` : ""}`);
    }
    linhas.push("");
  }
  return linhas.join("\n").trimEnd();
}

/**
 * O status do produto acompanha o quadro: alguma feature em execução → em construção; features abertas,
 * mas nenhuma em execução → em avaliação. Sem feature aberta, vale o status gravado (entregue, em implantação,
 * parado); um "em construção" gravado sem nada em execução (ex.: produto recém-criado) vira em avaliação.
 */
export function statusDoProduto(status: StatusProduto, itensDoProduto: ItemRice[]): StatusExibido {
  const fases = itensDoProduto.map(faseDoItem).filter((f) => f != null);
  if (fases.includes("execucao")) return "em_construcao";
  if (fases.length > 0 || status === "em_construcao") return "em_avaliacao";
  return status;
}

/** Ordem na lista de produtos: o que está em andamento primeiro; os entregues no fim, só antes dos parados. */
export const ORDEM_STATUS: StatusExibido[] = ["em_construcao", "em_implantacao", "em_avaliacao", "entregue", "parado"];
