import { describe, expect, it } from "vitest";
import {
  extractAssignees,
  groupCardsByAssignee,
  matchPhase,
  parseCommaSeparated,
} from "@/features/sprint-monitor/domain";
import { DEFAULT_FIELD_FILTERS } from "@/features/sprint-monitor/constants";
import type { SprintCard } from "@/features/sprint-monitor/types";

function createCard(overrides: Partial<SprintCard>): SprintCard {
  return {
    id: "1",
    title: "Card",
    assignees: [],
    currentPhase: "Sprint",
    projectAreas: [],
    pipeId: "pipe-1",
    pipeName: "QEG",
    pipeColor: "--pipe-1",
    ...overrides,
  };
}

describe("sprint monitor helpers", () => {
  it("normalizes comma separated values", () => {
    expect(parseCommaSeparated(" Sprint, Doing , , Review ")).toEqual([
      "Sprint",
      "Doing",
      "Review",
    ]);
  });

  it("matches phases accent-insensitively", () => {
    expect(matchPhase("Priorizados - time A", ["priorizados"])).toBe(true);
    expect(matchPhase("Em execucao", ["priorizacao"])).toBe(false);
  });

  it("extracts assignees from fallback fields", () => {
    expect(
      extractAssignees(
        [
          {
            name: "Responsavel pela execucao",
            value: null,
            report_value: "Ana Silva, Processos",
          },
        ],
        DEFAULT_FIELD_FILTERS,
      ),
    ).toEqual([{ name: "Ana Silva", avatarUrl: null }]);
  });

  it("groups cards only by valid assignees", () => {
    const groups = groupCardsByAssignee(
      [
        createCard({
          id: "active-1",
          assignees: [{ name: "Ana Silva", avatarUrl: null }],
        }),
        createCard({
          id: "active-2",
        }),
      ],
      [
        createCard({
          id: "next-1",
          assignees: [{ name: "Ana Silva", avatarUrl: null }],
        }),
      ],
    );

    expect(groups[0]).toMatchObject({
      name: "Ana Silva",
      activeCards: [{ id: "active-1" }],
      prioritizedCards: [{ id: "next-1" }],
    });
    expect(groups).toHaveLength(1);
  });
});
