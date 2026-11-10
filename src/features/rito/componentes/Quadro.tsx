import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { faseDoItem, FASES, NOMES_ETAPA, NOMES_FASE, ordenar, PROXIMO_PASSO, type Etapa } from "../regras";
import type { Item, Produto } from "../tipos";
import { Score } from "./ui";

const FORA_DO_FLUXO: Etapa[] = ["pausado", "entregue", "descartado"];

export function CardItem({ item, produto, onAbrir }: { item: Item; produto?: Produto; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-white px-3.5 py-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-xs text-muted-foreground">{produto?.nome ?? "Sem produto"}</span>
      <span className="text-sm font-medium leading-snug text-foreground">{item.titulo}</span>
      <Score item={item} />
    </button>
  );
}

/** Visualização: em que fase do fluxo está cada feature. As ações ficam no item e no modo rito. */
export function Quadro({ itens, produtos, onAbrir }: { itens: Item[]; produtos: Produto[]; onAbrir: (id: number) => void }) {
  const [aberta, setAberta] = useState<Etapa | null>(null);
  const produto = (id: number | null) => produtos.find((p) => p.id === id);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {FASES.map((fase, n) => {
          const lista = ordenar(itens.filter((i) => faseDoItem(i) === fase));
          return (
            <section key={fase} className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/60 p-3">
              <header className="flex flex-col gap-0.5 px-1">
                <h3 className="text-sm font-semibold text-foreground">
                  <span className="mr-1.5 text-xs tabular-nums text-muted-foreground">{n + 1}</span>
                  {NOMES_FASE[fase]} <span className="font-normal text-muted-foreground">{lista.length}</span>
                </h3>
                <span className="text-xs text-muted-foreground">Próximo: {PROXIMO_PASSO[fase].toLowerCase()}</span>
              </header>
              <div className="flex flex-col gap-2">
                {lista.map((i) => (
                  <CardItem key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)} />
                ))}
                {lista.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">Nada nesta fase.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {FORA_DO_FLUXO.map((etapa) => {
            const n = itens.filter((i) => i.etapa === etapa).length;
            const ativo = aberta === etapa;
            return (
              <button
                key={etapa}
                type="button"
                aria-expanded={ativo}
                onClick={() => setAberta(ativo ? null : etapa)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${ativo ? "rotate-90" : ""}`} />
                {NOMES_ETAPA[etapa]} {n}
              </button>
            );
          })}
        </div>
        {aberta && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {ordenar(itens.filter((i) => i.etapa === aberta)).map((i) => (
              <CardItem key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)} />
            ))}
            {itens.every((i) => i.etapa !== aberta) && <p className="text-xs text-muted-foreground">Nada aqui.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
