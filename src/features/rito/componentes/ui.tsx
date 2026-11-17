import type React from "react";
import { cn } from "@/lib/utils";
import { scoreDoCard, type ItemRice } from "../regras";
import type { StatusExibido } from "../tipos";

const foco =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Botao({
  variante = "secundario",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "secundario" | "fantasma" | "perigo" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        foco,
        variante === "primario" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variante === "secundario" && "border border-border bg-white text-foreground hover:bg-muted",
        variante === "fantasma" && "text-muted-foreground hover:bg-muted hover:text-foreground",
        variante === "perigo" && "border border-destructive/40 bg-white text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    />
  );
}

/** Grupo de opções fixas (escalas do RICE, pilares). */
export function Escolha<T extends string | number>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { valor: T; nome: string; dica?: string }[];
  valor: T | null;
  onChange: (v: T | null) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={ativo}
            title={o.dica}
            onClick={() => onChange(ativo ? null : o.valor)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              foco,
              ativo
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {o.nome}
          </button>
        );
      })}
    </div>
  );
}

export function Score({ item, grande = false }: { item: ItemRice; grande?: boolean }) {
  const { valor, tipo } = scoreDoCard(item);
  if (valor == null) {
    return <span className={cn("text-xs text-muted-foreground", grande && "text-sm")}>sem nota</span>;
  }
  return (
    <span
      title={tipo === "rice" ? "RICE: alcance × impacto × confiança ÷ esforço" : "Pré-score: alcance × impacto × confiança (sem esforço ainda)"}
      className={cn(
        "inline-flex items-baseline gap-1 tabular-nums",
        grande ? "text-2xl font-semibold text-foreground" : "text-sm font-semibold text-foreground",
      )}
    >
      {valor.toLocaleString("pt-BR")}
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {tipo === "rice" ? "RICE" : "pré"}
      </span>
    </span>
  );
}

const STATUS_PRODUTO: Record<StatusExibido, { nome: string; cor: string }> = {
  entregue: { nome: "Entregue", cor: "bg-primary/10 text-primary" },
  em_implantacao: { nome: "Em implantação", cor: "bg-[hsl(var(--amber))]/15 text-[hsl(30_70%_32%)]" },
  em_construcao: { nome: "Em construção", cor: "border border-primary/40 text-primary" },
  em_avaliacao: { nome: "Em avaliação", cor: "border border-border text-muted-foreground" },
  parado: { nome: "Parado", cor: "bg-muted text-muted-foreground" },
};

export function StatusProdutoPill({ status }: { status: StatusExibido }) {
  const s = STATUS_PRODUTO[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", s.cor)}>{s.nome}</span>;
}

export function Aviso({ texto, onFechar }: { texto: string; onFechar?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <span>{texto}</span>
      {onFechar && (
        <button type="button" onClick={onFechar} className="shrink-0 font-medium underline underline-offset-4">
          dispensar
        </button>
      )}
    </div>
  );
}

export function Campo({ rotulo, children, dica }: { rotulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      {children}
      {dica && <span className="text-xs text-muted-foreground">{dica}</span>}
    </div>
  );
}

export const estiloEntrada =
  "w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
