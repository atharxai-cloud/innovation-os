import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPriorArt } from "@/lib/prior-art/search";
import { consumeRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rate = await consumeRateLimit({
    request,
    scope: "prior-art-search",
    limit: 10,
    windowSeconds: 600,
  });
  const limited = rateLimitResponse(rate);
  if (limited) return limited;

  const body = await request.json().catch(() => null) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (query.length < 5 || query.length > 1500) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const result = await searchPriorArt(query);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "prior_art_search_failed" }, { status: 502 });
  }
}
