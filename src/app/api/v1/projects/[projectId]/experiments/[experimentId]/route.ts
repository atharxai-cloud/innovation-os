import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function lines(value: unknown) {
  return typeof value === "string"
    ? value.split("\n").map((item) => item.trim()).filter(Boolean)
    : [];
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; experimentId: string }> },
) {
  const { projectId, experimentId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("experiments")
    .select("id,status")
    .eq("project_id", projectId)
    .eq("id", experimentId)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (current.status === "READY" || current.status === "ARCHIVED") {
    return NextResponse.json({ error: "experiment_locked" }, { status: 409 });
  }

  const patch = {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    research_question: typeof body.research_question === "string" ? body.research_question.trim() : undefined,
    hypothesis: typeof body.hypothesis === "string" ? body.hypothesis.trim() : undefined,
    independent_variable: typeof body.independent_variable === "string" ? body.independent_variable.trim() : undefined,
    dependent_variable: typeof body.dependent_variable === "string" ? body.dependent_variable.trim() : undefined,
    control_description: typeof body.control_description === "string" ? body.control_description.trim() : undefined,
    sample_description: typeof body.sample_description === "string" ? body.sample_description.trim() : undefined,
    measurement_method: typeof body.measurement_method === "string" ? body.measurement_method.trim() : undefined,
    success_criteria: typeof body.success_criteria === "string" ? body.success_criteria.trim() : undefined,
    protocol_json: lines(body.protocol),
    expected_failure_modes_json: lines(body.expected_failure_modes),
    safety_notes_json: lines(body.safety_notes),
  };

  const { error } = await supabase
    .from("experiments")
    .update(patch)
    .eq("project_id", projectId)
    .eq("id", experimentId);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
