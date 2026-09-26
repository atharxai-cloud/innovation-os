import { createAdminClient } from "@/lib/supabase/admin";

export type BackgroundJobType = "EVIDENCE_SEARCH" | "PRIOR_ART_SEARCH";

export async function enqueueProjectJob(input: {
  workspaceId: string;
  projectId: string;
  actorId: string;
  jobType: BackgroundJobType;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  if (!admin) throw new Error("SERVICE_ROLE_UNAVAILABLE");

  const { data, error } = await admin.rpc("enqueue_background_job", {
    p_workspace_id: input.workspaceId,
    p_project_id: input.projectId,
    p_created_by: input.actorId,
    p_job_type: input.jobType,
    p_payload: input.payload,
  });

  if (error || typeof data !== "string") {
    throw new Error("JOB_ENQUEUE_FAILED");
  }

  return data;
}
