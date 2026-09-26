import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildProjectContextPack } from "@/lib/project-brain/context-pack";
import { askProjectAgent } from "@/lib/project-brain/ask-agent";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { question?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (question.length < 3 || question.length > 2000) {
    return NextResponse.json({ error: "invalid_question" }, { status: 400 });
  }

  try {
    const contextPack = await buildProjectContextPack(projectId, question);
    const answer = await askProjectAgent({
      question,
      contextPack: contextPack as unknown as Record<string, unknown>,
    });

    const sourceRows = Array.isArray(contextPack.sources)
      ? contextPack.sources as Array<Record<string, unknown>>
      : [];
    const allowedSourceIds = new Set(
      sourceRows
        .map((row) => typeof row.id === "string" ? row.id : null)
        .filter((id): id is string => Boolean(id)),
    );

    const facts = answer.facts.flatMap((fact) => {
      const sourceIds = fact.source_ids.filter((id) => allowedSourceIds.has(id));

      if (fact.grounding === "SOURCE_GROUNDED" && sourceIds.length === 0) {
        return [];
      }

      return [{ ...fact, source_ids: sourceIds }];
    });

    const sourceCatalog = sourceRows.map((row) => ({
      id: row.id,
      title: row.title,
      doi: row.doi,
      url: row.url,
    }));

    const safeAnswer = {
      ...answer,
      facts,
    };

    const project = contextPack.project as Record<string, unknown>;
    const workspaceId = typeof project.workspace_id === "string"
      ? project.workspace_id
      : null;

    const admin = createAdminClient();
    if (admin && workspaceId) {
      const model = process.env.OPENAI_ASK_PROJECT_MODEL ?? "gpt-5.6-terra";
      const { data: run } = await admin
        .from("ai_runs")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          agent_type: "ASK_PROJECT",
          status: "SUCCEEDED",
          input_hash: createHash("sha256").update(question).digest("hex"),
          model_provider: "openai",
          model_name: model,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (run?.id) {
        await admin.from("ai_artifacts").insert({
          ai_run_id: run.id,
          artifact_type: "ASK_PROJECT_ANSWER",
          content_json: {
            question,
            intent: contextPack.intent,
            answer: safeAnswer,
          },
          version: 1,
        });
      }
    }

    return NextResponse.json({
      intent: contextPack.intent,
      answer: safeAnswer,
      sources: sourceCatalog,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ error: "ask_project_failed" }, { status: 502 });
  }
}
