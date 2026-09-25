export const innovationStages = [
  "DISCOVERY",
  "PROBLEM_VALIDATION",
  "EVIDENCE",
  "PRIOR_ART",
  "GAP_DEFINITION",
  "EXPERIMENT_DESIGN",
  "EXPERIMENT_READY",
] as const;

export type InnovationStage = (typeof innovationStages)[number];

const allowedTransitions: Record<InnovationStage, InnovationStage[]> = {
  DISCOVERY: ["PROBLEM_VALIDATION"],
  PROBLEM_VALIDATION: ["EVIDENCE"],
  EVIDENCE: ["PRIOR_ART"],
  PRIOR_ART: ["GAP_DEFINITION"],
  GAP_DEFINITION: ["EXPERIMENT_DESIGN"],
  EXPERIMENT_DESIGN: ["EXPERIMENT_READY"],
  EXPERIMENT_READY: [],
};

export function canTransition(
  from: InnovationStage,
  to: InnovationStage,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function nextStage(stage: InnovationStage): InnovationStage | null {
  return allowedTransitions[stage][0] ?? null;
}
