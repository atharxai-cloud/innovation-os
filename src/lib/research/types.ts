export type EvidenceSearchResult = {
  externalId: string;
  doi: string | null;
  title: string;
  authors: string[];
  publishedAt: string | null;
  url: string;
  abstract: string | null;
  citedByCount: number | null;
  openAccess: boolean | null;
  provider: "OPENALEX";
};

export type EvidenceSearchType =
  | "PROBLEM_EVIDENCE"
  | "SCIENTIFIC_MECHANISM"
  | "TECHNOLOGY_EVIDENCE"
  | "MEASUREMENT_METHOD";
