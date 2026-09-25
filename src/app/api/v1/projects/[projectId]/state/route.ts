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
    project: state.project,
    problem: state.problem,
    assumptions: state.assumptions,
    questions: state.questions,
    brain: state.brain,
    next_best_action: state.nextAction,
  });
}
