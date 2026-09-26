import { createClient } from "@/lib/supabase/server";

export async function getPriorArtWorkspace(projectId: string) {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("prior_art_items")
    .select("id,source_id,prior_art_type,technical_summary,similarity_level,shared_concepts_json,differences_json,comparison_json,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Unable to load prior art");

  const sourceIds = (items ?? []).map((item) => item.source_id);
  const sources = sourceIds.length
    ? await supabase
        .from("sources")
        .select("id,title,url,doi,external_id,published_at,authors_json,source_type,metadata_json")
        .in("id", sourceIds)
    : { data: [], error: null };

  return {
    items: items ?? [],
    sources: sources.data ?? [],
  };
}
