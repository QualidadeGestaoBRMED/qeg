import type React from "react";
import { useMemo, useState } from "react";
import { daysUntil, findAvailableBySkill } from "../domain/talent";
import type { SkillCoverage, TalentMatrixRow } from "../types";

type TalentView = "pessoas" | "alocar" | "montar" | "balanco";

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

function freeInLabel(days: number | null): string {
  if (days === null) return "sem prazo definido";
  if (days < 0) return `atrasado há ${-days}d`;
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ~${days}d`;
}

function cardDeliveryLabel(date: string | null): { text: string; color: string } {
  const days = date ? daysUntil(date) : null;
  if (days === null) return { text: "sem prazo", color: "text-muted-foreground" };
  if (days < 0) return { text: `atrasado há ${-days}d`, color: "text-destructive" };
  if (days === 0) return { text: "entrega hoje", color: "text-[hsl(var(--amber))]" };
  if (days === 1) return { text: "entrega amanhã", color: "text-[hsl(var(--amber))]" };
  return { text: `entrega em ${days}d`, color: "text-muted-foreground" };
}

function soonestFreeDays(rows: TalentMatrixRow[]): number | null {
  const nums = rows
    .map((r) => (r.soonestDelivery ? daysUntil(r.soonestDelivery) : null))
    .filter((n): n is number => n !== null);
  return nums.length ? Math.min(...nums) : null;
}

function byAvailability(a: TalentMatrixRow, b: TalentMatrixRow): number {
  const af = a.activeCardCount === 0 ? 0 : 1;
  const bf = b.activeCardCount === 0 ? 0 : 1;
  if (af !== bf) return af - bf;
  const ad = a.soonestDelivery ? (daysUntil(a.soonestDelivery) ?? Infinity) : Infinity;
  const bd = b.soonestDelivery ? (daysUntil(b.soonestDelivery) ?? Infinity) : Infinity;
  return ad - bd;
}

/** Tooltip leve, sem dependência. Largura limitada e texto quebrável (não estoura com texto longo). */
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-max max-w-[240px] whitespace-normal break-words rounded-lg bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-lg group-hover/tip:block"
      >
        {label}
      </span>
    </span>
  );
}

function SkillTag({ skill, level }: { skill: string; level: string }) {
  const isForte = level === "forte";
  return (
    <Tip label={isForte ? `${skill} · forte` : `${skill} · em desenvolvimento`}>
      <span
        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${
          isForte
            ? "bg-primary/10 text-primary"
            : "border border-border text-muted-foreground"
        }`}
      >
        {skill}
      </span>
    </Tip>
  );
}

function ProjectsList({ row, prefix }: { row: TalentMatrixRow; prefix?: string }) {
  if (row.cards.length === 0) return null;
  return (
    <div>
      {prefix && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{prefix}</p>
      )}
      <ul className="mt-2 flex flex-col gap-2">
        {row.cards.map((card, i) => {
          const d = cardDeliveryLabel(card.deliveryDate);
          return (
            <li key={`${row.name}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-foreground">{card.title}</span>
              <span className={`shrink-0 text-xs font-medium ${d.color}`}>{d.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────── Pessoas ───────────────────────────────

function PersonCard({ row }: { row: TalentMatrixRow }) {
  const avail = availability(row);
  const skillEntries = Object.entries(row.skills);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
          <p className={`mt-1 text-sm font-medium ${avail.color}`}>{avail.text}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xl font-semibold leading-none text-foreground">
            {row.activeCardCount}
          </span>
          <span className="ml-1 text-xs uppercase tracking-wide text-muted-foreground">ativos</span>
        </div>
      </div>

      {skillEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skillEntries.map(([skill, level]) => (
            <SkillTag key={skill} skill={skill} level={level} />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {matrix.map((row) => (
        <PersonCard key={row.name} row={row} />
      ))}
    </div>
  );
}

// ──────────────────────────────── Alocar ───────────────────────────────

function AlocarView({ matrix, skills }: { matrix: TalentMatrixRow[]; skills: string[] }) {
  const [selected, setSelected] = useState(skills[0] ?? "");
  const filtered = findAvailableBySkill(matrix, selected);
  const livres = filtered.filter((r) => r.activeCardCount === 0);
  const ocupados = filtered.filter((r) => r.activeCardCount > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => setSelected(skill)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selected === skill
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
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
        <div className="flex flex-col gap-8">
          {livres.length > 0 && (
            <section className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-primary">Livres agora — {livres.length}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {livres.map((row) => (
                  <article
                    key={row.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"
                  >
                    <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
                    <SkillTag skill={row.skills[selected]} level={row.skills[selected]} />
                  </article>
                ))}
              </div>
            </section>
          )}

          {ocupados.length > 0 && (
            <section className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-muted-foreground">
                Ocupados — liberam em breve
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ocupados.map((row) => {
                  const avail = availability(row);
                  return (
                    <article
                      key={row.name}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-white p-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
                        <p className={`mt-0.5 text-sm font-medium ${avail.color}`}>{avail.text}</p>
                      </div>
                      <SkillTag skill={row.skills[selected]} level={row.skills[selected]} />
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────── Montar demanda (quadro arrasta-e-solta) ───────────────

function PoolCard({
  row,
  coveredSkills,
  selectedCount,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  row: TalentMatrixRow;
  coveredSkills: string[];
  selectedCount: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const [open, setOpen] = useState(false);
  const avail = availability(row);
  const otherSkills = Object.keys(row.skills).filter((s) => !coveredSkills.includes(s));
  const coversAll = selectedCount > 1 && coveredSkills.length === selectedCount;

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", row.name);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-2xl border bg-white p-5 transition-shadow active:cursor-grabbing hover:shadow-sm ${
        coversAll ? "border-primary/40" : "border-border/50"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
            {selectedCount > 1 && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  coversAll ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                cobre {coveredSkills.length}/{selectedCount}
              </span>
            )}
          </div>
          <p className={`mt-1 text-sm font-medium ${avail.color}`}>{avail.text}</p>
        </div>
        {row.cards.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {open ? "ocultar" : `${row.activeCardCount} projeto${row.activeCardCount !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {coveredSkills.map((s) => (
          <SkillTag key={s} skill={s} level={row.skills[s]} />
        ))}
        {otherSkills.length > 0 && (
          <Tip label={otherSkills.join(", ")}>
            <span className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
              +{otherSkills.length}
            </span>
          </Tip>
        )}
      </div>

      {open && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <ProjectsList row={row} prefix="Em andamento" />
        </div>
      )}
    </article>
  );
}

function RoleSlot({
  skill,
  pickedRow,
  isValidTarget,
  isDragActive,
  onDrop,
  onClear,
}: {
  skill: string;
  pickedRow: TalentMatrixRow | undefined;
  isValidTarget: boolean;
  isDragActive: boolean;
  onDrop: (name: string) => void;
  onClear: () => void;
}) {
  const [over, setOver] = useState(false);

  const border = pickedRow
    ? "border-solid border-primary/30 bg-primary/5"
    : isDragActive
      ? isValidTarget
        ? over
          ? "border-solid border-primary bg-primary/10"
          : "border-dashed border-primary/60"
        : "border-dashed border-border opacity-40"
      : "border-dashed border-border";

  return (
    <div
      onDragOver={(e) => {
        if (isValidTarget && !pickedRow) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop(e.dataTransfer.getData("text/plain"));
      }}
      className={`rounded-2xl border-2 p-5 transition-colors ${border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {skill}
        </span>
        {pickedRow && (
          <button
            type="button"
            onClick={onClear}
            aria-label="remover"
            className="rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            remover
          </button>
        )}
      </div>

      {pickedRow ? (
        <div className="mt-3">
          <p className="text-base font-semibold text-foreground">{pickedRow.name}</p>
          <p className={`mt-0.5 text-sm font-medium ${availability(pickedRow).color}`}>
            {availability(pickedRow).text}
          </p>
          {pickedRow.activeCardCount > 0 && (
            <div className="mt-3 border-t border-primary/15 pt-3">
              <ProjectsList row={pickedRow} prefix="Para liberar, pausaria" />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Arraste para cá alguém com <span className="font-medium text-foreground">{skill}</span>
        </p>
      )}
    </div>
  );
}

function MontarView({ matrix, skills }: { matrix: TalentMatrixRow[]; skills: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);

  const toggle = (skill: string) => {
    setSelected((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
    setPicks((prev) => {
      if (!(skill in prev)) return prev;
      const copy = { ...prev };
      delete copy[skill];
      return copy;
    });
  };

  const pool = useMemo(() => {
    if (selected.length === 0) return [];
    return matrix
      .map((row) => ({ row, covered: selected.filter((s) => s in row.skills) }))
      .filter((c) => c.covered.length > 0)
      .sort((a, b) =>
        b.covered.length !== a.covered.length
          ? b.covered.length - a.covered.length
          : byAvailability(a.row, b.row),
      );
  }, [matrix, selected]);

  // Menor conjunto de pessoas que cobre todas as skills selecionadas (greedy set cover).
  const suggestion = useMemo(() => {
    if (selected.length < 2) return null;
    const uncovered = new Set(selected);
    const people: { row: TalentMatrixRow; cover: string[] }[] = [];
    while (uncovered.size > 0) {
      let best: TalentMatrixRow | null = null;
      let bestCover: string[] = [];
      for (const row of matrix) {
        if (people.some((p) => p.row.name === row.name)) continue;
        const cover = [...uncovered].filter((s) => s in row.skills);
        const better =
          cover.length > bestCover.length ||
          (cover.length === bestCover.length &&
            cover.length > 0 &&
            best !== null &&
            row.activeCardCount < best.activeCardCount);
        if (better) {
          best = row;
          bestCover = cover;
        }
      }
      if (!best || bestCover.length === 0) break;
      people.push({ row: best, cover: bestCover });
      bestCover.forEach((s) => uncovered.delete(s));
    }
    return { people, uncoverable: [...uncovered] };
  }, [matrix, selected]);

  const draggingRow = dragging ? matrix.find((r) => r.name === dragging) : null;

  const assign = (skill: string, name: string) => {
    const row = matrix.find((r) => r.name === name);
    if (row && skill in row.skills) setPicks((prev) => ({ ...prev, [skill]: name }));
    setDragging(null);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const next: Record<string, string> = {};
    for (const p of suggestion.people) {
      for (const s of p.cover) next[s] = p.row.name;
    }
    setPicks(next);
  };

  const team = selected
    .filter((s) => picks[s])
    .map((s) => ({ skill: s, row: matrix.find((r) => r.name === picks[s]) }))
    .filter((t): t is { skill: string; row: TalentMatrixRow } => Boolean(t.row));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">Quais skills a demanda precisa?</p>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => {
            const active = selected.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggle(skill)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Selecione as skills da demanda. Aí monto o time arrastando as pessoas pras vagas.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {suggestion && suggestion.people.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {suggestion.people.length === 1
                      ? `${suggestion.people[0].row.name} cobre as ${selected.length} skills sozinho.`
                      : `Menor time: ${suggestion.people.length} pessoas cobrem a demanda.`}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {suggestion.people.map((p) => (
                      <li key={p.row.name} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{p.row.name}</span> —{" "}
                        {p.cover.join(", ")}
                        {p.row.activeCardCount > 0 && <span> · {availability(p.row).text}</span>}
                      </li>
                    ))}
                    {suggestion.uncoverable.length > 0 && (
                      <li className="text-sm text-destructive">
                        Ninguém cobre: {suggestion.uncoverable.join(", ")}
                      </li>
                    )}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Aplicar sugestão
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Time disponível</h3>
              <span className="text-xs text-muted-foreground">arraste para uma vaga →</span>
            </div>
            {pool.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguém com as skills selecionadas.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {pool.map(({ row, covered }) => (
                  <PoolCard
                    key={row.name}
                    row={row}
                    coveredSkills={covered}
                    selectedCount={selected.length}
                    isDragging={dragging === row.name}
                    onDragStart={() => setDragging(row.name)}
                    onDragEnd={() => setDragging(null)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Vagas da demanda — {team.length}/{selected.length}
            </h3>
            <div className="flex flex-col gap-3">
              {selected.map((skill) => (
                <RoleSlot
                  key={skill}
                  skill={skill}
                  pickedRow={picks[skill] ? matrix.find((r) => r.name === picks[skill]) : undefined}
                  isValidTarget={Boolean(draggingRow && skill in draggingRow.skills)}
                  isDragActive={Boolean(draggingRow)}
                  onDrop={(name) => assign(skill, name)}
                  onClear={() =>
                    setPicks((prev) => {
                      const copy = { ...prev };
                      delete copy[skill];
                      return copy;
                    })
                  }
                />
              ))}
            </div>

            {team.length > 0 && (
              <div className="mt-2 rounded-2xl border border-border/50 bg-muted/30 p-5">
                <p className="text-sm font-semibold text-foreground">Resumo da escalação</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {team.map(({ skill, row }) => {
                    const livre = row.activeCardCount === 0;
                    return (
                      <li key={skill} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {skill} → <span className="font-medium text-foreground">{row.name}</span>
                        </span>
                        <span
                          className={`shrink-0 text-xs font-medium ${livre ? "text-primary" : "text-[hsl(var(--amber))]"}`}
                        >
                          {livre
                            ? "livre"
                            : `pausar ${row.activeCardCount} projeto${row.activeCardCount !== 1 ? "s" : ""}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Demanda × Oferta ──────────────────────────

type BalancoStatus = "gargalo" | "apertado" | "ocioso" | "ok";

function computeStatus(item: SkillCoverage): BalancoStatus {
  if (item.demandCount > 0 && item.available === 0) return "gargalo";
  if (item.demandCount > item.available) return "apertado";
  if (item.demandCount === 0 && item.available > 0) return "ocioso";
  return "ok";
}

const STATUS_META: Record<BalancoStatus, { label: string; chip: string; dot: string }> = {
  gargalo: { label: "gargalo", chip: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  apertado: {
    label: "apertado",
    chip: "bg-[hsl(var(--amber))]/10 text-[hsl(var(--amber))]",
    dot: "bg-[hsl(var(--amber))]",
  },
  ocioso: { label: "capacidade ociosa", chip: "bg-muted text-muted-foreground", dot: "bg-border" },
  ok: { label: "equilibrado", chip: "bg-primary/10 text-primary", dot: "bg-primary" },
};

const STATUS_ORDER: Record<BalancoStatus, number> = { gargalo: 0, apertado: 1, ok: 2, ocioso: 3 };

function BalancoView({ coverage }: { coverage: SkillCoverage[] }) {
  const rows = coverage
    .filter((item) => item.demandCount > 0 || item.total > 0)
    .map((item) => ({ ...item, status: computeStatus(item) }))
    .sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.demandCount - a.demandCount,
    );

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados de demanda ou skills.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((item) => {
        const meta = STATUS_META[item.status];
        const nextDays = item.nextDelivery ? daysUntil(item.nextDelivery) : null;
        const showNote =
          (item.status === "gargalo" || item.status === "apertado") && item.demandCount > 0;

        return (
          <article key={item.skill} className="rounded-2xl border border-border/50 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden />
                <p className="text-base font-semibold text-foreground">{item.skill}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${meta.chip}`}>
                {meta.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Demanda
                </p>
                <p className="mt-2 text-3xl font-semibold leading-none text-foreground">
                  {item.demandCount}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  card{item.demandCount !== 1 ? "s" : ""} na sprint
                </p>
              </div>

              <div className="border-l border-border/70 pl-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Oferta
                </p>
                <p className="mt-2 text-3xl font-semibold leading-none">
                  <span className={item.available > 0 ? "text-primary" : "text-destructive"}>
                    {item.available}
                  </span>
                  <span className="text-muted-foreground">/{item.total}</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.total === 0 ? "ninguém mapeado" : "livres / qualificados"}
                </p>
              </div>
            </div>

            {showNote && (
              <p className="mt-5 text-sm text-muted-foreground">
                {item.available > 0 ? (
                  <>
                    <span className="font-medium text-primary">{item.available} livre</span>
                    {item.available !== 1 ? "s" : ""} para {item.demandCount} card
                    {item.demandCount !== 1 ? "s" : ""}.
                  </>
                ) : item.total === 0 ? (
                  "Ninguém com essa skill mapeado no time."
                ) : (
                  <>
                    Ninguém livre agora · próximo a liberar{" "}
                    <span className="font-medium text-foreground">{freeInLabel(nextDays)}</span>.
                  </>
                )}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

// ─────────────────────────────── Board ─────────────────────────────────

export function TalentBoard({ matrix, coverage, skills }: TalentBoardProps) {
  const [view, setView] = useState<TalentView>("pessoas");

  const views: { key: TalentView; label: string }[] = [
    { key: "pessoas", label: "Pessoas" },
    { key: "alocar", label: "Alocar" },
    { key: "montar", label: "Montar demanda" },
    { key: "balanco", label: "Demanda × Oferta" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex w-fit flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
      {view === "montar" && <MontarView matrix={matrix} skills={skills} />}
      {view === "balanco" && <BalancoView coverage={coverage} />}
    </div>
  );
}
