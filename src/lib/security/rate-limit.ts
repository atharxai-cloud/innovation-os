import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "LIMITED" | "UNAVAILABLE" };

function clientFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const agent = request.headers.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${ip}|${agent}`).digest("hex");
}

export async function consumeRateLimit(input: {
  request: Request;
  scope: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const admin = createAdminClient();

  if (!admin) {
    return { allowed: false, reason: "UNAVAILABLE" };
  }

  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_scope: input.scope,
    p_key_hash: clientFingerprint(input.request),
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error || typeof data !== "boolean") {
    return { allowed: false, reason: "UNAVAILABLE" };
  }

  return data
    ? { allowed: true }
    : { allowed: false, reason: "LIMITED" };
}

export function rateLimitResponse(result: RateLimitResult) {
  if (result.allowed) return null;

  if (result.reason === "LIMITED") {
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      },
    );
  }

  return Response.json(
    { error: "rate_limit_unavailable" },
    { status: 503 },
  );
}
