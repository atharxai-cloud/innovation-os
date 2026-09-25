import type { InnovationStage } from "./innovation-stage";

export type ProjectStatus = "ACTIVE" | "ARCHIVED";
export type ProjectVisibility = "PRIVATE";

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  description: string | null;
  currentStage: InnovationStage;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  updatedAt: string;
};

export type NextBestAction = {
  action: string;
  reason: string;
  blockingIssue: string | null;
  confidence: number | null;
};
