import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveNextBestAction } from "@/lib/projects/navigator";
import type { InnovationStage } from "@/domain/innovation-stage";

export async function listMyProjects() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id,title,description,current_stage,status,updated_at")
    .eq("status", "ACTIVE")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load projects");
  }

  return data ?? [];
}

export async function getProjectWorkspace(projectId: string) {
  const supabase = await createClient();

  const [
    projectResult,
    problemResult,
    assumptionsResult,
    questionsResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,description,current_stage,status,updated_at")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_problems")
      .select(
        "problem_statement,context,affected_users,current_solution_direction,status",
      )
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_assumptions")
      .select("id,category,statement,status,evidence_strength,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_questions")
      .select("id,question,type,priority,status,created_at,resolved_at")
      .eq("project_id", projectId)
      .order("priority", { ascending: true }),
    supabase
      .from("audit_events")
      .select("id,event_type,metadata_json,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const assumptions = assumptionsResult.data ?? [];
  const questions = questionsResult.data ?? [];

  return {
    project: projectResult.data,
    problem: problemResult.data,
    assumptions,
    questions,
    events: eventsResult.data ?? [],
    nextAction: deriveNextBestAction({
      stage: projectResult.data.current_stage as InnovationStage,
      questions,
      assumptions,
    }),
  };
}
