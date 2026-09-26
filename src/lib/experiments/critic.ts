import type { ScientificCriticReview } from "@/lib/experiments/types";

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

export async function critiqueExperiment(context: Record<string, unknown>): Promise<ScientificCriticReview> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: process.env.OPENAI_SCIENTIFIC_CRITIC_MODEL ?? "gpt-5.6-sol",
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
    }),
  });

  if (!response.ok) throw new Error(`Critic failed: ${response.status}`);
  const text = outputText(await response.json());
  if (!text) throw new Error("Critic output missing");
  return JSON.parse(text) as ScientificCriticReview;
}
