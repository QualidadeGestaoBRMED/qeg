import type { Etapa, Pilar } from "./regras";

export interface Area {
  id: number;
  nome: string;
  contagem: Partial<Record<Etapa, number>>;
}

export type StatusProduto = "entregue" | "em_implantacao" | "parado" | "em_construcao";

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
    | "impact"
    | "confidence"
    | "effort"
    | "solucao"
    | "riscos"
    | "pipefyUrl"
  >
>;
