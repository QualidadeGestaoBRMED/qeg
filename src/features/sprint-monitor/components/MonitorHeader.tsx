import { RefreshCw } from "lucide-react";

interface MonitorHeaderProps {
  activeCards: number;
  people: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export function MonitorHeader({ activeCards, people, isLoading, onRefresh }: MonitorHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          QEG
        </h1>
        <p className="text-sm text-muted-foreground">
          {people} pessoas · {activeCards} cards ativos
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-border bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        Atualizar
      </button>
    </header>
  );
}
