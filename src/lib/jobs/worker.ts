import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/logger";
import { searchEvidence } from "@/lib/research/search";
import { searchPriorArt } from "@/lib/prior-art/search";
import type { EvidenceSearchType } from "@/lib/research/types";

type ClaimedJob = {
  msg_id: number;
  job_id: string;
  workspace_id: string;
  project_id: string;
  created_by: string | null;
  job_type: "EVIDENCE_SEARCH" | "PRIOR_ART_SEARCH";
  payload_json: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
};

function safeMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 900);
  return "unknown_background_job_error";
}

export async function processBackgroundJobs(limit = 5) {
  const admin = createAdminClient();
  if (!admin) throw new Error("SERVICE_ROLE_UNAVAILABLE");

  const { data, error } = await admin.rpc("claim_background_jobs", {
    p_limit: Math.max(1, Math.min(limit, 20)),
  });

  if (error) {
    logEvent("error", "jobs.claim.failed", { reason: error.code ?? "unknown" });
    throw new Error("JOB_CLAIM_FAILED");
  }

  const jobs = (Array.isArray(data) ? data : []) as ClaimedJob[];
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      let result: Record<string, unknown>;

      if (job.job_type === "EVIDENCE_SEARCH") {
        const query =
          typeof job.payload_json.query === "string" ? job.payload_json.query : "";
        const type =
          typeof job.payload_json.type === "string"
            ? (job.payload_json.type as EvidenceSearchType)
            : "PROBLEM_EVIDENCE";

        result = await searchEvidence(query, type, {
          workspaceId: job.workspace_id,
          projectId: job.project_id,
          actorId: job.created_by,
          agentType: "EVIDENCE_QUERY_EXPANSION",
          inputHash: createHash("sha256")
            .update(`${type}:${query}`)
            .digest("hex"),
          metadata: {
            background_job_id: job.job_id,
            evidence_search_type: type,
          },
        });
      } else if (job.job_type === "PRIOR_ART_SEARCH") {
        const query =
          typeof job.payload_json.query === "string" ? job.payload_json.query : "";
        result = await searchPriorArt(query);
      } else {
        throw new Error("UNSUPPORTED_JOB_TYPE");
      }

      const { error: completeError } = await admin.rpc("complete_background_job", {
        p_job_id: job.job_id,
        p_msg_id: job.msg_id,
        p_result: result,
      });

      if (completeError) throw new Error("JOB_COMPLETE_FAILED");

      succeeded += 1;
      logEvent("info", "jobs.completed", {
        job_id: job.job_id,
        job_type: job.job_type,
        project_id: job.project_id,
        attempt_count: job.attempt_count,
      });
    } catch (jobError) {
      failed += 1;
      const message = safeMessage(jobError);

      await admin.rpc("fail_background_job", {
        p_job_id: job.job_id,
        p_msg_id: job.msg_id,
        p_error_code: "JOB_EXECUTION_FAILED",
        p_error_message: message,
      });

      logEvent("error", "jobs.failed", {
        job_id: job.job_id,
        job_type: job.job_type,
        project_id: job.project_id,
        attempt_count: job.attempt_count,
        max_attempts: job.max_attempts,
        error: message,
      });
    }
  }

  return {
    claimed: jobs.length,
    succeeded,
    failed,
  };
}
