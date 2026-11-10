import { useCallback, useEffect, useMemo, useState } from "react";
import { ritoApi } from "./api";
import type { Etapa } from "./regras";
import type { Area, CamposItem, Item, Produto, Rito } from "./tipos";

const ERRO_CARREGAMENTO_RITO = "Não foi possível carregar os dados do Rito. Tente novamente em instantes.";
const ERRO_CARREGAMENTO_AREAS = "Não foi possível carregar as áreas. Tente novamente em instantes.";

export function executarUmaVez<T>(acao: () => Promise<T>) {
  let emAndamento = false;
  return async () => {
    if (emAndamento) return;
    emAndamento = true;
    try {
      return await acao();
    } finally {
      emAndamento = false;
    }
  };
}

export async function carregarAreasRito(
  atualizar: {
    carregando: (valor: boolean) => void;
    areas: (valor: Area[]) => void;
    erro: (valor: string | null) => void;
  },
  buscar = ritoApi.areas,
) {
  atualizar.carregando(true);
  try {
    const resultado = await buscar();
    atualizar.areas(resultado.areas);
    atualizar.erro(null);
  } catch {
    atualizar.erro(ERRO_CARREGAMENTO_AREAS);
  } finally {
    atualizar.carregando(false);
  }
}

export async function carregarDadosRito(
  areaId: number | null,
  atualizar: {
    carregando: (valor: boolean) => void;
    itens: (valor: Item[]) => void;
    produtos: (valor: Produto[]) => void;
    rito: (valor: Rito | null) => void;
    erro: (valor: string | null) => void;
  },
  buscar = ritoApi.dados,
) {
  atualizar.carregando(true);
  try {
    const d = await buscar(areaId);
    atualizar.itens(d.itens);
    atualizar.produtos(d.produtos);
    atualizar.rito(d.ritoAberto);
    atualizar.erro(null);
  } catch {
    atualizar.erro(ERRO_CARREGAMENTO_RITO);
  } finally {
    atualizar.carregando(false);
  }
}

/** Estado de uma área (ou de todas, com areaId nulo) e as ações que mudam itens. */
export function useRito(areaId: number | null) {
  const [itens, setItens] = useState<Item[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [rito, setRito] = useState<Rito | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const recarregar = useMemo(
    () =>
      executarUmaVez(() =>
        carregarDadosRito(areaId, {
          carregando: setCarregando,
          itens: setItens,
          produtos: setProdutos,
          rito: setRito,
          erro: setErroCarregamento,
        }),
      ),
    [areaId],
  );

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const trocar = (item: Item) => setItens((atual) => atual.map((i) => (i.id === item.id ? item : i)));

  /** Cada ação devolve a mensagem de erro, ou null se deu certo. */
  const atualizar = useCallback(async (id: number, campos: CamposItem) => {
    try {
      trocar((await ritoApi.atualizarItem(id, campos)).item);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, []);

  const mover = useCallback(
    async (id: number, para: Etapa, nota = "") => {
      try {
        trocar((await ritoApi.mover(id, para, nota, rito?.id)).item);
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    },
    [rito],
  );

  const criar = useCallback(
    async (campos: CamposItem) => {
      if (areaId == null) return "Escolha uma área para criar o item.";
      try {
        const { item } = await ritoApi.criarItem(areaId, campos, rito?.id);
        setItens((atual) => [...atual, item]);
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    },
    [areaId, rito],
  );

  const criarProduto = useCallback(
    async (nome: string) => {
      if (areaId == null) return null;
      try {
        const { id } = await ritoApi.criarProduto(areaId, nome);
        await recarregar();
        return id;
      } catch (e) {
        setErro((e as Error).message);
        return null;
      }
    },
    [areaId, recarregar],
  );

  const iniciarRito = useCallback(async () => {
    try {
      const r = (await ritoApi.iniciarRito(areaId)).rito;
      setRito(r);
      return r;
    } catch (e) {
      setErro((e as Error).message);
      return null;
    }
  }, [areaId]);

  const encerrarRito = useCallback(async () => {
    if (!rito) return null;
    try {
      const { ata } = await ritoApi.encerrarRito(rito.id);
      setRito(null);
      return ata;
    } catch (e) {
      setErro((e as Error).message);
      return null;
    }
  }, [rito]);

  return {
    itens,
    produtos,
    rito,
    carregando,
    erro,
    erroCarregamento,
    limparErro: () => setErro(null),
    recarregar,
    atualizar,
    mover,
    criar,
    criarProduto,
    iniciarRito,
    encerrarRito,
  };
}

export type EstadoRito = ReturnType<typeof useRito>;
