"use server";

import { redirect } from "next/navigation";
import { enrichProjectBrain } from "@/lib/ai/project-brain-agent";
import { createClient } from "@/lib/supabase/server";
import { slugifyProjectTitle } from "@/lib/projects/slug";
import {
  isIdeaXRayResult,
  type IdeaXRayResult,
} from "@/lib/ai/idea-xray-schema";
import { recordIdeaXRayConversion } from "@/lib/ai/record-run";

export async function convertIdeaXRayToProject(formData: FormData) {
  const raw = String(formData.get("analysis") ?? "");
  const rawIdea = String(formData.get("rawIdea") ?? "").trim();

  let analysis: unknown;
  try {
    analysis = JSON.parse(raw);
  } catch {
    redirect("/idea-xray?error=invalid-analysis");
  }

  if (!isIdeaXRayResult(analysis)) {
    redirect("/idea-xray?error=invalid-analysis");
  }

  const typed = analysis as IdeaXRayResult;
  const supabase = await createClient();
  const baseSlug = slugifyProjectTitle(typed.project_title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data, error } = await supabase.rpc("create_project_from_idea_xray", {
    p_slug: slug,
    p_analysis: typed,
  });

  if (error || !data) {
    redirect("/idea-xray/convert?error=create-failed");
  }

  if (rawIdea.length >= 20 && rawIdea.length <= 5000) {
    await recordIdeaXRayConversion({
      projectId: data,
      rawIdea,
      analysis: typed,
    });
  }

  await enrichProjectBrain(data);

  redirect(`/projects/${data}`);
}
