import type React from "react";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSprintMonitor } from "@/features/sprint-monitor/useSprintMonitor";
import { bloqueioDaMudanca, chaveParaMover, faseDoItem, ordenar, type Etapa, type Fase } from "../regras";
import type { CamposItem, Item, Produto } from "../tipos";
import { CampoEsforco, FichaGuiada } from "./FichaGuiada";
import { Aviso, Botao, estiloEntrada, Score } from "./ui";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** O que o Beacon já mostra da execução no Pipefy, filtrado pela área do rito. */
function PipefyDaArea({ area }: { area: string }) {
  const { areaBuckets, isLoading, error } = useSprintMonitor();
  if (isLoading) return <p className="text-xs text-muted-foreground">Buscando a execução no Pipefy…</p>;
  if (error) return <p className="text-xs text-muted-foreground">Não consegui ler o Pipefy agora ({error}).</p>;
  const detalhe = areaBuckets.flatMap((b) => b.areas).find((a) => normalizar(a.area) === normalizar(area));
  if (!detalhe || detalhe.cards.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum card desta área em sprint ou priorizado no Pipefy.</p>;
  }
  return (
    <details className="rounded-lg border border-border bg-white px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        No Pipefy: {detalhe.activeCount} em sprint · {detalhe.plannedCount} priorizados
      </summary>
      <ul className="mt-3 flex flex-col gap-1.5">
        {detalhe.cards.map((c) => (
          <li key={`${c.id}-${c.status}`} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{c.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{c.phase}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// O rito segue o mesmo fluxo da feature; a execução fecha a reunião.
const PASSOS = [
  { titulo: "Produtos e features", pergunta: "O que chegou de novo? Adicione no produto certo." },
  { titulo: "Priorizar discovery", pergunta: "Preencha a ficha de cada feature nova. Depois, escolha o que vale entender." },
  { titulo: "Discovery", pergunta: "O que já foi entendido? Estime o esforço em semanas de trabalho." },
  { titulo: "Priorizar execução", pergunta: "Com o score final, o que entra em execução?" },
  { titulo: "Execução", pergunta: "O que está rodando? Algo terminou ou travou?" },
  { titulo: "Ata", pergunta: "O que decidimos hoje." },
];

function Linha({ item, produto, onAbrir, children, rodape }: { item: Item; produto?: Produto; onAbrir: () => void; children?: React.ReactNode; rodape?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onAbrir} className="flex min-w-0 flex-col text-left hover:underline">
          <span className="text-xs text-muted-foreground">{produto?.nome ?? "Sem produto"}</span>
          <span className="text-sm font-medium text-foreground">{item.titulo}</span>
        </button>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Score item={item} />
          {children}
        </div>
      </div>
      {rodape}
    </li>
  );
}

/**
 * Lista ordenada pelo score, com ajuste manual: subir ou descer um item pede o motivo, que fica gravado.
 */
function ListaPriorizada({
  lista,
  produto,
  onAbrir,
  onAtualizar,
  acoes,
  vazio,
}: {
  lista: Item[];
  produto: (id: number | null) => Produto | undefined;
  onAbrir: (id: number) => void;
  onAtualizar: (id: number, c: CamposItem) => Promise<void>;
  acoes: (i: Item) => React.ReactNode;
  vazio: string;
}) {
  const [pendente, setPendente] = useState<{ id: number; dir: -1 | 1 } | null>(null);
  const [motivo, setMotivo] = useState("");
  const aplicar = async () => {
    if (!pendente || !motivo.trim()) return;
    const chave = chaveParaMover(lista, pendente.id, pendente.dir);
    if (chave != null) await onAtualizar(pendente.id, { ajusteScore: chave, ajusteMotivo: motivo.trim() });
    setPendente(null);
    setMotivo("");
  };
  if (lista.length === 0) return <Vazio texto={vazio} />;
  return (
    <ul className="flex flex-col gap-2">
      {lista.map((i, n) => (
        <Linha
          key={i.id}
          item={i}
          produto={produto(i.produtoId)}
          onAbrir={() => onAbrir(i.id)}
          rodape={
            <>
              {i.ajusteMotivo && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Posição ajustada à mão: {i.ajusteMotivo}
                  <button type="button" className="underline underline-offset-4 hover:text-foreground" onClick={() => void onAtualizar(i.id, { ajusteScore: null, ajusteMotivo: "" })}>
                    voltar à ordem do score
                  </button>
                </p>
              )}
              {pendente?.id === i.id && (
                <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
                  <label htmlFor={`ajuste-${i.id}`} className="text-sm text-foreground">
                    Por que {pendente.dir === -1 ? "subir" : "descer"} esta feature? O motivo fica registrado.
                  </label>
                  <input id={`ajuste-${i.id}`} autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void aplicar()} className={estiloEntrada} placeholder="ex.: prazo contratual com o cliente em dezembro" />
                  <div className="flex gap-2">
                    <Botao variante="primario" disabled={!motivo.trim()} onClick={() => void aplicar()}>
                      Aplicar ajuste
                    </Botao>
                    <Botao variante="fantasma" onClick={() => setPendente(null)}>
                      Cancelar
                    </Botao>
                  </div>
                </div>
              )}
            </>
          }
        >
          <span className="text-xs tabular-nums text-muted-foreground">#{n + 1}</span>
          <span className="flex gap-0.5">
            <Botao variante="fantasma" className="h-8 px-1.5" aria-label={`Subir ${i.titulo}`} disabled={n === 0} onClick={() => { setPendente({ id: i.id, dir: -1 }); setMotivo(""); }}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Botao>
            <Botao variante="fantasma" className="h-8 px-1.5" aria-label={`Descer ${i.titulo}`} disabled={n === lista.length - 1} onClick={() => { setPendente({ id: i.id, dir: 1 }); setMotivo(""); }}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Botao>
          </span>
          {acoes(i)}
        </Linha>
      ))}
    </ul>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{texto}</p>;
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

export function ModoRito({
  area,
  itens,
  produtos,
  onMover,
  onAtualizar,
  onNovaFeature,
  onAbrir,
  onEncerrar,
  onSair,
}: {
  area: string;
  itens: Item[];
  produtos: Produto[];
  onMover: (id: number, para: Etapa, nota?: string) => Promise<string | null>;
  onAtualizar: (id: number, campos: CamposItem) => Promise<string | null>;
  onNovaFeature: () => void;
  onAbrir: (id: number) => void;
  onEncerrar: () => Promise<string | null>;
  onSair: () => void;
}) {
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [ata, setAta] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const produto = (id: number | null) => produtos.find((p) => p.id === id);
  const naFase = (f: Fase) => ordenar(itens.filter((i) => faseDoItem(i) === f));
  const daEtapa = (e: Etapa) => ordenar(itens.filter((i) => i.etapa === e));

  const mover = async (id: number, para: Etapa) => setErro(await onMover(id, para));
  const atualizar = async (id: number, c: CamposItem) => setErro(await onAtualizar(id, c));
  const acao = (item: Item, para: Etapa, rotulo: string, primario = true) => {
    const bloqueio = bloqueioDaMudanca(item, para);
    return (
      <Botao variante={primario ? "primario" : "secundario"} disabled={!!bloqueio} title={bloqueio ?? undefined} onClick={() => void mover(item.id, para)}>
        {rotulo}
      </Botao>
    );
  };

  const encerrar = async () => {
    const texto = await onEncerrar();
    if (texto != null) setAta(texto);
  };
  const copiar = async () => {
    if (!ata) return;
    try {
      await navigator.clipboard.writeText(ata);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setErro("Não consegui copiar. Selecione o texto e copie.");
    }
  };

  const novas = naFase("nova");
  const candidatos = naFase("priorizar_discovery");
  const ultimo = PASSOS.length - 1;

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 py-8 sm:px-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Rito · {area}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{PASSOS[passo].titulo}</h2>
            <p className="text-sm text-muted-foreground">{PASSOS[passo].pergunta}</p>
          </div>
          <Botao variante="fantasma" onClick={onSair} aria-label="Sair do modo rito">
            <X className="h-4 w-4" /> Sair
          </Botao>
        </header>

        <ol className="grid grid-cols-6 gap-1.5" aria-label="Etapas do rito">
          {PASSOS.map((p, i) => (
            <li key={p.titulo}>
              <button type="button" onClick={() => !ata && setPasso(i)} aria-current={i === passo ? "step" : undefined} className="flex w-full flex-col gap-1.5 text-left">
                <span className={cn("h-1 rounded-full", i < passo ? "bg-primary/50" : i === passo ? "bg-primary" : "bg-border")} />
                <span className={cn("hidden text-xs sm:block", i === passo ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {i + 1}. {p.titulo}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {erro && <Aviso texto={erro} onFechar={() => setErro(null)} />}

        {passo === 0 && (
          <div className="flex flex-col gap-4">
            <Botao variante="primario" className="self-start" onClick={onNovaFeature}>
              <Plus className="h-4 w-4" /> Nova feature
            </Botao>
            <Titulo>Features novas, ainda sem nota</Titulo>
            <ul className="flex flex-col gap-2">
              {novas.map((i) => (
                <Linha key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)} />
              ))}
              {novas.length === 0 && <Vazio texto="Nenhuma feature nova. Adicione o que a área trouxe hoje." />}
            </ul>
          </div>
        )}

        {passo === 1 && (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <Titulo>Preencher a ficha</Titulo>
              <ul className="flex flex-col gap-2">
                {novas.map((i) => (
                  <Linha key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)} rodape={<FichaGuiada compacta item={i} onSalvar={(c) => void atualizar(i.id, c)} />} />
                ))}
                {novas.length === 0 && <Vazio texto="Todas as features já têm a ficha preenchida." />}
              </ul>
            </section>
            <section className="flex flex-col gap-2">
              <Titulo>Escolher o que vai para discovery</Titulo>
              <ListaPriorizada
                lista={candidatos}
                produto={produto}
                onAbrir={onAbrir}
                onAtualizar={atualizar}
                acoes={(i) => acao(i, "discovery", "Abrir discovery")}
                vazio="Nenhuma feature com nota esperando discovery."
              />
            </section>
          </div>
        )}

        {passo === 2 && (
          <ul className="flex flex-col gap-2">
            {daEtapa("discovery").map((i) => (
              <Linha
                key={i.id}
                item={i}
                produto={produto(i.produtoId)}
                onAbrir={() => onAbrir(i.id)}
                rodape={<CampoEsforco item={i} onSalvar={(c) => void atualizar(i.id, c)} />}
              >
                {acao(i, "decidir", "Discovery concluído")}
              </Linha>
            ))}
            {daEtapa("discovery").length === 0 && <Vazio texto="Nenhum discovery em andamento." />}
          </ul>
        )}

        {passo === 3 && (
          <ListaPriorizada
            lista={daEtapa("decidir")}
            produto={produto}
            onAbrir={onAbrir}
            onAtualizar={atualizar}
            acoes={(i) => (
              <>
                {acao(i, "execucao", "Entrar em execução")}
                {acao(i, "backlog", "Agora não", false)}
              </>
            )}
            vazio="Nada esperando decisão de execução."
          />
        )}

        {passo === 4 && (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-2">
              {daEtapa("execucao").map((i) => (
                <Linha key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)}>
                  {acao(i, "entregue", "Entregue")}
                  {acao(i, "pausado", "Pausar", false)}
                </Linha>
              ))}
              {daEtapa("pausado").map((i) => (
                <Linha key={i.id} item={i} produto={produto(i.produtoId)} onAbrir={() => onAbrir(i.id)}>
                  <span className="text-xs text-muted-foreground">Pausado</span>
                  {acao(i, "execucao", "Retomar", false)}
                </Linha>
              ))}
              {daEtapa("execucao").length + daEtapa("pausado").length === 0 && <Vazio texto="Nada em execução para esta área." />}
            </ul>
            <PipefyDaArea area={area} />
          </div>
        )}

        {passo === ultimo &&
          (ata == null ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-white px-5 py-5">
              <p className="text-sm text-foreground">Ao encerrar, a ata é montada com tudo o que mudou durante este rito e fica guardada em Atas.</p>
              <Botao variante="primario" onClick={() => void encerrar()}>
                Encerrar rito e gerar ata
              </Botao>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-white px-5 py-4 font-sans text-sm text-foreground">{ata}</pre>
              <div className="flex gap-2">
                <Botao onClick={() => void copiar()}>
                  {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiado ? "Copiada" : "Copiar ata"}
                </Botao>
                <Botao variante="primario" onClick={onSair}>
                  Voltar ao quadro
                </Botao>
              </div>
            </div>
          ))}

        {passo < ultimo && (
          <div className="flex justify-between gap-2 border-t border-border pt-5">
            <Botao variante="fantasma" disabled={passo === 0} onClick={() => setPasso(passo - 1)}>
              Voltar
            </Botao>
            <Botao variante="primario" onClick={() => setPasso(passo + 1)}>
              Próximo: {PASSOS[passo + 1].titulo}
            </Botao>
          </div>
        )}
      </div>
    </div>
  );
}
