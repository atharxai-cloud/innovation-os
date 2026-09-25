"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifyProjectTitle } from "@/lib/projects/slug";
import {
  isIdeaXRayResult,
  type IdeaXRayResult,
} from "@/lib/ai/idea-xray-schema";

export async function convertIdeaXRayToProject(formData: FormData) {
  const raw = String(formData.get("analysis") ?? "");

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

  redirect(`/projects/${data}`);
}
