export type ProjectJob<T> = {
  id: string;
  job_type: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  result_json: T | null;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  max_attempts: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export async function pollProjectJob<T>(
  projectId: string,
  jobId: string,
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 90;
  const intervalMs = options.intervalMs ?? 1000;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(
      `/api/v1/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("JOB_STATUS_FAILED");
    }

    const payload = (await response.json()) as { job?: ProjectJob<T> };
    const job = payload.job;

    if (!job) throw new Error("JOB_STATUS_MISSING");

    if (job.status === "SUCCEEDED") {
      if (job.result_json == null) throw new Error("JOB_RESULT_MISSING");
      return job.result_json;
    }

    if (job.status === "FAILED" || job.status === "CANCELLED") {
      throw new Error(job.error_code ?? "JOB_FAILED");
    }

    await sleep(intervalMs);
  }

  throw new Error("JOB_POLL_TIMEOUT");
}
