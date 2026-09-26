import { createHash } from "node:crypto";
import { observedOpenAIResponse } from "@/lib/ai/observed-openai";
import {
  ideaXRayJsonSchema,
  isIdeaXRayResult,
  type IdeaXRayResult,
} from "@/lib/ai/idea-xray-schema";

type GatewayResult = {
  analysis: IdeaXRayResult;
  model: string;
  inputHash: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

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

export async function runIdeaXRay(
  idea: string,
  language: "ar" | "en",
): Promise<GatewayResult> {
  const model = process.env.OPENAI_IDEA_XRAY_MODEL ?? "gpt-5.6-luna";
  const inputHash = createHash("sha256").update(idea).digest("hex");

  const { payload, usage } = await observedOpenAIResponse({
    context: {
      agentType: "IDEA_XRAY",
      inputHash,
      metadata: { language, pre_auth: true },
    },
    model,
    timeoutMs: 25_000,
    retries: 1,
    body: {
      instructions: [
        "You are the Idea X-Ray specialist inside Innovation OS.",
        "Your job is to structure an early idea or problem, not praise it and not invent a finished solution.",
        "Separate what is stated from what is assumed.",
        "Identify unknowns, risks, and critical validation questions.",
        "The recommended next action must reduce uncertainty and normally validate the problem before solution-building.",
        "Do not claim scientific evidence exists unless evidence was supplied; no external search is available in this task.",
        "Use the user's language. Arabic must be clear Modern Standard Arabic while preserving useful English technical terminology when appropriate.",
        "Avoid innovation scores, novelty verdicts, patentability opinions, or exaggerated claims.",
      ].join("\n"),
      input: `Language: ${language}\n\nRaw idea/problem:\n${idea}`,
      max_output_tokens: 2200,
      text: {
        format: {
          type: "json_schema",
          name: "idea_xray_result",
          strict: true,
          schema: ideaXRayJsonSchema,
        },
      },
    },
  });

  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("Structured output was missing");
  }

  const parsed: unknown = JSON.parse(outputText);

  if (!isIdeaXRayResult(parsed)) {
    throw new Error("Structured output failed application validation");
  }

  return {
    analysis: parsed,
    model,
    inputHash,
    usage,
  };
}
