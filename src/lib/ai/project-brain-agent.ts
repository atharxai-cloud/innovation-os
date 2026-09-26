import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { observedOpenAIResponse } from "@/lib/ai/observed-openai";

type BrainEnrichment = {
  biggest_unknown: string;
  risk_summary: string;
  explanation: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["biggest_unknown", "risk_summary", "explanation"],
  properties: {
    biggest_unknown: { type: "string", minLength: 3, maxLength: 500 },
    risk_summary: { type: "string", minLength: 3, maxLength: 700 },
    explanation: { type: "string", minLength: 3, maxLength: 700 },
  },
} as const;

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }

  return null;
}

export async function enrichProjectBrain(projectId: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const admin = createAdminClient();

  if (!apiKey || !admin) return;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const actorId = typeof authData?.claims?.sub === "string" ? authData.claims.sub : null;

  const [project, problem, questions, assumptions, snapshot] = await Promise.all([
    supabase
      .from("projects")
      .select("id,workspace_id,title,current_stage")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_problems")
      .select("problem_statement,context,affected_users,current_solution_direction")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_questions")
      .select("question,type,priority,status")
      .eq("project_id", projectId)
      .in("status", ["OPEN", "IN_PROGRESS"])
      .order("priority", { ascending: true })
      .limit(12),
    supabase
      .from("project_assumptions")
      .select("category,statement,status")
      .eq("project_id", projectId)
      .eq("status", "UNTESTED")
      .limit(12),
    supabase
      .from("project_snapshots")
      .select("id,summary_json,next_best_action_json,risk_summary_json,snapshot_version")
      .eq("project_id", projectId)
      .order("snapshot_version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (project.error || !project.data || snapshot.error || !snapshot.data) return;

  const model = process.env.OPENAI_PROJECT_BRAIN_MODEL ?? "gpt-5.6-luna";
  try {
    const { payload, runId } = await observedOpenAIResponse({
      context: {
        workspaceId: project.data.workspace_id,
        projectId,
        actorId,
        agentType: "PROJECT_BRAIN",
        inputHash: `snapshot:${snapshot.data.snapshot_version}`,
        metadata: { snapshot_version: snapshot.data.snapshot_version },
      },
      model,
      timeoutMs: 10_000,
      body: {
        instructions: [
          "You are the Project Brain enrichment layer inside Innovation OS.",
          "Do not change the project stage.",
          "Do not invent evidence.",
          "Identify the biggest uncertainty and current risk from the supplied structured project context.",
          "Explain the existing next action more specifically; do not replace it with a different workflow stage.",
          "Return concise Modern Standard Arabic.",
        ].join("\n"),
        input: JSON.stringify({
          project: project.data,
          problem: problem.data,
          open_questions: questions.data ?? [],
          untested_assumptions: assumptions.data ?? [],
          deterministic_next_action:
            (snapshot.data.next_best_action_json as Record<string, unknown> | null) ?? {},
        }),
        max_output_tokens: 900,
        text: {
          format: {
            type: "json_schema",
            name: "project_brain_enrichment",
            strict: true,
            schema,
          },
        },
      },
    });

    const text = extractOutputText(payload);
    if (!text) return;

    const parsed = JSON.parse(text) as BrainEnrichment;
    if (
      typeof parsed.biggest_unknown !== "string" ||
      typeof parsed.risk_summary !== "string" ||
      typeof parsed.explanation !== "string"
    ) {
      return;
    }

    const currentNext =
      (snapshot.data.next_best_action_json as Record<string, unknown> | null) ?? {};
    const currentSummary =
      (snapshot.data.summary_json as Record<string, unknown> | null) ?? {};

    await admin
      .from("project_snapshots")
      .update({
        summary_json: {
          ...currentSummary,
          biggest_unknown: parsed.biggest_unknown,
          enriched_by: "PROJECT_BRAIN_AGENT_V1",
        },
        next_best_action_json: {
          ...currentNext,
          reason: parsed.explanation,
          generated_by: "HYBRID_NAVIGATOR_V1",
        },
        risk_summary_json: {
          biggest_unknown: parsed.biggest_unknown,
          risk_summary: parsed.risk_summary,
          enriched_by: "PROJECT_BRAIN_AGENT_V1",
        },
      })
      .eq("id", snapshot.data.id);

    if (runId) {
      await admin.from("ai_artifacts").insert({
        ai_run_id: runId,
        artifact_type: "PROJECT_BRAIN_ENRICHMENT",
        content_json: parsed,
        version: 1,
      });
    }

  } catch {
    // Deterministic snapshot remains valid if enrichment fails.
  }
}
