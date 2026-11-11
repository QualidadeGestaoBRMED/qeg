import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  economiaAnual,
  ESCALA_ALCANCE,
  ESCALA_CONFIANCA,
  FAIXAS_VALOR,
  ganhoDaFicha,
  NOMES_TIER,
  preScore,
  TIERS,
  type TipoGanho,
} from "../regras";
import type { CamposItem, Item } from "../tipos";
import { Botao, estiloEntrada } from "./ui";

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const TIPOS: { valor: TipoGanho; nome: string; exemplo: string }[] = [
  { valor: "tempo", nome: "Economiza tempo da equipe", exemplo: "Tira trabalho manual de um processo interno." },
  { valor: "cliente", nome: "Atende ou retém um cliente", exemplo: "Resolve um problema de um cliente específico." },
  { valor: "receita", nome: "Gera receita nova", exemplo: "Abre venda, serviço novo ou cobrança." },
];

const PASSOS = ["Tipo de ganho", "Ganho", "Alcance", "Confiança", "Por que vale a pena"] as const;

/** Uma opção grande, com nome e explicação sempre visíveis. */
function Opcao({ ativo, nome, exemplo, onClick }: { ativo: boolean; nome: string; exemplo?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border-[1.5px] px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ativo ? "border-primary bg-primary/10" : "border-border bg-white hover:border-primary/50",
      )}
    >
      <span className="text-sm font-semibold text-foreground">{nome}</span>
      {exemplo && <span className="text-xs text-muted-foreground">{exemplo}</span>}
    </button>
  );
}

function NumeroCampo({ id, rotulo, valor, onSalvar, onDigitar, dica, placeholder }: { id: string; rotulo: string; valor: number | null; onSalvar: (v: number | null) => void; onDigitar?: (v: number | null) => void; dica?: string; placeholder?: string }) {
  const [texto, setTexto] = useState(valor == null ? "" : String(valor).replace(".", ","));
  useEffect(() => setTexto(valor == null ? "" : String(valor).replace(".", ",")), [valor]);
  const salvar = () => {
    const limpo = texto.trim().replace(",", ".");
    const n = limpo === "" ? null : Number(limpo);
    if (n !== null && (!Number.isFinite(n) || n < 0)) return setTexto(valor == null ? "" : String(valor));
    if (n !== valor) onSalvar(n);
  };
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {rotulo}
      <input
        id={id}
        inputMode="decimal"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          const n = Number(e.target.value.trim().replace(",", "."));
          onDigitar?.(e.target.value.trim() === "" || !Number.isFinite(n) ? null : n);
        }}
        onBlur={salvar}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`${estiloEntrada} max-w-[200px] tabular-nums`}
      />
      {dica && <span className="text-xs font-normal text-muted-foreground">{dica}</span>}
    </label>
  );
}

function respondido(item: Item, passo: number): boolean {
  if (passo === 0) return item.ganhoTipo != null;
  if (passo === 1) return ganhoDaFicha(item) != null;
  if (passo === 2) return item.reach != null;
  if (passo === 3) return item.confidence != null;
  return item.justificativa.trim() !== "";
}

/**
 * Ficha de priorização, uma pergunta por vez. Cada resposta é gravada na hora; a nota prévia
 * (ganho × alcance × confiança) aparece assim que ganho, alcance e confiança estão respondidos.
 */
export function FichaGuiada({ item, onSalvar }: { item: Item; onSalvar: (campos: CamposItem) => void }) {
  const primeiroAberto = PASSOS.findIndex((_, i) => !respondido(item, i));
  const [passo, setPasso] = useState<number | null>(primeiroAberto < 0 ? null : primeiroAberto);
  const [horas, setHoras] = useState(item.horasMes);
  const [valorHora, setValorHora] = useState(item.valorHora);
  const [justificativa, setJustificativa] = useState(item.justificativa);
  useEffect(() => setHoras(item.horasMes), [item.horasMes]);
  useEffect(() => setValorHora(item.valorHora), [item.valorHora]);
  useEffect(() => setJustificativa(item.justificativa), [item.justificativa]);

  const ganho = ganhoDaFicha(item);
  const previa = preScore(item);
  const avancar = () => setPasso((p) => (p == null ? null : p + 1 < PASSOS.length ? p + 1 : null));

  const resumo: [string, string | null][] = [
    ["Tipo de ganho", TIPOS.find((t) => t.valor === item.ganhoTipo)?.nome ?? null],
    ["Ganho", ganho ? `${ganho.nota} · ${ganho.texto}` : null],
    ["Alcance", ESCALA_ALCANCE.find((a) => a.valor === item.reach)?.nome ?? null],
    ["Confiança", ESCALA_CONFIANCA.find((c) => c.valor === item.confidence)?.nome ?? null],
    ["Por que vale a pena", item.justificativa.trim() || null],
  ];

  if (passo == null) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ficha de priorização</span>
          {previa != null && (
            <span className="text-sm tabular-nums text-muted-foreground">
              Nota prévia <b className="text-foreground">{previa.toLocaleString("pt-BR")}</b>
            </span>
          )}
        </div>
        <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[160px_1fr]">
          {resumo.map(([rotulo, valor], i) => (
            <div key={rotulo} className="contents">
              <dt className="text-muted-foreground">{rotulo}</dt>
              <dd className="flex min-w-0 items-start justify-between gap-2">
                <span className={cn("min-w-0 break-words", valor ? "text-foreground" : "text-muted-foreground")}>{valor ?? "a responder"}</span>
                <button type="button" onClick={() => setPasso(i)} aria-label={`Editar ${rotulo.toLowerCase()}`} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  const ano = economiaAnual({ horasMes: horas, valorHora });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-white px-4 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-1" aria-hidden>
          {PASSOS.map((p, i) => (
            <span key={p} className={cn("h-1 flex-1 rounded-full", i <= passo ? "bg-primary" : "bg-border")} />
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ficha · passo {passo + 1} de {PASSOS.length}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            Nota prévia: <b className="text-foreground">{previa != null ? previa.toLocaleString("pt-BR") : "–"}</b>
          </span>
        </div>
      </div>

      {passo === 0 && (
        <Pergunta titulo="Que tipo de ganho esse projeto traz?" dica="Escolha o principal. Se trouxer mais de um, fique com o maior.">
          <div role="radiogroup" aria-label="Tipo de ganho" className="grid gap-2">
            {TIPOS.map((t) => (
              <Opcao key={t.valor} ativo={item.ganhoTipo === t.valor} nome={t.nome} exemplo={t.exemplo} onClick={() => onSalvar({ ganhoTipo: t.valor })} />
            ))}
          </div>
        </Pergunta>
      )}

      {passo === 1 && item.ganhoTipo == null && <p className="text-sm text-muted-foreground">Escolha antes o tipo de ganho.</p>}

      {passo === 1 && item.ganhoTipo === "tempo" && (
        <Pergunta titulo="Quanto tempo isso economiza?" dica="Pense no tempo que o processo consome hoje e deixaria de consumir.">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumeroCampo id={`horas-${item.id}`} rotulo="Horas economizadas por mês" valor={item.horasMes} placeholder="ex.: 40" onDigitar={setHoras} onSalvar={(v) => onSalvar({ horasMes: v })} />
            <NumeroCampo
              id={`valor-hora-${item.id}`}
              rotulo="Valor médio da hora da área (R$)"
              valor={item.valorHora}
              placeholder="ex.: 45"
              dica="Sem esse número? Salário médio da área ÷ 160."
              onDigitar={setValorHora}
              onSalvar={(v) => onSalvar({ valorHora: v })}
            />
          </div>
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
            {ano != null ? (
              <>
                Isso dá cerca de <b className="tabular-nums">{reais(ano)}</b> por ano (horas × valor × 12)
                {ganho && <span className="text-muted-foreground"> · ganho {ganho.nota}</span>}
              </>
            ) : (
              <span className="text-muted-foreground">Preencha os dois campos para ver a economia por ano.</span>
            )}
          </p>
        </Pergunta>
      )}

      {passo === 1 && item.ganhoTipo === "cliente" && (
        <Pergunta titulo="Qual cliente e quanto ele pesa?" dica="O tier vem do BI e já reflete o faturamento do cliente.">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Cliente
            <input
              defaultValue={item.cliente}
              placeholder="ex.: International SOS"
              onBlur={(e) => e.target.value.trim() !== item.cliente && onSalvar({ cliente: e.target.value.trim() })}
              className={`${estiloEntrada} max-w-[320px]`}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Tier do cliente</span>
            <div role="radiogroup" aria-label="Tier do cliente" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIERS.map((t) => (
                <Opcao key={t} ativo={item.tier === t} nome={NOMES_TIER[t]} onClick={() => onSalvar({ tier: t })} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Se não fizermos, há risco de perder o cliente?</span>
            <div role="radiogroup" aria-label="Risco de perder o cliente" className="grid grid-cols-2 gap-2 sm:max-w-[420px]">
              <Opcao ativo={item.riscoPerda === true} nome="Sim" exemplo="Sobe uma faixa" onClick={() => onSalvar({ riscoPerda: true })} />
              <Opcao ativo={item.riscoPerda === false} nome="Não" exemplo="Fica no tier" onClick={() => onSalvar({ riscoPerda: false })} />
            </div>
          </div>
        </Pergunta>
      )}

      {passo === 1 && item.ganhoTipo === "receita" && (
        <Pergunta titulo="Quanto de receita por ano, mais ou menos?" dica="Uma faixa basta; o discovery refina.">
          <div role="radiogroup" aria-label="Receita por ano" className="grid gap-2 sm:grid-cols-2">
            {FAIXAS_VALOR.map((f) => (
              <Opcao key={f.nota} ativo={item.faixaReceita === f.nota} nome={f.nome} onClick={() => onSalvar({ faixaReceita: f.nota })} />
            ))}
          </div>
        </Pergunta>
      )}

      {passo === 2 && (
        <Pergunta titulo="Quem ganha com isso?" dica="Conte as áreas que usam ou sentem o resultado, não só quem pediu.">
          <div role="radiogroup" aria-label="Alcance" className="grid gap-2">
            {ESCALA_ALCANCE.map((a) => (
              <Opcao key={a.valor} ativo={item.reach === a.valor} nome={a.nome} exemplo={a.exemplo} onClick={() => onSalvar({ reach: a.valor })} />
            ))}
          </div>
        </Pergunta>
      )}

      {passo === 3 && (
        <Pergunta titulo="Quão seguro você está desses números?" dica="Sem problema escolher chute: o discovery existe para isso.">
          <div role="radiogroup" aria-label="Confiança" className="grid gap-2">
            {ESCALA_CONFIANCA.map((c) => (
              <Opcao key={c.valor} ativo={item.confidence === c.valor} nome={c.nome} exemplo={c.exemplo} onClick={() => onSalvar({ confidence: c.valor })} />
            ))}
          </div>
        </Pergunta>
      )}

      {passo === 4 && (
        <Pergunta titulo="Por que vale a pena?" dica="Duas ou três linhas, como explicaria para a diretoria.">
          <textarea
            aria-label="Por que vale a pena"
            rows={3}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            onBlur={() => justificativa !== item.justificativa && onSalvar({ justificativa })}
            placeholder="ex.: Hoje não sabemos se o paciente está normal ou não fez o exame. O cliente é Ouro e já reclamou; o painel evita a perda da conta."
            className={`${estiloEntrada} resize-y`}
          />
        </Pergunta>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Botao variante="fantasma" disabled={passo === 0} onClick={() => setPasso(passo - 1)}>
          Voltar
        </Botao>
        <Botao
          variante="primario"
          disabled={!respondido({ ...item, justificativa }, passo)}
          onClick={() => {
            if (passo === 4 && justificativa !== item.justificativa) onSalvar({ justificativa });
            avancar();
          }}
        >
          {passo === PASSOS.length - 1 ? "Concluir ficha" : "Continuar"}
        </Botao>
      </div>
    </div>
  );
}

function Pergunta({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="text-base font-semibold text-foreground">{titulo}</h4>
        {dica && <p className="text-sm text-muted-foreground">{dica}</p>}
      </div>
      {children}
    </div>
  );
}

/** Esforço, preenchido pelo CX depois do discovery, com o guia de como estimar. */
export function CampoEsforco({ item, onSalvar }: { item: Item; onSalvar: (campos: CamposItem) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-white px-4 py-3">
      <NumeroCampo
        id={`effort-${item.id}`}
        rotulo="Esforço: semanas de trabalho"
        valor={item.effort}
        placeholder="ex.: 2"
        onSalvar={(v) => v !== 0 && onSalvar({ effort: v })}
      />
      <ul className="list-disc pl-4 text-xs text-muted-foreground">
        <li>1 semana = uma pessoa do time dedicada por 5 dias úteis.</li>
        <li>Conte tudo até a área usar: construção, testes, ajustes e implantação.</li>
        <li>Referências: painel novo ≈ 2 a 3 semanas; convocação nova ≈ 2; integração ≈ 6 ou mais.</li>
      </ul>
    </div>
  );
}
