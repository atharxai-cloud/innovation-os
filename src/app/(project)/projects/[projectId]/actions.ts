"use server";

import { redirect } from "next/navigation";
import { enrichProjectBrain } from "@/lib/ai/project-brain-agent";
import { createClient } from "@/lib/supabase/server";

export async function archiveProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");

  if (!projectId) {
    redirect("/innovations");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    redirect(`/projects/${projectId}?error=archive-failed`);
  }

  redirect("/innovations");
}

export async function advanceProjectStage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const targetStage = String(formData.get("targetStage") ?? "");

  if (!projectId || !targetStage) {
    redirect("/innovations");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_project_stage", {
    p_project_id: projectId,
    p_target_stage: targetStage,
  });

  if (error) {
    redirect(`/projects/${projectId}?error=transition-failed`);
  }

  await enrichProjectBrain(projectId);

  redirect(`/projects/${projectId}`);
}
