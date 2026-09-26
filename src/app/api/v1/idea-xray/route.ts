import { NextResponse } from "next/server";
import { runIdeaXRay } from "@/lib/ai/openai-gateway";
import { consumeIdeaXRayQuota } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientKey = forwarded?.split(",")[0]?.trim() || "unknown";

  const quota = await consumeIdeaXRayQuota(clientKey);

  if (quota.unavailable) {
    return NextResponse.json(
      { error: "rate_limit_unavailable" },
      { status: 503 },
    );
  }

  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const idea =
    body && typeof body === "object" && typeof (body as { idea?: unknown }).idea === "string"
      ? (body as { idea: string }).idea.trim()
      : "";

  const language =
    body &&
    typeof body === "object" &&
    (body as { language?: unknown }).language === "en"
      ? "en"
      : "ar";

  if (idea.length < 20 || idea.length > 5000) {
    return NextResponse.json(
      { error: "idea_length_invalid" },
      { status: 400 },
    );
  }

  try {
    const result = await runIdeaXRay(idea, language);
    return NextResponse.json({
      analysis: result.analysis,
      meta: {
        model: result.model,
        inputHash: result.inputHash,
        usage: result.usage,
        requestId: result.requestId,
        durationMs: result.durationMs,
        estimatedCostUsd: result.estimatedCostUsd,
        runId: result.telemetryRunId,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "analysis_failed",
        message:
          "لم يكتمل التحليل. لم يتم إنشاء نتائج وهمية ويمكن إعادة المحاولة.",
      },
      { status: 502 },
    );
  }
}
