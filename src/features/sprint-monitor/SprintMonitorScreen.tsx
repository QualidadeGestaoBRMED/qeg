import { useState } from "react";
import {
  AssigneeBoard,
  DirectorPresentation,
  MetricsGrid,
  MonitorHeader,
} from "./components";
import { useSprintMonitor } from "./useSprintMonitor";

export function SprintMonitorScreen() {
  const [isPresenting, setIsPresenting] = useState(false);
  const {
    groups,
    isLoading,
    error,
    summary,
    dashboard,
    areaBoard,
    plannedLaneSummary,
    teamLoad,
    directorView,
    clearError,
    refresh,
  } = useSprintMonitor();

  return (
    <main className="min-h-screen bg-background">
      {isPresenting && (
        <DirectorPresentation
          view={directorView}
          teamLoad={teamLoad}
          areaBoard={areaBoard}
          plannedLanes={plannedLaneSummary}
          totalActiveCards={summary.activeCards}
          totalPeople={summary.people}
          lastUpdated={summary.lastUpdatedLabel}
          pipeNames={summary.pipeNames}
          onClose={() => setIsPresenting(false)}
        />
      )}

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex w-full flex-col gap-4">
          <MonitorHeader
            activeCards={summary.activeCards}
            people={summary.people}
            isLoading={isLoading}
            onRefresh={() => void refresh()}
            onPresent={() => setIsPresenting(true)}
          />

          {error && (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive md:flex-row md:items-center md:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="text-left font-medium underline underline-offset-4 md:text-right"
              >
                dispensar
              </button>
            </div>
          )}

          <MetricsGrid metrics={dashboard} />
          <AssigneeBoard groups={groups} isLoading={isLoading} />
        </div>
      </div>
    </main>
  );
}
