import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getProjectWorkspace } from "@/lib/projects/data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  await requireUser();
  const { projectId } = await context.params;
  const state = await getProjectWorkspace(projectId);

  return NextResponse.json({
    current_stage: state.project.current_stage,
    next_best_action: state.nextAction,
    snapshot_version: state.brain?.snapshotVersion ?? null,
    generated_by: state.brain?.generatedBy ?? "FALLBACK_NAVIGATOR",
  });
}
