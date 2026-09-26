import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/logger";

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS = 5;

function hashKey(key: string) {
  const salt = process.env.RATE_LIMIT_HASH_SALT ?? "innovation-os-rate-limit-v1";
  return createHash("sha256").update(`${salt}:${key}`).digest("hex");
}

export async function consumeIdeaXRayQuota(key: string) {
  const admin = createAdminClient();

  if (!admin) {
    logEvent("error", "rate_limit.unavailable", {
      scope: "IDEA_XRAY",
      reason: "service_role_unavailable",
    });
    return { allowed: false, unavailable: true };
  }

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_scope: "IDEA_XRAY",
    p_key_hash: hashKey(key),
    p_limit: MAX_REQUESTS,
    p_window_seconds: WINDOW_SECONDS,
  });

  if (error || typeof data !== "boolean") {
    logEvent("error", "rate_limit.failed", {
      scope: "IDEA_XRAY",
      reason: error?.code ?? "unexpected_rpc_result",
    });
    return { allowed: false, unavailable: true };
  }

  if (!data) {
    logEvent("warn", "rate_limit.rejected", {
      scope: "IDEA_XRAY",
    });
  }

  return { allowed: data, unavailable: false };
}
