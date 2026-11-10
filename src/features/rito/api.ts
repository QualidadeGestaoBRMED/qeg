import type { Etapa } from "./regras";
import type { Area, CamposItem, Item, Movimento, Produto, Rito } from "./tipos";

async function chamar<T>(acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch("/api/rito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ acao, ...dados }),
    });
  } catch {
    throw new Error("Sem conexão com o servidor.");
  }
  const corpo = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(corpo.error ?? "Algo deu errado. Tente de novo.");
  return corpo;
}

export const ritoApi = {
  areas: () => chamar<{ areas: Area[] }>("areas"),
  dados: (areaId: number | null) =>
    chamar<{ itens: Item[]; produtos: Produto[]; ritoAberto: Rito | null }>("dados", { areaId }),
  criarItem: (areaId: number, campos: CamposItem, ritoId?: number | null) =>
    chamar<{ item: Item }>("criarItem", { areaId, ritoId, ...campos }),
  atualizarItem: (id: number, campos: CamposItem) => chamar<{ item: Item }>("atualizarItem", { id, campos }),
  mover: (id: number, para: Etapa, nota = "", ritoId?: number | null) =>
    chamar<{ item: Item }>("mover", { id, para, nota, ritoId }),
  historico: (id: number) => chamar<{ movimentos: Movimento[] }>("historico", { id }),
  criarProduto: (areaId: number, nome: string, descricao = "") =>
    chamar<{ id: number }>("criarProduto", { areaId, nome, descricao }),
  iniciarRito: (areaId: number | null) => chamar<{ rito: Rito }>("iniciarRito", { areaId }),
  encerrarRito: (id: number) => chamar<{ ata: string }>("encerrarRito", { id }),
  ritos: (areaId: number | null) => chamar<{ ritos: Rito[] }>("ritos", { areaId }),
};
