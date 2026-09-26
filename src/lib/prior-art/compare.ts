import type { PriorArtComparison, PriorArtSearchResult } from "@/lib/prior-art/types";

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "technical_summary",
    "similarity_level",
    "similarity_reasons",
    "shared_concepts",
    "key_differences",
    "limitations",
    "disclaimer",
  ],
  properties: {
    technical_summary: { type: "string", minLength: 3, maxLength: 1200 },
    similarity_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    similarity_reasons: { type: "array", maxItems: 8, items: { type: "string" } },
    shared_concepts: { type: "array", maxItems: 8, items: { type: "string" } },
    key_differences: { type: "array", maxItems: 8, items: { type: "string" } },
    limitations: { type: "array", maxItems: 8, items: { type: "string" } },
    disclaimer: { type: "string" },
  },
} as const;

function outputText(payload: unknown) {
  const output = payload && typeof payload === "object"
    ? (payload as { output?: unknown[] }).output
    : undefined;
  for (const item of output ?? []) {
    if (!item || typeof item !== "object") continue;
    for (const part of (item as { content?: unknown[] }).content ?? []) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) return (part as { text: string }).text;
    }
  }
  return null;
}

export async function comparePriorArt(input: {
  project: Record<string, unknown>;
  problem: Record<string, unknown> | null;
  candidate: PriorArtSearchResult;
}): Promise<PriorArtComparison> {
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
      model: process.env.OPENAI_PRIOR_ART_MODEL ?? "gpt-5.6-luna",
      instructions: [
        "You are the Prior-Art Comparison agent in Innovation OS.",
        "Compare concepts only from the supplied project and candidate metadata.",
        "Do not issue patentability, novelty, freedom-to-operate, infringement, or legal opinions.",
        "Similarity is conceptual only: LOW, MEDIUM, or HIGH.",
        "If candidate metadata is incomplete, say so in limitations.",
        "Return concise Arabic while preserving technical terms when useful.",
      ].join("\n"),
      input: JSON.stringify(input),
      max_output_tokens: 1400,
      text: {
        format: {
          type: "json_schema",
          name: "prior_art_comparison",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`Comparison failed: ${response.status}`);
  const text = outputText(await response.json());
  if (!text) throw new Error("Comparison output missing");
  return JSON.parse(text) as PriorArtComparison;
}
