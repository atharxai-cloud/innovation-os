import type { PriorArtSearchResult } from "@/lib/prior-art/types";

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

async function getToken() {
  const key = process.env.EPO_OPS_CONSUMER_KEY;
  const secret = process.env.EPO_OPS_CONSUMER_SECRET;
  if (!key || !secret) return null;

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await fetch("https://ops.epo.org/3.2/auth/accesstoken", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`EPO auth failed: ${response.status}`);
  const payload = await response.json() as { access_token?: string };
  return payload.access_token ?? null;
}

function publicationRefs(xml: string) {
  const refs: Array<{ country: string; doc: string; kind: string }> = [];
  const blocks = xml.match(/<document-id[^>]*document-id-type="docdb"[^>]*>[\s\S]*?<\/document-id>/g) ?? [];

  for (const block of blocks) {
    const country = block.match(/<country>([^<]+)<\/country>/)?.[1];
    const doc = block.match(/<doc-number>([^<]+)<\/doc-number>/)?.[1];
    const kind = block.match(/<kind>([^<]+)<\/kind>/)?.[1];
    if (country && doc && kind) refs.push({ country, doc, kind });
  }

  return refs.filter(
    (item, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.country === item.country &&
          candidate.doc === item.doc &&
          candidate.kind === item.kind,
      ) === index,
  );
}

async function fetchBiblio(
  token: string,
  ref: { country: string; doc: string; kind: string },
): Promise<PriorArtSearchResult> {
  const id = `${ref.country}.${ref.doc}.${ref.kind}`;
  const response = await fetch(
    `https://ops.epo.org/3.2/rest-services/published-data/publication/docdb/${encodeURIComponent(id)}/biblio`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/xml",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error(`EPO biblio failed: ${response.status}`);
  const xml = await response.text();
  const title =
    xml.match(/<invention-title[^>]*lang="en"[^>]*>([^<]+)<\/invention-title>/i)?.[1] ??
    xml.match(/<invention-title[^>]*>([^<]+)<\/invention-title>/i)?.[1] ??
    id;
  const date = xml.match(/<date>(\d{8})<\/date>/)?.[1] ?? null;
  const publishedAt = date
    ? `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`
    : null;

  return {
    provider: "EPO_OPS",
    priorArtType: "PATENT",
    externalId: id,
    title: decodeXml(title),
    authors: [],
    publishedAt,
    doi: null,
    url: `https://worldwide.espacenet.com/patent/search?q=pn%3D${ref.country}${ref.doc}${ref.kind}`,
    abstract: null,
    metadata: { country: ref.country, doc_number: ref.doc, kind: ref.kind },
  };
}

export async function searchEpoPatents(query: string) {
  const token = await getToken();
  if (!token) return { available: false, results: [] as PriorArtSearchResult[] };

  const cql = `ta all "${query.replaceAll('"', " ")}"`;
  const url = new URL("https://ops.epo.org/3.2/rest-services/published-data/search");
  url.searchParams.set("q", cql);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/xml",
      Range: "1-8",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`EPO search failed: ${response.status}`);
  const refs = publicationRefs(await response.text()).slice(0, 6);
  const settled = await Promise.allSettled(refs.map((ref) => fetchBiblio(token, ref)));
  return {
    available: true,
    results: settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []),
  };
}
