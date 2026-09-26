import { createClient } from "@/lib/supabase/server";

type ContextPack = {
  intent: "GENERAL" | "EVIDENCE" | "PRIOR_ART" | "GAP" | "EXPERIMENT";
  project: unknown;
  snapshot: unknown;
  problem?: unknown;
  claims?: unknown[];
  sources?: unknown[];
  prior_art?: unknown[];
  gaps?: unknown[];
  experiments?: unknown[];
  reviews?: unknown[];
};

export function detectIntent(question: string): ContextPack["intent"] {
  const q = question.toLowerCase();

  if (/تجرب|experiment|hypothesis|control|قياس|measurement/.test(q)) return "EXPERIMENT";
  if (/براء|patent|prior art|سابقة|تشابه|جدة/.test(q)) return "PRIOR_ART";
  if (/فجوة|gap|limitation|قيد|فرصة/.test(q)) return "GAP";
  if (/دليل|مصدر|دراسة|claim|evidence|source|بحث/.test(q)) return "EVIDENCE";
  return "GENERAL";
}

export async function buildProjectContextPack(projectId: string, question: string) {
  const supabase = await createClient();
  const intent = detectIntent(question);

  const [project, snapshot, problem] = await Promise.all([
    supabase
      .from("projects")
      .select("id,workspace_id,title,description,current_stage,status,updated_at")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_snapshots")
      .select("snapshot_version,summary_json,stage,next_best_action_json,risk_summary_json,created_at")
      .eq("project_id", projectId)
      .order("snapshot_version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("project_problems")
      .select("problem_statement,context,affected_users,current_solution_direction,status")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!project.data) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const pack: ContextPack = {
    intent,
    project: project.data,
    snapshot: snapshot.data,
    problem: problem.data,
  };

  if (intent === "GENERAL" || intent === "EVIDENCE") {
    const [claims, links] = await Promise.all([
      supabase
        .from("claims")
        .select("id,statement,claim_type,status,confidence")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(16),
      supabase
        .from("project_sources")
        .select("source_id,relevance,notes")
        .eq("project_id", projectId)
        .limit(16),
    ]);

    const ids = (links.data ?? []).map((row) => row.source_id);
    const sources = ids.length
      ? await supabase
          .from("sources")
          .select("id,title,doi,url,source_type,published_at,metadata_json")
          .in("id", ids)
      : { data: [] };

    pack.claims = claims.data ?? [];
    pack.sources = sources.data ?? [];
  }

  if (intent === "GENERAL" || intent === "PRIOR_ART" || intent === "GAP") {
    const prior = await supabase
      .from("prior_art_items")
      .select("id,prior_art_type,technical_summary,similarity_level,shared_concepts_json,differences_json,comparison_json,source_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(12);

    pack.prior_art = prior.data ?? [];
  }

  if (intent === "GENERAL" || intent === "GAP" || intent === "EXPERIMENT") {
    const gaps = await supabase
      .from("gaps")
      .select("id,title,description,gap_type,status,confidence,assumptions_json,validation_questions_json")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(8);

    pack.gaps = gaps.data ?? [];
  }

  if (intent === "GENERAL" || intent === "EXPERIMENT") {
    const experiments = await supabase
      .from("experiments")
      .select("id,gap_id,title,research_question,hypothesis,independent_variable,dependent_variable,control_description,sample_description,measurement_method,protocol_json,success_criteria,expected_failure_modes_json,safety_notes_json,status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(6);

    const ids = (experiments.data ?? []).map((row) => row.id);
    const reviews = ids.length
      ? await supabase
          .from("experiment_reviews")
          .select("experiment_id,issues_json,recommendations_json,blocking_issues_json,reviewed_at")
          .in("experiment_id", ids)
          .order("reviewed_at", { ascending: false })
          .limit(12)
      : { data: [] };

    pack.experiments = experiments.data ?? [];
    pack.reviews = reviews.data ?? [];
  }

  return pack;
}
