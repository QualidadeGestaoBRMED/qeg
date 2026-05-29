import type { AreaBoardItem, PlannedLaneSummary } from "../types";

interface AreaBoardProps {
  items: AreaBoardItem[];
  plannedLanes: PlannedLaneSummary[];
}

export function AreaBoard({ items, plannedLanes }: AreaBoardProps) {
  return (
    <section className="space-y-4">
      {plannedLanes.length === 0 ? (
        <article className="rounded-xl border border-border/60 bg-white p-4 text-sm text-muted-foreground">
          Nenhum card priorizado encontrado nas colunas monitoradas do QEG.
        </article>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${plannedLanes.length}, minmax(0, 1fr))` }}
        >
          {plannedLanes.map((lane) => (
            <article key={lane.id} className="rounded-xl border border-border/60 bg-white p-4">
              <p className="text-sm font-medium text-muted-foreground">{lane.label}</p>
              <p className="mt-2 text-[42px] font-bold leading-none tracking-tight text-foreground">
                {lane.count}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Cards planejados nesta coluna</p>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">QEG por area</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contagem por setor impactado, separando em execucao e planejado.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Em execucao</th>
                <th className="px-4 py-3">Planejado</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={4}>
                    Nenhuma area encontrada no QEG.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.area} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{item.area}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {item.activeCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-secondary/20 px-2 py-1 text-xs font-medium text-foreground">
                        {item.plannedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {item.activeCount + item.plannedCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
