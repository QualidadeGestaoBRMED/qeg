import { Presentation, RefreshCw } from "lucide-react";

interface MonitorHeaderProps {
  activeCards: number;
  people: number;
  isLoading: boolean;
  onRefresh: () => void;
  onPresent: () => void;
}

export function MonitorHeader({ activeCards, people, isLoading, onRefresh, onPresent }: MonitorHeaderProps) {
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

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={onPresent}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Presentation className="h-3.5 w-3.5" />
          Apresentar
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>
    </header>
  );
}
