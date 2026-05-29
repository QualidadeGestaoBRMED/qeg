import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import { CardChip } from "./CardChip";
import { getLoadLabel, getLoadLevel, getLoadRatio } from "../domain";
import type { AssigneeGroup } from "../types";

interface AssigneeLaneProps {
  group: AssigneeGroup;
}

export function AssigneeLane({ group }: AssigneeLaneProps) {
  const [isNextOpen, setIsNextOpen] = useState(false);
  const activeCardCount = group.activeCards.length;
  const loadLevel = getLoadLevel(activeCardCount);
  const loadRatio = getLoadRatio(activeCardCount) * 100;
  const loadLabel = getLoadLabel(loadLevel);

  const loadBarColor =
    loadLevel === "critical"
      ? "hsl(var(--destructive))"
      : loadLevel === "high"
        ? "hsl(var(--amber))"
        : "hsl(var(--primary))";
  const loadTextColor =
    loadLevel === "critical"
      ? "text-destructive"
      : loadLevel === "high"
        ? "text-[hsl(var(--amber))]"
        : "text-primary";

  return (
    <section className="rounded-lg border border-border bg-card px-4 py-4 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{group.name}</p>
            <span className="text-sm text-muted-foreground">
              {activeCardCount} {activeCardCount === 1 ? "card ativo" : "cards ativos"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2.5">
              {group.activeCards.map((card) => (
                <CardChip
                  key={card.id}
                  title={card.title}
                  pipeColor={card.pipeColor}
                  pipeName={card.pipeName}
                  status="active"
                />
              ))}
            </div>

            <div className="w-full max-w-[148px] shrink-0 lg:ml-auto">
              <Meter className="mt-2" value={activeCardCount} max={3}>
                <MeterTrack>
                  <MeterIndicator style={{ width: `${loadRatio}%`, backgroundColor: loadBarColor }} />
                </MeterTrack>
              </Meter>
              <p className={`mt-2 text-right text-xs font-medium ${loadTextColor}`}>{loadLabel}</p>
            </div>
          </div>

          {activeCardCount === 0 && (
            <div className="rounded-md border border-[hsl(var(--amber)/0.32)] bg-[hsl(var(--amber)/0.12)] px-3 py-2 text-sm text-[hsl(var(--amber))]">
              Sem card ativo — disponível para receber demanda
            </div>
          )}

          {activeCardCount > 0 && group.prioritizedCards.length === 0 && (
            <div className="rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              Sem proximo definido
            </div>
          )}

          {group.prioritizedCards.length > 0 && (
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setIsNextOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Proximos
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{group.prioritizedCards.length}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isNextOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isNextOpen && (
                <div className="mt-3 flex min-w-0 flex-wrap gap-2.5">
                  {group.prioritizedCards.map((card) => (
                    <CardChip
                      key={card.id}
                      title={card.title}
                      pipeColor={card.pipeColor}
                      pipeName={card.pipeName}
                      status="next"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
