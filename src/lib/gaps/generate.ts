import type { GapCandidate } from "@/lib/gaps/types";
import { observedOpenAIResponse, type AiObservationContext } from "@/lib/ai/observed-openai";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["gaps"],
  properties: {
    gaps: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title","description","gap_type","known_limitation","opportunity_rationale",
          "assumptions","validation_questions","confidence","evidence_source_ids","prior_art_ids"
        ],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 240 },
          description: { type: "string", minLength: 10, maxLength: 2500 },
          gap_type: { type: "string", enum: ["CONTEXT","COST","PERFORMANCE","INTEGRATION","ACCESSIBILITY","ENVIRONMENTAL","OTHER"] },
          known_limitation: { type: "string", minLength: 3, maxLength: 1000 },
          opportunity_rationale: { type: "string", minLength: 3, maxLength: 1000 },
          assumptions: { type: "array", maxItems: 8, items: { type: "string" } },
          validation_questions: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          evidence_source_ids: { type: "array", items: { type: "string" } },
          prior_art_ids: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

function outputText(payload: unknown) {
  const output = payload && typeof payload === "object"
    ? (payload as { output?: unknown[] }).output
    : undefined;
  for (const item of output ?? []) {
    if (!item || typeof item !== "object") continue;
    for (const part of (item as { content?: unknown[] }).content ?? []) {
      if (part && typeof part === "object" && (part as { type?: string }).type === "output_text" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

export async function generateGapCandidates(context: Record<string, unknown>, observation: AiObservationContext): Promise<GapCandidate[]> {
  const model = process.env.OPENAI_GAP_MODEL ?? "gpt-5.6-luna";

  const { payload } = await observedOpenAIResponse({
    context: observation,
    model,
    body: {
      instructions: [
        "You are the Gap Finder agent inside Innovation OS.",
        "Use only the supplied evidence, prior art, problem, and assumptions.",
        "A gap is a hypothesis, not a proven novelty claim.",
        "Do not issue patentability or novelty verdicts.",
        "Prefer concrete limitations: context, cost, performance, integration, accessibility, environmental constraints.",
        "Return source/prior-art IDs only from the supplied context.",
        "Every candidate must include validation questions and assumptions.",
        "Write concise Arabic while preserving useful technical terminology.",
      ].join("\n"),
      input: JSON.stringify(context),
      max_output_tokens: 2200,
      text: {
        format: {
          type: "json_schema",
          name: "gap_candidates",
          strict: true,
          schema,
        },
      },
    },
  });

  const text = outputText(payload);
  if (!text) throw new Error("Gap output missing");
  return (JSON.parse(text) as { gaps: GapCandidate[] }).gaps;
}
