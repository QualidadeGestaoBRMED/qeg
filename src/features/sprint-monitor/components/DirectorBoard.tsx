import type { DirectorView, RagStatus } from "../types";

interface DirectorBoardProps {
  view: DirectorView;
  totalActiveCards: number;
  totalPeople: number;
  isLoading: boolean;
}

const RAG_CONFIG = {
  green: {
    scoreBg: "bg-[hsl(var(--primary)/0.10)]",
    scoreBorder: "border-l-[5px] border-l-[hsl(var(--primary))]",
    scoreText: "text-[hsl(var(--primary))]",
    badgeBg: "bg-[hsl(var(--primary)/0.15)]",
    badgeText: "text-[hsl(var(--primary))]",
    dot: "bg-[hsl(var(--primary))]",
    insightsBorder: "border-[hsl(var(--primary)/0.20)]",
  },
  amber: {
    scoreBg: "bg-[hsl(var(--amber)/0.10)]",
    scoreBorder: "border-l-[5px] border-l-[hsl(var(--amber))]",
    scoreText: "text-[hsl(var(--amber))]",
    badgeBg: "bg-[hsl(var(--amber)/0.15)]",
    badgeText: "text-[hsl(var(--amber))]",
    dot: "bg-[hsl(var(--amber))]",
    insightsBorder: "border-[hsl(var(--amber)/0.20)]",
  },
  red: {
    scoreBg: "bg-[hsl(var(--destructive)/0.08)]",
    scoreBorder: "border-l-[5px] border-l-destructive",
    scoreText: "text-destructive",
    badgeBg: "bg-[hsl(var(--destructive)/0.12)]",
    badgeText: "text-destructive",
    dot: "bg-destructive",
    insightsBorder: "border-destructive/20",
  },
} satisfies Record<RagStatus, object>;

function ScoreBar({ score, rag }: { score: number; rag: RagStatus }) {
  const fillColor =
    rag === "green"
      ? "bg-[hsl(var(--primary))]"
      : rag === "amber"
        ? "bg-[hsl(var(--amber))]"
        : "bg-destructive";

  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
      <div
        className={`h-full rounded-full transition-all duration-700 ${fillColor}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export function DirectorBoard({ view, totalActiveCards, totalPeople, isLoading }: DirectorBoardProps) {
  if (isLoading) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-border/60 bg-white text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const cfg = RAG_CONFIG[view.ragStatus];
  const coverageColor =
    view.coveragePercent >= 75
      ? "text-[hsl(var(--primary))]"
      : view.coveragePercent >= 50
        ? "text-[hsl(var(--amber))]"
        : "text-destructive";

  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="flex flex-col lg:flex-row">
          <div className={`flex flex-col justify-center px-8 py-8 lg:w-[260px] lg:shrink-0 ${cfg.scoreBg} ${cfg.scoreBorder}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saúde do sprint</p>
            <p className={`mt-2 text-[80px] font-black leading-none tracking-tight ${cfg.scoreText}`}>{view.healthScore}</p>
            <p className="text-sm text-muted-foreground">de 100 pontos</p>
            <ScoreBar score={view.healthScore} rag={view.ragStatus} />
            <span className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {view.ragLabel}
            </span>
          </div>

          <div className={`flex-1 border-t lg:border-l lg:border-t-0 ${cfg.insightsBorder} px-8 py-8`}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Análise executiva</p>
            <ul className="flex flex-col gap-3">
              {view.insights.map((insight) => (
                <li key={insight} className="flex items-start gap-3 text-base text-foreground">
                  <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <article className="rounded-xl border border-border/60 bg-white px-5 py-5 text-center shadow-sm">
          <p className="text-[44px] font-black leading-none tracking-tight text-foreground">{totalPeople}</p>
          <p className="mt-2 text-sm text-muted-foreground">Pessoas no sprint</p>
        </article>
        <article className="rounded-xl border border-border/60 bg-white px-5 py-5 text-center shadow-sm">
          <p className="text-[44px] font-black leading-none tracking-tight text-foreground">{totalActiveCards}</p>
          <p className="mt-2 text-sm text-muted-foreground">Cards em execução</p>
        </article>
        <article className="rounded-xl border border-border/60 bg-white px-5 py-5 text-center shadow-sm">
          <p className={`text-[44px] font-black leading-none tracking-tight ${coverageColor}`}>{view.coveragePercent}%</p>
          <p className="mt-2 text-sm text-muted-foreground">Com próximo passo</p>
        </article>
      </section>
    </div>
  );
}
