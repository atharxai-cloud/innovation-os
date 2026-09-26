import type { ScientificCriticReview } from "@/lib/experiments/types";
import { observedOpenAIResponse, type AiObservationContext } from "@/lib/ai/observed-openai";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary","issues","recommendations","blocking_issues"],
  properties: {
    summary: { type: "string", minLength: 5, maxLength: 1200 },
    issues: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category","severity","message"],
        properties: {
          category: { type: "string", enum: ["HYPOTHESIS","CONTROL","MEASUREMENT","CONFOUNDING","SAMPLE","SUCCESS_CRITERIA","SAFETY","OTHER"] },
          severity: { type: "string", enum: ["INFO","WARNING","BLOCKING"] },
          message: { type: "string", minLength: 3, maxLength: 800 },
        },
      },
    },
    recommendations: { type: "array", maxItems: 12, items: { type: "string" } },
    blocking_issues: { type: "array", maxItems: 12, items: { type: "string" } },
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

export async function critiqueExperiment(context: Record<string, unknown>, observation: AiObservationContext): Promise<{ review: ScientificCriticReview; runId: string | null }> {
  const model = process.env.OPENAI_SCIENTIFIC_CRITIC_MODEL ?? "gpt-5.6-sol";
  const { payload, runId } = await observedOpenAIResponse({
    context: observation,
    model,
    body: {
      reasoning: { effort: "high" },
      instructions: [
        "You are an independent Scientific Critic. You did not design the experiment.",
        "Attempt to falsify the experimental design.",
        "Check whether it tests the hypothesis, has a valid control, valid measurement, confounders, sample logic, explicit success criterion, and safety concerns.",
        "A BLOCKING issue means the experiment should not be marked READY until revised.",
        "Do not invent evidence or claim statistical power without enough information.",
        "Write concise Arabic while preserving technical terms.",
      ].join("\n"),
      input: JSON.stringify(context),
      max_output_tokens: 2400,
      text: {
        format: {
          type: "json_schema",
          name: "scientific_critic_review",
          strict: true,
          schema,
        },
      },
    },
  });
  const text = outputText(payload);
  if (!text) throw new Error("Critic output missing");
  return { review: JSON.parse(text) as ScientificCriticReview, runId };
}
