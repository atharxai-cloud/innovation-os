import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { comparePriorArt } from "@/lib/prior-art/compare";
import type { PriorArtSearchResult } from "@/lib/prior-art/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as { candidate?: unknown } | null;
  const candidate = body?.candidate as PriorArtSearchResult | undefined;

  if (!candidate || typeof candidate.title !== "string" || typeof candidate.url !== "string") {
    return NextResponse.json({ error: "invalid_candidate" }, { status: 400 });
  }

  const supabase = await createClient();
  const [projectResult, problemResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,description,current_stage")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_problems")
      .select("problem_statement,context,affected_users,current_solution_direction")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!projectResult.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const comparison = await comparePriorArt({
      project: projectResult.data,
      problem: problemResult.data,
      candidate,
    });

    const { data, error } = await supabase.rpc("save_prior_art_item", {
      p_project_id: projectId,
      p_source: {
        source_type: candidate.priorArtType === "PATENT" ? "PATENT" : "RESEARCH_PAPER",
        external_id: candidate.externalId,
        doi: candidate.doi,
        title: candidate.title,
        authors: candidate.authors,
        published_at: candidate.publishedAt,
        url: candidate.url,
        metadata: {
          provider: candidate.provider,
          abstract: candidate.abstract,
          ...candidate.metadata,
        },
      },
      p_prior_art_type: candidate.priorArtType,
      p_comparison: comparison,
    });

    if (error || !data) {
      return NextResponse.json({ error: "save_failed" }, { status: 400 });
    }

    return NextResponse.json({ prior_art_id: data, comparison });
  } catch {
    return NextResponse.json({ error: "comparison_failed" }, { status: 502 });
  }
}
