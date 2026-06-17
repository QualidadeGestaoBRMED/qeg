import { useState } from "react";
import { daysUntil, findAvailableBySkill } from "../domain/talent";
import type { SkillCoverage, TalentMatrixRow } from "../types";

type TalentView = "pessoas" | "alocar" | "gaps";

interface TalentBoardProps {
  matrix: TalentMatrixRow[];
  coverage: SkillCoverage[];
  skills: string[];
}

function deliveryLabel(date: string | null): { text: string; color: string } | null {
  if (!date) return null;
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0) return { text: "prazo vencido", color: "text-destructive" };
  if (days === 0) return { text: "entrega hoje", color: "text-[hsl(var(--amber))]" };
  if (days === 1) return { text: "entrega amanhã", color: "text-[hsl(var(--amber))]" };
  return { text: `entrega em ${days}d`, color: "text-muted-foreground" };
}

function LoadDot({ level }: { level: TalentMatrixRow["loadLevel"] }) {
  const colors = { ok: "bg-primary", high: "bg-[hsl(var(--amber))]", critical: "bg-destructive" };
  const labels = { ok: "Carga ok", high: "Carga alta", critical: "Carga crítica" };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${colors[level]}`} />
      <span className="text-xs text-muted-foreground">{labels[level]}</span>
    </span>
  );
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

function SenioridadeChip({ value }: { value: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {value}
    </span>
  );
}

function PersonCard({ row }: { row: TalentMatrixRow }) {
  const delivery = deliveryLabel(row.soonestDelivery);
  const skillEntries = Object.entries(row.skills);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.name}</p>
          <div className="mt-1">
            <SenioridadeChip value={row.senioridade} />
          </div>
        </div>
        <LoadDot level={row.loadLevel} />
      </div>

      {skillEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skillEntries.map(([skill, level]) => (
            <SkillPill key={skill} skill={skill} level={level} />
          ))}
        </div>
      )}

      {delivery && (
        <p className={`text-xs ${delivery.color}`}>{delivery.text}</p>
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
  const disponiveis = filtered.filter((r) => r.loadLevel === "ok");
  const ocupados = filtered.filter((r) => r.loadLevel !== "ok");

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
          Nenhum membro com skill <strong>{selected}</strong>.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {disponiveis.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Disponíveis agora — {disponiveis.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {disponiveis.map((row) => (
                  <article
                    key={row.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{row.name}</p>
                      <SenioridadeChip value={row.senioridade} />
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
                Ocupados — {ocupados.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ocupados.map((row) => {
                  const delivery = deliveryLabel(row.soonestDelivery);
                  return (
                    <article
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white px-5 py-3"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{row.name}</p>
                        {delivery && (
                          <p className={`text-xs ${delivery.color}`}>{delivery.text}</p>
                        )}
                      </div>
                      <LoadDot level={row.loadLevel} />
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

function GapsView({ coverage }: { coverage: SkillCoverage[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {coverage.map((item) => {
        const nextDays =
          item.nextDelivery ? daysUntil(item.nextDelivery) : null;
        const allOccupied = item.total > 0 && item.available === 0;
        const coverageRatio = item.total > 0 ? item.available / item.total : 0;

        return (
          <article
            key={item.skill}
            className={`rounded-xl border bg-white px-5 py-4 ${
              allOccupied ? "border-destructive/30" : "border-border/60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{item.skill}</p>
              <span
                className={`text-xs font-medium ${
                  item.available > 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {item.available}/{item.total} livres
              </span>
            </div>

            {item.total > 0 && (
              <>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      coverageRatio === 0 ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ width: `${Math.max(coverageRatio * 100, item.total > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.strong} forte{item.strong !== 1 ? "s" : ""}</span>
                  {allOccupied && nextDays !== null && (
                    <span className="text-[hsl(var(--amber))]">
                      {nextDays <= 0 ? "libera em breve" : `libera em ~${nextDays}d`}
                    </span>
                  )}
                </div>
              </>
            )}

            {item.total === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Nenhum membro mapeado</p>
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
    { key: "gaps", label: "Gaps" },
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
      {view === "gaps" && <GapsView coverage={coverage} />}
    </div>
  );
}
