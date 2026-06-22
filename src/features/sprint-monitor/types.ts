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
  deliveryDate?: string; // DD/MM/YYYY from "Data de Entrega Estimada"
  labels: string[];
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

export interface AreaCardRef {
  id: string;
  title: string;
  deliveryDate: string | null;
  phase: string;
  status: "active" | "planned";
}

export interface AreaDetail {
  area: string;
  activeCount: number;
  plannedCount: number;
  cards: AreaCardRef[];
}

export interface AreaBucketGroup {
  bucket: string;
  areas: AreaDetail[];
  activeCount: number;
  plannedCount: number;
}

export interface PlannedLaneSummary {
  id: "squad-1" | "squad-2" | "other";
  label: string;
  count: number;
}

export type RagStatus = "green" | "amber" | "red";

export type SkillLevel = "forte" | "em desenvolvimento";

export interface TalentMember {
  name: string;
  skills: Record<string, SkillLevel>;
}

export interface TalentMap {
  skills: string[];
  members: TalentMember[];
  /** label do Pipefy (no card) -> skill da taxonomia. Labels ausentes = ignoradas. */
  labelMap?: Record<string, string>;
}

export interface TalentCardRef {
  title: string;
  deliveryDate: string | null;
}

export interface TalentMatrixRow {
  name: string;
  avatarUrl: string | null;
  skills: Record<string, SkillLevel>;
  loadLevel: LoadLevel;
  activeCardCount: number;
  soonestDelivery: string | null;
  cards: TalentCardRef[];
}

export interface SkillCoverage {
  skill: string;
  total: number;
  available: number;
  strong: number;
  nextDelivery: string | null;
  demandCount: number;
  demandTitles: string[];
}

export interface PersonStatus {
  name: string;
  activeCardCount: number;
  loadLevel: LoadLevel;
  hasNextStep: boolean;
}

export interface DirectorView {
  healthScore: number;
  ragStatus: RagStatus;
  ragLabel: string;
  insights: string[];
  coveragePercent: number;
  criticalPeople: string[];
  availablePeople: string[];
  peopleWithNext: string[];
  peopleWithoutNext: string[];
  allPeople: PersonStatus[];
}
