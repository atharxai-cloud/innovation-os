import { createClient } from "@/lib/supabase/server";

export async function getEvidenceWorkspace(projectId: string) {
  const supabase = await createClient();

  const [claims, projectSources] = await Promise.all([
    supabase
      .from("claims")
      .select("id,statement,claim_type,status,confidence,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_sources")
      .select("source_id,relevance,notes,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  const sourceIds = (projectSources.data ?? []).map((item) => item.source_id);
  const sources = sourceIds.length
    ? await supabase
        .from("sources")
        .select("id,source_type,external_id,doi,title,authors_json,published_at,url,metadata_json")
        .in("id", sourceIds)
    : { data: [], error: null };

  return {
    claims: claims.data ?? [],
    projectSources: projectSources.data ?? [],
    sources: sources.data ?? [],
  };
}
