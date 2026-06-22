import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMonitorCards } from "./api";
import {
  buildAreaBoardItems,
  buildAreaBuckets,
  buildDirectorView,
  buildPlannedLaneSummary,
  buildTeamLoadItems,
  formatUpdatedAt,
  groupCardsByAssignee,
} from "./domain";
import { buildSkillCoverage, buildTalentMatrix, loadTalentMap } from "./domain/talent";
import { loadMonitorConfigFromEnv } from "./env";
import type { AssigneeGroup, MonitorConfig, SkillCoverage, SprintCard, TalentMap, TalentMatrixRow } from "./types";

export function useSprintMonitor() {
  const [initialState] = useState(() => {
    const { config, error } = loadMonitorConfigFromEnv();

    return {
      config,
      error,
    };
  });
  const [config] = useState<MonitorConfig | null>(initialState.config);
  const [groups, setGroups] = useState<AssigneeGroup[]>([]);
  const [unassignedActiveCards, setUnassignedActiveCards] = useState(0);
  const [activeCardsTotal, setActiveCardsTotal] = useState(0);
  const [activeCards, setActiveCards] = useState<SprintCard[]>([]);
  const [prioritizedCards, setPrioritizedCards] = useState<SprintCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialState.error);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [talentMap, setTalentMap] = useState<TalentMap | null>(null);
  const [areaBucketsConfig, setAreaBucketsConfig] = useState<Record<string, string[]>>({});

  const refresh = useCallback(async () => {
    if (!config) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { activeCards, prioritizedCards } = await fetchMonitorCards(config);
      const grouped = groupCardsByAssignee(activeCards, prioritizedCards);
      const unassigned = activeCards.filter((card) => card.assignees.length === 0);

      setActiveCards(activeCards);
      setPrioritizedCards(prioritizedCards);
      setGroups(grouped);
      setUnassignedActiveCards(unassigned.length);
      setActiveCardsTotal(activeCards.length);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      void refresh();
    }
  }, [config, refresh]);

  useEffect(() => {
    loadTalentMap()
      .then(setTalentMap)
      .catch(() => {
        // talent.json is optional; ignore load failures silently
      });
  }, []);

  useEffect(() => {
    fetch("/areas.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { buckets?: Record<string, string[]> } | null) => {
        if (data?.buckets) setAreaBucketsConfig(data.buckets);
      })
      .catch(() => {
        // areas.json is optional; ignore load failures silently
      });
  }, []);

  const summary = useMemo(() => {
    const people = groups.length;
    const pipeNames = config?.pipes
      .filter((pipe) => pipe.id && pipe.name)
      .map((pipe) => pipe.name)
      .join(" · ");

    return {
      activeCards: activeCardsTotal,
      people,
      pipeNames,
      lastUpdatedLabel: formatUpdatedAt(lastUpdatedAt),
    };
  }, [activeCardsTotal, config, groups.length, lastUpdatedAt]);

  const dashboard = useMemo(() => {
    const peopleWithActiveCards = groups.filter((group) => group.activeCards.length > 0);
    const peopleWithNextStep = peopleWithActiveCards.filter(
      (group) => group.prioritizedCards.length > 0,
    ).length;
    const peopleWithoutNextStep = peopleWithActiveCards.filter(
      (group) => group.prioritizedCards.length === 0,
    ).length;
    return {
      activeCards: summary.activeCards,
      withNextStep: peopleWithNextStep,
      withoutNextStep: peopleWithoutNextStep,
      unassignedCards: unassignedActiveCards,
    };
  }, [groups, summary.activeCards, unassignedActiveCards]);

  const teamLoad = useMemo(() => buildTeamLoadItems(groups), [groups]);
  const areaBoard = useMemo(
    () => buildAreaBoardItems(activeCards, prioritizedCards),
    [activeCards, prioritizedCards],
  );
  const areaBuckets = useMemo(
    () => buildAreaBuckets(activeCards, prioritizedCards, areaBucketsConfig),
    [activeCards, prioritizedCards, areaBucketsConfig],
  );
  const plannedLaneSummary = useMemo(
    () => buildPlannedLaneSummary(prioritizedCards),
    [prioritizedCards],
  );
  const directorView = useMemo(
    () => buildDirectorView(groups, unassignedActiveCards),
    [groups, unassignedActiveCards],
  );

  const talentMatrix = useMemo<TalentMatrixRow[]>(
    () => (talentMap ? buildTalentMatrix(talentMap, groups) : []),
    [talentMap, groups],
  );

  const skillCoverage = useMemo<SkillCoverage[]>(
    () =>
      talentMap
        ? buildSkillCoverage(talentMatrix, talentMap.skills, activeCards, talentMap.labelMap ?? {})
        : [],
    [talentMap, talentMatrix, activeCards],
  );

  return {
    groups,
    isLoading,
    error,
    summary,
    dashboard,
    areaBoard,
    areaBuckets,
    plannedLaneSummary,
    teamLoad,
    directorView,
    talentMap,
    talentMatrix,
    skillCoverage,
    clearError: () => setError(null),
    refresh,
  };
}
