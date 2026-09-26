import { expandEvidenceQuery } from "@/lib/research/query-expansion";
import { searchOpenAlex } from "@/lib/research/openalex";
import type { EvidenceSearchType } from "@/lib/research/types";
import type { AiObservationContext } from "@/lib/ai/observed-openai";

export async function searchEvidence(query: string, type: EvidenceSearchType, observation?: AiObservationContext) {
  const queries = await expandEvidenceQuery(query, type, observation);
  const settled = await Promise.allSettled(queries.map((item) => searchOpenAlex(item)));

  const byKey = new Map<string, Awaited<ReturnType<typeof searchOpenAlex>>[number]>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      const key = item.doi?.toLowerCase() || item.externalId;
      if (key && !byKey.has(key)) byKey.set(key, item);
    }
  }

  return {
    queries,
    results: [...byKey.values()].slice(0, 20),
  };
}
