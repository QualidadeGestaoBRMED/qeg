import { useState } from "react";
import {
  AssigneeBoard,
  AreaBoard,
  MetricsGrid,
  MonitorHeader,
  MonitorTabs,
  TeamLoadBoard,
} from "./components";
import { useSprintMonitor } from "./useSprintMonitor";

export function SprintMonitorScreen() {
  const [activeTab, setActiveTab] = useState<"person" | "area" | "load">("person");
  const {
    groups,
    isLoading,
    error,
    summary,
    dashboard,
    areaBoard,
    plannedLaneSummary,
    teamLoad,
    clearError,
    refresh,
  } = useSprintMonitor();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex w-full flex-col gap-4">
          <MonitorHeader
            activeCards={summary.activeCards}
            people={summary.people}
            isLoading={isLoading}
            onRefresh={() => void refresh()}
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
          <MonitorTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            children={{
              person: <AssigneeBoard groups={groups} isLoading={isLoading} />,
              area: <AreaBoard items={areaBoard} plannedLanes={plannedLaneSummary} />,
              load: <TeamLoadBoard items={teamLoad} />,
            }}
          />
        </div>
      </div>
    </main>
  );
}
