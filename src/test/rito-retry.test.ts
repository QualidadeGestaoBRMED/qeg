import { describe, expect, it, vi } from "vitest";
import { carregarAreasRito, carregarDadosRito, executarUmaVez } from "@/features/rito/useRito";
import type { Area, Item, Produto, Rito } from "@/features/rito/tipos";

function estadoDados(itensIniciais: Item[] = []) {
  const estado = {
    carregando: [] as boolean[],
    itens: itensIniciais,
    produtos: [] as Produto[],
    rito: null as Rito | null,
    erro: null as string | null,
  };
  return {
    estado,
    atualizar: {
      carregando: (valor: boolean) => estado.carregando.push(valor),
      itens: (valor: Item[]) => {
        estado.itens = valor;
      },
      produtos: (valor: Produto[]) => {
        estado.produtos = valor;
      },
      rito: (valor: Rito | null) => {
        estado.rito = valor;
      },
      erro: (valor: string | null) => {
        estado.erro = valor;
      },
    },
  };
}

describe("recarregar dados do Rito", () => {
  it("tenta buscar novamente após uma falha e limpa o erro ao carregar", async () => {
    const buscar = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection failed: postgresql://user:secret@host/db"))
      .mockResolvedValueOnce({ itens: [], produtos: [], ritoAberto: null });
    const { estado, atualizar } = estadoDados();

    await carregarDadosRito(7, atualizar, buscar);
    expect(estado.erro).toBe("Não foi possível carregar os dados do Rito. Tente novamente em instantes.");
    expect(estado.erro).not.toContain("postgresql://");

    await carregarDadosRito(7, atualizar, buscar);

    expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar).toHaveBeenNthCalledWith(2, 7);
    expect(estado.carregando).toEqual([true, false, true, false]);
    expect(estado.erro).toBeNull();
    expect(estado.itens).toEqual([]);
    expect(estado.produtos).toEqual([]);
    expect(estado.rito).toBeNull();
  });

  it("preserva itens existentes após falha e permite tentar novamente", async () => {
    const itemExistente = { id: 12 } as Item;
    const itemAtualizado = { id: 13 } as Item;
    const buscar = vi
      .fn()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce({ itens: [itemAtualizado], produtos: [], ritoAberto: null });
    const { estado, atualizar } = estadoDados([itemExistente]);

    await carregarDadosRito(7, atualizar, buscar);
    expect(estado.itens).toEqual([itemExistente]);
    expect(estado.erro).toBe("Não foi possível carregar os dados do Rito. Tente novamente em instantes.");

    await carregarDadosRito(7, atualizar, buscar);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(estado.itens).toEqual([itemAtualizado]);
    expect(estado.erro).toBeNull();
  });
});

describe("recarregar áreas", () => {
  it("oferece uma nova tentativa após falha sem expor detalhes internos", async () => {
    const area = { id: 4, nome: "Produto" } as Area;
    const buscar = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection failed: postgresql://user:secret@host/db"))
      .mockResolvedValueOnce({ areas: [area] });
    const estado = {
      carregando: [] as boolean[],
      areas: [] as Area[],
      erro: null as string | null,
    };
    const atualizar = {
      carregando: (valor: boolean) => estado.carregando.push(valor),
      areas: (valor: Area[]) => {
        estado.areas = valor;
      },
      erro: (valor: string | null) => {
        estado.erro = valor;
      },
    };

    await carregarAreasRito(atualizar, buscar);
    expect(estado.erro).toBe("Não foi possível carregar as áreas. Tente novamente em instantes.");
    expect(estado.erro).not.toContain("postgresql://");

    await carregarAreasRito(atualizar, buscar);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(estado.areas).toEqual([area]);
    expect(estado.erro).toBeNull();
    expect(estado.carregando).toEqual([true, false, true, false]);
  });
});

describe("ação de retry pendente", () => {
  it("marca a tentativa como pendente e ignora disparos duplicados", async () => {
    const { estado, atualizar } = estadoDados();
    let concluirBusca!: (resposta: { itens: Item[]; produtos: Produto[]; ritoAberto: null }) => void;
    const buscar = vi.fn(
      () => new Promise<{ itens: Item[]; produtos: Produto[]; ritoAberto: null }>((resolve) => {
        concluirBusca = resolve;
      }),
    );
    const recarregar = executarUmaVez(() => carregarDadosRito(7, atualizar, buscar));

    const tentativa = recarregar();
    expect(estado.carregando.at(-1)).toBe(true);
    await recarregar();
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(estado.carregando).toEqual([true]);

    concluirBusca({ itens: [], produtos: [], ritoAberto: null });
    await tentativa;
    expect(estado.carregando).toEqual([true, false]);
  });
});
