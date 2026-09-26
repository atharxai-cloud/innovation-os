import { observedOpenAIResponse, type AiObservationContext } from "@/lib/ai/observed-openai";
export type AskProjectAnswer = {
  summary: string;
  facts: Array<{
    statement: string;
    grounding: "PROJECT_DATA" | "SOURCE_GROUNDED";
    source_ids: string[];
  }>;
  inferences: Array<{
    statement: string;
    basis: string;
  }>;
  recommendations: Array<{
    action: string;
    reason: string;
  }>;
  uncertainties: string[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary","facts","inferences","recommendations","uncertainties"],
  properties: {
    summary: { type: "string", minLength: 3, maxLength: 1200 },
    facts: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["statement","grounding","source_ids"],
        properties: {
          statement: { type: "string", minLength: 3, maxLength: 1000 },
          grounding: { type: "string", enum: ["PROJECT_DATA","SOURCE_GROUNDED"] },
          source_ids: { type: "array", items: { type: "string" }, maxItems: 8 },
        },
      },
    },
    inferences: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["statement","basis"],
        properties: {
          statement: { type: "string", minLength: 3, maxLength: 1000 },
          basis: { type: "string", minLength: 3, maxLength: 1000 },
        },
      },
    },
    recommendations: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["action","reason"],
        properties: {
          action: { type: "string", minLength: 3, maxLength: 1000 },
          reason: { type: "string", minLength: 3, maxLength: 1000 },
        },
      },
    },
    uncertainties: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 3, maxLength: 800 },
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

export async function askProjectAgent(input: {
  question: string;
  contextPack: Record<string, unknown>;
  observation: AiObservationContext;
}): Promise<{ answer: AskProjectAnswer; runId: string | null }> {
  const model = process.env.OPENAI_ASK_PROJECT_MODEL ?? "gpt-5.6-terra";
  const { payload, runId } = await observedOpenAIResponse({
    context: input.observation,
    model,
    body: {
      reasoning: { effort: "medium" },
      instructions: [
        "You are Ask My Project inside Innovation OS.",
        "Answer from the supplied Project Context Pack only.",
        "Do not use general-world claims as facts unless they appear in supplied sources.",
        "Clearly separate FACT, INFERENCE, RECOMMENDATION, and UNCERTAINTY.",
        "Scientific factual claims must use SOURCE_GROUNDED and source_ids from supplied source records.",
        "Project-state facts may use PROJECT_DATA with an empty source_ids array.",
        "Never fabricate a source id.",
        "If the context cannot answer the question, say what is missing.",
        "Write concise Arabic while preserving useful technical terminology.",
      ].join("\n"),
      input: JSON.stringify({
        question: input.question,
        contextPack: input.contextPack,
      }),
      max_output_tokens: 2200,
      text: {
        format: {
          type: "json_schema",
          name: "ask_project_answer",
          strict: true,
          schema,
        },
      },
    },
  });
  const text = outputText(payload);
  if (!text) throw new Error("Ask Project output missing");
  return { answer: JSON.parse(text) as AskProjectAnswer, runId };
}
