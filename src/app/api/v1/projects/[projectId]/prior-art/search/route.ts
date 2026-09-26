import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { processBackgroundJobs } from "@/lib/jobs/worker";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const actorId =
    typeof authData?.claims?.sub === "string" ? authData.claims.sub : null;

  if (!actorId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id,workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (query.length < 5 || query.length > 1500) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const jobId = await enqueueProjectJob({
      workspaceId: project.workspace_id,
      projectId,
      actorId,
      jobType: "PRIOR_ART_SEARCH",
      payload: { query },
    });

    after(async () => {
      await processBackgroundJobs(1).catch(() => undefined);
    });

    return NextResponse.json(
      { job_id: jobId, status: "QUEUED" },
      { status: 202 },
    );
  } catch {
    return NextResponse.json(
      { error: "job_enqueue_failed" },
      { status: 503 },
    );
  }
}
