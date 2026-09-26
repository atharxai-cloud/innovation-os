export type PriorArtSearchResult = {
  provider: "OPENALEX" | "EPO_OPS";
  priorArtType: "RESEARCH_PAPER" | "PATENT";
  externalId: string;
  title: string;
  authors: string[];
  publishedAt: string | null;
  doi: string | null;
  url: string;
  abstract: string | null;
  metadata: Record<string, unknown>;
};

export type PriorArtComparison = {
  technical_summary: string;
  similarity_level: "LOW" | "MEDIUM" | "HIGH";
  similarity_reasons: string[];
  shared_concepts: string[];
  key_differences: string[];
  limitations: string[];
  disclaimer: string;
};
