export type GapCandidate = {
  title: string;
  description: string;
  gap_type: "CONTEXT" | "COST" | "PERFORMANCE" | "INTEGRATION" | "ACCESSIBILITY" | "ENVIRONMENTAL" | "OTHER";
  known_limitation: string;
  opportunity_rationale: string;
  assumptions: string[];
  validation_questions: string[];
  confidence: number;
  evidence_source_ids: string[];
  prior_art_ids: string[];
};
