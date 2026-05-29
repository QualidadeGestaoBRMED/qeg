interface MetricsGridProps {
  metrics: {
    activeCards: number;
    withNextStep: number;
    withoutNextStep: number;
    unassignedCards: number;
  };
}

const metricCards = [
  {
    key: "activeCards",
    label: "Cards ativos",
  },
  {
    key: "withNextStep",
    label: "Com proximos definidos",
  },
  {
    key: "withoutNextStep",
    label: "Sem proximo passo",
  },
  {
    key: "unassignedCards",
    label: "Sem responsavel",
  },
] as const;

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metricCards.map((metric) => (
        <article
          key={metric.key}
          className="rounded-xl border border-border/60 bg-white px-5 py-4"
        >
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-[42px] font-bold leading-none tracking-tight text-foreground">
            {metrics[metric.key]}
          </p>
        </article>
      ))}
    </section>
  );
}
