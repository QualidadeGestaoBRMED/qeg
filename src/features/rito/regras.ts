// Regras do rito, sem dependências: usadas pela tela e pela API.
import type { StatusExibido, StatusProduto } from "./tipos";

export const ETAPAS = ["backlog", "discovery", "decidir", "execucao", "pausado", "entregue", "descartado"] as const;
export type Etapa = (typeof ETAPAS)[number];

export const PILARES = ["eficiencia", "decisao", "capacitacao"] as const;
export type Pilar = (typeof PILARES)[number];

// A nota segue a forma do RICE, com as perguntas da ficha guiada:
// reach = alcance (1, 3, 5), impact = ganho (1 a 5), confidence = confiança, effort = semanas de trabalho.
export const ALCANCES = [1, 3, 5] as const;
export const GANHOS = [1, 2, 3, 4, 5] as const;
export const CONFIANCAS = [0.5, 0.8, 1] as const;

export interface ItemRice {
  etapa: Etapa;
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  motivo?: string;
  /** "Por que vale a pena?": sem ele a ficha não está completa. */
  justificativa?: string;
  /** Posição ajustada à mão: substitui o score na ordenação. */
  ajusteScore?: number | null;
}

// ---- Ficha guiada: de onde vem o ganho ----

export const TIPOS_GANHO = ["tempo", "cliente", "receita", "risco"] as const;
export type TipoGanho = (typeof TIPOS_GANHO)[number];

export const TIERS = ["bronze", "prata", "ouro", "diamante"] as const;
export type Tier = (typeof TIERS)[number];
export const NOMES_TIER: Record<Tier, string> = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" };
export const NOTA_TIER: Record<Tier, number> = { bronze: 1, prata: 2, ouro: 3, diamante: 4 };

/** Faixas de valor anual, alinhadas aos tiers (Bronze 1 … Diamante 4). */
export const FAIXAS_VALOR: { nota: number; nome: string }[] = [
  { nota: 1, nome: "Até R$ 50 mil" },
  { nota: 2, nome: "R$ 50 a 200 mil" },
  { nota: 3, nome: "R$ 200 a 500 mil" },
  { nota: 4, nome: "Acima de R$ 500 mil" },
];
export function faixaDeValor(anual: number): number {
  return anual > 500_000 ? 4 : anual > 200_000 ? 3 : anual > 50_000 ? 2 : 1;
}

export interface ClienteDaFicha {
  nome: string;
  tier: Tier | null;
}

export interface FichaGanho {
  ganhoTipo: TipoGanho | null;
  horasMes: number | null;
  valorHora: number | null;
  clientes: ClienteDaFicha[];
  riscoPerda: boolean | null;
  faixaReceita: number | null;
  nivelRisco: number | null;
}

/** Projetos que não economizam horas, mas evitam erro, multa ou perda de contrato. */
export const NIVEIS_RISCO: { nota: number; nome: string; exemplo: string }[] = [
  { nota: 1, nome: "Incômodo", exemplo: "Retrabalho pequeno, ninguém de fora percebe." },
  { nota: 2, nome: "Erro visível", exemplo: "Retrabalho frequente ou erro que o cliente vê." },
  { nota: 3, nome: "Multa ou reclamação", exemplo: "Multa, reclamação formal ou perda de prazo contratual." },
  { nota: 4, nome: "Risco grave", exemplo: "Risco legal, de saúde do trabalhador ou de perder contrato." },
];

/** Economia anual de um projeto que economiza tempo: horas por mês × valor da hora × 12. */
export function economiaAnual(f: Pick<FichaGanho, "horasMes" | "valorHora">): number | null {
  return f.horasMes != null && f.valorHora != null && f.horasMes > 0 && f.valorHora > 0 ? f.horasMes * f.valorHora * 12 : null;
}

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * A nota de ganho (1 a 5) a partir das respostas da ficha. Cliente: o tier, uma faixa acima se houver
 * risco de perder o cliente. null enquanto faltar resposta.
 */
export function ganhoDaFicha(f: FichaGanho): { nota: number; texto: string } | null {
  if (f.ganhoTipo === "tempo") {
    const ano = economiaAnual(f);
    return ano == null ? null : { nota: faixaDeValor(ano), texto: `${reais(ano)}/ano` };
  }
  if (f.ganhoTipo === "receita") {
    const faixa = FAIXAS_VALOR.find((x) => x.nota === f.faixaReceita);
    return faixa ? { nota: faixa.nota, texto: faixa.nome } : null;
  }
  if (f.ganhoTipo === "cliente") {
    const tiers = f.clientes.map((c) => c.tier).filter((t): t is Tier => t != null);
    if (tiers.length === 0 || tiers.length < f.clientes.length || f.riscoPerda == null) return null;
    const maior = tiers.reduce((a, b) => (NOTA_TIER[b] > NOTA_TIER[a] ? b : a));
    const qtd = f.clientes.length > 1 ? ` (maior de ${f.clientes.length} clientes)` : "";
    return { nota: NOTA_TIER[maior] + (f.riscoPerda ? 1 : 0), texto: `${NOMES_TIER[maior]}${qtd}${f.riscoPerda ? " + risco de perda" : ""}` };
  }
  if (f.ganhoTipo === "risco") {
    const nivel = NIVEIS_RISCO.find((n) => n.nota === f.nivelRisco);
    return nivel ? { nota: nivel.nota, texto: nivel.nome } : null;
  }
  return null;
}

/** Nota prévia (sem esforço): ganho × alcance × confiança; decide quem merece discovery. */
export function preScore(i: Pick<ItemRice, "reach" | "impact" | "confidence">): number | null {
  if (i.reach == null || i.impact == null || i.confidence == null) return null;
  return Math.round(i.reach * i.impact * i.confidence * 10) / 10;
}

/** Ficha completa: ganho, alcance, confiança e o business case. É o que libera o discovery. */
export function fichaCompleta(i: Pick<ItemRice, "reach" | "impact" | "confidence" | "justificativa">): boolean {
  return preScore(i) != null && (i.justificativa ?? "").trim() !== "";
}

/** Score final: nota prévia ÷ semanas de trabalho; decide quem entra em execução. */
export function rice(i: Pick<ItemRice, "reach" | "impact" | "confidence" | "effort">): number | null {
  const p = preScore(i);
  if (p == null || i.effort == null || i.effort <= 0) return null;
  return Math.round(((i.reach! * i.impact! * i.confidence!) / i.effort) * 10) / 10;
}

/** O número que aparece no card: score final quando já tem esforço, senão a nota prévia. */
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
  if (para === "discovery" && !fichaCompleta(item)) {
    return "Preencha a ficha (ganho, alcance, confiança e por que vale a pena) antes de abrir o discovery.";
  }
  if (para === "decidir" && (item.effort == null || item.effort <= 0)) {
    return "O discovery precisa trazer o esforço (semanas de trabalho).";
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
 * sem a ficha preenchida ("nova") e com ela, esperando a escolha do discovery.
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
  nova: "Preencher a ficha",
  priorizar_discovery: "Escolher para discovery",
  discovery: "Definir o esforço",
  priorizar_execucao: "Escolher para execução",
  execucao: "Entregar",
};

/** Fase do fluxo em que o item aparece no quadro (null = fora do fluxo: pausado, entregue, descartado). */
export function faseDoItem(item: ItemRice): Fase | null {
  switch (item.etapa) {
    case "backlog":
      return fichaCompleta(item) ? "priorizar_discovery" : "nova";
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

export const ESCALA_ALCANCE: { valor: number; nome: string; exemplo: string }[] = [
  { valor: 1, nome: "Uma área", exemplo: "Só a área que pediu usa ou sente o resultado." },
  { valor: 3, nome: "Várias áreas", exemplo: "Duas ou mais áreas ganham. Ex.: Suporte, Operações e Credenciamento." },
  { valor: 5, nome: "A empresa toda", exemplo: "Muda algo para todas as áreas." },
];

/** Em projetos para clientes, o alcance conta clientes, não áreas. */
export const ESCALA_ALCANCE_CLIENTES: { valor: number; nome: string; exemplo: string }[] = [
  { valor: 1, nome: "Um cliente", exemplo: "Feito para um cliente específico." },
  { valor: 3, nome: "Alguns clientes", exemplo: "Serve a dois ou mais clientes. Ex.: a mesma convocação para EDF, Log-In e OOG-TK." },
  { valor: 5, nome: "Todos os clientes", exemplo: "Muda algo para toda a carteira." },
];

export function escalaDeAlcance(tipo: TipoGanho | null) {
  return tipo === "cliente" ? ESCALA_ALCANCE_CLIENTES : ESCALA_ALCANCE;
}

export const ESCALA_CONFIANCA: { valor: number; nome: string; exemplo: string }[] = [
  { valor: 1, nome: "Medido", exemplo: "Os números vêm do Pipefy, do BI ou de uma planilha." },
  { valor: 0.8, nome: "Estimado", exemplo: "Conheço bem o processo, mas não medi." },
  { valor: 0.5, nome: "Chute", exemplo: "É uma aposta; o discovery precisa validar." },
];

/** Chave de ordenação: o ajuste manual, quando houver; senão o score do card. */
export function chaveDeOrdem(i: ItemRice): number | null {
  return i.ajusteScore ?? scoreDoCard(i).valor;
}

/** Ordem dentro de uma coluna: maior score primeiro; sem score por último, mais antigos antes. */
export function ordenar<T extends ItemRice & { id: number }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const sa = chaveDeOrdem(a);
    const sb = chaveDeOrdem(b);
    if (sa == null && sb == null) return a.id - b.id;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sb - sa || a.id - b.id;
  });
}

/**
 * Chave que põe o item uma posição acima (dir = -1) ou abaixo (dir = 1) na lista já ordenada:
 * fica entre os dois vizinhos do novo lugar. null se não há para onde mover.
 */
export function chaveParaMover<T extends ItemRice & { id: number }>(lista: T[], id: number, dir: -1 | 1): number | null {
  const chaves = lista.map((i) => chaveDeOrdem(i) ?? 0);
  const i = lista.findIndex((x) => x.id === id);
  const alvo = i + dir;
  if (i < 0 || alvo < 0 || alvo >= lista.length) return null;
  const vizinho = chaves[alvo];
  const alem = dir === -1 ? chaves[alvo - 1] : chaves[alvo + 1];
  if (alem === undefined) return Math.round((vizinho + (dir === -1 ? 1 : -1)) * 1000) / 1000;
  return Math.round(((vizinho + alem) / 2) * 1000) / 1000;
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
