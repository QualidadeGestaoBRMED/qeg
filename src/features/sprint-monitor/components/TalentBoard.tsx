import { useState } from "react";
import { daysUntil, findAvailableBySkill } from "../domain/talent";
import type { SkillCoverage, TalentMatrixRow } from "../types";

type TalentView = "pessoas" | "alocar" | "balanco";

interface TalentBoardProps {
  matrix: TalentMatrixRow[];
  coverage: SkillCoverage[];
  skills: string[];
}

/** Disponibilidade binária: "livre" só com 0 cards; senão "ocupado · libera em ~Xd" pelo prazo. */
function availability(row: TalentMatrixRow): { text: string; color: string } {
  if (row.activeCardCount === 0) {
    return { text: "livre", color: "text-primary" };
  }
  if (row.soonestDelivery) {
    const days = daysUntil(row.soonestDelivery);
    if (days !== null) {
      if (days < 0) return { text: "ocupado · prazo vencido", color: "text-destructive" };
      if (days === 0) return { text: "ocupado · libera hoje", color: "text-[hsl(var(--amber))]" };
      if (days === 1) return { text: "ocupado · libera amanhã", color: "text-[hsl(var(--amber))]" };
      return { text: `ocupado · libera em ~${days}d`, color: "text-muted-foreground" };
    }
  }
  return { text: "ocupado · sem prazo", color: "text-muted-foreground" };
}

function SkillPill({ skill, level }: { skill: string; level: string }) {
  const isForte = level === "forte";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isForte
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : "bg-[hsl(var(--amber))]/10 text-[hsl(var(--amber))] ring-1 ring-[hsl(var(--amber))]/20"
      }`}
    >
      {skill}
    </span>
  );
}

function PersonCard({ row }: { row: TalentMatrixRow }) {
  const avail = availability(row);
  const skillEntries = Object.entries(row.skills);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.name}</p>
          <p className={`mt-0.5 text-xs font-medium ${avail.color}`}>{avail.text}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-foreground">{row.activeCardCount}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">ativos</span>
        </div>
      </div>

      {skillEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skillEntries.map(([skill, level]) => (
            <SkillPill key={skill} skill={skill} level={level} />
          ))}
        </div>
      )}
    </article>
  );
}

function PessoasView({ matrix }: { matrix: TalentMatrixRow[] }) {
  if (matrix.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum membro em <code>public/talent.json</code>.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {matrix.map((row) => (
        <PersonCard key={row.name} row={row} />
      ))}
    </div>
  );
}

function AlocarView({ matrix, skills }: { matrix: TalentMatrixRow[]; skills: string[] }) {
  const [selected, setSelected] = useState(skills[0] ?? "");
  const filtered = findAvailableBySkill(matrix, selected);
  const livres = filtered.filter((r) => r.activeCardCount === 0);
  const ocupados = filtered.filter((r) => r.activeCardCount > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => setSelected(skill)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              selected === skill
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {skill}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguém com a skill <strong>{selected}</strong> mapeado em <code>talent.json</code>.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {livres.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Livres agora — {livres.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {livres.map((row) => (
                  <article
                    key={row.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.activeCardCount} ativos</p>
                    </div>
                    <SkillPill skill={row.skills[selected]} level={row.skills[selected]} />
                  </article>
                ))}
              </div>
            </div>
          )}

          {ocupados.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ocupados — liberam em breve
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ocupados.map((row) => {
                  const avail = availability(row);
                  return (
                    <article
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{row.name}</p>
                        <p className={`text-xs font-medium ${avail.color}`}>{avail.text}</p>
                      </div>
                      <SkillPill skill={row.skills[selected]} level={row.skills[selected]} />
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type BalancoStatus = "gargalo" | "apertado" | "ocioso" | "ok";

function computeStatus(item: SkillCoverage): BalancoStatus {
  if (item.demandCount > 0 && item.available === 0) return "gargalo";
  if (item.demandCount > item.available) return "apertado";
  if (item.demandCount === 0 && item.available > 0) return "ocioso";
  return "ok";
}

const STATUS_META: Record<BalancoStatus, { label: string; chip: string; border: string }> = {
  gargalo: {
    label: "gargalo",
    chip: "bg-destructive/10 text-destructive",
    border: "border-l-destructive",
  },
  apertado: {
    label: "apertado",
    chip: "bg-[hsl(var(--amber))]/10 text-[hsl(var(--amber))]",
    border: "border-l-[hsl(var(--amber))]",
  },
  ocioso: {
    label: "capacidade ociosa",
    chip: "bg-muted text-muted-foreground",
    border: "border-l-border",
  },
  ok: { label: "equilibrado", chip: "bg-primary/10 text-primary", border: "border-l-primary" },
};

const STATUS_ORDER: Record<BalancoStatus, number> = {
  gargalo: 0,
  apertado: 1,
  ok: 2,
  ocioso: 3,
};

function BalancoView({ coverage }: { coverage: SkillCoverage[] }) {
  const rows = coverage
    .filter((item) => item.demandCount > 0 || item.total > 0)
    .map((item) => ({ ...item, status: computeStatus(item) }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.demandCount - a.demandCount,
    );

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados de demanda ou skills.</p>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((item) => {
        const meta = STATUS_META[item.status];
        const nextDays = item.nextDelivery ? daysUntil(item.nextDelivery) : null;

        return (
          <article
            key={item.skill}
            className={`rounded-xl border border-l-4 border-border/60 bg-white px-5 py-4 ${meta.border}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{item.skill}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>
                {meta.label}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-2xl font-semibold leading-none text-foreground">
                  {item.demandCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  card{item.demandCount !== 1 ? "s" : ""} na sprint
                </p>
              </div>

              <div className="text-muted-foreground/40 text-xl">→</div>

              <div className="flex-1 text-right">
                <p className="text-2xl font-semibold leading-none text-foreground">
                  <span className={item.available > 0 ? "text-primary" : "text-destructive"}>
                    {item.available}
                  </span>
                  <span className="text-muted-foreground">/{item.total}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.total === 0 ? "ninguém mapeado" : "livres / qualificados"}
                </p>
              </div>
            </div>

            {item.status === "gargalo" && (
              <p className="mt-3 text-xs text-destructive">
                {item.total === 0
                  ? "Demanda sem ninguém com a skill mapeada."
                  : nextDays !== null
                    ? nextDays <= 0
                      ? "Todos ocupados — liberação esperada em breve."
                      : `Todos ocupados — próxima liberação em ~${nextDays}d.`
                    : "Todos ocupados e sem prazo de entrega definido."}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function TalentBoard({ matrix, coverage, skills }: TalentBoardProps) {
  const [view, setView] = useState<TalentView>("pessoas");

  const views: { key: TalentView; label: string }[] = [
    { key: "pessoas", label: "Pessoas" },
    { key: "alocar", label: "Alocar" },
    { key: "balanco", label: "Demanda × Oferta" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "pessoas" && <PessoasView matrix={matrix} />}
      {view === "alocar" && <AlocarView matrix={matrix} skills={skills} />}
      {view === "balanco" && <BalancoView coverage={coverage} />}
    </div>
  );
}
