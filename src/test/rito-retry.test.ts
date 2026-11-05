import { describe, expect, it, vi } from "vitest";
import { carregarDadosRito } from "@/features/rito/useRito";
import type { Item, Produto, Rito } from "@/features/rito/tipos";

describe("recarregar dados do Rito", () => {
  it("tenta buscar os dados novamente após uma falha e limpa o erro ao carregar", async () => {
    const buscar = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sem conexão com o servidor."))
      .mockResolvedValueOnce({ itens: [], produtos: [], ritoAberto: null });
    const estado = {
      carregando: [] as boolean[],
      itens: [] as Item[][],
      produtos: [] as Produto[][],
      rito: [] as (Rito | null)[],
      erro: [] as (string | null)[],
    };
    const atualizar = {
      carregando: (valor: boolean) => estado.carregando.push(valor),
      itens: (valor: Item[]) => estado.itens.push(valor),
      produtos: (valor: Produto[]) => estado.produtos.push(valor),
      rito: (valor: Rito | null) => estado.rito.push(valor),
      erro: (valor: string | null) => estado.erro.push(valor),
    };

    await carregarDadosRito(7, atualizar, buscar);
    expect(estado.erro.at(-1)).toBe("Sem conexão com o servidor.");

    await carregarDadosRito(7, atualizar, buscar);

    expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar).toHaveBeenNthCalledWith(2, 7);
    expect(estado.carregando).toEqual([true, false, true, false]);
    expect(estado.erro.at(-1)).toBeNull();
    expect(estado.itens.at(-1)).toEqual([]);
    expect(estado.produtos.at(-1)).toEqual([]);
    expect(estado.rito.at(-1)).toBeNull();
  });
});
