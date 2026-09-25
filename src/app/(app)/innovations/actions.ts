"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifyProjectTitle } from "@/lib/projects/slug";

function normalize(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createProject(formData: FormData) {
  const title = normalize(formData.get("title"));
  const problem = normalize(formData.get("problem"));
  const context = normalize(formData.get("context"));
  const affectedUsers = normalize(formData.get("affectedUsers"));

  if (title.length < 3 || problem.length < 10) {
    redirect("/innovations/new?error=invalid-fields");
  }

  const supabase = await createClient();
  const baseSlug = slugifyProjectTitle(title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data, error } = await supabase.rpc("create_innovation_project", {
    p_title: title,
    p_slug: slug,
    p_problem_statement: problem,
    p_context: context || null,
    p_affected_users: affectedUsers || null,
  });

  if (error || !data) {
    redirect("/innovations/new?error=create-failed");
  }

  redirect(`/projects/${data}`);
}
