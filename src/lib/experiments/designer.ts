import type { ExperimentDraft } from "@/lib/experiments/types";
import { observedOpenAIResponse, type AiObservationContext } from "@/lib/ai/observed-openai";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title","research_question","hypothesis","independent_variable",
    "dependent_variable","control_description","sample_description",
    "measurement_method","protocol","success_criteria",
    "expected_failure_modes","safety_notes"
  ],
  properties: {
    title: { type: "string", minLength: 3, maxLength: 240 },
    research_question: { type: "string", minLength: 10, maxLength: 1500 },
    hypothesis: { type: "string", minLength: 10, maxLength: 1500 },
    independent_variable: { type: "string", maxLength: 1000 },
    dependent_variable: { type: "string", maxLength: 1000 },
    control_description: { type: "string", maxLength: 1500 },
    sample_description: { type: "string", maxLength: 1500 },
    measurement_method: { type: "string", maxLength: 1500 },
    protocol: { type: "array", minItems: 2, maxItems: 20, items: { type: "string" } },
    success_criteria: { type: "string", minLength: 5, maxLength: 1500 },
    expected_failure_modes: { type: "array", maxItems: 10, items: { type: "string" } },
    safety_notes: { type: "array", maxItems: 10, items: { type: "string" } },
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

export async function designExperiment(context: Record<string, unknown>, observation: AiObservationContext): Promise<ExperimentDraft> {
  const model = process.env.OPENAI_EXPERIMENT_DESIGNER_MODEL ?? "gpt-5.6-terra";
  const { payload } = await observedOpenAIResponse({
    context: observation,
    model,
    body: {
      reasoning: { effort: "medium" },
      instructions: [
        "You are the Experiment Designer inside Innovation OS.",
        "Design an experiment that tests the supplied gap/hypothesis rather than proving a preferred solution.",
        "Make variables, control, measurement method, sample, protocol, and success criteria explicit.",
        "Do not invent evidence.",
        "Include realistic failure modes and safety/ethics notes.",
        "Keep the design feasible as an MVP research experiment.",
        "Write concise Arabic while preserving technical terms.",
      ].join("\n"),
      input: JSON.stringify(context),
      max_output_tokens: 2400,
      text: {
        format: {
          type: "json_schema",
          name: "experiment_draft",
          strict: true,
          schema,
        },
      },
    },
  });
  const text = outputText(payload);
  if (!text) throw new Error("Experiment output missing");
  return JSON.parse(text) as ExperimentDraft;
}
