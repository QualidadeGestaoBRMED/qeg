export interface PipeConfig {
  id: string;
  name: string;
  color: string;
  activePhases: string;
  prioritizedPhases: string;
}

export interface FieldFilters {
  responsibleFields: string[];
  projectAreaFields: string[];
  nonPersonNames: string[];
  nonPersonKeywords: string[];
}

export interface MonitorConfig {
  token: string;
  pipes: PipeConfig[];
  defaultActivePhases: string[];
  defaultPrioritizedPhases: string[];
  filters: FieldFilters;
}

export interface CardAssignee {
  name: string;
  avatarUrl: string | null;
}

export interface PipefyField {
  name: string;
  value: string | null;
  report_value: string | null;
}

export interface SprintCard {
  id: string;
  title: string;
  assignees: CardAssignee[];
  currentPhase: string;
  projectAreas: string[];
  pipeId: string;
  pipeName: string;
  pipeColor: string;
}

export interface AssigneeGroup {
  name: string;
  avatarUrl: string | null;
  activeCards: SprintCard[];
  prioritizedCards: SprintCard[];
}

export type LoadLevel = "ok" | "high" | "critical";

export interface TeamLoadItem {
  name: string;
  avatarUrl: string | null;
  activeCardCount: number;
  prioritizedCardCount: number;
  loadLevel: LoadLevel;
  loadLabel: string;
  loadRatio: number;
  suggestion: string;
}

export interface AreaBoardItem {
  area: string;
  activeCount: number;
  plannedCount: number;
}

export interface PlannedLaneSummary {
  id: "squad-1" | "squad-2" | "other";
  label: string;
  count: number;
}
