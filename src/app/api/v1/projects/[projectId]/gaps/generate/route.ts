import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateGapCandidates } from "@/lib/gaps/generate";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const actorId = typeof authData?.claims?.sub === "string" ? authData.claims.sub : null;

  const [project, problem, assumptions, claims, projectSources, priorArt] = await Promise.all([
    supabase.from("projects").select("id,workspace_id,title,description,current_stage").eq("id", projectId).maybeSingle(),
    supabase.from("project_problems").select("problem_statement,context,affected_users,current_solution_direction").eq("project_id", projectId).maybeSingle(),
    supabase.from("project_assumptions").select("category,statement,status").eq("project_id", projectId).limit(20),
    supabase.from("claims").select("id,statement,claim_type,status").eq("project_id", projectId).limit(20),
    supabase.from("project_sources").select("source_id,relevance").eq("project_id", projectId),
    supabase.from("prior_art_items").select("id,source_id,prior_art_type,technical_summary,similarity_level,shared_concepts_json,differences_json").eq("project_id", projectId),
  ]);

  if (!project.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const sourceIds = (projectSources.data ?? []).map((item) => item.source_id);
  const priorItems = priorArt.data ?? [];

  if (sourceIds.length < 1 || priorItems.length < 1) {
    return NextResponse.json(
      {
        error: "INSUFFICIENT_CONTEXT",
        requirements: {
          evidence_sources: Math.max(0, 1 - sourceIds.length),
          prior_art_items: Math.max(0, 1 - priorItems.length),
        },
      },
      { status: 409 },
    );
  }

  const sources = await supabase
    .from("sources")
    .select("id,title,doi,url,source_type,metadata_json")
    .in("id", sourceIds);

  const allowedSources = new Set((sources.data ?? []).map((item) => item.id));
  const allowedPrior = new Set(priorItems.map((item) => item.id));

  try {
    const generationContext = {
      project: project.data,
      problem: problem.data,
      assumptions: assumptions.data ?? [],
      claims: claims.data ?? [],
      evidence_sources: sources.data ?? [],
      prior_art: priorItems,
    };

    const candidates = await generateGapCandidates(generationContext, {
      workspaceId: project.data.workspace_id,
      projectId,
      actorId,
      agentType: "GAP_FINDER",
      inputHash: createHash("sha256").update(JSON.stringify(generationContext)).digest("hex"),
      metadata: {
        evidence_source_count: sourceIds.length,
        prior_art_count: priorItems.length,
      },
    });

    const safe = candidates
      .map((candidate) => ({
        ...candidate,
        evidence_source_ids: candidate.evidence_source_ids.filter((id) => allowedSources.has(id)),
        prior_art_ids: candidate.prior_art_ids.filter((id) => allowedPrior.has(id)),
      }))
      .filter(
        (candidate) =>
          candidate.evidence_source_ids.length > 0 &&
          candidate.prior_art_ids.length > 0,
      );

    if (!safe.length) {
      return NextResponse.json({ error: "NO_GROUNDED_GAPS" }, { status: 422 });
    }

    return NextResponse.json({ gaps: safe });
  } catch {
    return NextResponse.json({ error: "gap_generation_failed" }, { status: 502 });
  }
}
