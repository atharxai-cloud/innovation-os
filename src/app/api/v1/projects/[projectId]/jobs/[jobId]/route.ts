import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; jobId: string }> },
) {
  const { projectId, jobId } = await context.params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("background_jobs")
    .select(
      "id,job_type,status,result_json,error_code,error_message,attempt_count,max_attempts,created_at,started_at,completed_at",
    )
    .eq("id", jobId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}
