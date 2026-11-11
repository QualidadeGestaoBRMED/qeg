import type { Etapa, Pilar, Tier, TipoGanho } from "./regras";

export interface Area {
  id: number;
  nome: string;
  contagem: Partial<Record<Etapa, number>>;
}

export type StatusProduto = "entregue" | "em_implantacao" | "parado" | "em_construcao";
/** O status que a tela mostra: segue as features do quadro (ver statusDoProduto); "em_avaliacao" não é gravado. */
export type StatusExibido = StatusProduto | "em_avaliacao";

export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  status: StatusProduto;
  areaIds: number[];
}

export interface Item {
  id: number;
  areaId: number;
  produtoId: number | null;
  titulo: string;
  problema: string;
  solicitante: string;
  pilar: Pilar | null;
  etapa: Etapa;
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  solucao: string;
  riscos: string;
  motivo: string;
  pipefyUrl: string;
  criadoEm: string;
  atualizadoEm: string;
  // Ficha guiada: de onde vem o ganho (impact é calculado a partir daqui)
  ganhoTipo: TipoGanho | null;
  horasMes: number | null;
  valorHora: number | null;
  cliente: string;
  tier: Tier | null;
  riscoPerda: boolean | null;
  faixaReceita: number | null;
  /** "Por que vale a pena?" */
  justificativa: string;
  /** Posição ajustada à mão no ranking, com o motivo. */
  ajusteScore: number | null;
  ajusteMotivo: string;
}

export interface Movimento {
  id: number;
  de: Etapa | null;
  para: Etapa;
  nota: string;
  ritoId: number | null;
  criadoEm: string;
}

export interface Rito {
  id: number;
  areaId: number | null;
  iniciadoEm: string;
  encerradoEm?: string | null;
  ata?: string;
}

/** Campos que a tela pode editar num item. */
export type CamposItem = Partial<
  Pick<
    Item,
    | "titulo"
    | "problema"
    | "solicitante"
    | "pilar"
    | "produtoId"
    | "reach"
    | "confidence"
    | "effort"
    | "ganhoTipo"
    | "horasMes"
    | "valorHora"
    | "cliente"
    | "tier"
    | "riscoPerda"
    | "faixaReceita"
    | "justificativa"
    | "ajusteScore"
    | "ajusteMotivo"
    | "solucao"
    | "riscos"
    | "pipefyUrl"
  >
>;
