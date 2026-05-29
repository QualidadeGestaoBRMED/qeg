import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import type { TeamLoadItem } from "../types";

interface TeamLoadBoardProps {
  items: TeamLoadItem[];
}

function getLoadColors(loadLevel: TeamLoadItem["loadLevel"]) {
  if (loadLevel === "critical") {
    return {
      value: "text-destructive",
      fill: "hsl(var(--destructive))",
      label: "text-destructive",
    };
  }

  if (loadLevel === "high") {
    return {
      value: "text-[hsl(var(--amber))]",
      fill: "hsl(var(--amber))",
      label: "text-[hsl(var(--amber))]",
    };
  }

  return {
    value: "text-primary",
    fill: "hsl(var(--primary))",
    label: "text-muted-foreground",
  };
}

export function TeamLoadBoard({ items }: TeamLoadBoardProps) {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => {
        const colors = getLoadColors(item.loadLevel);

        return (
          <article
            key={item.name}
            className="rounded-xl border border-border/60 bg-white px-5 py-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.prioritizedCardCount} proximos mapeados
                </p>
              </div>

              <div className="flex items-baseline gap-2 text-right">
                <span className={`text-3xl font-semibold leading-none tracking-tight ${colors.value}`}>
                  {item.activeCardCount}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  ativos
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Meter className="h-1.5 flex-1" value={item.activeCardCount} max={3}>
                <MeterTrack className="h-1.5">
                  <MeterIndicator
                    style={{ width: `${item.loadRatio * 100}%`, backgroundColor: colors.fill }}
                  />
                </MeterTrack>
              </Meter>
              <span className={`shrink-0 text-xs font-medium ${colors.label}`}>
                {item.loadLabel}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
