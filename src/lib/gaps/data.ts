import { createClient } from "@/lib/supabase/server";

export async function getGapWorkspace(projectId: string) {
  const supabase = await createClient();

  const { data: gaps, error } = await supabase
    .from("gaps")
    .select("id,title,description,gap_type,status,confidence,assumptions_json,validation_questions_json,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load gaps");
  return gaps ?? [];
}
