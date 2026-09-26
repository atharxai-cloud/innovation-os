export type ExperimentDraft = {
  title: string;
  research_question: string;
  hypothesis: string;
  independent_variable: string;
  dependent_variable: string;
  control_description: string;
  sample_description: string;
  measurement_method: string;
  protocol: string[];
  success_criteria: string;
  expected_failure_modes: string[];
  safety_notes: string[];
};

export type ScientificCriticReview = {
  summary: string;
  issues: Array<{
    category: "HYPOTHESIS" | "CONTROL" | "MEASUREMENT" | "CONFOUNDING" | "SAMPLE" | "SUCCESS_CRITERIA" | "SAFETY" | "OTHER";
    severity: "INFO" | "WARNING" | "BLOCKING";
    message: string;
  }>;
  recommendations: string[];
  blocking_issues: string[];
};
