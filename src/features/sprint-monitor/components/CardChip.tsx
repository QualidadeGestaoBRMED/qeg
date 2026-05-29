import { cn } from "@/lib/utils";

interface CardChipProps {
  title: string;
  pipeColor: string;
  pipeName: string;
  status: "active" | "next";
}

const statusStyles = {
  active: "border-border/70 bg-white text-foreground",
  next: "border-dashed border-border bg-transparent text-muted-foreground",
};

export function CardChip({ title, pipeColor, pipeName, status }: CardChipProps) {
  return (
    <div
      className={cn(
        "group inline-flex min-w-0 max-w-[22rem] flex-1 basis-[14rem] items-center gap-2 overflow-hidden rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/50",
        statusStyles[status],
      )}
      title={`${title} (${pipeName})`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `hsl(var(${pipeColor}))` }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-5">
        {title}
      </span>
    </div>
  );
}
