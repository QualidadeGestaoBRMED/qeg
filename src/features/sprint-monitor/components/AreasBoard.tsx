import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { daysUntil } from "../domain/talent";
import type { AreaBucketGroup, AreaCardRef, AreaDetail } from "../types";

function deliveryLabel(date: string | null): { text: string; color: string } | null {
  const days = date ? daysUntil(date) : null;
  if (days === null) return null;
  if (days < 0) return { text: `atrasado há ${-days}d`, color: "text-destructive" };
  if (days === 0) return { text: "entrega hoje", color: "text-[hsl(var(--amber))]" };
  if (days === 1) return { text: "entrega amanhã", color: "text-[hsl(var(--amber))]" };
  return { text: `entrega em ${days}d`, color: "text-muted-foreground" };
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
    />
  );
}

function Counts({ active, planned }: { active: number; planned: number }) {
  return (
    <span className="shrink-0 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{active}</span> ativo{active !== 1 ? "s" : ""}
      {planned > 0 && ` · ${planned} planejado${planned !== 1 ? "s" : ""}`}
    </span>
  );
}

function CardRow({ card }: { card: AreaCardRef }) {
  const d = deliveryLabel(card.deliveryDate);
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="flex min-w-0 items-baseline gap-2">
        <span
          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
            card.status === "active" ? "bg-primary" : "bg-muted-foreground/40"
          }`}
        />
        <span className="min-w-0 truncate text-sm text-foreground">{card.title}</span>
      </span>
      {d && <span className={`shrink-0 text-xs font-medium ${d.color}`}>{d.text}</span>}
    </li>
  );
}

function AreaRow({ detail }: { detail: AreaDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Chevron open={open} />
          <span className="truncate font-medium text-foreground">{detail.area}</span>
        </span>
        <Counts active={detail.activeCount} planned={detail.plannedCount} />
      </button>
      {open && (
        <ul className="border-t border-border/40 px-4 py-2">
          {detail.cards.map((card) => (
            <CardRow key={`${card.id}-${card.status}`} card={card} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BucketCard({ group }: { group: AreaBucketGroup }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-2xl border border-border/50 bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Chevron open={open} />
          <span className="truncate text-base font-semibold text-foreground">{group.bucket}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {group.areas.length} {group.areas.length === 1 ? "área" : "áreas"}
          </span>
        </span>
        <Counts active={group.activeCount} planned={group.plannedCount} />
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-2">
          {group.areas.map((area) => (
            <AreaRow key={area.area} detail={area} />
          ))}
        </div>
      )}
    </section>
  );
}

export function AreasBoard({ buckets }: { buckets: AreaBucketGroup[] }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma área com cards no QEG.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {buckets.map((group) => (
        <BucketCard key={group.bucket} group={group} />
      ))}
    </div>
  );
}
