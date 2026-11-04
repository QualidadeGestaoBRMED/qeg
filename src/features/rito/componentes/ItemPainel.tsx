import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { ritoApi } from "../api";
import {
  bloqueioDaMudanca,
  destinosPossiveis,
  NOMES_ETAPA,
  NOMES_PILAR,
  PILARES,
  type Etapa,
} from "../regras";
import type { CamposItem, Item, Movimento, Produto } from "../tipos";
import { RiceCampos } from "./RiceCampos";
import { Aviso, Botao, Campo, Escolha, estiloEntrada, Score } from "./ui";

const ROTULO_ACAO: Partial<Record<Etapa, string>> = {
  discovery: "Abrir discovery",
  decidir: "Discovery concluído",
  execucao: "Entrar em execução",
  entregue: "Marcar como entregue",
  pausado: "Pausar",
  backlog: "Voltar ao backlog",
  descartado: "Descartar",
};

function Texto({
  id,
  valor,
  onSalvar,
  linhas = 3,
  placeholder,
}: {
  id: string;
  valor: string;
  onSalvar: (v: string) => void;
  linhas?: number;
  placeholder?: string;
}) {
  const [t, setT] = useState(valor);
  useEffect(() => setT(valor), [valor]);
  return (
    <textarea
      id={id}
      rows={linhas}
      value={t}
      placeholder={placeholder}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => t !== valor && onSalvar(t)}
      className={`${estiloEntrada} resize-y`}
    />
  );
}

export function ItemPainel({
  item,
  produtos,
  onAtualizar,
  onMover,
  onCriarProduto,
  onFechar,
}: {
  item: Item;
  produtos: Produto[];
  onAtualizar: (id: number, campos: CamposItem) => Promise<string | null>;
  onMover: (id: number, para: Etapa, nota?: string) => Promise<string | null>;
  onCriarProduto: (nome: string) => Promise<number | null>;
  onFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState(false);
  const [historico, setHistorico] = useState<Movimento[] | null>(null);
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [titulo, setTitulo] = useState(item.titulo);

  useEffect(() => {
    setTitulo(item.titulo);
    setErro(null);
    setDescartando(false);
  }, [item.id, item.titulo]);

  useEffect(() => {
    if (!detalhes) return;
    let ativo = true;
    ritoApi
      .historico(item.id)
      .then((r) => ativo && setHistorico(r.movimentos))
      .catch(() => ativo && setHistorico([]));
    return () => {
      ativo = false;
    };
  }, [detalhes, item.id, item.etapa]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const salvar = async (campos: CamposItem) => setErro(await onAtualizar(item.id, campos));
  const mover = async (para: Etapa, nota = "") => {
    const e = await onMover(item.id, para, nota);
    setErro(e);
    if (!e) setDescartando(false);
  };

  const mostraEsforco = item.etapa !== "backlog" && item.etapa !== "descartado";
  const destinos = destinosPossiveis(item.etapa);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-foreground/20" onClick={onFechar}>
      <aside
        role="dialog"
        aria-label={item.titulo}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-background shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-background px-6 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-primary">{NOMES_ETAPA[item.etapa]}</span>
            <input
              aria-label="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => titulo.trim() && titulo !== item.titulo && void salvar({ titulo })}
              className="w-full bg-transparent text-lg font-semibold text-foreground focus-visible:outline-none"
            />
          </div>
          <Botao variante="fantasma" aria-label="Fechar" onClick={onFechar} className="px-2">
            <X className="h-4 w-4" />
          </Botao>
        </div>

        <div className="flex flex-col gap-6 px-6 py-5">
          {erro && <Aviso texto={erro} onFechar={() => setErro(null)} />}

          <div className="flex items-end justify-between gap-4 rounded-lg border border-border bg-white px-4 py-3">
            <Score item={item} grande />
            <span className="max-w-[220px] text-right text-xs text-muted-foreground">
              {item.effort ? "Alcance × impacto × confiança ÷ esforço" : "Sem esforço ainda: a nota serve para escolher o discovery"}
            </span>
          </div>

          {destinos.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {destinos
                  .filter((d) => d !== "descartado")
                  .map((d) => {
                    const bloqueio = bloqueioDaMudanca(item, d);
                    return (
                      <Botao
                        key={d}
                        variante={d === "backlog" || d === "pausado" ? "secundario" : "primario"}
                        disabled={!!bloqueio}
                        title={bloqueio ?? undefined}
                        onClick={() => void mover(d)}
                      >
                        {ROTULO_ACAO[d]}
                      </Botao>
                    );
                  })}
                {destinos.includes("descartado") && !descartando && (
                  <Botao variante="fantasma" onClick={() => setDescartando(true)}>
                    Descartar
                  </Botao>
                )}
              </div>
              {destinos.some((d) => d !== "descartado" && bloqueioDaMudanca(item, d)) && (
                <p className="text-xs text-muted-foreground">
                  {destinos.map((d) => (d !== "descartado" ? bloqueioDaMudanca(item, d) : null)).find(Boolean)}
                </p>
              )}
              {descartando && (
                <div className="flex flex-col gap-2 rounded-md border border-border bg-white p-3">
                  <label htmlFor={`motivo-${item.id}`} className="text-sm text-foreground">
                    Por que descartar?
                  </label>
                  <input
                    id={`motivo-${item.id}`}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className={estiloEntrada}
                    placeholder="ex.: o cliente encerrou o contrato"
                  />
                  <div className="flex gap-2">
                    <Botao variante="perigo" disabled={!motivo.trim()} onClick={() => void mover("descartado", motivo)}>
                      Descartar
                    </Botao>
                    <Botao variante="fantasma" onClick={() => setDescartando(false)}>
                      Cancelar
                    </Botao>
                  </div>
                </div>
              )}
            </div>
          )}

          <Campo rotulo="Problema">
            <Texto id={`problema-${item.id}`} valor={item.problema} placeholder="O que dói hoje, em uma frase." onSalvar={(v) => void salvar({ problema: v })} />
          </Campo>

          <RiceCampos item={item} comEsforco={mostraEsforco} onSalvar={(c) => void salvar(c)} />

          <Campo rotulo="Pilar">
            <Escolha
              rotulo="Pilar"
              valor={item.pilar}
              onChange={(v) => void salvar({ pilar: v })}
              opcoes={PILARES.map((p) => ({ valor: p, nome: NOMES_PILAR[p] }))}
            />
          </Campo>

          <Campo rotulo="Produto">
            <select
              aria-label="Produto"
              value={item.produtoId ?? ""}
              onChange={async (e) => {
                const v = e.target.value;
                if (v === "__novo") {
                  const nome = window.prompt?.("Nome do novo produto")?.trim();
                  const id = nome ? await onCriarProduto(nome) : null;
                  if (id) void salvar({ produtoId: id });
                  return;
                }
                void salvar({ produtoId: v ? Number(v) : null });
              }}
              className={estiloEntrada}
            >
              <option value="">Sem produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>

          <button
            type="button"
            onClick={() => setDetalhes((d) => !d)}
            aria-expanded={detalhes}
            className="flex items-center gap-2 self-start text-sm font-medium text-primary hover:underline"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${detalhes ? "rotate-180" : ""}`} />
            {detalhes ? "Menos detalhes" : "Mais detalhes"}
          </button>

          {detalhes && (
            <div className="flex flex-col gap-5 border-t border-border pt-5">
              <Campo rotulo="Solução proposta" dica="Sai do discovery.">
                <Texto id={`solucao-${item.id}`} valor={item.solucao} onSalvar={(v) => void salvar({ solucao: v })} />
              </Campo>
              <Campo rotulo="Riscos">
                <Texto id={`riscos-${item.id}`} valor={item.riscos} linhas={2} onSalvar={(v) => void salvar({ riscos: v })} />
              </Campo>
              <Campo rotulo="Quem pediu">
                <Texto id={`solicitante-${item.id}`} valor={item.solicitante} linhas={1} onSalvar={(v) => void salvar({ solicitante: v })} />
              </Campo>
              <Campo rotulo="Card no Pipefy">
                <div className="flex items-center gap-2">
                  <Texto id={`pipefy-${item.id}`} valor={item.pipefyUrl} linhas={1} placeholder="https://app.pipefy.com/open-cards/…" onSalvar={(v) => void salvar({ pipefyUrl: v })} />
                  {item.pipefyUrl && (
                    <a href={item.pipefyUrl} target="_blank" rel="noreferrer" aria-label="Abrir no Pipefy" className="text-primary">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </Campo>
              {item.motivo && (
                <Campo rotulo="Motivo do descarte">
                  <p className="text-sm text-foreground">{item.motivo}</p>
                </Campo>
              )}
              <Campo rotulo="Histórico">
                {historico == null ? (
                  <span className="text-sm text-muted-foreground">Carregando…</span>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {historico.map((m) => (
                      <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-foreground">
                          {m.de ? `${NOMES_ETAPA[m.de]} → ` : ""}
                          {NOMES_ETAPA[m.para]}
                          {m.nota && m.de && <span className="text-muted-foreground"> · {m.nota}</span>}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {new Date(m.criadoEm).toLocaleDateString("pt-BR")}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Campo>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
