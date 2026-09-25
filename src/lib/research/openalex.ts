import type { EvidenceSearchResult } from "@/lib/research/types";

function reconstructAbstract(index: Record<string, number[]> | null | undefined) {
  if (!index) return null;
  const entries: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) entries.push([position, word]);
  }
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map(([, word]) => word).join(" ") || null;
}

export async function searchOpenAlex(query: string): Promise<EvidenceSearchResult[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", "8");
  url.searchParams.set(
    "select",
    "id,doi,title,publication_date,authorships,primary_location,abstract_inverted_index,cited_by_count,open_access",
  );

  const apiKey = process.env.OPENALEX_API_KEY;
  if (apiKey) url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: { "User-Agent": "InnovationOS/1.0" },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`OpenAlex search failed: ${response.status}`);

  const payload = (await response.json()) as {
    results?: Array<Record<string, unknown>>;
  };

  return (payload.results ?? []).map((item) => {
    const authorships = Array.isArray(item.authorships) ? item.authorships : [];
    const authors = authorships
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const author = (entry as { author?: unknown }).author;
        if (!author || typeof author !== "object") return null;
        const name = (author as { display_name?: unknown }).display_name;
        return typeof name === "string" ? name : null;
      })
      .filter((name): name is string => Boolean(name));

    const primary = item.primary_location && typeof item.primary_location === "object"
      ? item.primary_location as { landing_page_url?: unknown }
      : null;

    const rawDoi = typeof item.doi === "string" ? item.doi : null;
    const doi = rawDoi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") ?? null;

    return {
      externalId: String(item.id ?? ""),
      doi,
      title: String(item.title ?? "Untitled"),
      authors,
      publishedAt: typeof item.publication_date === "string" ? item.publication_date : null,
      url:
        typeof primary?.landing_page_url === "string"
          ? primary.landing_page_url
          : rawDoi ?? String(item.id ?? ""),
      abstract: reconstructAbstract(
        item.abstract_inverted_index && typeof item.abstract_inverted_index === "object"
          ? item.abstract_inverted_index as Record<string, number[]>
          : null,
      ),
      citedByCount: typeof item.cited_by_count === "number" ? item.cited_by_count : null,
      openAccess:
        item.open_access && typeof item.open_access === "object"
          ? Boolean((item.open_access as { is_oa?: unknown }).is_oa)
          : null,
      provider: "OPENALEX" as const,
    };
  });
}
