import { observedOpenAIResponse, type AiObservationContext } from "@/lib/ai/observed-openai";
import type { EvidenceSearchType } from "@/lib/research/types";

export async function expandEvidenceQuery(
  query: string,
  type: EvidenceSearchType,
  observation?: AiObservationContext,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !observation) return [query];

  const model = process.env.OPENAI_EVIDENCE_QUERY_MODEL ?? "gpt-5.6-luna";
  let payload: { output?: unknown[] };

  try {
    ({ payload } = await observedOpenAIResponse({
      context: observation,
      model,
      body: {
        instructions:
          "Expand an Arabic or English research question into up to 3 concise English scholarly search queries. Preserve scientific meaning. Do not answer the question.",
        input: JSON.stringify({ query, type }),
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "evidence_queries",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["queries"],
              properties: {
                queries: {
                  type: "array",
                  minItems: 1,
                  maxItems: 3,
                  items: { type: "string", minLength: 3, maxLength: 300 },
                },
              },
            },
          },
        },
      },
    }));
  } catch {
    return [query];
  }

  for (const item of payload.output ?? []) {
    if (!item || typeof item !== "object") continue;
    for (const part of (item as { content?: unknown[] }).content ?? []) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        try {
          const parsed = JSON.parse((part as { text: string }).text) as { queries?: string[] };
          if (Array.isArray(parsed.queries) && parsed.queries.length) {
            return [...new Set([query, ...parsed.queries])].slice(0, 4);
          }
        } catch {}
      }
    }
  }

  return [query];
}
