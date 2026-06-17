import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Moon, Sun, X } from "lucide-react";
import type { AreaBoardItem, DirectorView, PersonStatus, PlannedLaneSummary, RagStatus, TeamLoadItem } from "../types";

interface DirectorPresentationProps {
  view: DirectorView;
  teamLoad: TeamLoadItem[];
  areaBoard: AreaBoardItem[];
  plannedLanes: PlannedLaneSummary[];
  totalActiveCards: number;
  totalPeople: number;
  lastUpdated: string | null;
  pipeNames: string | undefined;
  onClose: () => void;
}

// ── Theme interface ────────────────────────────────────────────────
interface PTheme {
  BG: string;
  CARD_BG: string;
  CARD_BORDER: string;
  TEXT: string;
  MUTED: string;
  DIM: string;
  BAR_TRACK: string;
  CHIP_BG: string;
  DIVIDER: string;
  PERSON_ROW_BG: string;
  NO_NEXT_BAR: string;
  BTN_DISABLED: string;
  TEAL: string;
  GOLD: string;
  RED: string;
  GREEN: string;
  AREA_ACTIVE: string;
  AREA_PLANNED: string;
  SQUAD_TEXT: string;
  COLORS: Record<RagStatus, { score: string; bar: string; dot: string; badge: string; badgeText: string; border: string }>;
  LOAD_COLORS: Record<string, { bar: string; label: string }>;
}

const DARK: PTheme = {
  BG:            "#193B4F",
  CARD_BG:       "rgba(0,120,145,0.14)",
  CARD_BORDER:   "rgba(126,191,204,0.18)",
  TEXT:          "#F3F3F3",
  MUTED:         "#BFC3C6",
  DIM:           "#DFE0E2",
  BAR_TRACK:     "rgba(191,195,198,0.22)",
  CHIP_BG:       "rgba(243,243,243,0.07)",
  DIVIDER:       "rgba(243,243,243,0.06)",
  PERSON_ROW_BG: "rgba(243,243,243,0.05)",
  NO_NEXT_BAR:   "rgba(243,243,243,0.20)",
  BTN_DISABLED:  "rgba(243,243,243,0.15)",
  TEAL:          "#00AFAA",
  GOLD:          "#CC851E",
  RED:           "#f87171",
  GREEN:         "#2CAD6E",
  AREA_ACTIVE:   "#00AFAA",
  AREA_PLANNED:  "rgba(155,213,225,0.35)",
  SQUAD_TEXT:    "#F3F3F3",
  COLORS: {
    green: { score: "#00AFAA", bar: "#00AFAA", dot: "#00AFAA", badge: "rgba(0,175,170,0.18)", badgeText: "#00AFAA", border: "rgba(0,175,170,0.28)" },
    amber: { score: "#CC851E", bar: "#CC851E", dot: "#CC851E", badge: "rgba(204,133,30,0.18)", badgeText: "#CC851E", border: "rgba(204,133,30,0.28)" },
    red:   { score: "#f87171", bar: "#f87171", dot: "#f87171", badge: "rgba(248,113,113,0.18)", badgeText: "#f87171", border: "rgba(248,113,113,0.28)" },
  },
  LOAD_COLORS: {
    critical: { bar: "#f87171", label: "#f87171" },
    high:     { bar: "#CC851E", label: "#CC851E" },
    ok:       { bar: "#00AFAA", label: "#00AFAA" },
  },
};

const LIGHT: PTheme = {
  BG:            "#F3F3F3",
  CARD_BG:       "#FFFFFF",
  CARD_BORDER:   "#DFE0E2",
  TEXT:          "#193B4F",
  MUTED:         "#767A7B",
  DIM:           "#BFC3C6",
  BAR_TRACK:     "rgba(25,59,79,0.08)",
  CHIP_BG:       "rgba(25,59,79,0.06)",
  DIVIDER:       "rgba(25,59,79,0.06)",
  PERSON_ROW_BG: "rgba(25,59,79,0.04)",
  NO_NEXT_BAR:   "rgba(25,59,79,0.15)",
  BTN_DISABLED:  "rgba(25,59,79,0.20)",
  TEAL:          "#007891",
  GOLD:          "#A05E1E",
  RED:           "#d94f4f",
  GREEN:         "#2CAD6E",
  AREA_ACTIVE:   "#007891",
  AREA_PLANNED:  "rgba(25,59,79,0.12)",
  SQUAD_TEXT:    "#193B4F",
  COLORS: {
    green: { score: "#007891", bar: "#007891", dot: "#007891", badge: "rgba(0,120,145,0.10)", badgeText: "#007891", border: "rgba(0,120,145,0.25)" },
    amber: { score: "#A05E1E", bar: "#A05E1E", dot: "#A05E1E", badge: "rgba(160,94,30,0.10)", badgeText: "#A05E1E", border: "rgba(160,94,30,0.25)" },
    red:   { score: "#d94f4f", bar: "#d94f4f", dot: "#d94f4f", badge: "rgba(217,79,79,0.10)", badgeText: "#d94f4f", border: "rgba(217,79,79,0.25)" },
  },
  LOAD_COLORS: {
    critical: { bar: "#d94f4f", label: "#d94f4f" },
    high:     { bar: "#A05E1E", label: "#A05E1E" },
    ok:       { bar: "#007891", label: "#007891" },
  },
};

const ThemeCtx = createContext<PTheme>(DARK);
function useTheme() { return useContext(ThemeCtx); }

function cvColor(pct: number, t: PTheme) {
  if (pct >= 75) return t.TEAL;
  if (pct >= 50) return t.GOLD;
  return t.RED;
}

// ── PersonDot ──────────────────────────────────────────────────────
function PersonDot({ person }: { person: PersonStatus }) {
  const t = useTheme();
  const dotColor =
    person.activeCardCount === 0
      ? t.TEAL
      : person.loadLevel === "critical"
        ? t.RED
        : person.loadLevel === "high"
          ? t.GOLD
          : t.TEAL;

  return (
    <div style={{ background: t.PERSON_ROW_BG }} className="flex items-center gap-3 rounded-xl px-4 py-3">
      <span style={{ background: dotColor }} className="h-2.5 w-2.5 shrink-0 rounded-full" />
      <span style={{ color: t.TEXT }} className="min-w-0 flex-1 truncate text-sm font-medium">
        {person.name.split(" ").slice(0, 2).join(" ")}
      </span>
      <span style={{ color: t.MUTED }} className="shrink-0 text-xs tabular-nums">
        {person.activeCardCount}
      </span>
      <span
        style={{ background: person.hasNextStep ? t.TEAL : t.NO_NEXT_BAR }}
        className="h-1.5 w-4 shrink-0 rounded-full"
      />
    </div>
  );
}

// ── Screen 1: Sprint Health ────────────────────────────────────────
function ScreenHealth({ view }: { view: DirectorView }) {
  const t = useTheme();
  const c = t.COLORS[view.ragStatus];
  const cv = cvColor(view.coveragePercent, t);

  return (
    <div className="flex flex-1 gap-5 overflow-hidden">
      <div className="flex w-[340px] shrink-0 flex-col gap-4">
        {/* Score card */}
        <div style={{ background: t.CARD_BG, borderColor: c.border }} className="rounded-2xl border px-7 py-6">
          <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">Saúde do sprint</p>
          <p style={{ color: c.score, fontSize: "clamp(60px,7vw,108px)", lineHeight: 1 }} className="mt-2 font-black tracking-tight">
            {view.healthScore}
          </p>
          <p style={{ color: t.MUTED }} className="mt-1 text-sm">de 100 pontos</p>
          <div style={{ background: t.BAR_TRACK }} className="mt-4 h-2 w-full overflow-hidden rounded-full">
            <div style={{ width: `${view.healthScore}%`, background: c.bar, transition: "width 0.8s ease" }} className="h-full rounded-full" />
          </div>
          <span style={{ background: c.badge, color: c.badgeText }} className="mt-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
            <span style={{ background: c.dot }} className="h-1.5 w-1.5 rounded-full" />
            {view.ragLabel}
          </span>
        </div>

        {/* Team grid */}
        <div style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="flex flex-1 flex-col overflow-hidden rounded-2xl border px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">Equipe</p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span style={{ background: t.TEAL }} className="h-1.5 w-3 rounded-full" />
                <span style={{ color: t.DIM }} className="text-[10px]">próximo</span>
              </span>
              <span className="flex items-center gap-1">
                <span style={{ background: t.NO_NEXT_BAR }} className="h-1.5 w-3 rounded-full" />
                <span style={{ color: t.DIM }} className="text-[10px]">sem próximo</span>
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 overflow-auto">
            {view.allPeople.map((p) => <PersonDot key={p.name} person={p} />)}
          </div>
        </div>
      </div>

      {/* Right: insights + KPIs */}
      <div className="flex flex-1 flex-col gap-4">
        <div style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="flex flex-1 flex-col justify-evenly rounded-2xl border px-10 py-8">
          {view.insights.map((insight, i) => {
            const match = insight.match(/^(\d+)\s(.+)$/);
            const num = match?.[1];
            const rest = match ? match[2] : insight;
            const isLast = i === view.insights.length - 1;
            return (
              <div key={insight}>
                <div className="flex items-baseline gap-4">
                  {num ? (
                    <>
                      <span style={{ color: c.score, fontSize: "clamp(36px,4.5vw,64px)", lineHeight: 1 }} className="shrink-0 font-black tabular-nums tracking-tight">{num}</span>
                      <span style={{ color: t.TEXT, fontSize: "clamp(14px,1.3vw,19px)" }} className="leading-snug">{rest}</span>
                    </>
                  ) : (
                    <span style={{ color: t.MUTED, fontSize: "clamp(13px,1.2vw,18px)" }} className="leading-snug">{insight}</span>
                  )}
                </div>
                {!isLast && <div style={{ background: t.DIVIDER, marginTop: 16 }} className="h-px w-full" />}
              </div>
            );
          })}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-4">
          {[
            { value: String(view.allPeople.length), label: "Pessoas no sprint", color: t.TEXT },
            { value: `${view.coveragePercent}%`, label: "Com próximo passo", color: cv },
            { value: String(view.criticalPeople.length), label: "Com carga crítica", color: view.criticalPeople.length > 0 ? t.RED : t.TEAL },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="rounded-2xl border px-6 py-5 text-center">
              <p style={{ color, fontSize: "clamp(26px,3vw,48px)", lineHeight: 1 }} className="font-black tracking-tight">{value}</p>
              <p style={{ color: t.DIM }} className="mt-2 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Team Load ────────────────────────────────────────────
function ScreenTeamLoad({ teamLoad, totalActiveCards }: { teamLoad: TeamLoadItem[]; totalActiveCards: number }) {
  const t = useTheme();
  const cols = teamLoad.length > 6 ? "grid-cols-3" : teamLoad.length > 3 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-hidden">
      <div style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="rounded-2xl border px-7 py-4">
        <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">Carga total</p>
        <p style={{ color: t.TEXT, fontSize: "clamp(28px,3.5vw,52px)", lineHeight: 1 }} className="mt-1 font-black tracking-tight">{totalActiveCards} cards</p>
      </div>

      <div className={`grid flex-1 gap-3 overflow-auto ${cols}`}>
        {teamLoad.map((item) => {
          const lc = t.LOAD_COLORS[item.loadLevel];
          return (
            <div key={item.name} style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="flex items-center gap-4 rounded-2xl border px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p style={{ color: t.TEXT }} className="truncate text-base font-semibold">{item.name}</p>
                  <span style={{ color: lc.label }} className="shrink-0 text-sm font-semibold">{item.loadLabel}</span>
                </div>
                <div style={{ background: t.BAR_TRACK }} className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full">
                  <div style={{ width: `${item.loadRatio * 100}%`, background: lc.bar, transition: "width 0.6s ease" }} className="h-full rounded-full" />
                </div>
                <p style={{ color: t.DIM }} className="mt-1.5 text-xs">
                  {item.activeCardCount} {item.activeCardCount === 1 ? "card ativo" : "cards ativos"}
                  {item.prioritizedCardCount > 0 && ` · ${item.prioritizedCardCount} próximo${item.prioritizedCardCount > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Screen 3: Coverage ─────────────────────────────────────────────
function ScreenCoverage({ view }: { view: DirectorView }) {
  const t = useTheme();
  const uncoveredPct = 100 - view.coveragePercent;
  const gapColor = uncoveredPct >= 30 ? t.RED : uncoveredPct >= 15 ? t.GOLD : t.TEAL;
  const chipStyle = { background: t.CHIP_BG, color: t.TEXT };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      {/* Hero metric */}
      <div style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="flex shrink-0 items-center gap-10 rounded-2xl border px-10 py-8">
        <div className="shrink-0">
          <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">Sem próxima demanda</p>
          <p style={{ color: gapColor, fontSize: "clamp(72px,10vw,130px)", lineHeight: 1 }} className="mt-2 font-black tracking-tight">
            {uncoveredPct}%
          </p>
        </div>
        <div className="flex-1">
          <p style={{ color: t.MUTED }} className="mb-4 text-lg">
            das pessoas ativas não têm a próxima demanda definida
          </p>
          <div style={{ background: t.BAR_TRACK }} className="h-3 w-full overflow-hidden rounded-full">
            <div style={{ width: `${uncoveredPct}%`, background: gapColor, transition: "width 0.8s ease" }} className="h-full rounded-full" />
          </div>
          <div className="mt-2.5 flex justify-between">
            <span style={{ color: t.DIM }} className="text-sm">{view.coveragePercent}% com próxima definida</span>
            <span style={{ color: gapColor }} className="text-sm font-semibold">{uncoveredPct}% sem próxima</span>
          </div>
        </div>
      </div>

      {/* People split */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {([
          { label: "Com próxima demanda", names: view.peopleWithNext, dot: t.TEAL },
          { label: "Sem próxima demanda", names: view.peopleWithoutNext, dot: t.RED },
        ]).map(({ label, names, dot }) => (
          <div key={label} style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="flex flex-1 flex-col overflow-hidden rounded-2xl border px-7 py-6">
            <div className="mb-5 flex shrink-0 items-center gap-2">
              <span style={{ background: dot }} className="h-2 w-2 shrink-0 rounded-full" />
              <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">
                {label} — {names.length} {names.length === 1 ? "pessoa" : "pessoas"}
              </p>
            </div>
            {names.length === 0 ? (
              <p style={{ color: t.MUTED }} className="text-sm">Nenhuma</p>
            ) : (
              <div className="flex flex-1 flex-col justify-evenly">
                {names.map((name, i) => (
                  <div key={name}>
                    <div className="flex items-center gap-3 py-0.5">
                      <span style={{ background: dot, opacity: 0.55 }} className="h-1.5 w-1.5 shrink-0 rounded-full" />
                      <span style={{ color: t.TEXT, fontSize: "clamp(13px,1.3vw,18px)" }} className="font-medium">
                        {name.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                    {i < names.length - 1 && (
                      <div style={{ background: t.DIVIDER }} className="mt-1 h-px w-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Screen 4: By Area ──────────────────────────────────────────────
function ScreenArea({ items, plannedLanes }: { items: AreaBoardItem[]; plannedLanes: PlannedLaneSummary[] }) {
  const t = useTheme();
  const maxTotal = Math.max(...items.map((i) => i.activeCount + i.plannedCount), 1);
  const sorted = [...items].sort((a, b) => (b.activeCount + b.plannedCount) - (a.activeCount + a.plannedCount));
  const squadTotal = plannedLanes.reduce((s, l) => s + l.count, 0);
  const SQUAD_COLORS = ["rgba(44,173,110,0.55)", "rgba(170,209,180,0.45)", "rgba(44,173,110,0.35)", "rgba(170,209,180,0.30)"];

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      {plannedLanes.length > 0 && squadTotal > 0 && (
        <div style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="shrink-0 rounded-2xl border px-8 py-5">
          <div className="mb-3 flex items-baseline gap-3">
            <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">Priorizados por squad</p>
            <p style={{ color: t.MUTED }} className="text-sm">{squadTotal} cards no total</p>
          </div>
          <div className="flex h-8 w-full overflow-hidden rounded-lg">
            {plannedLanes.map((lane, i) => {
              const pct = (lane.count / squadTotal) * 100;
              const shortName = lane.label.replace(/^Priorizados\s*[-–]\s*/i, "").split(" (")[0];
              return (
                <div
                  key={lane.id}
                  style={{ width: `${pct}%`, background: SQUAD_COLORS[i % SQUAD_COLORS.length], transition: "width 0.7s ease" }}
                  className="flex items-center justify-center overflow-hidden px-2"
                >
                  {pct > 12 && (
                    <span style={{ color: t.SQUAD_TEXT, fontSize: 11 }} className="truncate font-bold">
                      {shortName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-6">
            {plannedLanes.map((lane, i) => (
              <div key={lane.id} className="flex items-center gap-2">
                <span style={{ background: SQUAD_COLORS[i % SQUAD_COLORS.length] }} className="h-2.5 w-2.5 shrink-0 rounded-full" />
                <span style={{ color: t.MUTED }} className="text-xs">{lane.label.replace("Priorizados - ", "")}</span>
                <span style={{ color: t.TEXT }} className="text-xs font-bold tabular-nums">{lane.count}</span>
                <span style={{ color: t.DIM }} className="text-xs">({Math.round((lane.count / squadTotal) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: t.CARD_BG, borderColor: t.CARD_BORDER }} className="flex flex-1 flex-col overflow-hidden rounded-2xl border px-8 py-5">
        <div className="mb-3 flex shrink-0 items-center gap-5">
          <p style={{ color: t.DIM }} className="text-xs font-semibold uppercase tracking-widest">Demanda por área</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full" style={{ background: t.AREA_ACTIVE }} />
              <span style={{ color: t.DIM }} className="text-xs">Em execução</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full" style={{ background: t.AREA_PLANNED }} />
              <span style={{ color: t.DIM }} className="text-xs">Planejado</span>
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-around">
          {sorted.map((item) => {
            const total = item.activeCount + item.plannedCount;
            const activePct = (item.activeCount / maxTotal) * 100;
            const plannedPct = (item.plannedCount / maxTotal) * 100;
            return (
              <div key={item.area} className="flex items-center gap-3">
                <p style={{ color: t.MUTED, minWidth: "clamp(90px,12vw,180px)" }} className="shrink-0 truncate text-xs">
                  {item.area}
                </p>
                <div className="flex flex-1 items-center gap-0.5">
                  {item.activeCount > 0 && (
                    <div
                      style={{ width: `${activePct}%`, background: t.AREA_ACTIVE, minWidth: 3, transition: "width 0.6s ease" }}
                      className={`h-2 ${item.plannedCount === 0 ? "rounded-full" : "rounded-l-full"}`}
                    />
                  )}
                  {item.plannedCount > 0 && (
                    <div
                      style={{ width: `${plannedPct}%`, background: t.AREA_PLANNED, minWidth: 3, transition: "width 0.6s ease" }}
                      className={`h-2 ${item.activeCount === 0 ? "rounded-full" : "rounded-r-full"}`}
                    />
                  )}
                </div>
                <p style={{ color: t.DIM, minWidth: 28 }} className="shrink-0 text-right text-xs font-semibold tabular-nums">
                  {total}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SCREENS = [
  { id: "health",   label: "Saúde do Sprint" },
  { id: "team",     label: "Carga da Equipe" },
  { id: "coverage", label: "Próximos Passos" },
  { id: "area",     label: "Por Área"        },
];

// ── Main export ────────────────────────────────────────────────────
export function DirectorPresentation({
  view, teamLoad, areaBoard, plannedLanes,
  totalActiveCards, totalPeople, lastUpdated, pipeNames, onClose,
}: DirectorPresentationProps) {
  const [screen, setScreen] = useState(0);
  const [isLight, setIsLight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = isLight ? LIGHT : DARK;
  const c = t.COLORS[view.ragStatus];

  const prev = useCallback(() => setScreen((s) => Math.max(0, s - 1)), []);
  const next = useCallback(() => setScreen((s) => Math.min(SCREENS.length - 1, s + 1)), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", handleKey);
    containerRef.current?.requestFullscreen().catch(() => {});
    return () => {
      window.removeEventListener("keydown", handleKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose, next, prev]);

  const content = (
    <ThemeCtx.Provider value={t}>
      <div ref={containerRef} style={{ background: t.BG }} className="fixed inset-0 z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-10 pt-7">
          <div className="flex items-center gap-4">
            <p style={{ color: t.TEXT }} className="text-base font-semibold">{pipeNames ?? "Sprint"}</p>
            <span style={{ background: c.badge, color: c.badgeText }} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <span style={{ background: c.dot }} className="h-1.5 w-1.5 rounded-full" />
              {view.ragLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p style={{ color: t.DIM }} className="text-sm font-semibold">{SCREENS[screen].label}</p>
            {lastUpdated && <span style={{ color: t.DIM }} className="text-sm">· {lastUpdated}</span>}
            <button
              type="button"
              onClick={() => setIsLight((v) => !v)}
              style={{ color: t.DIM }}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:opacity-70"
              title={isLight ? "Modo escuro" : "Modo claro"}
            >
              {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ color: t.DIM }}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Screen content */}
        <div className="flex flex-1 flex-col overflow-hidden px-10 py-5">
          {screen === 0 && <ScreenHealth view={view} />}
          {screen === 1 && <ScreenTeamLoad teamLoad={teamLoad} totalActiveCards={totalActiveCards} />}
          {screen === 2 && <ScreenCoverage view={view} />}
          {screen === 3 && <ScreenArea items={areaBoard} plannedLanes={plannedLanes} />}
        </div>

        {/* Navigation */}
        <footer className="flex shrink-0 items-center justify-between px-10 pb-7">
          <button
            type="button"
            onClick={prev}
            disabled={screen === 0}
            style={{ color: screen === 0 ? t.BTN_DISABLED : t.MUTED }}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {SCREENS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScreen(i)}
                className="rounded-full transition-all"
                style={{
                  background: i === screen ? t.TEAL : t.NO_NEXT_BAR,
                  width: i === screen ? 24 : 8,
                  height: 8,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            disabled={screen === SCREENS.length - 1}
            style={{ color: screen === SCREENS.length - 1 ? t.BTN_DISABLED : t.MUTED }}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        </footer>
      </div>
    </ThemeCtx.Provider>
  );

  return createPortal(content, document.body);
}
