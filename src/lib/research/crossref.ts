export async function resolveCrossrefDoi(doi: string) {
  const encoded = encodeURIComponent(doi);
  const url = new URL(`https://api.crossref.org/v1/works/${encoded}`);
  const mailto = process.env.CROSSREF_MAILTO;
  if (mailto) url.searchParams.set("mailto", mailto);

  const response = await fetch(url, {
    headers: { "User-Agent": "InnovationOS/1.0" },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    message?: Record<string, unknown>;
  };
  const item = payload.message;
  if (!item) return null;

  const title = Array.isArray(item.title) && typeof item.title[0] === "string"
    ? item.title[0]
    : null;
  const authorRows = Array.isArray(item.author) ? item.author : [];
  const authors = authorRows.map((entry) => {
    if (!entry || typeof entry !== "object") return "";
    const given = typeof (entry as { given?: unknown }).given === "string"
      ? (entry as { given: string }).given
      : "";
    const family = typeof (entry as { family?: unknown }).family === "string"
      ? (entry as { family: string }).family
      : "";
    return `${given} ${family}`.trim();
  }).filter(Boolean);

  return {
    title,
    authors,
    url: typeof item.URL === "string" ? item.URL : null,
    metadata: item,
  };
}
