import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set([
  "PROBLEM",
  "MECHANISM",
  "TECHNOLOGY",
  "MEASUREMENT",
  "SOLUTION",
  "OTHER",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as
    | { statement?: unknown; claimType?: unknown }
    | null;

  const statement =
    typeof body?.statement === "string" ? body.statement.trim() : "";
  const claimType =
    typeof body?.claimType === "string" && allowedTypes.has(body.claimType)
      ? body.claimType
      : "OTHER";

  if (statement.length < 5 || statement.length > 1500) {
    return NextResponse.json({ error: "invalid_claim" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_claim", {
    p_project_id: projectId,
    p_statement: statement,
    p_claim_type: claimType,
  });

  if (error || !data) {
    return NextResponse.json({ error: "create_failed" }, { status: 400 });
  }

  return NextResponse.json({ claim_id: data });
}
