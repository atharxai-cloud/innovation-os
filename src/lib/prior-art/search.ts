import { searchOpenAlex } from "@/lib/research/openalex";
import { searchEpoPatents } from "@/lib/prior-art/epo-ops";
import type { PriorArtSearchResult } from "@/lib/prior-art/types";

export async function searchPriorArt(query: string) {
  const [papers, patents] = await Promise.all([
    searchOpenAlex(query),
    searchEpoPatents(query).catch(() => ({ available: false, results: [] })),
  ]);

  const research: PriorArtSearchResult[] = papers.slice(0, 10).map((item) => ({
    provider: "OPENALEX",
    priorArtType: "RESEARCH_PAPER",
    externalId: item.externalId,
    title: item.title,
    authors: item.authors,
    publishedAt: item.publishedAt,
    doi: item.doi,
    url: item.url,
    abstract: item.abstract,
    metadata: {
      cited_by_count: item.citedByCount,
      open_access: item.openAccess,
    },
  }));

  return {
    research,
    patents: patents.results,
    patentProviderAvailable: patents.available,
  };
}
