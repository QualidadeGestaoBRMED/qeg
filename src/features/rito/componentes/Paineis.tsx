import { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { ritoApi } from "../api";
import { faseDoItem, FASES, NOMES_ETAPA, NOMES_FASE, ORDEM_STATUS, ordenar, statusDoProduto, type Etapa } from "../regras";
import type { Area, Item, Produto, Rito } from "../tipos";
import { Botao, estiloEntrada, Score, StatusProdutoPill } from "./ui";

/** Escolha da área: o rito é sempre feito com uma área. */
export function EscolhaArea({ areas, onEscolher }: { areas: Area[]; onEscolher: (id: number | null) => void }) {
  const total = (a: Area) => Object.values(a.contagem).reduce((s, n) => s + (n ?? 0), 0);
  const comItens = areas.filter((a) => total(a) > 0);
  const semItens = areas.filter((a) => total(a) === 0);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Com qual área é o rito?</h2>
        <p className="text-sm text-muted-foreground">A tela mostra só a área escolhida. Dá para trocar a qualquer momento.</p>
      </div>
      {comItens.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {comItens.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onEscolher(a.id)}
              className="flex flex-col gap-1 rounded-xl border border-border bg-white px-5 py-4 text-left transition-colors hover:border-primary/50"
            >
              <span className="text-base font-semibold text-foreground">{a.nome}</span>
              <span className="text-sm text-muted-foreground">
                {a.contagem.execucao ?? 0} em execução · {(a.contagem.backlog ?? 0) + (a.contagem.discovery ?? 0) + (a.contagem.decidir ?? 0)} para priorizar
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {comItens.length > 0 ? "Outras áreas" : "Áreas"}
        </span>
        <div className="flex flex-wrap gap-2">
          {semItens.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onEscolher(a.id)}
              className="rounded-full border border-border bg-white px-3 py-1 text-sm text-foreground hover:border-primary/50"
            >
              {a.nome}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onEscolher(null)}
        className="self-start text-sm font-medium text-primary hover:underline"
      >
        Ver todas as áreas (reunião interna) →
      </button>
    </div>
  );
}

/** Reunião interna: as áreas lado a lado, com o melhor candidato de cada uma. */
export function VisaoGeral({
  areas,
  itens,
  onAbrirArea,
  onAbrirItem,
}: {
  areas: Area[];
  itens: Item[];
  onAbrirArea: (id: number) => void;
  onAbrirItem: (id: number) => void;
}) {
  const colunas = FASES;
  const linhas = areas
    .map((a) => ({ area: a, itens: itens.filter((i) => i.areaId === a.id) }))
    .filter((l) => l.itens.length > 0);
  if (linhas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma área tem itens ainda. Escolha uma área e cadastre o backlog.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Área</th>
            {colunas.map((c) => (
              <th key={c} className="px-3 py-3 text-right font-medium">
                {NOMES_FASE[c]}
              </th>
            ))}
            <th className="px-4 py-3 font-medium">Melhor candidato</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ area, itens: lista }) => {
            const melhor = ordenar(lista.filter((i) => i.etapa === "decidir" || i.etapa === "backlog"))[0];
            return (
              <tr key={area.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onAbrirArea(area.id)} className="font-medium text-foreground hover:underline">
                    {area.nome}
                  </button>
                </td>
                {colunas.map((c) => (
                  <td key={c} className="px-3 py-3 text-right tabular-nums text-foreground">
                    {lista.filter((i) => faseDoItem(i) === c).length || <span className="text-muted-foreground">–</span>}
                  </td>
                ))}
                <td className="px-4 py-3">
                  {melhor ? (
                    <button type="button" onClick={() => onAbrirItem(melhor.id)} className="flex items-center gap-3 text-left hover:underline">
                      <span className="text-foreground">{melhor.titulo}</span>
                      <Score item={melhor} />
                    </button>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Passo 1 do fluxo: os produtos da área. Cada produto abre as features dele e aceita uma nova. */
export function ListaProdutos({
  produtos,
  itens,
  onAbrirItem,
  onNovoProduto,
  onNovaFeature,
}: {
  produtos: Produto[];
  itens: Item[];
  onAbrirItem: (id: number) => void;
  onNovoProduto: (nome: string) => Promise<number | null>;
  onNovaFeature: (produtoId: number) => void;
}) {
  const [aberto, setAberto] = useState<number | null>(null);
  const [novo, setNovo] = useState<string | null>(null);
  const criar = async () => {
    if (!novo?.trim()) return;
    const id = await onNovoProduto(novo.trim());
    if (id) {
      setNovo(null);
      setAberto(id);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {novo === null ? (
          <Botao onClick={() => setNovo("")}>
            <Plus className="h-3.5 w-3.5" /> Produto
          </Botao>
        ) : (
          <>
            <input
              autoFocus
              aria-label="Nome do novo produto"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void criar();
                if (e.key === "Escape") setNovo(null);
              }}
              placeholder="Nome do produto"
              className={`${estiloEntrada} max-w-[320px]`}
            />
            <Botao variante="primario" onClick={() => void criar()}>
              Criar produto
            </Botao>
            <Botao variante="fantasma" onClick={() => setNovo(null)}>
              Cancelar
            </Botao>
          </>
        )}
      </div>
      {produtos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto nesta área ainda. Comece criando um.</p>}
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {produtos
          .map((p) => ({ p, status: statusDoProduto(p.status, itens.filter((i) => i.produtoId === p.id)) }))
          .sort((a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status))
          .map(({ p, status }) => {
          const dele = ordenar(itens.filter((i) => i.produtoId === p.id));
          const ativo = aberto === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-expanded={ativo}
                onClick={() => setAberto(ativo ? null : p.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${ativo ? "rotate-90" : ""}`} />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{p.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.descricao}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {dele.length} {dele.length === 1 ? "feature" : "features"}
                  </span>
                  <StatusProdutoPill status={status} />
                </span>
              </button>
              {ativo && (
                <div className="flex flex-col gap-2 px-11 pb-4">
                  <ul className="flex flex-col gap-1">
                    {dele.map((i) => {
                      const fase = faseDoItem(i);
                      return (
                        <li key={i.id}>
                          <button type="button" onClick={() => onAbrirItem(i.id)} className="flex w-full items-center justify-between gap-3 py-1 text-left text-sm hover:underline">
                            <span className="text-foreground">{i.titulo}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{fase ? NOMES_FASE[fase] : NOMES_ETAPA[i.etapa]}</span>
                          </button>
                        </li>
                      );
                    })}
                    {dele.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma feature ainda.</li>}
                  </ul>
                  <Botao className="self-start" onClick={() => onNovaFeature(p.id)}>
                    <Plus className="h-3.5 w-3.5" /> Feature em {p.nome}
                  </Botao>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Atas({ areaId }: { areaId: number | null }) {
  const [ritos, setRitos] = useState<Rito[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    ritoApi
      .ritos(areaId)
      .then((r) => ativo && setRitos(r.ritos))
      .catch((e) => ativo && setErro((e as Error).message));
    return () => {
      ativo = false;
    };
  }, [areaId]);
  if (erro) return <p className="text-sm text-destructive">{erro}</p>;
  if (ritos == null) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (ritos.length === 0) return <p className="text-sm text-muted-foreground">Nenhum rito encerrado ainda. A ata aparece aqui ao fim de cada rito.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {ritos.map((r) => (
        <li key={r.id}>
          <details className="rounded-xl border border-border bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              {new Date(r.iniciadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground">{r.ata}</pre>
          </details>
        </li>
      ))}
    </ul>
  );
}
