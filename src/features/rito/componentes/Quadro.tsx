import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { NOMES_ETAPA, ordenar, type Etapa } from "../regras";
import type { Item, Produto } from "../tipos";
import { estiloEntrada, Score } from "./ui";

const PRINCIPAIS: { etapa: Etapa; dica: string }[] = [
  { etapa: "backlog", dica: "Ainda não avaliado ou à espera de discovery" },
  { etapa: "discovery", dica: "Sendo entendido para estimar o esforço" },
  { etapa: "decidir", dica: "Com RICE completo, esperando o rito" },
  { etapa: "execucao", dica: "Sendo construído" },
];
const SECUNDARIAS: Etapa[] = ["pausado", "entregue", "descartado"];

export function CardItem({ item, produto, onAbrir }: { item: Item; produto?: Produto; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-white px-3.5 py-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm font-medium leading-snug text-foreground">{item.titulo}</span>
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{produto?.nome ?? "Sem produto"}</span>
        <Score item={item} />
      </span>
    </button>
  );
}

export function Quadro({
  itens,
  produtos,
  onAbrir,
  onCriar,
}: {
  itens: Item[];
  produtos: Produto[];
  onAbrir: (id: number) => void;
  onCriar?: (titulo: string) => Promise<string | null>;
}) {
  const [novo, setNovo] = useState<string | null>(null);
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [abertas, setAbertas] = useState<Etapa | null>(null);
  const produto = (id: number | null) => produtos.find((p) => p.id === id);
  const da = (etapa: Etapa) => ordenar(itens.filter((i) => i.etapa === etapa));

  const criar = async () => {
    if (!novo?.trim() || !onCriar) return;
    const erro = await onCriar(novo.trim());
    setErroNovo(erro);
    if (!erro) setNovo(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PRINCIPAIS.map(({ etapa, dica }) => {
          const lista = da(etapa);
          return (
            <section key={etapa} className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/60 p-3">
              <header className="flex items-center justify-between gap-2 px-1" title={dica}>
                <h3 className="text-sm font-semibold text-foreground">
                  {NOMES_ETAPA[etapa]} <span className="font-normal text-muted-foreground">{lista.length}</span>
                </h3>
                {etapa === "backlog" && onCriar && (
                  <button
                    type="button"
                    aria-label="Novo item no backlog"
                    onClick={() => setNovo(novo === null ? "" : null)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-white hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </header>
              {etapa === "backlog" && novo !== null && (
                <div className="flex flex-col gap-1.5">
                  <input
                    autoFocus
                    aria-label="Título do novo item"
                    value={novo}
                    onChange={(e) => setNovo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void criar();
                      if (e.key === "Escape") setNovo(null);
                    }}
                    placeholder="O que a área precisa? Enter para criar"
                    className={estiloEntrada}
                  />
                  {erroNovo && <span className="text-xs text-destructive">{erroNovo}</span>}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {lista.map((i) => (
                  <CardItem key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)} />
                ))}
                {lista.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">{dica}.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {SECUNDARIAS.map((etapa) => {
            const n = itens.filter((i) => i.etapa === etapa).length;
            const aberta = abertas === etapa;
            return (
              <button
                key={etapa}
                type="button"
                aria-expanded={aberta}
                onClick={() => setAbertas(aberta ? null : etapa)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${aberta ? "rotate-90" : ""}`} />
                {NOMES_ETAPA[etapa]} {n}
              </button>
            );
          })}
        </div>
        {abertas && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {da(abertas).map((i) => (
              <CardItem key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)} />
            ))}
            {da(abertas).length === 0 && <p className="text-xs text-muted-foreground">Nada aqui.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
