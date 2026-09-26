import { createClient } from "@/lib/supabase/server";

export async function getExperimentWorkspace(projectId: string) {
  const supabase = await createClient();

  const [gaps, experiments] = await Promise.all([
    supabase
      .from("gaps")
      .select("id,title,description,gap_type,status,confidence,assumptions_json,validation_questions_json")
      .eq("project_id", projectId)
      .neq("status", "REJECTED")
      .order("created_at", { ascending: false }),
    supabase
      .from("experiments")
      .select("id,gap_id,title,research_question,hypothesis,independent_variable,dependent_variable,control_description,sample_description,measurement_method,protocol_json,success_criteria,expected_failure_modes_json,safety_notes_json,status,created_at,updated_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  const experimentIds = (experiments.data ?? []).map((item) => item.id);
  const reviews = experimentIds.length
    ? await supabase
        .from("experiment_reviews")
        .select("id,experiment_id,issues_json,recommendations_json,blocking_issues_json,reviewed_at,model_metadata_json")
        .in("experiment_id", experimentIds)
        .order("reviewed_at", { ascending: false })
    : { data: [], error: null };

  return {
    gaps: gaps.data ?? [],
    experiments: experiments.data ?? [],
    reviews: reviews.data ?? [],
  };
}
